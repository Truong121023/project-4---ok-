package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.CategoryResponse;
import com.example.registrationotp.dto.ContentSectionResponse;
import com.example.registrationotp.dto.DishResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.PublicBestStoreResponse;
import com.example.registrationotp.dto.PublicDishCardResponse;
import com.example.registrationotp.dto.PublicDishDetailResponse;
import com.example.registrationotp.dto.PublicDishStatsResponse;
import com.example.registrationotp.dto.PublicEventCardResponse;
import com.example.registrationotp.dto.PublicHomeResponse;
import com.example.registrationotp.dto.PublicNewsCardResponse;
import com.example.registrationotp.dto.PublicNewsDetailResponse;
import com.example.registrationotp.dto.PublicReviewItemResponse;
import com.example.registrationotp.dto.PublicStoreCardResponse;
import com.example.registrationotp.dto.PublicStoreDetailResponse;
import com.example.registrationotp.dto.PublicStoreLocationResponse;
import com.example.registrationotp.dto.PublicStoreStatsResponse;
import com.example.registrationotp.dto.StoreResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.ContentSection;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.EventItemRepository;
import com.example.registrationotp.repository.FavoriteRepository;
import com.example.registrationotp.repository.NewsArticleRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.ReviewRepository;
import com.example.registrationotp.repository.CategoryRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.support.ReviewTargetSupport;

