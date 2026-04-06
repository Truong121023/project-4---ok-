package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.registrationotp.dto.AdminDashboardResponse;
import com.example.registrationotp.dto.AdminRevenueSummaryResponse;
import com.example.registrationotp.dto.AdminSummaryResponse;
import com.example.registrationotp.dto.AdminTopSellingDishResponse;
import com.example.registrationotp.dto.ContentSectionRequest;
import com.example.registrationotp.dto.AdminUserRequest;
import com.example.registrationotp.dto.AdminUserResponse;
import com.example.registrationotp.dto.AdminUserVerificationRequest;
import com.example.registrationotp.dto.CategoryRequest;
import com.example.registrationotp.dto.CategoryResponse;
import com.example.registrationotp.dto.CustomerFeedbackResponse;
import com.example.registrationotp.dto.DishRequest;
import com.example.registrationotp.dto.DishResponse;
import com.example.registrationotp.dto.EventItemRequest;
import com.example.registrationotp.dto.EventItemResponse;
import com.example.registrationotp.dto.HighlightMetadataRequest;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.NewsArticleRequest;
import com.example.registrationotp.dto.NewsArticleResponse;
import com.example.registrationotp.dto.OrderItemResponse;
import com.example.registrationotp.dto.OrderResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.PromotionResponse;
import com.example.registrationotp.dto.ReviewRequest;
import com.example.registrationotp.dto.ReviewResponse;
import com.example.registrationotp.dto.StoreRequest;
import com.example.registrationotp.dto.StoreDishRequest;
import com.example.registrationotp.dto.StoreDishResponse;
import com.example.registrationotp.dto.StoreResponse;
import com.example.registrationotp.dto.UploadImagesResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.ContentSection;
import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.OrderAllowedAction;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.CustomerFeedbackRepository;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EmailOtpRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.FavoriteRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.ReviewRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.UserRepository;
import com.example.registrationotp.repository.UserSessionRepository;
import com.example.registrationotp.support.EmailNormalizer;
import com.example.registrationotp.support.EventSlugNormalizer;
import com.example.registrationotp.support.NewsSlugNormalizer;
import com.example.registrationotp.support.ReviewTargetSupport;
import com.example.registrationotp.support.StoreSlugNormalizer;

