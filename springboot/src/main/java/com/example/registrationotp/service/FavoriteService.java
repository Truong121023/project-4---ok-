package com.example.registrationotp.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.FavoriteRequest;
import com.example.registrationotp.dto.FavoriteResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.FavoriteRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.StoreRepository;

@Service
public class FavoriteService {

	private final SessionAuthService sessionAuthService;
	private final FavoriteRepository favoriteRepository;
	private final StoreRepository storeRepository;
	private final DishRepository dishRepository;
	private final EventItemRepository eventItemRepository;
	private final OrderItemRepository orderItemRepository;

	public FavoriteService(
			SessionAuthService sessionAuthService,
			FavoriteRepository favoriteRepository,
			StoreRepository storeRepository,
			DishRepository dishRepository,
			EventItemRepository eventItemRepository,
			OrderItemRepository orderItemRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.favoriteRepository = favoriteRepository;
		this.storeRepository = storeRepository;
		this.dishRepository = dishRepository;
		this.eventItemRepository = eventItemRepository;
		this.orderItemRepository = orderItemRepository;
	}

	@Transactional(readOnly = true)
	public List<FavoriteResponse> listFavorites(String authorizationHeader, FavoriteTargetType targetType, boolean purchasedOnly) {
		User user = requireBuyerUser(authorizationHeader);
		if (purchasedOnly && targetType != null && targetType != FavoriteTargetType.DISH) {
			throw new BadRequestException("purchasedOnly is only supported for DISH favorites");
		}
		return favoriteRepository.findAllByUserId(user.getId())
				.stream()
				.filter(favorite -> {
					if (purchasedOnly && targetType == null) {
						return favorite.getTargetType() == FavoriteTargetType.DISH;
					}
					return targetType == null || favorite.getTargetType() == targetType;
				})
				.filter(favorite -> !purchasedOnly || isPurchased(user, favorite))
				.sorted(Comparator.comparing(Favorite::getCreatedAt).reversed())
				.map(favorite -> toResponse(user, favorite))
				.toList();
	}

	@Transactional
	public FavoriteResponse createFavorite(String authorizationHeader, FavoriteRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		validateTarget(request.targetType(), request.targetId());

		Favorite favorite = favoriteRepository.findByUserIdAndTargetTypeAndTargetId(
				user.getId(),
				request.targetType(),
				request.targetId()
		).orElseGet(() -> {
			Favorite createdFavorite = new Favorite();
			createdFavorite.setUser(user);
			createdFavorite.setTargetType(request.targetType());
			createdFavorite.setTargetId(request.targetId());
			return favoriteRepository.save(createdFavorite);
		});

		return toResponse(user, favorite);
	}

	@Transactional
	public MessageResponse deleteFavorite(String authorizationHeader, FavoriteRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		favoriteRepository.deleteByUserIdAndTargetTypeAndTargetId(user.getId(), request.targetType(), request.targetId());
		return new MessageResponse("Favorite removed successfully");
	}

	private FavoriteResponse toResponse(User user, Favorite favorite) {
		return FavoriteResponse.from(
				favorite,
				resolveTargetSlug(favorite.getTargetType(), favorite.getTargetId()),
				resolveTargetLabel(favorite.getTargetType(), favorite.getTargetId()),
				resolveTargetImagePaths(favorite.getTargetType(), favorite.getTargetId()),
				isPurchased(user, favorite)
		);
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage favorites");
		}
		return user;
	}

	private void validateTarget(FavoriteTargetType targetType, Long targetId) {
		switch (targetType) {
			case STORE -> findStore(targetId);
			case DISH -> findDish(targetId);
			case EVENT -> findEvent(targetId);
		}
	}

	private Store findStore(Long id) {
		return storeRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Store not found"));
	}

	private Dish findDish(Long id) {
		return dishRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Dish not found"));
	}

	private EventItem findEvent(Long id) {
		return eventItemRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Event not found"));
	}

	private String resolveTargetLabel(FavoriteTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> findStore(targetId).getName();
			case DISH -> findDish(targetId).getName();
			case EVENT -> findEvent(targetId).getName();
		};
	}

	private String resolveTargetSlug(FavoriteTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> findStore(targetId).getSlug();
			case EVENT -> findEvent(targetId).getSlug();
			case DISH -> null;
		};
	}

	private List<String> resolveTargetImagePaths(FavoriteTargetType targetType, Long targetId) {
		return switch (targetType) {
			case STORE -> List.copyOf(findStore(targetId).getImagePaths());
			case DISH -> List.copyOf(findDish(targetId).getImagePaths());
			case EVENT -> List.copyOf(findEvent(targetId).getImagePaths());
		};
	}

	private boolean isPurchased(User user, Favorite favorite) {
		return switch (favorite.getTargetType()) {
			case STORE -> orderItemRepository.existsByOrderUserIdAndStoreId(user.getId(), favorite.getTargetId());
			case DISH -> orderItemRepository.existsByOrderUserIdAndDishId(user.getId(), favorite.getTargetId());
			case EVENT -> {
				EventItem eventItem = findEvent(favorite.getTargetId());
				yield orderItemRepository.existsByOrderUserIdAndStoreId(user.getId(), eventItem.getStore().getId());
			}
		};
	}
}