@Service
public class PublicService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final String BRAND_NAME = "Tea Matcha";
	private static final Locale VI_LOCALE = Locale.forLanguageTag("vi-VN");

	private final StoreRepository storeRepository;
	private final CategoryRepository categoryRepository;
	private final DishRepository dishRepository;
	private final EventItemRepository eventItemRepository;
	private final NewsArticleRepository newsArticleRepository;
	private final StoreDishRepository storeDishRepository;
	private final ReviewRepository reviewRepository;
	private final FavoriteRepository favoriteRepository;
	private final OrderItemRepository orderItemRepository;
	private final CatalogAvailabilityService catalogAvailabilityService;

	public PublicService(
			StoreRepository storeRepository,
			CategoryRepository categoryRepository,
			DishRepository dishRepository,
			EventItemRepository eventItemRepository,
			NewsArticleRepository newsArticleRepository,
			StoreDishRepository storeDishRepository,
			ReviewRepository reviewRepository,
			FavoriteRepository favoriteRepository,
			OrderItemRepository orderItemRepository,
			CatalogAvailabilityService catalogAvailabilityService
	) {
		this.storeRepository = storeRepository;
		this.categoryRepository = categoryRepository;
		this.dishRepository = dishRepository;
		this.eventItemRepository = eventItemRepository;
		this.newsArticleRepository = newsArticleRepository;
		this.storeDishRepository = storeDishRepository;
		this.reviewRepository = reviewRepository;
		this.favoriteRepository = favoriteRepository;
		this.orderItemRepository = orderItemRepository;
		this.catalogAvailabilityService = catalogAvailabilityService;
	}

	@Transactional(readOnly = true)
	public PublicHomeResponse home() {
		CatalogSnapshot snapshot = snapshot();

		List<PublicStoreCardResponse> featuredStores = storeRepository.findAll().stream()
				.map(store -> toStoreCard(store, null, null, snapshot))
				.sorted(Comparator.comparingDouble(PublicStoreCardResponse::averageRating).reversed()
						.thenComparing(Comparator.comparingLong(PublicStoreCardResponse::reviewCount).reversed())
						.thenComparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER))
				.limit(6)
				.toList();

		List<PublicDishCardResponse> featuredDishes = dishRepository.findAll().stream()
				.map(dish -> toDishCard(dish, null, null, snapshot))
				.sorted(Comparator.comparingDouble(PublicDishCardResponse::averageRating).reversed()
						.thenComparing(Comparator.comparingLong(PublicDishCardResponse::reviewCount).reversed())
						.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER))
				.limit(6)
				.toList();

		List<PublicEventCardResponse> upcomingEvents = eventItemRepository.findAll().stream()
				.filter(eventItem -> eventItem.getEndsAt() == null || !eventItem.getEndsAt().isBefore(Instant.now()))
				.map(eventItem -> toEventCard(eventItem, null, null, snapshot))
				.sorted(Comparator.comparing(PublicEventCardResponse::startsAt))
				.limit(6)
				.toList();

		List<PublicStoreLocationResponse> storeLocations = storeRepository.findAll().stream()
				.map(store -> new PublicStoreLocationResponse(
						store.getId(),
						store.getSlug(),
						store.getName(),
						store.getAddress(),
						store.getArea(),
						store.getLatitude(),
						store.getLongitude(),
						store.getPositionLabel()
				))
				.toList();

		List<PublicNewsCardResponse> latestNews = newsArticleRepository.findAll().stream()
				.filter(this::isPublicNews)
				.map(PublicNewsCardResponse::from)
				.sorted(newsComparator())
				.limit(6)
				.toList();

		return new PublicHomeResponse(BRAND_NAME, featuredStores, featuredDishes, upcomingEvents, storeLocations, latestNews);
	}

	@Transactional(readOnly = true)
	public PageResponse<PublicStoreCardResponse> listStores(
			String search,
			String sort,
			Double minRating,
			Double lat,
			Double lng,
			int page,
			int size
	) {
		CatalogSnapshot snapshot = snapshot();
		List<PublicStoreCardResponse> items = storeRepository.findAll().stream()
				.filter(store -> matchesStore(store, search))
				.map(store -> toStoreCard(store, lat, lng, snapshot))
				.filter(store -> minRating == null || store.averageRating() >= minRating)
				.sorted(storeComparator(sort))
				.toList();
		return paginate(items, page, size);
	}

	@Transactional(readOnly = true)
	public PublicStoreDetailResponse getStore(String storeKey) {
		CatalogSnapshot snapshot = snapshot();
		Store store = findPublicStoreByKey(storeKey);
		Long storeId = store.getId();

		List<StoreDish> storeDishes = snapshot.storeDishesByStoreId().getOrDefault(storeId, List.of());
		List<PublicStoreDetailResponse.CategorySection> categories = storeDishes.stream()
				.collect(Collectors.groupingBy(storeDish -> storeDish.getDish().getCategory().getId()))
				.values()
				.stream()
				.map(group -> toCategorySection(group, snapshot))
				.sorted(Comparator.comparingInt((PublicStoreDetailResponse.CategorySection section) -> {
					Category category = groupCategory(storeDishes, section.id());
					return category != null && category.getSortOrder() != null ? category.getSortOrder() : 0;
				}).thenComparing(PublicStoreDetailResponse.CategorySection::name, String.CASE_INSENSITIVE_ORDER))
				.toList();

		List<PublicEventCardResponse> events = eventItemRepository.findAllByStoreId(storeId).stream()
				.map(eventItem -> toEventCard(eventItem, null, null, snapshot))
				.sorted(Comparator.comparing(PublicEventCardResponse::startsAt))
				.toList();

		List<PublicReviewItemResponse> reviews = snapshot.reviewsByTarget()
				.getOrDefault(new TargetKey(ReviewTargetType.STORE, storeId), List.of())
				.stream()
				.sorted(reviewComparator("date_desc"))
				.toList();

		return new PublicStoreDetailResponse(
				StoreResponse.from(store),
				buildStoreStats(store, snapshot),
				categories,
				events,
				reviews
		);
	}

	@Transactional(readOnly = true)
	public PageResponse<PublicDishCardResponse> listDishes(
			String search,
			String sort,
			Double minRating,
			Long categoryId,
			Boolean franchiseRequired,
			Double lat,
			Double lng,
			int page,
			int size
	) {
		CatalogSnapshot snapshot = snapshot();
		List<PublicDishCardResponse> items = dishRepository.findAll().stream()
				.filter(dish -> categoryId == null || Objects.equals(dish.getCategory().getId(), categoryId))
				.filter(dish -> franchiseRequired == null || dish.isFranchiseRequired() == franchiseRequired)
				.filter(dish -> matchesDish(dish, search))
				.map(dish -> toDishCard(dish, lat, lng, snapshot))
				.filter(dish -> minRating == null || dish.averageRating() >= minRating)
				.sorted(dishComparator(sort))
				.toList();
		return paginate(items, page, size);
	}

	@Transactional(readOnly = true)
	public PublicDishDetailResponse getDish(Long dishId, Double lat, Double lng) {
		CatalogSnapshot snapshot = snapshot();
		Dish dish = dishRepository.findById(dishId)
				.orElseThrow(() -> new NotFoundException("Dish not found"));

		List<StoreDish> storeDishes = snapshot.storeDishesByDishId().getOrDefault(dishId, List.of());
		List<PublicDishDetailResponse.StoreAvailability> stores = storeDishes.stream()
				.map(storeDish -> {
					Store store = storeDish.getStore();
					boolean disabled = catalogAvailabilityService.isStoreDishDisabled(storeDish);
					boolean schedulable = catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish) == null;
					return new PublicDishDetailResponse.StoreAvailability(
							store.getId(),
							store.getId(),
							store.getSlug(),
							store.getSlug(),
							store.getName(),
							store.getName(),
							store.getAddress(),
							store.getArea(),
							distanceKm(store, lat, lng),
							catalogAvailabilityService.isStoreOpen(store),
							catalogAvailabilityService.isStoreDisabled(store),
							Math.max(storeDish.getQuantity(), 0),
							!disabled,
							disabled,
							schedulable,
							catalogAvailabilityService.resolveEffectivePrice(storeDish),
							List.copyOf(store.getImagePaths())
					);
				})
				.sorted(Comparator.comparing(PublicDishDetailResponse.StoreAvailability::disabled)
						.thenComparing(PublicDishDetailResponse.StoreAvailability::distanceKm, Comparator.nullsLast(Double::compareTo))
						.thenComparing(PublicDishDetailResponse.StoreAvailability::storeName, String.CASE_INSENSITIVE_ORDER))
				.toList();

		List<PublicReviewItemResponse> reviews = snapshot.reviewsByTarget()
				.getOrDefault(new TargetKey(ReviewTargetType.DISH, dishId), List.of())
				.stream()
				.sorted(reviewComparator("date_desc"))
				.toList();

		List<PublicDishCardResponse> relatedDishes = dishRepository.findAllByCategoryId(dish.getCategory().getId()).stream()
				.filter(relatedDish -> !relatedDish.getId().equals(dishId))
				.map(relatedDish -> toDishCard(relatedDish, lat, lng, snapshot))
				.sorted(dishComparator("top_rated"))
				.limit(6)
				.toList();

		long totalStock = storeDishes.stream().mapToLong(storeDish -> Math.max(storeDish.getQuantity(), 0)).sum();
		PublicDishStatsResponse stats = new PublicDishStatsResponse(
				ratingAverage(snapshot, ReviewTargetType.DISH, dishId),
				ratingCount(snapshot, ReviewTargetType.DISH, dishId),
				snapshot.orderCountByDishId().getOrDefault(dishId, 0L),
				snapshot.favoriteCounts().getOrDefault(new FavoriteKey(FavoriteTargetType.DISH, dishId), 0L),
				totalStock
		);

		return new PublicDishDetailResponse(
				DishResponse.from(dish),
				CategoryResponse.from(dish.getCategory()),
				stats,
				stores,
				reviews,
				relatedDishes
		);
	}

	@Transactional(readOnly = true)
	public PageResponse<PublicEventCardResponse> listEvents(
			String search,
			String sort,
			Double lat,
			Double lng,
			int page,
			int size
	) {
		CatalogSnapshot snapshot = snapshot();
		List<PublicEventCardResponse> items = eventItemRepository.findAll().stream()
				.filter(eventItem -> matchesEvent(eventItem, search))
				.map(eventItem -> toEventCard(eventItem, lat, lng, snapshot))
				.sorted(eventComparator(sort))
				.toList();
		return paginate(items, page, size);
	}

	@Transactional(readOnly = true)
	public PublicEventCardResponse getEvent(String eventKey, Double lat, Double lng) {
		CatalogSnapshot snapshot = snapshot();
		return toEventCard(findPublicEventByKey(eventKey), lat, lng, snapshot);
	}

	@Transactional(readOnly = true)
	public PageResponse<PublicNewsCardResponse> listNews(String search, Boolean featured, int page, int size) {
		List<PublicNewsCardResponse> items = newsArticleRepository.findAll().stream()
				.filter(this::isPublicNews)
				.filter(newsArticle -> featured == null || newsArticle.isFeatured() == featured)
				.filter(newsArticle -> matchesNews(newsArticle, search))
				.map(PublicNewsCardResponse::from)
				.sorted(newsComparator())
				.toList();
		return paginate(items, page, size);
	}

	@Transactional(readOnly = true)
	public PublicNewsDetailResponse getNews(String newsKey) {
		return PublicNewsDetailResponse.from(findPublicNewsByKey(newsKey));
	}

	@Transactional(readOnly = true)
	public PageResponse<PublicReviewItemResponse> listReviews(
			ReviewTargetType targetType,
			Long targetId,
			String sort,
			int page,
			int size
	) {
		ReviewTargetSupport.requireSupported(targetType);
		if (targetId != null && targetType == null) {
			throw new BadRequestException("targetType is required when targetId is provided");
		}

		List<PublicReviewItemResponse> items = reviewRepository.findAll().stream()
				.filter(Review::isApproved)
				.filter(review -> ReviewTargetSupport.isSupported(review.getTargetType()))
				.filter(review -> targetType == null || review.getTargetType() == targetType)
				.filter(review -> targetId == null || Objects.equals(review.getTargetId(), targetId))
				.map(this::toPublicReview)
				.sorted(reviewComparator(sort))
				.toList();
		return paginate(items, page, size);
	}

	private PublicStoreCardResponse toStoreCard(Store store, Double lat, Double lng, CatalogSnapshot snapshot) {
		PublicStoreStatsResponse stats = buildStoreStats(store, snapshot);
		String disabledReason = catalogAvailabilityService.resolveStoreDisabledReason(store);
		return new PublicStoreCardResponse(
				store.getId(),
				store.getSlug(),
				store.getName(),
				store.getDescription(),
				store.getAddress(),
				store.getArea(),
				store.getPositionLabel(),
				store.getLatitude(),
				store.getLongitude(),
				List.copyOf(store.getImagePaths()),
				store.getHighlightSummary(),
				List.copyOf(store.getHighlightTags()),
				stats.averageRating(),
				stats.reviewCount(),
				stats.favoriteCount(),
				stats.availableItemCount(),
				distanceKm(store, lat, lng),
				catalogAvailabilityService.isStoreOpen(store),
				disabledReason != null,
				disabledReason
		);
	}

	private PublicStoreStatsResponse buildStoreStats(Store store, CatalogSnapshot snapshot) {
		long availableItemCount = snapshot.storeDishesByStoreId().getOrDefault(store.getId(), List.of()).stream()
				.filter(storeDish -> !catalogAvailabilityService.isStoreDishDisabled(storeDish))
				.count();
		return new PublicStoreStatsResponse(
				ratingAverage(snapshot, ReviewTargetType.STORE, store.getId()),
				ratingCount(snapshot, ReviewTargetType.STORE, store.getId()),
				snapshot.favoriteCounts().getOrDefault(new FavoriteKey(FavoriteTargetType.STORE, store.getId()), 0L),
				availableItemCount
		);
	}

	private PublicDishCardResponse toDishCard(Dish dish, Double lat, Double lng, CatalogSnapshot snapshot) {
		PublicBestStoreResponse bestStore = resolveBestStore(snapshot.storeDishesByDishId().getOrDefault(dish.getId(), List.of()), lat, lng);
		BigDecimal displayPrice = bestStore != null && bestStore.price() != null ? bestStore.price() : dish.getPrice();
		Integer stock = bestStore != null ? bestStore.stock() : null;
		boolean available = bestStore != null && bestStore.available();
		boolean disabled = bestStore != null && bestStore.disabled();
		Long storeId = bestStore != null ? bestStore.storeId() : null;
		String storeName = bestStore != null ? bestStore.storeName() : null;
		return new PublicDishCardResponse(
				dish.getId(),
				dish.getCategory().getId(),
				dish.getCategory().getName(),
				dish.getName(),
				dish.getDescription(),
				dish.getNote(),
				displayPrice,
				formatPrice(displayPrice),
				dish.getStatus(),
				dish.isFranchiseRequired(),
				dish.getFranchiseNote(),
				List.copyOf(dish.getImagePaths()),
				dish.getHighlightSummary(),
				List.copyOf(dish.getHighlightTags()),
				ratingAverage(snapshot, ReviewTargetType.DISH, dish.getId()),
				ratingCount(snapshot, ReviewTargetType.DISH, dish.getId()),
				snapshot.orderCountByDishId().getOrDefault(dish.getId(), 0L),
				snapshot.favoriteCounts().getOrDefault(new FavoriteKey(FavoriteTargetType.DISH, dish.getId()), 0L),
				stock,
				available,
				disabled,
				dish.isActive(),
				storeId,
				storeName,
				bestStore
		);
	}

	private PublicEventCardResponse toEventCard(EventItem eventItem, Double lat, Double lng, CatalogSnapshot snapshot) {
		Store store = eventItem.getStore();
		List<PublicEventCardResponse.FeaturedDishPreview> featuredDishes = eventItem.getFeaturedDishIds().stream()
				.map(dishRepository::findById)
				.flatMap(Optional::stream)
				.map(dish -> new PublicEventCardResponse.FeaturedDishPreview(
						dish.getId(),
						dish.getName(),
						dish.getPrice(),
						List.copyOf(dish.getImagePaths())
				))
				.toList();
		List<PublicReviewItemResponse> reviews = snapshot.reviewsByTarget()
				.getOrDefault(new TargetKey(ReviewTargetType.EVENT, eventItem.getId()), List.of())
				.stream()
				.sorted(reviewComparator("date_desc"))
				.toList();
		PublicEventCardResponse.StorePreview storePreview = new PublicEventCardResponse.StorePreview(
				store.getId(),
				store.getSlug(),
				store.getSlug(),
				store.getName(),
				store.getName(),
				store.getAddress(),
				store.getArea(),
				catalogAvailabilityService.isStoreOpen(store),
				catalogAvailabilityService.isStoreDisabled(store),
				catalogAvailabilityService.resolveStoreDisabledReason(store),
				List.copyOf(store.getImagePaths())
		);

		return new PublicEventCardResponse(
				eventItem.getId(),
				eventItem.getSlug(),
				store.getId(),
				store.getSlug(),
				store.getName(),
				store.getAddress(),
				store.getArea(),
				eventItem.getName(),
				eventItem.getName(),
				buildEventSummary(eventItem),
				eventItem.getDescription(),
				eventItem.getLocation(),
				eventItem.getScheduleText(),
				List.copyOf(eventItem.getImagePaths()),
				ContentSectionResponse.fromList(eventItem.getSections()),
				eventItem.getHighlightSummary(),
				List.copyOf(eventItem.getHighlightTags()),
				eventItem.getStartsAt(),
				eventItem.getEndsAt(),
				ratingAverage(snapshot, ReviewTargetType.EVENT, eventItem.getId()),
				ratingCount(snapshot, ReviewTargetType.EVENT, eventItem.getId()),
				snapshot.favoriteCounts().getOrDefault(new FavoriteKey(FavoriteTargetType.EVENT, eventItem.getId()), 0L),
				eventItem.getCapacity(),
				eventItem.getBookedCount(),
				catalogAvailabilityService.resolveRemainingSlots(eventItem),
				catalogAvailabilityService.isEventDisabled(eventItem),
				catalogAvailabilityService.resolveEventDisabledReason(eventItem),
				distanceKm(store, lat, lng),
				storePreview,
				reviews,
				featuredDishes
		);
	}

	private PublicStoreDetailResponse.CategorySection toCategorySection(List<StoreDish> storeDishes, CatalogSnapshot snapshot) {
		Category category = storeDishes.get(0).getDish().getCategory();
		List<PublicStoreDetailResponse.StoreDishItem> items = storeDishes.stream()
				.map(storeDish -> {
					Dish dish = storeDish.getDish();
					double averageRating = ratingAverage(snapshot, ReviewTargetType.DISH, dish.getId());
					long reviewCount = ratingCount(snapshot, ReviewTargetType.DISH, dish.getId());
					boolean disabled = catalogAvailabilityService.isStoreDishDisabled(storeDish);
					boolean schedulable = catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish) == null;
					return new PublicStoreDetailResponse.StoreDishItem(
							dish.getId(),
							dish.getCategory().getId(),
							dish.getName(),
							dish.getDescription(),
							dish.getNote(),
							catalogAvailabilityService.resolveEffectivePrice(storeDish),
							formatPrice(catalogAvailabilityService.resolveEffectivePrice(storeDish)),
							dish.isFranchiseRequired(),
							dish.getFranchiseNote(),
							List.copyOf(dish.getImagePaths()),
							dish.getHighlightSummary(),
							List.copyOf(dish.getHighlightTags()),
							averageRating,
							reviewCount,
							snapshot.orderCountByDishId().getOrDefault(dish.getId(), 0L),
							snapshot.favoriteCounts().getOrDefault(new FavoriteKey(FavoriteTargetType.DISH, dish.getId()), 0L),
							Math.max(storeDish.getQuantity(), 0),
							!disabled,
							disabled,
							schedulable
					);
				})
				.sorted(Comparator.comparing(PublicStoreDetailResponse.StoreDishItem::name, String.CASE_INSENSITIVE_ORDER))
				.toList();

		long totalReviewCount = items.stream().mapToLong(PublicStoreDetailResponse.StoreDishItem::reviewCount).sum();
		double averageRating = totalReviewCount == 0 ? 0.0 : round(items.stream()
				.mapToDouble(item -> item.averageRating() * item.reviewCount())
				.sum() / totalReviewCount);

		return new PublicStoreDetailResponse.CategorySection(
				category.getId(),
				category.getName(),
				category.getName(),
				category.getDescription(),
				List.copyOf(category.getImagePaths()),
				averageRating,
				totalReviewCount,
				items
		);
	}

	private PublicBestStoreResponse resolveBestStore(List<StoreDish> storeDishes, Double lat, Double lng) {
		return storeDishes.stream()
				.sorted(Comparator.comparing((StoreDish storeDish) -> catalogAvailabilityService.isStoreDishDisabled(storeDish))
						.thenComparing(storeDish -> distanceKm(storeDish.getStore(), lat, lng), Comparator.nullsLast(Double::compareTo))
						.thenComparing(storeDish -> catalogAvailabilityService.resolveEffectivePrice(storeDish))
						.thenComparing(StoreDish::getQuantity, Comparator.reverseOrder()))
				.findFirst()
				.map(storeDish -> {
					Store store = storeDish.getStore();
					boolean disabled = catalogAvailabilityService.isStoreDishDisabled(storeDish);
					boolean schedulable = catalogAvailabilityService.resolveStoreDishStaticDisabledReason(storeDish) == null;
					return new PublicBestStoreResponse(
							store.getId(),
							store.getId(),
							store.getSlug(),
							store.getSlug(),
							store.getName(),
							store.getName(),
							store.getAddress(),
							store.getArea(),
							distanceKm(store, lat, lng),
							Math.max(storeDish.getQuantity(), 0),
							catalogAvailabilityService.isStoreOpen(store),
							!disabled,
							disabled,
							schedulable,
							catalogAvailabilityService.resolveEffectivePrice(storeDish),
							List.copyOf(store.getImagePaths())
					);
				})
				.orElse(null);
	}

	private String buildEventSummary(EventItem eventItem) {
		if (eventItem.getHighlightSummary() != null && !eventItem.getHighlightSummary().isBlank()) {
			return eventItem.getHighlightSummary();
		}
		if (eventItem.getDescription() == null || eventItem.getDescription().isBlank()) {
			return null;
		}
		String description = eventItem.getDescription().trim();
		return description.length() <= 180 ? description : description.substring(0, 177) + "...";
	}

	private PublicReviewItemResponse toPublicReview(Review review) {
		return new PublicReviewItemResponse(
				review.getId(),
				review.getUser().getId(),
				review.getUser().getFullName(),
				review.getUser().getEmail(),
				review.getTargetType(),
				review.getTargetId(),
				resolveTargetSlug(review.getTargetType(), review.getTargetId()),
				resolveTargetLabel(review.getTargetType(), review.getTargetId()),
				resolveTargetImagePaths(review.getTargetType(), review.getTargetId()),
				review.getRating(),
				review.getTitle(),
				review.getComment(),
				review.getCreatedAt(),
				review.getUpdatedAt()
		);
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

	private Comparator<PublicStoreCardResponse> storeComparator(String sort) {
		String resolvedSort = sort == null ? "rating_desc" : sort;
		return switch (resolvedSort) {
			case "rating_asc" -> Comparator.comparingDouble(PublicStoreCardResponse::averageRating)
					.thenComparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "distance_asc" -> Comparator.comparing(PublicStoreCardResponse::distanceKm, Comparator.nullsLast(Double::compareTo))
					.thenComparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "name_asc" -> Comparator.comparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "rating_desc" -> Comparator.comparingDouble(PublicStoreCardResponse::averageRating).reversed()
					.thenComparing(Comparator.comparingLong(PublicStoreCardResponse::reviewCount).reversed())
					.thenComparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			default -> Comparator.comparingDouble(PublicStoreCardResponse::averageRating).reversed()
					.thenComparing(PublicStoreCardResponse::name, String.CASE_INSENSITIVE_ORDER);
		};
	}

	private Comparator<PublicDishCardResponse> dishComparator(String sort) {
		String resolvedSort = sort == null ? "top_rated" : sort;
		return switch (resolvedSort) {
			case "most_reviewed" -> Comparator.comparingLong(PublicDishCardResponse::reviewCount).reversed()
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "most_ordered" -> Comparator.comparingLong(PublicDishCardResponse::orderCount).reversed()
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "distance_asc" -> Comparator.comparing(
							(PublicDishCardResponse dish) -> dish.bestStore() != null ? dish.bestStore().distanceKm() : null,
							Comparator.nullsLast(Double::compareTo)
					)
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "price_asc" -> Comparator.comparing(PublicDishCardResponse::price)
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "price_desc" -> Comparator.comparing(PublicDishCardResponse::price, Comparator.reverseOrder())
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			case "top_rated" -> Comparator.comparingDouble(PublicDishCardResponse::averageRating).reversed()
					.thenComparing(Comparator.comparingLong(PublicDishCardResponse::reviewCount).reversed())
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
			default -> Comparator.comparingDouble(PublicDishCardResponse::averageRating).reversed()
					.thenComparing(PublicDishCardResponse::name, String.CASE_INSENSITIVE_ORDER);
		};
	}

	private Comparator<PublicEventCardResponse> eventComparator(String sort) {
		String resolvedSort = sort == null ? "date_asc" : sort;
		return switch (resolvedSort) {
			case "date_desc" -> Comparator.comparing(PublicEventCardResponse::startsAt, Comparator.reverseOrder());
			case "rating_desc" -> Comparator.comparingDouble(PublicEventCardResponse::averageRating).reversed()
					.thenComparing(PublicEventCardResponse::startsAt);
			case "rating_asc" -> Comparator.comparingDouble(PublicEventCardResponse::averageRating)
					.thenComparing(PublicEventCardResponse::startsAt);
			case "distance_asc" -> Comparator.comparing(PublicEventCardResponse::distanceKm, Comparator.nullsLast(Double::compareTo))
					.thenComparing(PublicEventCardResponse::startsAt);
			case "date_asc" -> Comparator.comparing(PublicEventCardResponse::startsAt);
			default -> Comparator.comparing(PublicEventCardResponse::startsAt);
		};
	}

	private Comparator<PublicReviewItemResponse> reviewComparator(String sort) {
		String resolvedSort = sort == null ? "date_desc" : sort;
		return switch (resolvedSort) {
			case "date_asc" -> Comparator.comparing(PublicReviewItemResponse::createdAt);
			case "rating_desc" -> Comparator.comparing(PublicReviewItemResponse::rating, Comparator.reverseOrder())
					.thenComparing(PublicReviewItemResponse::createdAt, Comparator.reverseOrder());
			case "rating_asc" -> Comparator.comparing(PublicReviewItemResponse::rating)
					.thenComparing(PublicReviewItemResponse::createdAt, Comparator.reverseOrder());
			case "date_desc" -> Comparator.comparing(PublicReviewItemResponse::createdAt, Comparator.reverseOrder());
			default -> Comparator.comparing(PublicReviewItemResponse::createdAt, Comparator.reverseOrder());
		};
	}

	private Comparator<PublicNewsCardResponse> newsComparator() {
		return Comparator.comparing(PublicNewsCardResponse::featured).reversed()
				.thenComparing(
						PublicNewsCardResponse::publishedAt,
						Comparator.nullsLast(Comparator.reverseOrder())
				)
				.thenComparing(PublicNewsCardResponse::createdAt, Comparator.reverseOrder());
	}

	private boolean matchesStore(Store store, String search) {
		String normalized = normalize(search);
		if (normalized == null) {
			return true;
		}
		return containsAny(normalized,
				store.getName(),
				store.getSlug(),
				store.getDescription(),
				store.getAddress(),
				store.getContactEmail(),
				store.getPhoneNumber(),
				store.getArea(),
				store.getPositionLabel(),
				store.getHoursText(),
				store.getPersonality(),
				store.getDesignSignature(),
				store.getFranchiseMood(),
				store.getSpecialty(),
				store.getHighlightSummary(),
				String.join(" ", store.getHighlightTags()),
				String.join(" ", store.getServiceTags()),
				flattenSectionText(store.getSections())
		);
	}

	private boolean matchesDish(Dish dish, String search) {
		String normalized = normalize(search);
		if (normalized == null) {
			return true;
		}
		return containsAny(normalized,
				dish.getName(),
				dish.getDescription(),
				dish.getNote(),
				dish.getStatus(),
				dish.getFranchiseNote(),
				dish.getHighlightSummary(),
				String.join(" ", dish.getHighlightTags()),
				dish.getCategory().getName(),
				dish.getCategory().getDescription(),
				flattenSectionText(dish.getSections())
		);
	}

	private boolean matchesEvent(EventItem eventItem, String search) {
		String normalized = normalize(search);
		if (normalized == null) {
			return true;
		}
		return containsAny(normalized,
				eventItem.getName(),
				eventItem.getSlug(),
				eventItem.getDescription(),
				eventItem.getLocation(),
				eventItem.getScheduleText(),
				eventItem.getHighlightSummary(),
				String.join(" ", eventItem.getHighlightTags()),
				flattenSectionText(eventItem.getSections()),
				eventItem.getStore().getName(),
				eventItem.getStore().getAddress(),
				eventItem.getStore().getArea()
		);
	}

	private boolean matchesNews(NewsArticle newsArticle, String search) {
		String normalized = normalize(search);
		if (normalized == null) {
			return true;
		}
		return containsAny(normalized,
				newsArticle.getTitle(),
				newsArticle.getSlug(),
				newsArticle.getSummary(),
				newsArticle.getContent(),
				flattenSectionText(newsArticle.getSections()),
				String.join(" ", newsArticle.getTags()),
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getName() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getSlug() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getAddress() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getArea() : null
		);
	}

	private boolean containsAny(String search, String... values) {
		for (String value : values) {
			if (value != null && value.toLowerCase(Locale.ROOT).contains(search)) {
				return true;
			}
		}
		return false;
	}

	private String flattenSectionText(List<ContentSection> sections) {
		if (sections == null || sections.isEmpty()) {
			return null;
		}
		return sections.stream()
				.filter(Objects::nonNull)
				.map(section -> String.join(" ",
						section.getTitle() == null ? "" : section.getTitle(),
						section.getContent() == null ? "" : section.getContent()
				).trim())
				.filter(value -> !value.isEmpty())
				.collect(Collectors.joining(" "));
	}

	private String normalize(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
	}

	private Store findPublicStoreByKey(String storeKey) {
		String normalizedKey = normalize(storeKey);
		if (normalizedKey == null) {
			throw new NotFoundException("Store not found");
		}
		if (normalizedKey.chars().allMatch(Character::isDigit)) {
			return storeRepository.findById(Long.valueOf(normalizedKey))
					.orElseThrow(() -> new NotFoundException("Store not found"));
		}
		return storeRepository.findBySlugIgnoreCase(normalizedKey)
				.orElseThrow(() -> new NotFoundException("Store not found"));
	}

	private EventItem findPublicEventByKey(String eventKey) {
		String normalizedKey = normalize(eventKey);
		if (normalizedKey == null) {
			throw new NotFoundException("Event not found");
		}
		if (normalizedKey.chars().allMatch(Character::isDigit)) {
			return eventItemRepository.findById(Long.valueOf(normalizedKey))
					.orElseThrow(() -> new NotFoundException("Event not found"));
		}
		return eventItemRepository.findBySlugIgnoreCase(normalizedKey)
				.orElseThrow(() -> new NotFoundException("Event not found"));
	}

	private NewsArticle findPublicNewsByKey(String newsKey) {
		String normalizedKey = normalize(newsKey);
		if (normalizedKey == null) {
			throw new NotFoundException("News not found");
		}
		NewsArticle newsArticle;
		if (normalizedKey.chars().allMatch(Character::isDigit)) {
			newsArticle = newsArticleRepository.findById(Long.valueOf(normalizedKey))
					.orElseThrow(() -> new NotFoundException("News not found"));
		} else {
			newsArticle = newsArticleRepository.findBySlugIgnoreCase(normalizedKey)
					.orElseThrow(() -> new NotFoundException("News not found"));
		}
		if (!isPublicNews(newsArticle)) {
			throw new NotFoundException("News not found");
		}
		return newsArticle;
	}

	private boolean isPublicNews(NewsArticle newsArticle) {
		return newsArticle.isPublished()
				&& newsArticle.getPublishedAt() != null
				&& !newsArticle.getPublishedAt().isAfter(Instant.now());
	}

	private Double distanceKm(Store store, Double lat, Double lng) {
		if (lat == null || lng == null || store.getLatitude() == null || store.getLongitude() == null) {
			return null;
		}
		double earthRadiusKm = 6371.0;
		double dLat = Math.toRadians(store.getLatitude() - lat);
		double dLng = Math.toRadians(store.getLongitude() - lng);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(store.getLatitude()))
				* Math.sin(dLng / 2) * Math.sin(dLng / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return round(earthRadiusKm * c);
	}

	private String formatPrice(BigDecimal value) {
		NumberFormat numberFormat = NumberFormat.getNumberInstance(VI_LOCALE);
		numberFormat.setMaximumFractionDigits(0);
		return numberFormat.format(value) + " đ";
	}

	private double ratingAverage(CatalogSnapshot snapshot, ReviewTargetType targetType, Long targetId) {
		RatingSummary summary = snapshot.ratingByTarget().get(new TargetKey(targetType, targetId));
		if (summary == null || summary.count() == 0) {
			return 0.0;
		}
		return round((double) summary.sum() / summary.count());
	}

	private long ratingCount(CatalogSnapshot snapshot, ReviewTargetType targetType, Long targetId) {
		RatingSummary summary = snapshot.ratingByTarget().get(new TargetKey(targetType, targetId));
		return summary == null ? 0L : summary.count();
	}

	private <T> PageResponse<T> paginate(List<T> items, int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		int fromIndex = Math.min(resolvedPage * resolvedSize, items.size());
		int toIndex = Math.min(fromIndex + resolvedSize, items.size());
		int totalPages = items.isEmpty() ? 0 : (int) Math.ceil((double) items.size() / resolvedSize);
		return new PageResponse<>(
				items.subList(fromIndex, toIndex),
				resolvedPage,
				resolvedSize,
				items.size(),
				totalPages,
				resolvedPage + 1 < totalPages,
				resolvedPage > 0 && totalPages > 0
		);
	}

	private double round(double value) {
		return Math.round(value * 100.0) / 100.0;
	}

	private Category groupCategory(List<StoreDish> storeDishes, Long categoryId) {
		return storeDishes.stream()
				.map(storeDish -> storeDish.getDish().getCategory())
				.filter(category -> Objects.equals(category.getId(), categoryId))
				.findFirst()
				.orElse(null);
	}

	private CatalogSnapshot snapshot() {
		List<Review> approvedReviews = reviewRepository.findAll().stream()
				.filter(Review::isApproved)
				.filter(review -> ReviewTargetSupport.isSupported(review.getTargetType()))
				.toList();
		List<Favorite> favorites = favoriteRepository.findAll();
		List<OrderItem> orderItems = orderItemRepository.findAll();
		List<StoreDish> storeDishes = storeDishRepository.findAll();

		Map<Long, List<StoreDish>> storeDishesByStoreId = storeDishes.stream()
				.collect(Collectors.groupingBy(storeDish -> storeDish.getStore().getId()));
		Map<Long, List<StoreDish>> storeDishesByDishId = storeDishes.stream()
				.collect(Collectors.groupingBy(storeDish -> storeDish.getDish().getId()));
		Map<TargetKey, RatingSummary> ratingByTarget = approvedReviews.stream()
				.collect(Collectors.groupingBy(
						review -> new TargetKey(review.getTargetType(), review.getTargetId()),
						Collectors.collectingAndThen(
								Collectors.toList(),
								reviews -> new RatingSummary(
										reviews.stream().mapToLong(Review::getRating).sum(),
										reviews.size()
								)
						)
				));
		Map<TargetKey, List<PublicReviewItemResponse>> reviewsByTarget = approvedReviews.stream()
				.map(this::toPublicReview)
				.collect(Collectors.groupingBy(review -> new TargetKey(review.targetType(), review.targetId())));
		Map<FavoriteKey, Long> favoriteCounts = favorites.stream()
				.collect(Collectors.groupingBy(
						favorite -> new FavoriteKey(favorite.getTargetType(), favorite.getTargetId()),
						Collectors.counting()
				));
		Map<Long, Long> orderCountByDishId = orderItems.stream()
				.collect(Collectors.groupingBy(
						orderItem -> orderItem.getDish().getId(),
						Collectors.summingLong(OrderItem::getQuantity)
				));

		return new CatalogSnapshot(
				storeDishesByStoreId,
				storeDishesByDishId,
				ratingByTarget,
				reviewsByTarget,
				favoriteCounts,
				orderCountByDishId
		);
	}

	private record TargetKey(ReviewTargetType targetType, Long targetId) {
	}

	private record FavoriteKey(FavoriteTargetType targetType, Long targetId) {
	}

	private record RatingSummary(long sum, long count) {
	}

	private record CatalogSnapshot(
			Map<Long, List<StoreDish>> storeDishesByStoreId,
			Map<Long, List<StoreDish>> storeDishesByDishId,
			Map<TargetKey, RatingSummary> ratingByTarget,
			Map<TargetKey, List<PublicReviewItemResponse>> reviewsByTarget,
			Map<FavoriteKey, Long> favoriteCounts,
			Map<Long, Long> orderCountByDishId
	) {
	}
}