@Service
public class AdminService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
	private static final Collection<Role> MANAGED_EMPLOYEE_ROLES = List.of(Role.STAFF, Role.SHIPPER);

	private final SessionAuthService sessionAuthService;
	private final UserRepository userRepository;
	private final EmailOtpRepository emailOtpRepository;
	private final UserSessionRepository userSessionRepository;
	private final PasswordEncoder passwordEncoder;
	private final StoreRepository storeRepository;
	private final EventItemRepository eventItemRepository;
	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final StoreDishRepository storeDishRepository;
	private final ReviewRepository reviewRepository;
	private final FavoriteRepository favoriteRepository;
	private final CustomerFeedbackRepository customerFeedbackRepository;
	private final NewsArticleRepository newsArticleRepository;
	private final CartRepository cartRepository;
	private final CartItemRepository cartItemRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;
	private final PromotionRepository promotionRepository;
	private final FileStorageService fileStorageService;
	private final NotificationService notificationService;
	private final ZoneId zoneId = ZoneId.systemDefault();

	public AdminService(
			SessionAuthService sessionAuthService,
			UserRepository userRepository,
			EmailOtpRepository emailOtpRepository,
			UserSessionRepository userSessionRepository,
			PasswordEncoder passwordEncoder,
			StoreRepository storeRepository,
			EventItemRepository eventItemRepository,
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			StoreDishRepository storeDishRepository,
			ReviewRepository reviewRepository,
			FavoriteRepository favoriteRepository,
			CustomerFeedbackRepository customerFeedbackRepository,
			NewsArticleRepository newsArticleRepository,
			CartRepository cartRepository,
			CartItemRepository cartItemRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository,
			PromotionRepository promotionRepository,
			FileStorageService fileStorageService,
			NotificationService notificationService
	) {
		this.sessionAuthService = sessionAuthService;
		this.userRepository = userRepository;
		this.emailOtpRepository = emailOtpRepository;
		this.userSessionRepository = userSessionRepository;
		this.passwordEncoder = passwordEncoder;
		this.storeRepository = storeRepository;
		this.eventItemRepository = eventItemRepository;
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.storeDishRepository = storeDishRepository;
		this.reviewRepository = reviewRepository;
		this.favoriteRepository = favoriteRepository;
		this.customerFeedbackRepository = customerFeedbackRepository;
		this.newsArticleRepository = newsArticleRepository;
		this.cartRepository = cartRepository;
		this.cartItemRepository = cartItemRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.promotionRepository = promotionRepository;
		this.fileStorageService = fileStorageService;
		this.notificationService = notificationService;
	}

	@Transactional(readOnly = true)
	public AdminDashboardResponse dashboard(String authorizationHeader, Long storeId) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		DashboardScope scope = resolveDashboardScope(operator, storeId);
		return new AdminDashboardResponse(
				listUsersPreview(scope),
				listStoresPreview(scope),
				listEventsPreview(scope),
				listCategoriesPreview(scope),
				listDishesPreview(scope),
				listStoreDishesPreview(scope),
				listOrdersPreview(scope),
				listReviewsPreview(scope),
				listFeedbacksPreview(scope),
				listPromotionsPreview(scope),
				listNewsPreview(scope),
				buildTopSellingDishes(scope),
				buildRevenueSummary(scope)
		);
	}

	@Transactional(readOnly = true)
	public AdminSummaryResponse summary(String authorizationHeader, Long storeId) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		DashboardScope scope = resolveDashboardScope(operator, storeId);
		return new AdminSummaryResponse(
				countUsers(scope),
				countStores(scope),
				countEvents(scope),
				countCategories(scope),
				countDishes(scope),
				countStoreDishes(scope),
				countPromotions(scope),
				countOrders(scope),
				countReviews(scope),
				countNews(scope),
				buildRevenueSummary(scope)
		);
	}

	public UploadImagesResponse uploadImages(String authorizationHeader, List<MultipartFile> files, String folder) {
		sessionAuthService.requireAdminOrManager(authorizationHeader);
		return fileStorageService.storeImages(files, folder);
	}

	@Transactional(readOnly = true)
	public PageResponse<AdminUserResponse> listUsers(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<User> specification = userSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and((root, query, criteriaBuilder) -> criteriaBuilder.and(
					criteriaBuilder.equal(root.join("workingStore", JoinType.LEFT).get("id"), workingStoreId),
					root.get("role").in(Role.STAFF, Role.SHIPPER)
			));
		}
		return PageResponse.from(userRepository.findAll(specification, buildPageable(page, size))
				.map(AdminUserResponse::from));
	}

	@Transactional(readOnly = true)
	public AdminUserResponse getUser(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		User user = findUser(id);
		validateManagedUserAccess(operator, user);
		return AdminUserResponse.from(user);
	}

	@Transactional
	public AdminUserResponse createUser(String authorizationHeader, AdminUserRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		if (request.password() == null || request.password().isBlank()) {
			throw new BadRequestException("password is required when creating a user");
		}
		validateUserManagementRequest(operator, request);

		String normalizedEmail = EmailNormalizer.normalize(request.email());
		userRepository.findByEmail(normalizedEmail)
				.ifPresent(existingUser -> {
					throw new ConflictException("Email is already in use");
				});

		User user = new User();
		applyUserRequest(user, request, normalizedEmail, true);
		return AdminUserResponse.from(userRepository.save(user));
	}

	@Transactional
	public AdminUserResponse updateUser(String authorizationHeader, Long id, AdminUserRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		User user = findUser(id);
		validateManagedUserAccess(operator, user);
		validateUserManagementRequest(operator, request);
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		userRepository.findByEmail(normalizedEmail)
				.filter(existingUser -> !existingUser.getId().equals(id))
				.ifPresent(existingUser -> {
					throw new ConflictException("Email is already in use");
				});

		applyUserRequest(user, request, normalizedEmail, false);
		return AdminUserResponse.from(userRepository.save(user));
	}

	@Transactional
	public AdminUserResponse updateUserVerification(
			String authorizationHeader,
			Long id,
			AdminUserVerificationRequest request
	) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		User user = findUser(id);
		validateManagedUserAccess(operator, user);
		if (Boolean.TRUE.equals(request.verified())) {
			user.setEnabled(true);
			if (user.getVerifiedAt() == null) {
				user.setVerifiedAt(Instant.now());
			}
		} else {
			user.setEnabled(false);
			user.setVerifiedAt(null);
			emailOtpRepository.deleteAllByUserId(id);
			userSessionRepository.deleteAllByUserId(id);
		}
		return AdminUserResponse.from(userRepository.save(user));
	}

	@Transactional
	public MessageResponse deleteUser(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		User user = findUser(id);
		validateManagedUserAccess(operator, user);
		emailOtpRepository.deleteAllByUserId(id);
		userSessionRepository.deleteAllByUserId(id);
		reviewRepository.deleteAllByUserId(id);
		favoriteRepository.deleteAllByUserId(id);
		customerFeedbackRepository.deleteAllByUserId(id);
		notificationService.deleteAllNotificationsForUser(id);
		cartRepository.findByUserIdAndStatus(id, CartStatus.OPEN)
				.ifPresent(cart -> {
					cartItemRepository.deleteAllByCartId(cart.getId());
					cartRepository.delete(cart);
				});
		for (Order order : orderRepository.findAllByUserId(id)) {
			orderItemRepository.deleteAllByOrderId(order.getId());
			orderRepository.delete(order);
		}
		userRepository.deleteById(id);
		return new MessageResponse("User deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<StoreResponse> listStores(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<Store> specification = storeSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"), workingStoreId)
			);
		}
		return PageResponse.from(storeRepository.findAll(specification, buildPageable(page, size))
				.map(StoreResponse::from));
	}

	@Transactional(readOnly = true)
	public StoreResponse getStore(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Store store = findStore(id);
		validateStoreOwnership(operator, store.getId());
		return StoreResponse.from(store);
	}

	@Transactional
	public StoreResponse createStore(String authorizationHeader, StoreRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		Store store = new Store();
		String normalizedSlug = resolveNormalizedStoreSlug(request);
		if (storeRepository.existsBySlugIgnoreCase(normalizedSlug)) {
			throw new ConflictException("Store slug is already in use");
		}
		applyStoreRequest(store, request, normalizedSlug);
		return StoreResponse.from(storeRepository.save(store));
	}

	@Transactional
	public StoreResponse updateStore(String authorizationHeader, Long id, StoreRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Store store = findStore(id);
		validateStoreOwnership(operator, store.getId());
		String normalizedSlug = resolveNormalizedStoreSlug(request);
		if (storeRepository.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, id)) {
			throw new ConflictException("Store slug is already in use");
		}
		applyStoreRequest(store, request, normalizedSlug);
		return StoreResponse.from(storeRepository.save(store));
	}

	@Transactional
	public StoreResponse updateStoreHighlights(String authorizationHeader, Long id, HighlightMetadataRequest request) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Store store = findStore(id);
		validateStoreOwnership(operator, store.getId());
		applyStoreHighlights(store, request.highlightSummary(), request.highlightTags());
		return StoreResponse.from(storeRepository.save(store));
	}

	@Transactional
	public MessageResponse deleteStore(String authorizationHeader, Long id) {
		sessionAuthService.requireAdmin(authorizationHeader);
		findStore(id);
		if (userRepository.existsByWorkingStoreId(id)) {
			throw new ConflictException("Store has assigned employees. Reassign them before deleting this store.");
		}
		if (orderItemRepository.countByStoreId(id) > 0) {
			throw new ConflictException("Store has order history. Keep it for historical orders.");
		}
		eventItemRepository.findAllByStoreId(id).forEach(eventItem -> deleteEventInternal(eventItem.getId()));
		categoryRepository.findAllByStoreId(id).forEach(category -> deleteCategoryInternal(category.getId()));
		reviewRepository.deleteAllByTargetTypeAndTargetId(ReviewTargetType.STORE, id);
		favoriteRepository.deleteAllByTargetTypeAndTargetId(FavoriteTargetType.STORE, id);
		List<CustomerFeedback> relatedFeedbacks = customerFeedbackRepository.findAllByRelatedStoreId(id);
		relatedFeedbacks.forEach(feedback -> feedback.setRelatedStore(null));
		customerFeedbackRepository.saveAll(relatedFeedbacks);
		newsArticleRepository.findAllByRelatedStoreId(id).forEach(newsArticle -> newsArticle.setRelatedStore(null));
		storeDishRepository.deleteAllByStoreId(id);
		cartItemRepository.deleteAllByStoreId(id);
		storeRepository.deleteById(id);
		return new MessageResponse("Store deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<EventItemResponse> listEvents(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<EventItem> specification = eventSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(
							root.join("store", JoinType.LEFT).get("id"),
							workingStoreId
					)
			);
		}
		return PageResponse.from(eventItemRepository.findAll(specification, buildPageable(page, size))
				.map(EventItemResponse::from));
	}

	@Transactional(readOnly = true)
	public EventItemResponse getEvent(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		EventItem eventItem = findEvent(id);
		validateStoreOwnership(operator, eventItem.getStore().getId());
		return EventItemResponse.from(eventItem);
	}

	@Transactional
	public EventItemResponse createEvent(String authorizationHeader, EventItemRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateStoreOwnership(operator, request.storeId());
		validateEventTime(request);
		EventItem eventItem = new EventItem();
		String normalizedSlug = resolveNormalizedEventSlug(request);
		if (eventItemRepository.existsBySlugIgnoreCase(normalizedSlug)) {
			throw new ConflictException("Event slug is already in use");
		}
		applyEventRequest(eventItem, request, normalizedSlug);
		EventItem savedEventItem = eventItemRepository.save(eventItem);
		notificationService.notifyNewBrandEvent(savedEventItem);
		return EventItemResponse.from(savedEventItem);
	}

	@Transactional
	public EventItemResponse updateEvent(String authorizationHeader, Long id, EventItemRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateEventTime(request);
		EventItem eventItem = findEvent(id);
		validateStoreOwnership(operator, eventItem.getStore().getId());
		validateStoreOwnership(operator, request.storeId());
		String normalizedSlug = resolveNormalizedEventSlug(request);
		if (eventItemRepository.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, id)) {
			throw new ConflictException("Event slug is already in use");
		}
		applyEventRequest(eventItem, request, normalizedSlug);
		return EventItemResponse.from(eventItemRepository.save(eventItem));
	}

	@Transactional
	public EventItemResponse updateEventHighlights(String authorizationHeader, Long id, HighlightMetadataRequest request) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		EventItem eventItem = findEvent(id);
		validateStoreOwnership(operator, eventItem.getStore().getId());
		applyEventHighlights(eventItem, request.highlightSummary(), request.highlightTags());
		return EventItemResponse.from(eventItemRepository.save(eventItem));
	}

	@Transactional
	public MessageResponse deleteEvent(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		EventItem eventItem = findEvent(id);
		validateStoreOwnership(operator, eventItem.getStore().getId());
		deleteEventInternal(id);
		return new MessageResponse("Event deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<CategoryResponse> listCategories(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<Category> specification = categorySpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(
							root.join("store", JoinType.LEFT).get("id"),
							workingStoreId
					)
			);
		}
		return PageResponse.from(categoryRepository.findAll(specification, buildPageable(page, size))
				.map(CategoryResponse::from));
	}

	@Transactional(readOnly = true)
	public CategoryResponse getCategory(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Category category = findCategory(id);
		validateStoreOwnership(operator, category.getStore().getId());
		return CategoryResponse.from(category);
	}

	@Transactional
	public CategoryResponse createCategory(String authorizationHeader, CategoryRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateStoreOwnership(operator, request.storeId());
		Category category = new Category();
		applyCategoryRequest(category, request);
		return CategoryResponse.from(categoryRepository.save(category));
	}

	@Transactional
	public CategoryResponse updateCategory(String authorizationHeader, Long id, CategoryRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Category category = findCategory(id);
		validateStoreOwnership(operator, category.getStore() != null ? category.getStore().getId() : null);
		validateStoreOwnership(operator, request.storeId());
		applyCategoryRequest(category, request);
		return CategoryResponse.from(categoryRepository.save(category));
	}

	@Transactional
	public MessageResponse deleteCategory(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Category category = findCategory(id);
		validateStoreOwnership(operator, category.getStore() != null ? category.getStore().getId() : null);
		deleteCategoryInternal(id);
		return new MessageResponse("Category deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<DishResponse> listDishes(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<Dish> specification = dishSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(
							root.join("category", JoinType.LEFT).join("store", JoinType.LEFT).get("id"),
							workingStoreId
					)
			);
		}
		return PageResponse.from(dishRepository.findAll(specification, buildPageable(page, size))
				.map(DishResponse::from));
	}

	@Transactional(readOnly = true)
	public DishResponse getDish(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Dish dish = findDish(id);
		validateStoreOwnership(operator, dish.getCategory().getStore().getId());
		return DishResponse.from(dish);
	}

	@Transactional
	public DishResponse createDish(String authorizationHeader, DishRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateStoreOwnership(operator, findCategory(request.categoryId()).getStore().getId());
		Dish dish = new Dish();
		applyDishRequest(dish, request);
		return DishResponse.from(dishRepository.save(dish));
	}

	@Transactional
	public DishResponse updateDish(String authorizationHeader, Long id, DishRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Dish dish = findDish(id);
		validateStoreOwnership(operator, dish.getCategory().getStore().getId());
		validateStoreOwnership(operator, findCategory(request.categoryId()).getStore().getId());
		applyDishRequest(dish, request);
		return DishResponse.from(dishRepository.save(dish));
	}

	@Transactional
	public DishResponse updateDishHighlights(String authorizationHeader, Long id, HighlightMetadataRequest request) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Dish dish = findDish(id);
		validateStoreOwnership(operator, dish.getCategory().getStore().getId());
		applyDishHighlights(dish, request.highlightSummary(), request.highlightTags());
		return DishResponse.from(dishRepository.save(dish));
	}

	@Transactional
	public MessageResponse deleteDish(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Dish dish = findDish(id);
		validateStoreOwnership(operator, dish.getCategory().getStore().getId());
		deleteDishInternal(id);
		return new MessageResponse("Dish deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<StoreDishResponse> listStoreDishes(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<StoreDish> specification = storeDishSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(
							root.join("store", JoinType.LEFT).get("id"),
							workingStoreId
					)
			);
		}
		return PageResponse.from(storeDishRepository.findAll(specification, buildPageable(page, size))
				.map(StoreDishResponse::from));
	}

	@Transactional(readOnly = true)
	public StoreDishResponse getStoreDish(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		StoreDish storeDish = findStoreDish(id);
		validateStoreOwnership(operator, storeDish.getStore().getId());
		return StoreDishResponse.from(storeDish);
	}

	@Transactional
	public StoreDishResponse createStoreDish(String authorizationHeader, StoreDishRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateStoreOwnership(operator, request.storeId());
		storeDishRepository.findByStoreIdAndDishId(request.storeId(), request.dishId())
				.ifPresent(existing -> {
					throw new ConflictException("Store dish already exists for this store and dish");
				});

		StoreDish storeDish = new StoreDish();
		applyStoreDishRequest(storeDish, request);
		return StoreDishResponse.from(storeDishRepository.save(storeDish));
	}

	@Transactional
	public StoreDishResponse updateStoreDish(String authorizationHeader, Long id, StoreDishRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		StoreDish storeDish = findStoreDish(id);
		validateStoreOwnership(operator, storeDish.getStore().getId());
		validateStoreOwnership(operator, request.storeId());
		storeDishRepository.findByStoreIdAndDishId(request.storeId(), request.dishId())
				.filter(existing -> !existing.getId().equals(id))
				.ifPresent(existing -> {
					throw new ConflictException("Store dish already exists for this store and dish");
				});

		applyStoreDishRequest(storeDish, request);
		return StoreDishResponse.from(storeDishRepository.save(storeDish));
	}

	@Transactional
	public MessageResponse deleteStoreDish(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		StoreDish storeDish = findStoreDish(id);
		validateStoreOwnership(operator, storeDish.getStore().getId());
		storeDishRepository.deleteById(id);
		return new MessageResponse("Store dish deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<ReviewResponse> listReviews(String authorizationHeader, int page, int size, String search) {
		sessionAuthService.requireAdminOrManager(authorizationHeader);
		return PageResponse.from(reviewRepository.findAll(reviewSpecification(search), buildPageable(page, size))
				.map(review -> ReviewResponse.from(
						review,
						resolveTargetSlug(review.getTargetType(), review.getTargetId()),
						resolveTargetLabel(review.getTargetType(), review.getTargetId()),
						resolveTargetImagePaths(review.getTargetType(), review.getTargetId())
				)));
	}

	@Transactional(readOnly = true)
	public ReviewResponse getReview(String authorizationHeader, Long id) {
		sessionAuthService.requireAdminOrManager(authorizationHeader);
		Review review = findReview(id);
		if (!ReviewTargetSupport.isSupported(review.getTargetType())) {
			throw new NotFoundException("Review not found");
		}
		return ReviewResponse.from(
				review,
				resolveTargetSlug(review.getTargetType(), review.getTargetId()),
				resolveTargetLabel(review.getTargetType(), review.getTargetId()),
				resolveTargetImagePaths(review.getTargetType(), review.getTargetId())
		);
	}

	@Transactional
	public ReviewResponse createReview(String authorizationHeader, ReviewRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		Review review = new Review();
		applyReviewRequest(review, request);
		Review savedReview = reviewRepository.save(review);
		return ReviewResponse.from(
				savedReview,
				resolveTargetSlug(savedReview.getTargetType(), savedReview.getTargetId()),
				resolveTargetLabel(savedReview.getTargetType(), savedReview.getTargetId()),
				resolveTargetImagePaths(savedReview.getTargetType(), savedReview.getTargetId())
		);
	}

	@Transactional
	public ReviewResponse updateReview(String authorizationHeader, Long id, ReviewRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		Review review = findReview(id);
		applyReviewRequest(review, request);
		Review savedReview = reviewRepository.save(review);
		return ReviewResponse.from(
				savedReview,
				resolveTargetSlug(savedReview.getTargetType(), savedReview.getTargetId()),
				resolveTargetLabel(savedReview.getTargetType(), savedReview.getTargetId()),
				resolveTargetImagePaths(savedReview.getTargetType(), savedReview.getTargetId())
		);
	}

	@Transactional
	public MessageResponse deleteReview(String authorizationHeader, Long id) {
		sessionAuthService.requireAdminOrManager(authorizationHeader);
		findReview(id);
		reviewRepository.deleteById(id);
		return new MessageResponse("Review deleted successfully");
	}

	@Transactional(readOnly = true)
	public PageResponse<NewsArticleResponse> listNews(String authorizationHeader, int page, int size, String search) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		Specification<NewsArticle> specification = newsSpecification(search);
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			specification = specification.and(
					(root, query, criteriaBuilder) -> criteriaBuilder.equal(
							root.join("relatedStore", JoinType.LEFT).get("id"),
							workingStoreId
					)
			);
		}
		return PageResponse.from(newsArticleRepository.findAll(specification, buildPageable(page, size))
				.map(NewsArticleResponse::from));
	}

	@Transactional(readOnly = true)
	public NewsArticleResponse getNews(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		NewsArticle newsArticle = findNews(id);
		validateRelatedStoreOwnership(operator, newsArticle.getRelatedStore());
		return NewsArticleResponse.from(newsArticle);
	}

	@Transactional
	public NewsArticleResponse createNews(String authorizationHeader, NewsArticleRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		validateNewsRequestAccess(operator, request.relatedStoreId());
		NewsArticle newsArticle = new NewsArticle();
		boolean wasPublic = isPublicNews(newsArticle);
		String normalizedSlug = resolveNormalizedNewsSlug(request);
		if (newsArticleRepository.existsBySlugIgnoreCase(normalizedSlug)) {
			throw new ConflictException("News slug is already in use");
		}
		applyNewsRequest(newsArticle, request, normalizedSlug);
		NewsArticle savedNews = newsArticleRepository.save(newsArticle);
		if (!wasPublic && isPublicNews(savedNews)) {
			notificationService.notifyPublishedNews(savedNews);
		}
		return NewsArticleResponse.from(savedNews);
	}

	@Transactional
	public NewsArticleResponse updateNews(String authorizationHeader, Long id, NewsArticleRequest request) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		NewsArticle newsArticle = findNews(id);
		validateRelatedStoreOwnership(operator, newsArticle.getRelatedStore());
		validateNewsRequestAccess(operator, request.relatedStoreId());
		boolean wasPublic = isPublicNews(newsArticle);
		String normalizedSlug = resolveNormalizedNewsSlug(request);
		if (newsArticleRepository.existsBySlugIgnoreCaseAndIdNot(normalizedSlug, id)) {
			throw new ConflictException("News slug is already in use");
		}
		applyNewsRequest(newsArticle, request, normalizedSlug);
		NewsArticle savedNews = newsArticleRepository.save(newsArticle);
		if (!wasPublic && isPublicNews(savedNews)) {
			notificationService.notifyPublishedNews(savedNews);
		}
		return NewsArticleResponse.from(savedNews);
	}

	@Transactional
	public MessageResponse deleteNews(String authorizationHeader, Long id) {
		User operator = requireAdminOrManagerOperator(authorizationHeader);
		NewsArticle newsArticle = findNews(id);
		validateRelatedStoreOwnership(operator, newsArticle.getRelatedStore());
		newsArticleRepository.deleteById(id);
		return new MessageResponse("News deleted successfully");
	}

	private List<AdminUserResponse> listUsersPreview(DashboardScope scope) {
		return userRepository.findAll(userPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(AdminUserResponse::from)
				.toList();
	}

	private List<StoreResponse> listStoresPreview(DashboardScope scope) {
		return storeRepository.findAll(storePreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(StoreResponse::from)
				.toList();
	}

	private List<EventItemResponse> listEventsPreview(DashboardScope scope) {
		return eventItemRepository.findAll(eventPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(EventItemResponse::from)
				.toList();
	}

	private List<CategoryResponse> listCategoriesPreview(DashboardScope scope) {
		return categoryRepository.findAll(categoryPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(CategoryResponse::from)
				.toList();
	}

	private List<DishResponse> listDishesPreview(DashboardScope scope) {
		return dishRepository.findAll(dishPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(DishResponse::from)
				.toList();
	}

	private List<StoreDishResponse> listStoreDishesPreview(DashboardScope scope) {
		return storeDishRepository.findAll(storeDishPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(StoreDishResponse::from)
				.toList();
	}

	private List<OrderResponse> listOrdersPreview(DashboardScope scope) {
		return orderRepository.findAll(orderPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(this::toOrderPreview)
				.toList();
	}

	private List<ReviewResponse> listReviewsPreview(DashboardScope scope) {
		return reviewRepository.findAll(reviewPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.filter(review -> ReviewTargetSupport.isSupported(review.getTargetType()))
				.map(review -> ReviewResponse.from(
						review,
						resolveTargetSlug(review.getTargetType(), review.getTargetId()),
						resolveTargetLabel(review.getTargetType(), review.getTargetId()),
						resolveTargetImagePaths(review.getTargetType(), review.getTargetId())
				))
				.toList();
	}

	private List<CustomerFeedbackResponse> listFeedbacksPreview(DashboardScope scope) {
		return customerFeedbackRepository.findAll(feedbackPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(CustomerFeedbackResponse::from)
				.toList();
	}

	private List<PromotionResponse> listPromotionsPreview(DashboardScope scope) {
		if (scope.storeScoped()) {
			return List.of();
		}
		return promotionRepository.findAll(buildPreviewPageable())
				.stream()
				.map(PromotionResponse::from)
				.toList();
	}

	private List<NewsArticleResponse> listNewsPreview(DashboardScope scope) {
		return newsArticleRepository.findAll(newsPreviewSpecification(scope), buildPreviewPageable())
				.stream()
				.map(NewsArticleResponse::from)
				.toList();
	}

	private User requireAdminOrManagerOperator(String authorizationHeader) {
		return sessionAuthService.requireAdminOrManager(authorizationHeader);
	}

	private DashboardScope resolveDashboardScope(User operator, Long requestedStoreId) {
		if (operator.getRole() == Role.MANAGER) {
			Long workingStoreId = requireManagerWorkingStoreId(operator);
			if (requestedStoreId != null && !Objects.equals(workingStoreId, requestedStoreId)) {
				throw new ForbiddenException("Manager dashboard is limited to the assigned working store");
			}
			Store store = findStore(workingStoreId);
			return new DashboardScope(store.getId(), store.getName(), true);
		}

		if (requestedStoreId == null) {
			return new DashboardScope(null, "All stores", false);
		}

		Store store = findStore(requestedStoreId);
		return new DashboardScope(store.getId(), store.getName(), true);
	}

	private List<AdminTopSellingDishResponse> buildTopSellingDishes(DashboardScope scope) {
		List<OrderItemRepository.TopSellingDishProjection> projections = scope.storeScoped()
				? orderItemRepository.findTopSellingDishStatsByStoreId(scope.storeId(), buildTopSellingPageable())
				: orderItemRepository.findTopSellingDishStats(buildTopSellingPageable());
		if (projections.isEmpty()) {
			return List.of();
		}

		Map<Long, List<String>> dishImagePathsById = new HashMap<>();
		List<Long> dishIds = projections.stream()
				.map(OrderItemRepository.TopSellingDishProjection::getDishId)
				.filter(Objects::nonNull)
				.distinct()
				.toList();
		for (Dish dish : dishRepository.findAllById(dishIds)) {
			dishImagePathsById.put(dish.getId(), List.copyOf(dish.getImagePaths()));
		}

		return projections.stream()
				.map(projection -> new AdminTopSellingDishResponse(
						projection.getStoreId(),
						projection.getStoreName(),
						projection.getDishId(),
						projection.getDishName(),
						dishImagePathsById.getOrDefault(projection.getDishId(), List.of()),
						projection.getQuantitySold() == null ? 0L : projection.getQuantitySold(),
						projection.getOrderCount() == null ? 0L : projection.getOrderCount(),
						projection.getRevenue() == null ? BigDecimal.ZERO : projection.getRevenue()
				))
				.toList();
	}

	private AdminRevenueSummaryResponse buildRevenueSummary(DashboardScope scope) {
		LocalDate today = LocalDate.now(zoneId);
		Instant todayStart = startOfDay(today);
		Instant tomorrowStart = startOfDay(today.plusDays(1));
		Instant weekStart = startOfDay(today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
		Instant monthStart = startOfDay(today.withDayOfMonth(1));
		Instant yearStart = startOfDay(today.withDayOfYear(1));
		return new AdminRevenueSummaryResponse(
				scope.storeId(),
				scope.scopeStoreName(),
				sumPaidRevenue(scope.storeId(), todayStart, tomorrowStart),
				sumPaidRevenue(scope.storeId(), weekStart, tomorrowStart),
				sumPaidRevenue(scope.storeId(), monthStart, tomorrowStart),
				sumPaidRevenue(scope.storeId(), yearStart, tomorrowStart)
		);
	}

	private Instant startOfDay(LocalDate date) {
		return date.atStartOfDay(zoneId).toInstant();
	}

	private BigDecimal sumPaidRevenue(Long storeId, Instant start, Instant end) {
		return storeId == null
				? orderRepository.sumPaidTotalAmountBetween(start, end)
				: orderRepository.sumPaidTotalAmountByStoreIdBetween(storeId, start, end);
	}

	private long countUsers(DashboardScope scope) {
		return userRepository.count(userPreviewSpecification(scope));
	}

	private long countStores(DashboardScope scope) {
		return storeRepository.count(storePreviewSpecification(scope));
	}

	private long countEvents(DashboardScope scope) {
		return eventItemRepository.count(eventPreviewSpecification(scope));
	}

	private long countCategories(DashboardScope scope) {
		return categoryRepository.count(categoryPreviewSpecification(scope));
	}

	private long countDishes(DashboardScope scope) {
		return dishRepository.count(dishPreviewSpecification(scope));
	}

	private long countStoreDishes(DashboardScope scope) {
		return storeDishRepository.count(storeDishPreviewSpecification(scope));
	}

	private long countPromotions(DashboardScope scope) {
		return scope.storeScoped() ? 0 : promotionRepository.count();
	}

	private long countOrders(DashboardScope scope) {
		return orderRepository.count(orderPreviewSpecification(scope));
	}

	private long countReviews(DashboardScope scope) {
		return reviewRepository.count(reviewPreviewSpecification(scope));
	}

	private long countNews(DashboardScope scope) {
		return newsArticleRepository.count(newsPreviewSpecification(scope));
	}

	private Pageable buildPreviewPageable() {
		return PageRequest.of(0, DEFAULT_PAGE_SIZE, DEFAULT_SORT);
	}

	private Pageable buildTopSellingPageable() {
		return PageRequest.of(0, DEFAULT_PAGE_SIZE);
	}

	private Specification<User> userPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.and(
				criteriaBuilder.equal(root.join("workingStore", JoinType.LEFT).get("id"), scope.storeId()),
				root.get("role").in(MANAGED_EMPLOYEE_ROLES)
		);
	}

	private Specification<Store> storePreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"), scope.storeId());
	}

	private Specification<EventItem> eventPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("store", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<Category> categoryPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("store", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<Dish> dishPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("category", JoinType.LEFT).join("store", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<StoreDish> storeDishPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("store", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<Order> orderPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> {
			Subquery<Long> subquery = query.subquery(Long.class);
			Root<OrderItem> orderItem = subquery.from(OrderItem.class);
			subquery.select(orderItem.get("id"))
					.where(
							criteriaBuilder.equal(orderItem.get("order"), root),
							criteriaBuilder.equal(orderItem.get("store").get("id"), scope.storeId())
					);
			return criteriaBuilder.exists(subquery);
		};
	}

	private Specification<CustomerFeedback> feedbackPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("relatedStore", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<NewsArticle> newsPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();
		}
		return (root, query, criteriaBuilder) -> criteriaBuilder.equal(
				root.join("relatedStore", JoinType.LEFT).get("id"),
				scope.storeId()
		);
	}

	private Specification<Review> reviewPreviewSpecification(DashboardScope scope) {
		if (!scope.storeScoped()) {
			return (root, query, criteriaBuilder) -> {
				if (query != null) {
					query.distinct(true);
				}
				return root.get("targetType").in(ReviewTargetSupport.supportedTypes());
			};
		}

		List<Long> eventIds = eventItemRepository.findAll(eventPreviewSpecification(scope))
				.stream()
				.map(EventItem::getId)
				.toList();
		List<Long> dishIds = dishRepository.findAll(dishPreviewSpecification(scope))
				.stream()
				.map(Dish::getId)
				.toList();

		return (root, query, criteriaBuilder) -> {
			if (query != null) {
				query.distinct(true);
			}
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(criteriaBuilder.and(
					criteriaBuilder.equal(root.get("targetType"), ReviewTargetType.STORE),
					criteriaBuilder.equal(root.get("targetId"), scope.storeId())
			));
			if (!eventIds.isEmpty()) {
				predicates.add(criteriaBuilder.and(
						criteriaBuilder.equal(root.get("targetType"), ReviewTargetType.EVENT),
						root.get("targetId").in(eventIds)
				));
			}
			if (!dishIds.isEmpty()) {
				predicates.add(criteriaBuilder.and(
						criteriaBuilder.equal(root.get("targetType"), ReviewTargetType.DISH),
						root.get("targetId").in(dishIds)
				));
			}
			return criteriaBuilder.and(
					root.get("targetType").in(ReviewTargetSupport.supportedTypes()),
					criteriaBuilder.or(predicates.toArray(Predicate[]::new))
			);
		};
	}

	private record DashboardScope(Long storeId, String scopeStoreName, boolean storeScoped) {
	}

	private OrderResponse toOrderPreview(Order order) {
		List<OrderItemResponse> items = orderItemRepository.findAllByOrderId(order.getId()).stream()
				.map(OrderItemResponse::from)
				.toList();
		OrderItemResponse firstItem = items.isEmpty() ? null : items.get(0);
		boolean invoiceAvailable = order.getInvoiceNumber() != null
				&& !order.getInvoiceNumber().isBlank()
				&& order.getInvoiceIssuedAt() != null
				&& order.getInvoiceQrToken() != null
				&& !order.getInvoiceQrToken().isBlank();
		String invoicePreviewUrl = invoiceAvailable ? "/api/public/order-qr/" + order.getInvoiceQrToken() : null;
		String invoiceDownloadUrl = invoiceAvailable ? invoicePreviewUrl + "?download=true" : null;
		return new OrderResponse(
				order.getId(),
				order.getUser() != null ? order.getUser().getId() : null,
				firstItem != null ? firstItem.storeId() : null,
				firstItem != null ? firstItem.storeSlug() : null,
				firstItem != null ? firstItem.storeName() : null,
				order.getStatus(),
				order.getPaymentStatus(),
				order.getPaymentProvider(),
				order.getPayosOrderCode(),
				order.getPaymentLinkId(),
				order.getPaymentCheckoutUrl(),
				order.getPaymentQrCode(),
				order.getPaymentExpiresAt(),
				order.getPaidAt(),
				order.getPaymentReference(),
				order.getSubtotalAmount(),
				order.getDiscountAmount(),
				order.getTotalAmount(),
				order.getPromotionCode(),
				order.getPromotionScope(),
				order.getPromotionEligibleAmount(),
				List.copyOf(order.getPromotionDishIds()),
				order.getDeliveryType(),
				order.getScheduledDeliveryAt(),
				order.getDeliveryFullName(),
				order.getDeliveryPhoneNumber(),
				order.getDeliveryAddress(),
				order.getConfirmedByUser() != null ? order.getConfirmedByUser().getId() : null,
				order.getConfirmedByUser() != null ? order.getConfirmedByUser().getFullName() : null,
				order.getConfirmedByUser() != null && order.getConfirmedByUser().getRole() != null ? order.getConfirmedByUser().getRole().name() : null,
				order.getConfirmedAt(),
				order.getPreparingStaff() != null ? order.getPreparingStaff().getId() : null,
				order.getPreparingStaff() != null ? order.getPreparingStaff().getFullName() : null,
				order.getDeliveringShipper() != null ? order.getDeliveringShipper().getId() : null,
				order.getDeliveringShipper() != null ? order.getDeliveringShipper().getFullName() : null,
				invoiceAvailable,
				invoiceAvailable ? order.getId() : null,
				order.getInvoiceNumber(),
				order.getInvoiceIssuedAt(),
				invoiceDownloadUrl,
				invoicePreviewUrl,
				order.getInvoiceQrToken(),
				order.getDeliveryProofImagePath(),
				order.getDeliveryProofCapturedAt(),
				order.getDeliveryProofUploadedAt(),
				order.getDeliveryProofNote(),
				List.<OrderAllowedAction>of(),
				order.getStatus() != null ? order.getStatus().name() : "UNKNOWN",
				items,
				order.getCreatedAt(),
				order.getUpdatedAt()
		);
	}

	private User findUser(Long id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("User not found"));
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

	private NewsArticle findNews(Long id) {
		return newsArticleRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("News not found"));
	}

	private Review findReview(Long id) {
		return reviewRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Review not found"));
	}

	private StoreDish findStoreDish(Long id) {
		return storeDishRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Store dish not found"));
	}

	private Pageable buildPageable(int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		return PageRequest.of(resolvedPage, resolvedSize, DEFAULT_SORT);
	}

	private Specification<User> userSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<User, Store> workingStore = root.join("workingStore", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("fullName"),
					root.get("email"),
					root.get("role"),
					root.get("enabled"),
					root.get("verifiedAt"),
					root.get("createdAt"),
					root.get("updatedAt"),
					workingStore.get("id"),
					workingStore.get("name"),
					workingStore.get("description"),
					workingStore.get("address"),
					workingStore.get("contactEmail"),
					workingStore.get("phoneNumber"),
					workingStore.get("active"),
					workingStore.get("createdAt"),
					workingStore.get("updatedAt")
			);
		};
	}

	private Specification<Store> storeSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<Store, String> imagePaths = root.join("imagePaths", JoinType.LEFT);
			Join<Store, String> highlightTags = root.join("highlightTags", JoinType.LEFT);
			Join<Store, String> serviceTags = root.join("serviceTags", JoinType.LEFT);
			Join<Store, ContentSection> sections = root.join("sections", JoinType.LEFT);
			Join<ContentSection, String> sectionImagePaths = sections.join("imagePaths", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("slug"),
					root.get("name"),
					root.get("description"),
					root.get("address"),
					root.get("contactEmail"),
					root.get("phoneNumber"),
					root.get("latitude"),
					root.get("longitude"),
					root.get("area"),
					root.get("positionLabel"),
					root.get("hoursText"),
					root.get("openTime"),
					root.get("closeTime"),
					root.get("personality"),
					root.get("designSignature"),
					root.get("franchiseMood"),
					root.get("specialty"),
					root.get("highlightSummary"),
					root.get("active"),
					root.get("createdAt"),
					root.get("updatedAt"),
					imagePaths,
					highlightTags,
					serviceTags,
					sections.get("title"),
					sections.get("content"),
					sections.get("imagePath"),
					sectionImagePaths
			);
		};
	}

	private Specification<EventItem> eventSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<EventItem, Store> store = root.join("store", JoinType.LEFT);
			Join<EventItem, String> imagePaths = root.join("imagePaths", JoinType.LEFT);
			Join<EventItem, String> highlightTags = root.join("highlightTags", JoinType.LEFT);
			Join<EventItem, Long> featuredDishIds = root.join("featuredDishIds", JoinType.LEFT);
			Join<EventItem, ContentSection> sections = root.join("sections", JoinType.LEFT);
			Join<ContentSection, String> sectionImagePaths = sections.join("imagePaths", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("name"),
					root.get("slug"),
					root.get("description"),
					root.get("location"),
					root.get("scheduleText"),
					root.get("highlightSummary"),
					root.get("startsAt"),
					root.get("endsAt"),
					root.get("capacity"),
					root.get("bookedCount"),
					root.get("active"),
					root.get("createdAt"),
					root.get("updatedAt"),
					store.get("id"),
					store.get("slug"),
					store.get("name"),
					store.get("description"),
					store.get("address"),
					store.get("contactEmail"),
					store.get("phoneNumber"),
					store.get("active"),
					imagePaths,
					highlightTags,
					featuredDishIds,
					sections.get("title"),
					sections.get("content"),
					sections.get("imagePath"),
					sectionImagePaths
			);
		};
	}

	private Specification<Category> categorySpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<Category, Store> store = root.join("store", JoinType.LEFT);
			Join<Category, String> imagePaths = root.join("imagePaths", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("name"),
					root.get("description"),
					root.get("sortOrder"),
					root.get("active"),
					root.get("createdAt"),
					root.get("updatedAt"),
					store.get("id"),
					store.get("name"),
					store.get("description"),
					store.get("address"),
					store.get("contactEmail"),
					store.get("phoneNumber"),
					store.get("active"),
					imagePaths
			);
		};
	}

	private Specification<Dish> dishSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<Dish, Category> category = root.join("category", JoinType.LEFT);
			Join<Category, Store> store = category.join("store", JoinType.LEFT);
			Join<Dish, String> imagePaths = root.join("imagePaths", JoinType.LEFT);
			Join<Dish, String> highlightTags = root.join("highlightTags", JoinType.LEFT);
			Join<Dish, ContentSection> sections = root.join("sections", JoinType.LEFT);
			Join<ContentSection, String> sectionImagePaths = sections.join("imagePaths", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("name"),
					root.get("description"),
					root.get("note"),
					root.get("price"),
					root.get("status"),
					root.get("franchiseRequired"),
					root.get("franchiseNote"),
					root.get("highlightSummary"),
					root.get("active"),
					root.get("available"),
					root.get("createdAt"),
					root.get("updatedAt"),
					category.get("id"),
					category.get("name"),
					category.get("description"),
					category.get("active"),
					store.get("id"),
					store.get("name"),
					store.get("description"),
					store.get("address"),
					store.get("contactEmail"),
					store.get("phoneNumber"),
					imagePaths,
					highlightTags,
					sections.get("title"),
					sections.get("content"),
					sections.get("imagePath"),
					sectionImagePaths
			);
		};
	}

	private Specification<NewsArticle> newsSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<NewsArticle, Store> relatedStore = root.join("relatedStore", JoinType.LEFT);
			Join<NewsArticle, String> tags = root.join("tags", JoinType.LEFT);
			Join<NewsArticle, String> imagePaths = root.join("imagePaths", JoinType.LEFT);
			Join<NewsArticle, ContentSection> sections = root.join("sections", JoinType.LEFT);
			Join<ContentSection, String> sectionImagePaths = sections.join("imagePaths", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("title"),
					root.get("slug"),
					root.get("summary"),
					root.get("content"),
					root.get("featured"),
					root.get("published"),
					root.get("publishedAt"),
					root.get("createdAt"),
					root.get("updatedAt"),
					tags,
					imagePaths,
					relatedStore.get("id"),
					relatedStore.get("slug"),
					relatedStore.get("name"),
					relatedStore.get("address"),
					relatedStore.get("area"),
					sections.get("title"),
					sections.get("content"),
					sections.get("imagePath"),
					sectionImagePaths
			);
		};
	}

	private Specification<Review> reviewSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		List<Long> matchingStoreIds = normalizedSearch == null ? List.of() : findMatchingIds(storeRepository, storeSpecification(search));
		List<Long> matchingEventIds = normalizedSearch == null ? List.of() : findMatchingIds(eventItemRepository, eventSpecification(search));
		List<Long> matchingDishIds = normalizedSearch == null ? List.of() : findMatchingIds(dishRepository, dishSpecification(search));

		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			Predicate supportedTargets = root.get("targetType").in(ReviewTargetSupport.supportedTypes());
			if (normalizedSearch == null) {
				return supportedTargets;
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<Review, User> user = root.join("user", JoinType.LEFT);
			List<Predicate> predicates = new ArrayList<>(List.of(
					likePredicate(criteriaBuilder, root.get("id"), likeValue),
					likePredicate(criteriaBuilder, root.get("targetType"), likeValue),
					likePredicate(criteriaBuilder, root.get("targetId"), likeValue),
					likePredicate(criteriaBuilder, root.get("rating"), likeValue),
					likePredicate(criteriaBuilder, root.get("title"), likeValue),
					likePredicate(criteriaBuilder, root.get("comment"), likeValue),
					likePredicate(criteriaBuilder, root.get("approved"), likeValue),
					likePredicate(criteriaBuilder, root.get("createdAt"), likeValue),
					likePredicate(criteriaBuilder, root.get("updatedAt"), likeValue),
					likePredicate(criteriaBuilder, user.get("id"), likeValue),
					likePredicate(criteriaBuilder, user.get("fullName"), likeValue),
					likePredicate(criteriaBuilder, user.get("email"), likeValue),
					likePredicate(criteriaBuilder, user.get("role"), likeValue)
			));
			addTargetMatchPredicate(predicates, criteriaBuilder, root, ReviewTargetType.STORE, matchingStoreIds);
			addTargetMatchPredicate(predicates, criteriaBuilder, root, ReviewTargetType.EVENT, matchingEventIds);
			addTargetMatchPredicate(predicates, criteriaBuilder, root, ReviewTargetType.DISH, matchingDishIds);
			return criteriaBuilder.and(
					supportedTargets,
					criteriaBuilder.or(predicates.toArray(Predicate[]::new))
			);
		};
	}

	private Specification<StoreDish> storeDishSpecification(String search) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			query.distinct(true);
			if (normalizedSearch == null) {
				return criteriaBuilder.conjunction();
			}

			String likeValue = toLikeValue(normalizedSearch);
			Join<StoreDish, Store> store = root.join("store", JoinType.LEFT);
			Join<StoreDish, Dish> dish = root.join("dish", JoinType.LEFT);
			Join<Dish, Category> category = dish.join("category", JoinType.LEFT);
			return likeAnyOf(
					criteriaBuilder,
					likeValue,
					root.get("id"),
					root.get("quantity"),
					root.get("available"),
					root.get("priceOverride"),
					root.get("createdAt"),
					root.get("updatedAt"),
					store.get("id"),
					store.get("name"),
					store.get("address"),
					store.get("area"),
					dish.get("id"),
					dish.get("name"),
					dish.get("description"),
					dish.get("status"),
					category.get("id"),
					category.get("name")
			);
		};
	}

	private <T> List<Long> findMatchingIds(
			org.springframework.data.jpa.repository.JpaSpecificationExecutor<T> repository,
			Specification<T> specification
	) {
		return repository.findAll(specification)
				.stream()
				.map(entity -> {
					if (entity instanceof Store store) {
						return store.getId();
					}
					if (entity instanceof EventItem eventItem) {
						return eventItem.getId();
					}
					if (entity instanceof Category category) {
						return category.getId();
					}
					if (entity instanceof Dish dish) {
						return dish.getId();
					}
					return null;
				})
				.filter(id -> id != null)
				.toList();
	}

	private void addTargetMatchPredicate(
			List<Predicate> predicates,
			CriteriaBuilder criteriaBuilder,
			Root<Review> root,
			ReviewTargetType targetType,
			List<Long> matchingTargetIds
	) {
		if (!matchingTargetIds.isEmpty()) {
			predicates.add(criteriaBuilder.and(
					criteriaBuilder.equal(root.get("targetType"), targetType),
					root.get("targetId").in(matchingTargetIds)
			));
		}
	}

	private Predicate likeAnyOf(CriteriaBuilder criteriaBuilder, String likeValue, Expression<?>... expressions) {
		List<Predicate> predicates = new ArrayList<>();
		for (Expression<?> expression : expressions) {
			predicates.add(likePredicate(criteriaBuilder, expression, likeValue));
		}
		return criteriaBuilder.or(predicates.toArray(Predicate[]::new));
	}

	private Predicate likePredicate(CriteriaBuilder criteriaBuilder, Expression<?> expression, String likeValue) {
		return criteriaBuilder.like(criteriaBuilder.lower(expression.as(String.class)), likeValue);
	}

	private String normalizeSearch(String search) {
		String normalized = trimToNull(search);
		return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
	}

	private String toLikeValue(String normalizedSearch) {
		return "%" + normalizedSearch + "%";
	}

	private void applyUserRequest(User user, AdminUserRequest request, String normalizedEmail, boolean creating) {
		user.setFullName(request.fullName().trim());
		user.setEmail(normalizedEmail);
		user.setRole(request.role());
		applyWorkingStore(user, request.role(), request.workingStoreId());
		user.setEnabled(request.enabled());

		if (creating && (request.password() == null || request.password().isBlank())) {
			throw new BadRequestException("password is required when creating a user");
		}

		if (request.password() != null && !request.password().isBlank()) {
			user.setPasswordHash(passwordEncoder.encode(request.password()));
		}

		if (!user.isEnabled()) {
			user.setVerifiedAt(null);
			if (user.getId() != null) {
				emailOtpRepository.deleteAllByUserId(user.getId());
				userSessionRepository.deleteAllByUserId(user.getId());
			}
		} else if (user.getVerifiedAt() == null) {
			user.setVerifiedAt(Instant.now());
		}
	}

	private void applyWorkingStore(User user, Role role, Long workingStoreId) {
		if (role.requiresWorkingStore()) {
			if (workingStoreId == null) {
				throw new BadRequestException("workingStoreId is required for MANAGER, SHIPPER, and STAFF");
			}
			user.setWorkingStore(findStore(workingStoreId));
			return;
		}

		user.setWorkingStore(null);
	}

	private void applyStoreRequest(Store store, StoreRequest request, String normalizedSlug) {
		store.setName(request.name().trim());
		store.setSlug(normalizedSlug);
		store.setDescription(trimToNull(request.description()));
		store.setAddress(trimToNull(request.address()));
		store.setContactEmail(trimToNull(request.contactEmail()));
		store.setPhoneNumber(trimToNull(request.phoneNumber()));
		store.setLatitude(request.latitude());
		store.setLongitude(request.longitude());
		store.setArea(trimToNull(request.area()));
		store.setPositionLabel(trimToNull(request.positionLabel()));
		store.setHoursText(trimToNull(request.hoursText()));
		store.setOpenTime(request.openTime());
		store.setCloseTime(request.closeTime());
		store.setPersonality(trimToNull(request.personality()));
		store.setDesignSignature(trimToNull(request.designSignature()));
		store.setFranchiseMood(trimToNull(request.franchiseMood()));
		store.setSpecialty(trimToNull(request.specialty()));
		applyStoreHighlights(store, request.highlightSummary(), request.highlightTags());
		store.setServiceTags(normalizeTags(request.serviceTags()));
		store.setImagePaths(normalizeImagePaths(request.imagePaths()));
		store.setSections(normalizeSections(request.sections()));
		store.setActive(request.active());
	}

	private String resolveNormalizedStoreSlug(StoreRequest request) {
		String requestedSlug = trimToNull(request.slug());
		String normalizedSlug = StoreSlugNormalizer.normalize(requestedSlug != null ? requestedSlug : request.name());
		if (normalizedSlug == null) {
			throw new BadRequestException("slug is required and must contain only letters, numbers, or hyphens");
		}
		return normalizedSlug;
	}

	private void applyEventRequest(EventItem eventItem, EventItemRequest request, String normalizedSlug) {
		eventItem.setStore(findStore(request.storeId()));
		eventItem.setName(request.name().trim());
		eventItem.setSlug(normalizedSlug);
		eventItem.setDescription(trimToNull(request.description()));
		eventItem.setLocation(trimToNull(request.location()));
		eventItem.setScheduleText(trimToNull(request.scheduleText()));
		applyEventHighlights(eventItem, request.highlightSummary(), request.highlightTags());
		eventItem.setImagePaths(normalizeImagePaths(request.imagePaths()));
		eventItem.setSections(normalizeSections(request.sections()));
		eventItem.setStartsAt(request.startsAt());
		eventItem.setEndsAt(request.endsAt());
		eventItem.setCapacity(request.capacity());
		eventItem.setBookedCount(request.bookedCount() == null ? 0 : request.bookedCount());
		eventItem.setFeaturedDishIds(normalizeLongList(request.featuredDishIds()));
		eventItem.setActive(request.active());
	}

	private String resolveNormalizedEventSlug(EventItemRequest request) {
		String requestedSlug = trimToNull(request.slug());
		String normalizedSlug = EventSlugNormalizer.normalize(requestedSlug != null ? requestedSlug : request.name());
		if (normalizedSlug == null) {
			throw new BadRequestException("slug is required and must contain only letters, numbers, or hyphens");
		}
		return normalizedSlug;
	}

	private void applyCategoryRequest(Category category, CategoryRequest request) {
		category.setStore(request.storeId() == null ? null : findStore(request.storeId()));
		category.setName(request.name().trim());
		category.setDescription(trimToNull(request.description()));
		category.setImagePaths(normalizeImagePaths(request.imagePaths()));
		category.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
		category.setActive(request.active());
	}

	private void applyDishRequest(Dish dish, DishRequest request) {
		dish.setCategory(findCategory(request.categoryId()));
		dish.setName(request.name().trim());
		dish.setDescription(trimToNull(request.description()));
		dish.setNote(trimToNull(request.note()));
		dish.setPrice(request.price());
		dish.setStatus(trimToNull(request.status()) == null ? "ACTIVE" : trimToNull(request.status()));
		dish.setAvailable(request.available() == null || request.available());
		dish.setFranchiseRequired(request.franchiseRequired() != null && request.franchiseRequired());
		dish.setFranchiseNote(trimToNull(request.franchiseNote()));
		applyDishHighlights(dish, request.highlightSummary(), request.highlightTags());
		dish.setActive(request.active() == null || request.active());
		dish.setImagePaths(normalizeImagePaths(request.imagePaths()));
		dish.setSections(normalizeSections(request.sections()));
	}

	private void applyNewsRequest(NewsArticle newsArticle, NewsArticleRequest request, String normalizedSlug) {
		newsArticle.setTitle(request.title().trim());
		newsArticle.setSlug(normalizedSlug);
		newsArticle.setSummary(request.summary().trim());
		newsArticle.setContent(request.content().trim());
		newsArticle.setRelatedStore(request.relatedStoreId() == null ? null : findStore(request.relatedStoreId()));
		newsArticle.setTags(normalizeTags(request.tags()));
		newsArticle.setImagePaths(normalizeImagePaths(request.imagePaths()));
		newsArticle.setSections(normalizeSections(request.sections()));
		newsArticle.setFeatured(Boolean.TRUE.equals(request.featured()));
		newsArticle.setPublished(Boolean.TRUE.equals(request.published()));
		Instant publishedAt = request.publishedAt();
		if (newsArticle.isPublished() && publishedAt == null) {
			publishedAt = newsArticle.getPublishedAt() != null ? newsArticle.getPublishedAt() : Instant.now();
		}
		newsArticle.setPublishedAt(publishedAt);
	}

	private boolean isPublicNews(NewsArticle newsArticle) {
		return newsArticle != null
				&& newsArticle.isPublished()
				&& newsArticle.getPublishedAt() != null
				&& !newsArticle.getPublishedAt().isAfter(Instant.now());
	}

	private void applyStoreHighlights(Store store, String highlightSummary, List<String> highlightTags) {
		store.setHighlightSummary(trimToNull(highlightSummary));
		store.setHighlightTags(normalizeHighlightTags(highlightTags));
	}

	private void applyEventHighlights(EventItem eventItem, String highlightSummary, List<String> highlightTags) {
		eventItem.setHighlightSummary(trimToNull(highlightSummary));
		eventItem.setHighlightTags(normalizeHighlightTags(highlightTags));
	}

	private void applyDishHighlights(Dish dish, String highlightSummary, List<String> highlightTags) {
		dish.setHighlightSummary(trimToNull(highlightSummary));
		dish.setHighlightTags(normalizeHighlightTags(highlightTags));
	}

	private String resolveNormalizedNewsSlug(NewsArticleRequest request) {
		String requestedSlug = trimToNull(request.slug());
		String normalizedSlug = NewsSlugNormalizer.normalize(requestedSlug != null ? requestedSlug : request.title());
		if (normalizedSlug == null) {
			throw new BadRequestException("slug is required and must contain only letters, numbers, or hyphens");
		}
		return normalizedSlug;
	}

	private void applyStoreDishRequest(StoreDish storeDish, StoreDishRequest request) {
		storeDish.setStore(findStore(request.storeId()));
		storeDish.setDish(findDish(request.dishId()));
		storeDish.setQuantity(request.quantity());
		storeDish.setAvailable(request.available());
		storeDish.setPriceOverride(request.priceOverride());
	}

	private void applyReviewRequest(Review review, ReviewRequest request) {
		ReviewTargetSupport.requireSupported(request.targetType());
		User user = findUser(request.userId());
		validateReviewAuthor(user);
		validateReviewTarget(request.targetType(), request.targetId());

		review.setUser(user);
		review.setTargetType(request.targetType());
		review.setTargetId(request.targetId());
		review.setRating(request.rating());
		review.setTitle(trimToNull(request.title()));
		review.setComment(trimToNull(request.comment()));
		review.setApproved(request.approved());
	}

	private void validateEventTime(EventItemRequest request) {
		if (request.endsAt().isBefore(request.startsAt())) {
			throw new BadRequestException("endsAt must be after startsAt");
		}
		if (request.capacity() != null && request.capacity() < 0) {
			throw new BadRequestException("capacity must be non-negative");
		}
		if (request.bookedCount() != null && request.bookedCount() < 0) {
			throw new BadRequestException("bookedCount must be non-negative");
		}
		if (request.capacity() != null && request.bookedCount() != null && request.bookedCount() > request.capacity()) {
			throw new BadRequestException("bookedCount must not exceed capacity");
		}
		for (Long featuredDishId : normalizeLongList(request.featuredDishIds())) {
			findDish(featuredDishId);
		}
	}

	private void validateReviewTarget(ReviewTargetType targetType, Long targetId) {
		ReviewTargetSupport.requireSupported(targetType);
		switch (targetType) {
			case STORE -> findStore(targetId);
			case EVENT -> findEvent(targetId);
			case DISH -> findDish(targetId);
			case CATEGORY -> throw new BadRequestException("CATEGORY reviews are no longer supported");
		}
	}

	private void validateReviewAuthor(User user) {
		if (user.getRole() != Role.USER) {
			throw new BadRequestException("Reviews can only be created for USER accounts");
		}
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

	private void deleteEventInternal(Long id) {
		findEvent(id);
		reviewRepository.deleteAllByTargetTypeAndTargetId(ReviewTargetType.EVENT, id);
		favoriteRepository.deleteAllByTargetTypeAndTargetId(FavoriteTargetType.EVENT, id);
		eventItemRepository.deleteById(id);
	}

	private void deleteCategoryInternal(Long id) {
		findCategory(id);
		dishRepository.findAllByCategoryId(id).forEach(dish -> deleteDishInternal(dish.getId()));
		reviewRepository.deleteAllByTargetTypeAndTargetId(ReviewTargetType.CATEGORY, id);
		categoryRepository.deleteById(id);
	}

	private void deleteDishInternal(Long id) {
		findDish(id);
		if (orderItemRepository.countByDishId(id) > 0) {
			throw new ConflictException("Dish has order history. Keep it for historical orders.");
		}
		reviewRepository.deleteAllByTargetTypeAndTargetId(ReviewTargetType.DISH, id);
		favoriteRepository.deleteAllByTargetTypeAndTargetId(FavoriteTargetType.DISH, id);
		storeDishRepository.deleteAllByDishId(id);
		cartItemRepository.deleteAllByDishId(id);
		dishRepository.deleteById(id);
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private List<String> normalizeImagePaths(List<String> imagePaths) {
		if (imagePaths == null || imagePaths.isEmpty()) {
			return List.of();
		}

		List<String> normalized = new ArrayList<>();
		for (String imagePath : imagePaths) {
			String trimmed = trimToNull(imagePath);
			if (trimmed != null) {
				normalized.add(trimmed);
			}
		}
		return normalized;
	}

	private List<ContentSection> normalizeSections(List<ContentSectionRequest> requests) {
		if (requests == null || requests.isEmpty()) {
			return List.of();
		}

		List<ContentSection> normalized = new ArrayList<>();
		for (ContentSectionRequest request : requests) {
			if (request == null) {
				continue;
			}

			String title = trimToNull(request.title());
			String content = trimToNull(request.content());
			if (title == null || content == null) {
				throw new BadRequestException("Each section must include a title and content");
			}

			ContentSection section = new ContentSection();
			section.setTitle(title);
			section.setContent(content);
			section.setImagePaths(resolveSectionImagePaths(request));
			normalized.add(section);
		}
		return normalized;
	}

	private List<String> resolveSectionImagePaths(ContentSectionRequest request) {
		if (request == null) {
			return List.of();
		}
		List<String> normalizedImagePaths = normalizeImagePaths(request.imagePaths());
		if (!normalizedImagePaths.isEmpty()) {
			return normalizedImagePaths;
		}
		String legacyImagePath = trimToNull(request.imagePath());
		return legacyImagePath == null ? List.of() : List.of(legacyImagePath);
	}

	private List<String> normalizeTags(List<String> values) {
		return normalizeImagePaths(values);
	}

	private List<String> normalizeHighlightTags(List<String> values) {
		return normalizeImagePaths(values);
	}

	private List<Long> normalizeLongList(List<Long> values) {
		if (values == null || values.isEmpty()) {
			return List.of();
		}
		return values.stream()
				.filter(Objects::nonNull)
				.distinct()
				.toList();
	}

	private void validateStoreOwnership(User operator, Long storeId) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		if (!Objects.equals(requireManagerWorkingStoreId(operator), storeId)) {
			throw new ForbiddenException("Resource does not belong to your store");
		}
	}

	private void validateUserManagementRequest(User operator, AdminUserRequest request) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		if (request.role() != Role.STAFF && request.role() != Role.SHIPPER) {
			throw new ForbiddenException("Manager can only create or update STAFF and SHIPPER accounts");
		}
		if (!Objects.equals(requireManagerWorkingStoreId(operator), request.workingStoreId())) {
			throw new ForbiddenException("Manager can only assign employees to their own store");
		}
	}

	private void validateManagedUserAccess(User operator, User managedUser) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		if (managedUser.getRole() != Role.STAFF && managedUser.getRole() != Role.SHIPPER) {
			throw new ForbiddenException("Manager can only manage STAFF and SHIPPER accounts");
		}
		if (managedUser.getWorkingStore() == null || managedUser.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Managed user does not belong to your store");
		}
		if (!Objects.equals(requireManagerWorkingStoreId(operator), managedUser.getWorkingStore().getId())) {
			throw new ForbiddenException("Managed user does not belong to your store");
		}
	}

	private void validateRelatedStoreOwnership(User operator, Store relatedStore) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		if (relatedStore == null || relatedStore.getId() == null) {
			throw new ForbiddenException("News article does not belong to your store");
		}
		validateStoreOwnership(operator, relatedStore.getId());
	}

	private void validateNewsRequestAccess(User operator, Long relatedStoreId) {
		if (operator.getRole() != Role.MANAGER) {
			return;
		}
		if (relatedStoreId == null) {
			throw new ForbiddenException("Manager can only manage news linked to their store");
		}
		validateStoreOwnership(operator, relatedStoreId);
	}

	private Long requireManagerWorkingStoreId(User operator) {
		if (operator.getWorkingStore() == null || operator.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Manager account must be assigned to a working store");
		}
		return operator.getWorkingStore().getId();
	}
}
