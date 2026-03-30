package com.example.registrationotp.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.ReviewResponse;
import com.example.registrationotp.dto.UserReviewRequest;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.ReviewRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.support.ReviewTargetSupport;

@Service
public class ReviewService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private final SessionAuthService sessionAuthService;
	private final ReviewRepository reviewRepository;
	private final StoreRepository storeRepository;
	private final EventItemRepository eventItemRepository;
	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final OrderItemRepository orderItemRepository;

	public ReviewService(
			SessionAuthService sessionAuthService,
			ReviewRepository reviewRepository,
			StoreRepository storeRepository,
			EventItemRepository eventItemRepository,
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			OrderItemRepository orderItemRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.reviewRepository = reviewRepository;
		this.storeRepository = storeRepository;
		this.eventItemRepository = eventItemRepository;
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.orderItemRepository = orderItemRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<ReviewResponse> listMyReviews(
			String authorizationHeader,
			ReviewTargetType targetType,
			String sort,
			int page,
			int size
	) {
		ReviewTargetSupport.requireSupported(targetType);
		User user = requireBuyerUser(authorizationHeader);
		List<ReviewResponse> items = reviewRepository.findAll().stream()
				.filter(review -> review.getUser().getId().equals(user.getId()))
				.filter(review -> ReviewTargetSupport.isSupported(review.getTargetType()))
				.filter(review -> targetType == null || review.getTargetType() == targetType)
				.map(this::toResponse)
				.sorted(reviewComparator(sort))
				.toList();
		return paginate(items, page, size);
	}

	@Transactional
	public ReviewResponse createReview(String authorizationHeader, UserReviewRequest request) {
		ReviewTargetSupport.requireSupported(request.targetType());
		User user = requireBuyerUser(authorizationHeader);
		validateReviewTarget(user, request.targetType(), request.targetId());
		reviewRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), request.targetType(), request.targetId())
				.ifPresent(existingReview -> {
					throw new ConflictException("You have already reviewed this target");
				});

		Review review = new Review();
		applyReviewRequest(review, user, request);
		return toResponse(saveReviewWithConflictGuard(review));
	}

	@Transactional
	public ReviewResponse updateMyReview(String authorizationHeader, Long id, UserReviewRequest request) {
		ReviewTargetSupport.requireSupported(request.targetType());
		User user = requireBuyerUser(authorizationHeader);
		validateReviewTarget(user, request.targetType(), request.targetId());

		Review review = reviewRepository.findByIdAndUserId(id, user.getId())
				.orElseThrow(() -> new NotFoundException("Review not found"));

		reviewRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), request.targetType(), request.targetId())
				.filter(existingReview -> !existingReview.getId().equals(id))
				.ifPresent(existingReview -> {
					throw new ConflictException("You have already reviewed this target");
				});

		applyReviewRequest(review, user, request);
		return toResponse(saveReviewWithConflictGuard(review));
	}

	@Transactional
	public MessageResponse deleteMyReview(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		reviewRepository.findByIdAndUserId(id, user.getId())
				.orElseThrow(() -> new NotFoundException("Review not found"));
		reviewRepository.deleteById(id);
		return new MessageResponse("Review deleted successfully");
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage reviews");
		}
		return user;
	}

	private <T> PageResponse<T> paginate(List<T> items, int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		int fromIndex = Math.min(resolvedPage * resolvedSize, items.size());
		int toIndex = Math.min(fromIndex + resolvedSize, items.size());
		List<T> pageItems = items.subList(fromIndex, toIndex);
		long totalItems = items.size();
		int totalPages = totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / resolvedSize);
		return new PageResponse<>(
				pageItems,
				resolvedPage,
				resolvedSize,
				totalItems,
				totalPages,
				resolvedPage + 1 < totalPages,
				resolvedPage > 0 && totalPages > 0
		);
	}

	private void applyReviewRequest(Review review, User user, UserReviewRequest request) {
		review.setUser(user);
		review.setTargetType(request.targetType());
		review.setTargetId(request.targetId());
		review.setRating(request.rating());
		review.setTitle(trimToNull(request.title()));
		review.setComment(trimToNull(request.comment()));
		review.setApproved(true);
	}

	private void validateReviewTarget(User user, ReviewTargetType targetType, Long targetId) {
		ReviewTargetSupport.requireSupported(targetType);
		validateUserHasPurchase(user, targetType, targetId);
		switch (targetType) {
			case STORE -> findStore(targetId);
			case EVENT -> findEvent(targetId);
			case DISH -> findDish(targetId);
			case CATEGORY -> throw new BadRequestException("CATEGORY reviews are no longer supported");
		}
	}

	private ReviewResponse toResponse(Review review) {
		return ReviewResponse.from(
				review,
				resolveTargetSlug(review.getTargetType(), review.getTargetId()),
				resolveTargetLabel(review.getTargetType(), review.getTargetId()),
				resolveTargetImagePaths(review.getTargetType(), review.getTargetId())
		);
	}

	private Store findStore(Long id) {
		return storeRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Store not found"));
	}

	private EventItem findEvent(Long id) {
		return eventItemRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Event not found"));
	}

	private Category findCategory(Long id) {
		return categoryRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Category not found"));
	}

	private Dish findDish(Long id) {
		return dishRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Dish not found"));
	}

	private String resolveTargetSlug(ReviewTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> storeRepository.findById(targetId)
					.map(Store::getSlug)
					.orElse(null);
			case EVENT -> eventItemRepository.findById(targetId)
					.map(EventItem::getSlug)
					.orElse(null);
			case CATEGORY, DISH -> null;
		};
	}

	private String resolveTargetLabel(ReviewTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> storeRepository.findById(targetId)
					.map(store -> "Store: " + store.getName())
					.orElse("Store #" + targetId);
			case EVENT -> eventItemRepository.findById(targetId)
					.map(eventItem -> "Event: " + eventItem.getName())
					.orElse("Event #" + targetId);
			case CATEGORY -> categoryRepository.findById(targetId)
					.map(category -> "Category: " + category.getName())
					.orElse("Category #" + targetId);
			case DISH -> dishRepository.findById(targetId)
					.map(dish -> "Dish: " + dish.getName())
					.orElse("Dish #" + targetId);
		};
	}

	private List<String> resolveTargetImagePaths(ReviewTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> storeRepository.findById(targetId)
					.map(store -> List.copyOf(store.getImagePaths()))
					.orElse(List.of());
			case EVENT -> eventItemRepository.findById(targetId)
					.map(eventItem -> List.copyOf(eventItem.getImagePaths()))
					.orElse(List.of());
			case CATEGORY -> categoryRepository.findById(targetId)
					.map(category -> List.copyOf(category.getImagePaths()))
					.orElse(List.of());
			case DISH -> dishRepository.findById(targetId)
					.map(dish -> List.copyOf(dish.getImagePaths()))
					.orElse(List.of());
		};
	}

	private void validateUserHasPurchase(User user, ReviewTargetType targetType, Long targetId) {
		boolean hasPurchase = switch (targetType) {
			case STORE -> orderItemRepository.existsByOrderUserIdAndStoreId(user.getId(), targetId);
			case DISH -> orderItemRepository.existsByOrderUserIdAndDishId(user.getId(), targetId);
			case EVENT -> {
				EventItem eventItem = findEvent(targetId);
				yield orderItemRepository.existsByOrderUserIdAndStoreId(user.getId(), eventItem.getStore().getId());
			}
			case CATEGORY -> throw new BadRequestException("CATEGORY reviews are no longer supported");
		};
		if (!hasPurchase) {
			throw new BadRequestException("You can only review targets from stores you have ordered from");
		}
	}

	private Review saveReviewWithConflictGuard(Review review) {
		try {
			return reviewRepository.save(review);
		}
		catch (DataIntegrityViolationException exception) {
			throw new ConflictException("You have already reviewed this target");
		}
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private Comparator<ReviewResponse> reviewComparator(String sort) {
		String resolvedSort = sort == null ? "date_desc" : sort;
		return switch (resolvedSort) {
			case "date_asc" -> Comparator.comparing(ReviewResponse::createdAt);
			case "rating_desc" -> Comparator.comparing(ReviewResponse::rating, Comparator.reverseOrder())
					.thenComparing(ReviewResponse::createdAt, Comparator.reverseOrder());
			case "rating_asc" -> Comparator.comparing(ReviewResponse::rating)
					.thenComparing(ReviewResponse::createdAt, Comparator.reverseOrder());
			case "date_desc" -> Comparator.comparing(ReviewResponse::createdAt, Comparator.reverseOrder());
			default -> Comparator.comparing(ReviewResponse::createdAt, Comparator.reverseOrder());
		};
	}
}
