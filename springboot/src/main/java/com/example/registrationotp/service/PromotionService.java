package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PromotionRequest;
import com.example.registrationotp.dto.PromotionResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserLevelDefinitionRepository;

@Service
public class PromotionService {

	private static final String SIGNATURE_CATEGORY_NAME = "SIGNATURE";

	private final SessionAuthService sessionAuthService;
	private final PromotionRepository promotionRepository;
	private final DishRepository dishRepository;
	private final StoreRepository storeRepository;
	private final UserLevelDefinitionRepository userLevelDefinitionRepository;

	public PromotionService(
			SessionAuthService sessionAuthService,
			PromotionRepository promotionRepository,
			DishRepository dishRepository,
			StoreRepository storeRepository,
			UserLevelDefinitionRepository userLevelDefinitionRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.promotionRepository = promotionRepository;
		this.dishRepository = dishRepository;
		this.storeRepository = storeRepository;
		this.userLevelDefinitionRepository = userLevelDefinitionRepository;
	}

	@Transactional(readOnly = true)
	public List<PromotionResponse> listPromotions(String authorizationHeader) {
		sessionAuthService.requireAdmin(authorizationHeader);
		return promotionRepository.findAll().stream()
				.sorted((left, right) -> right.getUpdatedAt().compareTo(left.getUpdatedAt()))
				.map(PromotionResponse::from)
				.toList();
	}

	@Transactional(readOnly = true)
	public PromotionResponse getPromotion(String authorizationHeader, Long id) {
		sessionAuthService.requireAdmin(authorizationHeader);
		return PromotionResponse.from(findPromotion(id));
	}

	@Transactional
	public PromotionResponse createPromotion(String authorizationHeader, PromotionRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		String normalizedCode = normalizeCode(request.code());
		if (promotionRepository.existsByCodeIgnoreCase(normalizedCode)) {
			throw new ConflictException("Promotion code already exists");
		}
		Promotion promotion = new Promotion();
		applyRequest(promotion, request, normalizedCode);
		return PromotionResponse.from(promotionRepository.save(promotion));
	}

	@Transactional
	public PromotionResponse updatePromotion(String authorizationHeader, Long id, PromotionRequest request) {
		sessionAuthService.requireAdmin(authorizationHeader);
		Promotion promotion = findPromotion(id);
		String normalizedCode = normalizeCode(request.code());
		if (promotionRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
			throw new ConflictException("Promotion code already exists");
		}
		applyRequest(promotion, request, normalizedCode);
		return PromotionResponse.from(promotionRepository.save(promotion));
	}

	@Transactional
	public MessageResponse deletePromotion(String authorizationHeader, Long id) {
		sessionAuthService.requireAdmin(authorizationHeader);
		promotionRepository.delete(findPromotion(id));
		return new MessageResponse("Promotion deleted successfully");
	}

