package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PublicPromotionCardResponse;
import com.example.registrationotp.dto.PromotionRequest;
import com.example.registrationotp.dto.PromotionResponse;
import com.example.registrationotp.dto.UserVoucherRedeemResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Category;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountTarget;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserPromotionRedemption;
import com.example.registrationotp.repository.DishRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreRepository;
import com.example.registrationotp.repository.UserLevelDefinitionRepository;
import com.example.registrationotp.repository.UserPromotionRedemptionRepository;
import com.example.registrationotp.repository.UserRepository;

@Service
public class PromotionService {

	private static final String SIGNATURE_CATEGORY_NAME = "SIGNATURE";

	private final SessionAuthService sessionAuthService;
	private final PromotionRepository promotionRepository;
	private final DishRepository dishRepository;
	private final StoreRepository storeRepository;
	private final UserLevelDefinitionRepository userLevelDefinitionRepository;
	private final UserPromotionRedemptionRepository userPromotionRedemptionRepository;
	private final UserRepository userRepository;
	private final UserLevelService userLevelService;

	public PromotionService(
			SessionAuthService sessionAuthService,
			PromotionRepository promotionRepository,
			DishRepository dishRepository,
			StoreRepository storeRepository,
			UserLevelDefinitionRepository userLevelDefinitionRepository,
			UserPromotionRedemptionRepository userPromotionRedemptionRepository,
			UserRepository userRepository,
			UserLevelService userLevelService
	) {
		this.sessionAuthService = sessionAuthService;
		this.promotionRepository = promotionRepository;
		this.dishRepository = dishRepository;
		this.storeRepository = storeRepository;
		this.userLevelDefinitionRepository = userLevelDefinitionRepository;
		this.userPromotionRedemptionRepository = userPromotionRedemptionRepository;
		this.userRepository = userRepository;
		this.userLevelService = userLevelService;
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
		try {
			CheckoutPromotionPlan checkoutPlan = planPromotionForCheckout(
					promotion,
					buildCheckoutContextsForCartItems(cartItems)
			);
			return new PromotionCalculation(
					promotion,
					checkoutPlan.totalEligibleAmount(),
					checkoutPlan.totalDiscountAmount(),
					checkoutPlan.applied()
			);
		} catch (BadRequestException exception) {
			return new PromotionCalculation(promotion, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
if (hasMultipleStores(cartItems)) {
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

	@Transactional(readOnly = true)
	public List<Promotion> listCurrentlyAvailablePromotions() {
		return promotionRepository.findAll().stream()
				.filter(this::isPromotionCurrentlyAvailable)
				.sorted((left, right) -> right.getUpdatedAt().compareTo(left.getUpdatedAt()))
				.toList();
	}

	@Transactional(readOnly = true)
	public List<Promotion> listAccessiblePromotionsForUser(User user) {
		if (user == null || user.getId() == null) {
			return List.of();
		}
		List<Long> currentLevelIds = resolveCurrentUserLevelIds(user);
		Map<Long, Integer> availableRedemptions = countAvailableRedemptionsByPromotionId(user.getId());
		return listCurrentlyAvailablePromotions().stream()
				.filter(promotion -> matchesUserLevel(promotion, currentLevelIds))
				.filter(promotion -> isPromotionAccessibleForUser(promotion, availableRedemptions))
				.toList();
	}

	@Transactional(readOnly = true)
	public List<PublicPromotionCardResponse> listVoucherCatalogForUser(String authorizationHeader) {
		User user = requireBuyerUser(authorizationHeader);
		Map<Long, Integer> availableRedemptions = countAvailableRedemptionsByPromotionId(user.getId());
		List<Long> currentLevelIds = resolveCurrentUserLevelIds(user);
		return listCurrentlyAvailablePromotions().stream()
				.filter(promotion -> matchesUserLevel(promotion, currentLevelIds))
				.map(promotion -> toPublicPromotionCard(
						promotion,
						availableRedemptions.getOrDefault(promotion.getId(), 0)))
				.toList();
	}

	@Transactional
	public UserVoucherRedeemResponse redeemVoucher(String authorizationHeader, Long promotionId) {
		User user = requireBuyerUser(authorizationHeader);
		Promotion promotion = findPromotion(promotionId);
		validatePromotionAvailability(promotion);
		int creditCost = resolveCreditCost(promotion);
		if (creditCost <= 0) {
			throw new BadRequestException("This voucher does not require credit redemption");
		}
		List<Long> currentLevelIds = resolveCurrentUserLevelIds(user);
		if (!matchesUserLevel(promotion, currentLevelIds)) {
			throw new BadRequestException("Your current membership level is not eligible to redeem this voucher");
		}
		if (user.getCreditPoints() < creditCost) {
			throw new BadRequestException("You do not have enough credits to redeem this voucher");
		}
		user.setCreditPoints(user.getCreditPoints() - creditCost);
		userRepository.save(user);

		UserPromotionRedemption redemption = new UserPromotionRedemption();
		redemption.setUser(user);
		redemption.setPromotion(promotion);
		redemption.setCreditCost(creditCost);
		redemption.setRedeemedAt(Instant.now());
		userPromotionRedemptionRepository.save(redemption);

		int availableRedemptions = (int) userPromotionRedemptionRepository
				.countByUserIdAndPromotionIdAndUsedAtIsNull(user.getId(), promotion.getId());
		return new UserVoucherRedeemResponse(
				"Voucher redeemed successfully",
				promotion.getId(),
				promotion.getCode(),
				user.getCreditPoints(),
				availableRedemptions
		);
	}

	@Transactional(readOnly = true)
	public Promotion resolvePromotionForUser(User user, String promotionCode) {
		Promotion promotion = resolvePromotion(promotionCode);
		if (promotion == null || user == null || user.getId() == null) {
			return promotion;
		}
		List<Long> currentLevelIds = resolveCurrentUserLevelIds(user);
		if (!matchesUserLevel(promotion, currentLevelIds)) {
			throw new BadRequestException("Your current membership level is not eligible for this voucher");
		}
		if (resolveCreditCost(promotion) > 0
				&& userPromotionRedemptionRepository.countByUserIdAndPromotionIdAndUsedAtIsNull(user.getId(), promotion.getId()) <= 0) {
			throw new BadRequestException("This credit voucher has not been redeemed yet or it has no remaining uses");
		}
		return promotion;
	}

	@Transactional
	public void consumeVoucherForOrder(User user, Promotion promotion, Order order) {
		if (user == null || user.getId() == null || promotion == null || order == null || order.getId() == null) {
			return;
		}
		if (resolveCreditCost(promotion) <= 0) {
			return;
		}
		UserPromotionRedemption redemption = userPromotionRedemptionRepository
				.findFirstByUserIdAndPromotionIdAndUsedAtIsNullOrderByRedeemedAtAsc(user.getId(), promotion.getId())
				.orElseThrow(() -> new BadRequestException("This credit voucher has no remaining uses"));
		redemption.setUsedAt(Instant.now());
		redemption.setUsedOrder(order);
		userPromotionRedemptionRepository.save(redemption);
	}

	@Transactional
	public void restoreVoucherForOrder(Order order) {
		if (order == null || order.getId() == null) {
			return;
		}
		List<UserPromotionRedemption> redemptions = userPromotionRedemptionRepository.findAllByUsedOrderId(order.getId());
		for (UserPromotionRedemption redemption : redemptions) {
			redemption.setUsedAt(null);
			redemption.setUsedOrder(null);
		}
		if (!redemptions.isEmpty()) {
			userPromotionRedemptionRepository.saveAll(redemptions);
		}
	}

	public PromotionCheckoutEvaluation evaluatePromotionForCheckout(
			Promotion promotion,
			List<StoreCheckoutContext> contexts
	) {
		if (promotion == null) {
			return new PromotionCheckoutEvaluation(
					null,
					false,
					BigDecimal.ZERO,
					BigDecimal.ZERO,
					List.of(),
					null,
					"Promotion code not found");
		}
		try {
			validatePromotionAvailability(promotion);
			CheckoutPromotionPlan plan = planPromotionForCheckout(promotion, contexts);
			List<Long> matchedDishIds = plan.storeAllocations().stream()
					.filter(StorePromotionAllocation::applicable)
					.flatMap(allocation -> allocation.matchedDishIds().stream())
					.distinct()
					.toList();
			return new PromotionCheckoutEvaluation(
					promotion,
					plan.applied(),
					plan.totalEligibleAmount(),
					plan.totalDiscountAmount(),
					matchedDishIds,
					null,
					plan.applied() ? "Promotion is ready for this cart" : "Promotion is not applicable");
		} catch (BadRequestException exception) {
			return new PromotionCheckoutEvaluation(
					promotion,
					false,
					BigDecimal.ZERO,
					BigDecimal.ZERO,
					List.of(),
					null,
					exception.getMessage());
		}
	}

	public PromotionCalculation calculatePromotionForCartItems(Promotion promotion, List<CartItem> cartItems) {
		if (promotion == null) {
			return new PromotionCalculation(null, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
		try {
			CheckoutPromotionPlan checkoutPlan = planPromotionForCheckout(
					promotion,
					buildCheckoutContextsForCartItems(cartItems)
			);
			return new PromotionCalculation(
					promotion,
					checkoutPlan.totalEligibleAmount(),
					checkoutPlan.totalDiscountAmount(),
					checkoutPlan.applied()
			);
		} catch (BadRequestException exception) {
			return new PromotionCalculation(promotion, BigDecimal.ZERO, BigDecimal.ZERO, false);
		}
if (hasMultipleStores(cartItems)) {
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
			return new CheckoutPromotionPlan(null, List.of(), BigDecimal.ZERO, BigDecimal.ZERO, false);
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
		BigDecimal totalEligibleAmount = candidates.stream()
				.filter(StorePromotionAllocation::levelMatched)
				.map(StorePromotionAllocation::eligibleAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		if (promotion.getMinOrderAmount() != null
				&& totalEligibleAmount.compareTo(promotion.getMinOrderAmount()) < 0) {
			throw new BadRequestException(buildInapplicablePromotionMessage(promotion, candidates));
		}
		BigDecimal totalDiscountBasis = applicableAllocations.stream()
				.map(StorePromotionAllocation::discountableAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalDiscountAmount = calculateDiscountAmount(promotion, totalDiscountBasis);
		return new CheckoutPromotionPlan(
				promotion,
				allocateDiscounts(candidates, totalDiscountAmount),
				totalEligibleAmount,
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
		List<Long> normalizedUserLevelIds = normalizeIds(request.eligibleUserLevelIds(), "eligibleUserLevelIds");
		BigDecimal resolvedMinOrderAmount = resolveAmount("minOrderAmount", request.minOrderAmount(), request.minimumOrderAmount());
		BigDecimal resolvedMaxDiscountAmount = resolveAmount("maxDiscountAmount", request.maxDiscountAmount(), request.maximumDiscountAmount());
		validateRequest(request, normalizedDishIds, normalizedUserLevelIds, resolvedMinOrderAmount, resolvedMaxDiscountAmount);
		promotion.setCode(normalizedCode);
		promotion.setName(resolveName(request, normalizedCode));
		promotion.setDescription(StringUtils.hasText(request.description()) ? request.description().trim() : null);
		promotion.setScope(request.scope());
		promotion.setDiscountType(request.discountType());
		promotion.setDiscountTarget(request.discountTarget() == null ? PromotionDiscountTarget.ITEMS : request.discountTarget());
		promotion.setDiscountValue(request.discountValue());
		promotion.setMinOrderAmount(resolvedMinOrderAmount);
		promotion.setMaxDiscountAmount(resolvedMaxDiscountAmount);
		promotion.setCreditCost(request.creditCost());
		promotion.setMinStoreBillAmount(null);
		promotion.setMinCrossStoreBillAmount(null);
		promotion.setUsageLimit(request.usageLimit());
		promotion.setStartsAt(request.startsAt());
		promotion.setEndsAt(request.endsAt());
		promotion.setApplicableDishIds(normalizedDishIds);
		promotion.setEligibleStoreIds(List.of());
		promotion.setEligibleUserLevelIds(normalizedUserLevelIds);
		promotion.setActive(request.active());
	}

	private void validateRequest(
			PromotionRequest request,
			List<Long> normalizedDishIds,
			List<Long> normalizedUserLevelIds,
			BigDecimal resolvedMinOrderAmount,
			BigDecimal resolvedMaxDiscountAmount
	) {
		BigDecimal resolvedCrossStoreBillAmount = normalizeCrossStoreBillAmount(request.minCrossStoreBillAmount());
		if (request.usageLimit() != null && request.usageLimit() < 0) {
			throw new BadRequestException("usageLimit must be at least 0");
		}
		if (request.creditCost() != null && request.creditCost() < 0) {
			throw new BadRequestException("creditCost must be at least 0");
if (resolvedCrossStoreBillAmount != null) {
			throw new BadRequestException("minCrossStoreBillAmount is not supported because promotions only apply to one store bill");
		}
		if (request.startsAt() != null && request.endsAt() != null && request.endsAt().isBefore(request.startsAt())) {
			throw new BadRequestException("endsAt must be after startsAt");
		}
		if (resolvedMinOrderAmount != null && resolvedMinOrderAmount.compareTo(BigDecimal.ZERO) < 0) {
			throw new BadRequestException("minOrderAmount must be at least 0");
		}
		if (resolvedMaxDiscountAmount != null && resolvedMaxDiscountAmount.compareTo(BigDecimal.ZERO) < 0) {
			throw new BadRequestException("maxDiscountAmount must be at least 0");
		}
		if (request.discountType() == PromotionDiscountType.PERCENT
				&& request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
			throw new BadRequestException("discountValue must be at most 100 for percentage promotions");
		}
		List<com.example.registrationotp.model.UserLevelDefinition> userLevels = normalizedUserLevelIds.isEmpty()
				? List.of()
				: userLevelDefinitionRepository.findAllById(normalizedUserLevelIds);
		if (userLevels.size() != normalizedUserLevelIds.size()) {
			throw new NotFoundException("One or more eligible user levels were not found");
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

	private boolean isPromotionCurrentlyAvailable(Promotion promotion) {
		try {
			validatePromotionAvailability(promotion);
			return true;
		} catch (BadRequestException exception) {
			return false;
		}
	}

	private String buildInapplicablePromotionMessage(Promotion promotion, List<StorePromotionAllocation> allocations) {
		BigDecimal totalEligibleAmount = allocations.stream()
				.map(StorePromotionAllocation::eligibleAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalDiscountableAmount = allocations.stream()
				.map(StorePromotionAllocation::discountableAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		boolean anyLevelMatched = allocations.stream()
				.anyMatch(StorePromotionAllocation::levelMatched);
		if (!anyLevelMatched) {
			return "Your current membership level does not qualify for this voucher";
		}
		if (promotion.getScope() == PromotionScope.DISH && totalEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "This voucher only works with matching signature items in your cart";
		}
		if (promotion.getScope() == PromotionScope.ORDER && totalEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "This voucher only works when your cart includes eligible signature items";
		}
		if (promotion.getDiscountTarget() == PromotionDiscountTarget.SHIPPING
				&& totalDiscountableAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "This voucher only applies when the order has a shipping fee";
		}
		if (promotion.getMinOrderAmount() != null && totalEligibleAmount.compareTo(promotion.getMinOrderAmount()) < 0) {
boolean hasStoreSpecialtyItems = allocations.stream()
				.anyMatch(StorePromotionAllocation::containsStoreSpecialtyItems);
		if (hasStoreSpecialtyItems) {
			return "Promotion code only applies to SIGNATURE dishes and cannot be used with store specialty dishes";
		if (promotion.getScope() == PromotionScope.DISH && maxEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "Promotion code does not apply to any dish in the cart";
		if (promotion.getScope() == PromotionScope.ORDER && maxEligibleAmount.compareTo(BigDecimal.ZERO) <= 0) {
			return "Promotion code only applies to SIGNATURE dishes";
		if (promotion.getMinOrderAmount() != null && maxEligibleAmount.compareTo(promotion.getMinOrderAmount()) < 0) {
			if (promotion.getScope() == PromotionScope.DISH) {
				return "The eligible signature item total does not reach the minimum amount for this voucher";
			}
			return "The eligible signature subtotal does not reach the minimum amount for this voucher";
		}
		return "This voucher is not applicable to the current checkout";
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
		boolean levelMatched = promotion.getEligibleUserLevelIds().isEmpty()
				|| context.currentUserLevelIds().stream().anyMatch(promotion.getEligibleUserLevelIds()::contains);
		BigDecimal discountableAmount = calculateDiscountableAmount(
				promotion,
				eligibleAmount,
				context.shippingFeeAmount()
		);
		boolean applicable = levelMatched
				&& discountableAmount.compareTo(BigDecimal.ZERO) > 0;
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
				context.shippingFeeAmount(),
				discountableAmount,
				BigDecimal.ZERO,
				applicable,
				matchedDishIds,
				levelMatched
containsStoreSpecialtyItems,
				context.currentUserLevelId()
		);
	}

	private List<StorePromotionAllocation> allocateDiscounts(List<StorePromotionAllocation> candidates, BigDecimal totalDiscountAmount) {
		List<Integer> applicableIndexes = new ArrayList<>();
		BigDecimal totalDiscountBasis = BigDecimal.ZERO;
		for (int index = 0; index < candidates.size(); index++) {
			StorePromotionAllocation candidate = candidates.get(index);
			if (candidate.applicable()) {
				applicableIndexes.add(index);
				totalDiscountBasis = totalDiscountBasis.add(candidate.discountableAmount());
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
				discountAmount = totalDiscountAmount.multiply(candidate.discountableAmount())
						.divide(totalDiscountBasis, 0, RoundingMode.DOWN);
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

	private BigDecimal calculateDiscountableAmount(
			Promotion promotion,
			BigDecimal eligibleAmount,
			BigDecimal shippingFeeAmount
	) {
		BigDecimal safeEligibleAmount = eligibleAmount == null ? BigDecimal.ZERO : eligibleAmount.max(BigDecimal.ZERO);
		BigDecimal safeShippingFeeAmount = shippingFeeAmount == null ? BigDecimal.ZERO : shippingFeeAmount.max(BigDecimal.ZERO);
		return switch (promotion.getDiscountTarget()) {
			case SHIPPING -> safeShippingFeeAmount;
			case BOTH -> safeEligibleAmount.add(safeShippingFeeAmount);
			case ITEMS -> safeEligibleAmount;
		};
	}

	private List<StoreCheckoutContext> buildCheckoutContextsForCartItems(List<CartItem> cartItems) {
		if (cartItems == null || cartItems.isEmpty()) {
			return List.of();
		}

		Map<Long, List<CartItem>> cartItemsByStoreKey = new LinkedHashMap<>();
		Map<Long, com.example.registrationotp.model.Store> storesByKey = new LinkedHashMap<>();
		long syntheticStoreKey = -1;
		for (CartItem cartItem : cartItems) {
			Long storeKey = cartItem.getStore() != null && cartItem.getStore().getId() != null
					? cartItem.getStore().getId()
					: syntheticStoreKey--;
			cartItemsByStoreKey.computeIfAbsent(storeKey, ignored -> new ArrayList<>()).add(cartItem);
			if (cartItem.getStore() != null) {
				storesByKey.putIfAbsent(storeKey, cartItem.getStore());
			}
		}

		List<StoreCheckoutContext> contexts = new ArrayList<>();
		for (Map.Entry<Long, List<CartItem>> entry : cartItemsByStoreKey.entrySet()) {
			List<CartItem> items = List.copyOf(entry.getValue());
			contexts.add(new StoreCheckoutContext(
					storesByKey.get(entry.getKey()),
					items,
					calculateSubtotal(items),
					List.of(),
					BigDecimal.ZERO
			));
		}
		return List.copyOf(contexts);
private BigDecimal normalizeCrossStoreBillAmount(BigDecimal amount) {
		if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
			return null;
		return amount;
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

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("User role is required");
		}
		return user;
	}

	private List<Long> resolveCurrentUserLevelIds(User user) {
		if (user == null || user.getId() == null) {
			return List.of();
		}
		return userLevelService.resolveCurrentLevelDefinitionIds(user, Instant.now());
	}

	private boolean matchesUserLevel(Promotion promotion, List<Long> currentLevelIds) {
		if (promotion == null || promotion.getEligibleUserLevelIds().isEmpty()) {
			return true;
		}
		return currentLevelIds.stream().anyMatch(promotion.getEligibleUserLevelIds()::contains);
	}

	private boolean isPromotionAccessibleForUser(Promotion promotion, Map<Long, Integer> availableRedemptions) {
		if (promotion == null) {
			return false;
		}
		if (resolveCreditCost(promotion) <= 0) {
			return true;
		}
		return availableRedemptions.getOrDefault(promotion.getId(), 0) > 0;
	}

	private int resolveCreditCost(Promotion promotion) {
		return promotion == null ? 0 : Math.max(promotion.getCreditCost(), 0);
	}

	private Map<Long, Integer> countAvailableRedemptionsByPromotionId(Long userId) {
		if (userId == null) {
			return Map.of();
		}
		Map<Long, Integer> counts = new HashMap<>();
		for (UserPromotionRedemption redemption : userPromotionRedemptionRepository.findAllByUserIdAndUsedAtIsNull(userId)) {
			if (redemption.getPromotion() == null || redemption.getPromotion().getId() == null) {
				continue;
			}
			counts.merge(redemption.getPromotion().getId(), 1, Integer::sum);
		}
		return counts;
	}

	private PublicPromotionCardResponse toPublicPromotionCard(
			Promotion promotion,
			Integer availableRedemptions
	) {
		return new PublicPromotionCardResponse(
				promotion.getId(),
				promotion.getCode(),
				promotion.getName(),
				promotion.getDescription(),
				promotion.getScope(),
				promotion.getDiscountType(),
				promotion.getDiscountTarget(),
				promotion.getDiscountValue(),
				promotion.getMinOrderAmount(),
				promotion.getMaxDiscountAmount(),
				promotion.getCreditCost(),
				List.copyOf(promotion.getApplicableDishIds()),
				List.of(),
				promotion.getStartsAt(),
				promotion.getEndsAt(),
				availableRedemptions
		);
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

	public record PromotionCheckoutEvaluation(
			Promotion promotion,
			boolean applicable,
			BigDecimal eligibleAmount,
			BigDecimal discountAmount,
			List<Long> matchedDishIds,
			com.example.registrationotp.model.Store store,
			String statusSummary
	) {
	}

	public record StoreCheckoutContext(
			com.example.registrationotp.model.Store store,
			List<CartItem> cartItems,
			BigDecimal subtotalAmount,
			List<Long> currentUserLevelIds,
			BigDecimal shippingFeeAmount
	) {
	}

	public record StorePromotionAllocation(
			com.example.registrationotp.model.Store store,
			BigDecimal subtotalAmount,
			BigDecimal eligibleAmount,
			BigDecimal shippingFeeAmount,
			BigDecimal discountableAmount,
			BigDecimal discountAmount,
			boolean applicable,
			List<Long> matchedDishIds,
			boolean levelMatched
boolean containsStoreSpecialtyItems,
			Long currentUserLevelId
	) {
		public StorePromotionAllocation withDiscountAmount(BigDecimal resolvedDiscountAmount) {
			return new StorePromotionAllocation(
					store,
					subtotalAmount,
					eligibleAmount,
					shippingFeeAmount,
					discountableAmount,
					resolvedDiscountAmount,
					applicable,
					matchedDishIds,
					levelMatched
containsStoreSpecialtyItems,
					currentUserLevelId
			);
		}
	}

	public record CheckoutPromotionPlan(
			Promotion promotion,
			List<StorePromotionAllocation> storeAllocations,
			BigDecimal totalEligibleAmount,
			BigDecimal totalDiscountAmount,
			boolean applied
	) {
	}
}