	@Transactional(readOnly = true)
	public PromotionCalculation resolveApplicablePromotion(String promotionCode, List<CartItem> cartItems) {
		Promotion promotion = resolvePromotion(promotionCode);
		if (promotion == null) {
			return new PromotionCalculation(null, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
		if (hasMultipleStores(cartItems)) {
			return new PromotionCalculation(promotion, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
		StoreCheckoutContext context = new StoreCheckoutContext(
				cartItems.isEmpty() ? null : cartItems.get(0).getStore(),
				cartItems,
				calculateSubtotal(cartItems),
				null
		);
		CheckoutPromotionPlan checkoutPlan = planPromotionForCheckout(promotion, List.of(context));
		StorePromotionAllocation allocation = checkoutPlan.storeAllocations().isEmpty()
				? new StorePromotionAllocation(context.store(), context.subtotalAmount(), BigDecimal.ZERO, BigDecimal.ZERO, false, List.of(), true, null)
				: checkoutPlan.storeAllocations().get(0);
		return new PromotionCalculation(
				promotion,
				allocation.eligibleAmount(),
				allocation.discountAmount(),
				allocation.applicable()
		);
	}

	@Transactional(readOnly = true)
	public Promotion resolvePromotion(String promotionCode) {
		if (!StringUtils.hasText(promotionCode)) {
			return null;
		}
		Promotion promotion = promotionRepository.findByCodeIgnoreCase(promotionCode.trim())
				.orElseThrow(() -> new NotFoundException("Promotion code not found"));
		validatePromotionAvailability(promotion);
		return promotion;
	}

	public PromotionCalculation calculatePromotionForCartItems(Promotion promotion, List<CartItem> cartItems) {
		if (promotion == null) {
			return new PromotionCalculation(null, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
		if (hasMultipleStores(cartItems)) {
			return new PromotionCalculation(promotion, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
		StoreCheckoutContext context = new StoreCheckoutContext(
				cartItems.isEmpty() ? null : cartItems.get(0).getStore(),
				cartItems,
				calculateSubtotal(cartItems),
				null
		);
		StorePromotionAllocation allocation = buildStoreAllocationCandidate(promotion, context);
		return new PromotionCalculation(
				promotion,
				allocation.eligibleAmount(),
				allocation.applicable() ? calculateDiscountAmount(promotion, allocation.eligibleAmount()) : BigDecimal.ZERO,
				allocation.applicable()
		);
	}

	public CheckoutPromotionPlan planPromotionForCheckout(Promotion promotion, List<StoreCheckoutContext> contexts) {
		if (promotion == null) {
			return new CheckoutPromotionPlan(null, List.of(), BigDecimal.ZERO, false);
		}
		if (contexts.size() > 1) {
			throw new BadRequestException("Promotion code can only be applied to one store bill per checkout");
		}
		List<StorePromotionAllocation> candidates = contexts.stream()
				.map(context -> buildStoreAllocationCandidate(promotion, context))
				.toList();
		List<StorePromotionAllocation> applicableAllocations = candidates.stream()
				.filter(StorePromotionAllocation::applicable)
				.toList();
		if (applicableAllocations.isEmpty()) {
			throw new BadRequestException(buildInapplicablePromotionMessage(promotion, candidates));
		}
		BigDecimal combinedStoreSubtotal = applicableAllocations.stream()
				.map(StorePromotionAllocation::subtotalAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		if (promotion.getMinCrossStoreBillAmount() != null
				&& combinedStoreSubtotal.compareTo(promotion.getMinCrossStoreBillAmount()) < 0) {
			throw new BadRequestException("Combined store total does not meet promotion minimum amount");
		}
		BigDecimal totalEligibleAmount = applicableAllocations.stream()
				.map(StorePromotionAllocation::eligibleAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalDiscountAmount = calculateDiscountAmount(promotion, totalEligibleAmount);
		return new CheckoutPromotionPlan(
				promotion,
				allocateDiscounts(candidates, totalDiscountAmount),
				totalDiscountAmount,
				totalDiscountAmount.compareTo(BigDecimal.ZERO) > 0
		);
	}

	public BigDecimal calculateDiscountAmount(Promotion promotion, BigDecimal subtotalAmount) {
		if (promotion == null) {
			return BigDecimal.ZERO;
		}
		BigDecimal discountAmount;
		if (promotion.getDiscountType() == PromotionDiscountType.PERCENT) {
			discountAmount = subtotalAmount.multiply(promotion.getDiscountValue())
					.divide(BigDecimal.valueOf(100));
		} else {
			discountAmount = promotion.getDiscountValue();
		}
		if (promotion.getMaxDiscountAmount() != null && discountAmount.compareTo(promotion.getMaxDiscountAmount()) > 0) {
			discountAmount = promotion.getMaxDiscountAmount();
		}
		if (discountAmount.compareTo(subtotalAmount) > 0) {
			discountAmount = subtotalAmount;
		}
		return discountAmount.max(BigDecimal.ZERO);
	}

	public void incrementUsage(Promotion promotion) {
		incrementUsage(promotion, 1);
	}

	public void incrementUsage(Promotion promotion, int count) {
		if (promotion == null) {
			return;
		}
		if (count <= 0) {
			return;
		}
		promotion.setUsedCount((promotion.getUsedCount() == null ? 0 : promotion.getUsedCount()) + count);
		promotionRepository.save(promotion);
	}

	public void decrementUsage(Promotion promotion) {
		if (promotion == null) {
			return;
		}
		int usedCount = promotion.getUsedCount() == null ? 0 : promotion.getUsedCount();
		promotion.setUsedCount(Math.max(usedCount - 1, 0));
		promotionRepository.save(promotion);
	}

	private Promotion findPromotion(Long id) {
		return promotionRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Promotion not found"));
	}

	private void applyRequest(Promotion promotion, PromotionRequest request, String normalizedCode) {
		List<Long> normalizedDishIds = resolveDishIds(request);
		List<Long> normalizedStoreIds = normalizeIds(request.eligibleStoreIds(), "eligibleStoreIds");
		List<Long> normalizedUserLevelIds = normalizeIds(request.eligibleUserLevelIds(), "eligibleUserLevelIds");
		BigDecimal resolvedMinOrderAmount = resolveAmount("minOrderAmount", request.minOrderAmount(), request.minimumOrderAmount());
		BigDecimal resolvedMaxDiscountAmount = resolveAmount("maxDiscountAmount", request.maxDiscountAmount(), request.maximumDiscountAmount());
		validateRequest(request, normalizedDishIds, normalizedStoreIds, normalizedUserLevelIds, resolvedMinOrderAmount, resolvedMaxDiscountAmount);
		promotion.setCode(normalizedCode);
		promotion.setName(resolveName(request, normalizedCode));
		promotion.setDescription(StringUtils.hasText(request.description()) ? request.description().trim() : null);
		promotion.setScope(request.scope());
		promotion.setDiscountType(request.discountType());
		promotion.setDiscountValue(request.discountValue());
		promotion.setMinOrderAmount(resolvedMinOrderAmount);
		promotion.setMaxDiscountAmount(resolvedMaxDiscountAmount);
		promotion.setMinStoreBillAmount(request.minStoreBillAmount());
		promotion.setMinCrossStoreBillAmount(request.minCrossStoreBillAmount());
		promotion.setUsageLimit(request.usageLimit());
		promotion.setStartsAt(request.startsAt());
		promotion.setEndsAt(request.endsAt());
		promotion.setApplicableDishIds(normalizedDishIds);
		promotion.setEligibleStoreIds(normalizedStoreIds);
		promotion.setEligibleUserLevelIds(normalizedUserLevelIds);
		promotion.setActive(request.active());
	}

	private void validateRequest(
			PromotionRequest request,
			List<Long> normalizedDishIds,
			List<Long> normalizedStoreIds,
			List<Long> normalizedUserLevelIds,
			BigDecimal resolvedMinOrderAmount,
			BigDecimal resolvedMaxDiscountAmount
	) {
		BigDecimal resolvedCrossStoreBillAmount = normalizeCrossStoreBillAmount(request.minCrossStoreBillAmount());
		if (request.usageLimit() != null && request.usageLimit() < 0) {
			throw new BadRequestException("usageLimit must be at least 0");
		}
		if (resolvedCrossStoreBillAmount != null) {
			throw new BadRequestException("minCrossStoreBillAmount is not supported because promotions only apply to one store bill");
		}
		if (request.startsAt() != null && request.endsAt() != null && request.endsAt().isBefore(request.startsAt())) {
			throw new BadRequestException("endsAt must be after startsAt");
		}
		if (request.discountType() == PromotionDiscountType.PERCENT
				&& request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
			throw new BadRequestException("discountValue must be at most 100 for percentage promotions");
		}
		if (!normalizedStoreIds.isEmpty() && storeRepository.findAllById(normalizedStoreIds).size() != normalizedStoreIds.size()) {
			throw new NotFoundException("One or more eligible stores were not found");
		}
		List<com.example.registrationotp.model.UserLevelDefinition> userLevels = normalizedUserLevelIds.isEmpty()
				? List.of()
				: userLevelDefinitionRepository.findAllById(normalizedUserLevelIds);
		if (userLevels.size() != normalizedUserLevelIds.size()) {
			throw new NotFoundException("One or more eligible user levels were not found");
		}
		if (!normalizedStoreIds.isEmpty() && !userLevels.isEmpty()) {
			boolean invalidLevelStore = userLevels.stream()
					.map(level -> level.getStore().getId())
					.anyMatch(storeId -> !normalizedStoreIds.contains(storeId));
			if (invalidLevelStore) {
				throw new BadRequestException("eligibleUserLevelIds must belong to eligibleStoreIds when both are provided");
			}
		}
		if (request.scope() == PromotionScope.DISH) {
			if (normalizedDishIds.isEmpty()) {
				throw new BadRequestException("promotionDishIds or applicableDishIds is required when scope is DISH");
			}
			List<Dish> applicableDishes = dishRepository.findAllById(normalizedDishIds);
			if (applicableDishes.size() != normalizedDishIds.size()) {
				throw new NotFoundException("One or more applicable dishes were not found");
			}
			boolean hasNonSignatureDish = applicableDishes.stream().anyMatch(dish -> !isSignatureDish(dish));
			if (hasNonSignatureDish) {
				throw new BadRequestException("promotionDishIds or applicableDishIds can only contain SIGNATURE dishes");
			}
			return;
		}
		if (!normalizedDishIds.isEmpty()) {
			throw new BadRequestException("promotionDishIds or applicableDishIds is only allowed when scope is DISH");
		}
	}

	private void validatePromotionAvailability(Promotion promotion) {
		if (!promotion.isActive()) {
			throw new BadRequestException("Promotion code is inactive");
		}
		Instant now = Instant.now();
		if (promotion.getStartsAt() != null && now.isBefore(promotion.getStartsAt())) {
			throw new BadRequestException("Promotion code is not active yet");
		}
		if (promotion.getEndsAt() != null && now.isAfter(promotion.getEndsAt())) {
			throw new BadRequestException("Promotion code has expired");
		}
		if (promotion.getUsageLimit() != null && promotion.getUsedCount() != null
				&& promotion.getUsedCount() >= promotion.getUsageLimit()) {
			throw new BadRequestException("Promotion code has reached its usage limit");
		}
	}

	private String buildInapplicablePromotionMessage(Promotion promotion, List<StorePromotionAllocation> allocations) {
		BigDecimal maxEligibleAmount = allocations.stream()
				.map(StorePromotionAllocation::eligibleAmount)
				.max(BigDecimal::compareTo)
				.orElse(BigDecimal.ZERO);
		boolean anyStoreMatched = allocations.stream()
				.anyMatch(allocation -> allocation.store() != null
						&& (promotion.getEligibleStoreIds().isEmpty()
						|| promotion.getEligibleStoreIds().contains(allocation.store().getId())));
		boolean anyLevelMatched = allocations.stream()
				.anyMatch(allocation -> promotion.getEligibleUserLevelIds().isEmpty()
						|| (allocation.currentUserLevelId() != null
						&& promotion.getEligibleUserLevelIds().contains(allocation.currentUserLevelId())));
		boolean anyStoreBillMatched = allocations.stream()
				.anyMatch(allocation -> promotion.getMinStoreBillAmount() == null
						|| allocation.subtotalAmount().compareTo(promotion.getMinStoreBillAmount()) >= 0);
		if (!anyStoreMatched) {
			return "Promotion code does not apply to any store in the cart";
		}
		if (!anyLevelMatched) {
			return "Current user level is not eligible for this promotion";
		}
		if (!anyStoreBillMatched) {
			return "No store bill meets promotion minimum amount";
		}
		boolean hasStoreSpecialtyItems = allocations.stream()
				.anyMatch(StorePromotionAllocation::containsStoreSpecialtyItems);
		if (hasStoreSpecialtyItems) {
			return "Promotion code only applies to SIGNATURE dishes and cannot be used with store specialty dishes";
		}
		if (promotion.getScope() == PromotionScope.DISH && maxEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "Promotion code does not apply to any dish in the cart";
		}
		if (promotion.getScope() == PromotionScope.ORDER && maxEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "Promotion code only applies to SIGNATURE dishes";
		}
		if (promotion.getMinOrderAmount() != null && maxEligibleAmount.compareTo(promotion.getMinOrderAmount()) < 0) {
			if (promotion.getScope() == PromotionScope.DISH) {
				return "Eligible dish total does not meet promotion minimum amount";
			}
			return "Order total does not meet promotion minimum amount";
		}
		return "Promotion code does not apply to any store bill";
	}

	private BigDecimal calculateEligibleAmount(Promotion promotion, List<CartItem> cartItems) {
		if (promotion.getScope() == PromotionScope.ORDER) {
			return calculateSignatureAmount(cartItems);
		}
		Set<Long> applicableDishIds = Set.copyOf(promotion.getApplicableDishIds());
		return cartItems.stream()
				.filter(item -> isSignatureDish(item.getDish()))
				.filter(item -> applicableDishIds.contains(item.getDish().getId()))
				.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private List<Long> calculateMatchedDishIds(Promotion promotion, List<CartItem> cartItems) {
		if (promotion.getScope() != PromotionScope.DISH) {
			return List.of();
		}
		Set<Long> applicableDishIds = Set.copyOf(promotion.getApplicableDishIds());
		return cartItems.stream()
				.filter(item -> isSignatureDish(item.getDish()))
				.map(item -> item.getDish().getId())
				.filter(applicableDishIds::contains)
				.distinct()
				.toList();
	}

	private StorePromotionAllocation buildStoreAllocationCandidate(Promotion promotion, StoreCheckoutContext context) {
		BigDecimal eligibleAmount = calculateEligibleAmount(promotion, context.cartItems());
		List<Long> matchedDishIds = calculateMatchedDishIds(promotion, context.cartItems());
		boolean containsStoreSpecialtyItems = context.cartItems().stream()
				.anyMatch(item -> !isSignatureDish(item.getDish()));
		boolean storeMatched = context.store() != null
				&& (promotion.getEligibleStoreIds().isEmpty() || promotion.getEligibleStoreIds().contains(context.store().getId()));
		boolean levelMatched = promotion.getEligibleUserLevelIds().isEmpty()
				|| (context.currentUserLevelId() != null && promotion.getEligibleUserLevelIds().contains(context.currentUserLevelId()));
		boolean storeBillMatched = promotion.getMinStoreBillAmount() == null
				|| context.subtotalAmount().compareTo(promotion.getMinStoreBillAmount()) >= 0;
		boolean eligibleAmountMatched = promotion.getMinOrderAmount() == null
				|| eligibleAmount.compareTo(promotion.getMinOrderAmount()) >= 0;
		boolean scopeMatched = promotion.getScope() != PromotionScope.DISH || eligibleAmount.compareTo(BigDecimal.ZERO) > 0;
		boolean applicable = storeMatched
				&& levelMatched
				&& storeBillMatched
				&& eligibleAmountMatched
				&& scopeMatched
				&& !containsStoreSpecialtyItems;
		return new StorePromotionAllocation(
				context.store(),
				context.subtotalAmount(),
				eligibleAmount,
				BigDecimal.ZERO,
				applicable,
				matchedDishIds,
				containsStoreSpecialtyItems,
				context.currentUserLevelId()
		);
	}

	private List<StorePromotionAllocation> allocateDiscounts(List<StorePromotionAllocation> candidates, BigDecimal totalDiscountAmount) {
		List<Integer> applicableIndexes = new ArrayList<>();
		BigDecimal totalEligibleAmount = BigDecimal.ZERO;
		for (int index = 0; index < candidates.size(); index++) {
			StorePromotionAllocation candidate = candidates.get(index);
			if (candidate.applicable()) {
				applicableIndexes.add(index);
				totalEligibleAmount = totalEligibleAmount.add(candidate.eligibleAmount());
			}
		}
		if (applicableIndexes.isEmpty() || totalDiscountAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return candidates;
		}

		List<StorePromotionAllocation> allocated = new ArrayList<>();
		BigDecimal distributedAmount = BigDecimal.ZERO;
		int lastApplicableIndex = applicableIndexes.get(applicableIndexes.size() - 1);
		for (int index = 0; index < candidates.size(); index++) {
			StorePromotionAllocation candidate = candidates.get(index);
			if (!candidate.applicable()) {
				allocated.add(candidate);
				continue;
			}
			BigDecimal discountAmount;
			if (index == lastApplicableIndex) {
				discountAmount = totalDiscountAmount.subtract(distributedAmount);
			} else {
				discountAmount = totalDiscountAmount.multiply(candidate.eligibleAmount())
						.divide(totalEligibleAmount, 0, RoundingMode.DOWN);
				distributedAmount = distributedAmount.add(discountAmount);
			}
			allocated.add(candidate.withDiscountAmount(discountAmount));
		}
		return allocated;
	}

	private BigDecimal calculateSubtotal(List<CartItem> cartItems) {
		return cartItems.stream()
				.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private BigDecimal calculateSignatureAmount(List<CartItem> cartItems) {
		return cartItems.stream()
				.filter(item -> isSignatureDish(item.getDish()))
				.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private BigDecimal normalizeCrossStoreBillAmount(BigDecimal amount) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			return null;
		}
		return amount;
	}

	private boolean hasMultipleStores(List<CartItem> cartItems) {
		return cartItems.stream()
				.map(CartItem::getStore)
				.filter(store -> store != null && store.getId() != null)
				.map(store -> store.getId())
				.distinct()
				.count() > 1;
	}

	private boolean isSignatureDish(Dish dish) {
		return dish != null && isSignatureCategory(dish.getCategory());
	}

	private boolean isSignatureCategory(Category category) {
		return category != null
				&& category.getStore() == null
				&& SIGNATURE_CATEGORY_NAME.equalsIgnoreCase(category.getName());
	}

	private List<Long> normalizeIds(List<Long> ids, String fieldName) {
		if (ids == null || ids.isEmpty()) {
			return List.of();
		}
		Set<Long> orderedUniqueIds = new LinkedHashSet<>();
		for (Long id : ids) {
			if (id == null || id <= 0) {
				throw new BadRequestException(fieldName + " must contain valid ids");
			}
			orderedUniqueIds.add(id);
		}
		return new ArrayList<>(orderedUniqueIds);
	}

	private List<Long> resolveDishIds(PromotionRequest request) {
		List<Long> legacyDishIds = normalizeIds(request.applicableDishIds(), "applicableDishIds");
		List<Long> aliasDishIds = normalizeIds(request.promotionDishIds(), "promotionDishIds");
		if (!legacyDishIds.isEmpty() && !aliasDishIds.isEmpty() && !legacyDishIds.equals(aliasDishIds)) {
			throw new BadRequestException("applicableDishIds and promotionDishIds must match when both are provided");
		}
		return !aliasDishIds.isEmpty() ? aliasDishIds : legacyDishIds;
	}

	private BigDecimal resolveAmount(String fieldName, BigDecimal legacyValue, BigDecimal aliasValue) {
		if (legacyValue != null && aliasValue != null && legacyValue.compareTo(aliasValue) != 0) {
			throw new BadRequestException(fieldName + " alias values must match when both are provided");
		}
		return aliasValue != null ? aliasValue : legacyValue;
	}

	private String resolveName(PromotionRequest request, String normalizedCode) {
		if (StringUtils.hasText(request.name())) {
			return request.name().trim();
		}
		return normalizedCode;
	}

	private String normalizeCode(String code) {
		return code.trim().toUpperCase(Locale.ROOT);
	}

	public record PromotionCalculation(
			Promotion promotion,
			BigDecimal eligibleAmount,
			BigDecimal discountAmount,
			boolean applicable
	) {
	}

	public record StoreCheckoutContext(
			com.example.registrationotp.model.Store store,
			List<CartItem> cartItems,
			BigDecimal subtotalAmount,
			Long currentUserLevelId
	) {
	}

	public record StorePromotionAllocation(
			com.example.registrationotp.model.Store store,
			BigDecimal subtotalAmount,
			BigDecimal eligibleAmount,
			BigDecimal discountAmount,
			boolean applicable,
			List<Long> matchedDishIds,
			boolean containsStoreSpecialtyItems,
			Long currentUserLevelId
	) {
		public StorePromotionAllocation withDiscountAmount(BigDecimal resolvedDiscountAmount) {
			return new StorePromotionAllocation(
					store,
					subtotalAmount,
					eligibleAmount,
					resolvedDiscountAmount,
					applicable,
					matchedDishIds,
					containsStoreSpecialtyItems,
					currentUserLevelId
			);
		}
	}

	public record CheckoutPromotionPlan(
			Promotion promotion,
			List<StorePromotionAllocation> storeAllocations,
			BigDecimal totalDiscountAmount,
			boolean applied
	) {
	}
}
