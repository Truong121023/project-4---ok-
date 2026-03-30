package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Base64;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.util.StringUtils;

import com.example.registrationotp.config.AppMobileProperties;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.example.registrationotp.config.PayOsProperties;
import com.example.registrationotp.dto.CheckoutRequest;
import com.example.registrationotp.dto.CheckoutResponse;
import com.example.registrationotp.dto.EmployeeOrderScanRequest;
import com.example.registrationotp.dto.EmployeeOrderScanResponse;
import com.example.registrationotp.dto.MobileOrderQrResolveResponse;
import com.example.registrationotp.dto.OrderInvoiceDocument;
import com.example.registrationotp.dto.OrderItemResponse;
import com.example.registrationotp.dto.OrderResponse;
import com.example.registrationotp.dto.OrderScanAuditResponse;
import com.example.registrationotp.dto.OrderStageFilter;
import com.example.registrationotp.dto.OrderStatusUpdateRequest;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.PayOsCreatePaymentLinkRequest;
import com.example.registrationotp.dto.PayOsPaymentLinkData;
import com.example.registrationotp.dto.PayOsPaymentStatusResponse;
import com.example.registrationotp.dto.PayOsWebhookRequest;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartItem;
import com.example.registrationotp.model.CartStatus;
import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.Dish;
import com.example.registrationotp.model.EmployeeOrderScanAction;
import com.example.registrationotp.model.OrderAllowedAction;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.OrderScanAudit;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.StoreDish;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserDeliveryAddress;
import com.example.registrationotp.repository.CartItemRepository;
import com.example.registrationotp.repository.CartRepository;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.OrderRepository;
import com.example.registrationotp.repository.OrderScanAuditRepository;
import com.example.registrationotp.repository.PromotionRepository;
import com.example.registrationotp.repository.StoreDishRepository;
import com.example.registrationotp.repository.UserDeliveryAddressRepository;
import com.example.registrationotp.repository.UserRepository;

@Service
public class OrderService {

	private static final Logger log = LoggerFactory.getLogger(OrderService.class);
	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
	private static final String PAYMENT_PROVIDER_PAYOS = "PAYOS";

	private final SessionAuthService sessionAuthService;
	private final CartRepository cartRepository;
	private final CartItemRepository cartItemRepository;
	private final StoreDishRepository storeDishRepository;
	private final OrderRepository orderRepository;
	private final OrderItemRepository orderItemRepository;
	private final OrderScanAuditRepository orderScanAuditRepository;
	private final UserDeliveryAddressRepository userDeliveryAddressRepository;
	private final PromotionRepository promotionRepository;
	private final UserRepository userRepository;
	private final CatalogAvailabilityService catalogAvailabilityService;
	private final PromotionService promotionService;
	private final UserLevelService userLevelService;
	private final PayOsClient payOsClient;
	private final PayOsProperties payOsProperties;
	private final PayOsSignatureService payOsSignatureService;
	private final EmailSender emailSender;
	private final NotificationService notificationService;
	private final TokenGenerator tokenGenerator;
	private final AppMobileProperties appMobileProperties;

	public OrderService(
			SessionAuthService sessionAuthService,
			CartRepository cartRepository,
			CartItemRepository cartItemRepository,
			StoreDishRepository storeDishRepository,
			OrderRepository orderRepository,
			OrderItemRepository orderItemRepository,
			OrderScanAuditRepository orderScanAuditRepository,
			UserDeliveryAddressRepository userDeliveryAddressRepository,
			PromotionRepository promotionRepository,
			UserRepository userRepository,
			CatalogAvailabilityService catalogAvailabilityService,
			PromotionService promotionService,
			UserLevelService userLevelService,
			PayOsClient payOsClient,
			PayOsProperties payOsProperties,
			PayOsSignatureService payOsSignatureService,
			EmailSender emailSender,
			NotificationService notificationService,
			TokenGenerator tokenGenerator,
			AppMobileProperties appMobileProperties
	) {
		this.sessionAuthService = sessionAuthService;
		this.cartRepository = cartRepository;
		this.cartItemRepository = cartItemRepository;
		this.storeDishRepository = storeDishRepository;
		this.orderRepository = orderRepository;
		this.orderItemRepository = orderItemRepository;
		this.orderScanAuditRepository = orderScanAuditRepository;
		this.userDeliveryAddressRepository = userDeliveryAddressRepository;
		this.promotionRepository = promotionRepository;
		this.userRepository = userRepository;
		this.catalogAvailabilityService = catalogAvailabilityService;
		this.promotionService = promotionService;
		this.userLevelService = userLevelService;
		this.payOsClient = payOsClient;
		this.payOsProperties = payOsProperties;
		this.payOsSignatureService = payOsSignatureService;
		this.emailSender = emailSender;
		this.notificationService = notificationService;
		this.tokenGenerator = tokenGenerator;
		this.appMobileProperties = appMobileProperties;
	}

	@Transactional
	public CheckoutResponse checkout(String authorizationHeader, CheckoutRequest request) {
		User user = requireBuyerUser(authorizationHeader);
		UserDeliveryAddress deliveryAddress = userDeliveryAddressRepository.findByIdAndUserId(request.deliveryAddressId(), user.getId())
				.orElseThrow(() -> new NotFoundException("Delivery address not found"));
		DeliveryType deliveryType = resolveDeliveryType(request);
		Instant scheduledDeliveryAt = resolveScheduledDeliveryAt(request, deliveryType);
		Cart cart = cartRepository.findByUserIdAndStatus(user.getId(), CartStatus.OPEN)
				.orElseThrow(() -> new BadRequestException("Cart is empty"));
		List<CartItem> cartItems = cartItemRepository.findAllByCartId(cart.getId());
		if (cartItems.isEmpty()) {
			throw new BadRequestException("Cart is empty");
		}
		if (!StringUtils.hasText(request.returnUrl()) || !StringUtils.hasText(request.cancelUrl())) {
			throw new BadRequestException("returnUrl and cancelUrl are required");
		}
		String returnUrl = request.returnUrl().trim();
		String cancelUrl = request.cancelUrl().trim();

		Map<Long, StoreDish> storeDishByCartItemId = new LinkedHashMap<>();
		Map<Long, List<CartItem>> cartItemsByStoreId = new LinkedHashMap<>();
		for (CartItem cartItem : cartItems) {
			StoreDish storeDish = storeDishRepository.findByStoreIdAndDishId(cartItem.getStore().getId(), cartItem.getDish().getId())
					.orElseThrow(() -> new NotFoundException("Store dish not found"));
			storeDishByCartItemId.put(cartItem.getId(), storeDish);
			cartItemsByStoreId.computeIfAbsent(cartItem.getStore().getId(), ignored -> new ArrayList<>()).add(cartItem);
		}

		for (CartItem cartItem : cartItems) {
			StoreDish storeDish = storeDishByCartItemId.get(cartItem.getId());
			String disabledReason = deliveryType == DeliveryType.SCHEDULED
					? catalogAvailabilityService.resolveStoreDishDisabledReasonAt(storeDish, scheduledDeliveryAt)
					: catalogAvailabilityService.resolveStoreDishDisabledReason(storeDish);
			if (disabledReason != null) {
				throw new BadRequestException(buildAvailabilityMessage(disabledReason, deliveryType));
			}
			if (storeDish.getQuantity() < cartItem.getQuantity()) {
				throw new BadRequestException("quantity exceeds available stock");
			}
		}

		Promotion sharedPromotion = promotionService.resolvePromotion(request.promotionCode());
		Instant checkoutStartedAt = Instant.now();
		List<StoreCheckoutDraft> storeCheckoutDrafts = new ArrayList<>();
		List<PromotionService.StoreCheckoutContext> promotionContexts = new ArrayList<>();
		for (List<CartItem> storeCartItems : cartItemsByStoreId.values()) {
			Store store = storeCartItems.get(0).getStore();
			BigDecimal storeSubtotalAmount = storeCartItems.stream()
					.map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
					.reduce(BigDecimal.ZERO, BigDecimal::add);
			storeCheckoutDrafts.add(new StoreCheckoutDraft(store, storeCartItems, storeSubtotalAmount));
			UserLevelService.CurrentLevelSnapshot currentLevelSnapshot = userLevelService.resolveCurrentLevelSnapshot(user, store.getId(), checkoutStartedAt);
			Long currentUserLevelId = currentLevelSnapshot.level() != null ? currentLevelSnapshot.level().getId() : null;
			promotionContexts.add(new PromotionService.StoreCheckoutContext(
					store,
					storeCartItems,
					storeSubtotalAmount,
					currentUserLevelId
			));
		}
		PromotionService.CheckoutPromotionPlan checkoutPromotionPlan = sharedPromotion == null
				? new PromotionService.CheckoutPromotionPlan(null, List.of(), BigDecimal.ZERO, false)
				: promotionService.planPromotionForCheckout(sharedPromotion, promotionContexts);

		List<StoreOrderPlan> storeOrderPlans = new ArrayList<>();
		Map<Long, PromotionService.StorePromotionAllocation> allocationsByStoreId = new LinkedHashMap<>();
		for (PromotionService.StorePromotionAllocation allocation : checkoutPromotionPlan.storeAllocations()) {
			if (allocation.store() != null) {
				allocationsByStoreId.put(allocation.store().getId(), allocation);
			}
		}
		for (StoreCheckoutDraft storeCheckoutDraft : storeCheckoutDrafts) {
			PromotionService.StorePromotionAllocation allocation = allocationsByStoreId.get(storeCheckoutDraft.store().getId());
			BigDecimal storeDiscountAmount = allocation != null ? allocation.discountAmount() : BigDecimal.ZERO;
			BigDecimal storeTotalAmount = storeCheckoutDraft.subtotalAmount().subtract(storeDiscountAmount).max(BigDecimal.ZERO);
			boolean promotionApplied = allocation != null && allocation.discountAmount().compareTo(BigDecimal.ZERO) > 0;
			storeOrderPlans.add(new StoreOrderPlan(
					storeCheckoutDraft.store(),
					storeCheckoutDraft.cartItems(),
					storeCheckoutDraft.subtotalAmount(),
					storeDiscountAmount,
					storeTotalAmount,
					promotionApplied ? sharedPromotion : null,
					promotionApplied && allocation != null ? allocation.eligibleAmount() : null,
					promotionApplied && allocation != null ? allocation.matchedDishIds() : List.of()
			));
		}

		BigDecimal subtotalAmount = storeOrderPlans.stream()
				.map(StoreOrderPlan::subtotalAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal discountAmount = storeOrderPlans.stream()
				.map(StoreOrderPlan::discountAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		BigDecimal totalAmount = storeOrderPlans.stream()
				.map(StoreOrderPlan::totalAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new BadRequestException("Order total must be greater than 0");
		}

		markDeliveryAddressUsed(deliveryAddress);
		Instant paymentExpiresAt = Instant.now().plusSeconds(resolvePaymentExpirySeconds());
		List<Order> savedOrders = new ArrayList<>();
		for (StoreOrderPlan storeOrderPlan : storeOrderPlans) {
			Order order = new Order();
			order.setUser(user);
			order.setStatus(OrderStatus.PENDING);
			order.setPaymentStatus(PaymentStatus.PENDING);
			order.setPaymentProvider(PAYMENT_PROVIDER_PAYOS);
			order.setSubtotalAmount(storeOrderPlan.subtotalAmount());
			order.setDiscountAmount(storeOrderPlan.discountAmount());
			order.setTotalAmount(storeOrderPlan.totalAmount());
			order.setPromotionCode(storeOrderPlan.appliedPromotion() != null ? storeOrderPlan.appliedPromotion().getCode() : null);
			order.setPromotionScope(storeOrderPlan.appliedPromotion() != null ? storeOrderPlan.appliedPromotion().getScope() : null);
			order.setPromotionEligibleAmount(storeOrderPlan.appliedPromotion() != null ? storeOrderPlan.promotionEligibleAmount() : null);
			order.setPromotionDishIds(storeOrderPlan.promotionDishIds());
			order.setDeliveryType(deliveryType);
			order.setScheduledDeliveryAt(scheduledDeliveryAt);
			order.setDeliveryFullName(deliveryAddress.getFullName());
			order.setDeliveryPhoneNumber(deliveryAddress.getPhoneNumber());
			order.setDeliveryAddress(deliveryAddress.getDeliveryAddress());
			order.setDeliveryAddressId(deliveryAddress.getId());
			order.setPaymentReturnUrl(returnUrl);
			order.setPaymentCancelUrl(cancelUrl);
			order.setPaymentExpiresAt(paymentExpiresAt);
			Order savedOrder = orderRepository.save(order);

			for (CartItem cartItem : storeOrderPlan.cartItems()) {
				StoreDish storeDish = storeDishByCartItemId.get(cartItem.getId());
				OrderItem orderItem = new OrderItem();
				orderItem.setOrder(savedOrder);
				orderItem.setStore(storeDish.getStore());
				orderItem.setDish(storeDish.getDish());
				orderItem.setQuantity(cartItem.getQuantity());
				orderItem.setUnitPrice(catalogAvailabilityService.resolveEffectivePrice(storeDish));
				orderItemRepository.save(orderItem);

				int remainingQuantity = Math.max(storeDish.getQuantity() - cartItem.getQuantity(), 0);
				storeDish.setQuantity(remainingQuantity);
				if (remainingQuantity == 0) {
					storeDish.setAvailable(false);
				}
				storeDishRepository.save(storeDish);
			}

			savedOrders.add(savedOrder);
		}

		if (sharedPromotion != null) {
			int appliedPromotionCount = (int) storeOrderPlans.stream()
					.filter(storeOrderPlan -> storeOrderPlan.appliedPromotion() != null)
					.count();
			promotionService.incrementUsage(sharedPromotion, appliedPromotionCount);
		}

		Order primaryOrder = primaryOrder(savedOrders);
		Long payosOrderCode = primaryOrder.getId();
		for (Order savedOrder : savedOrders) {
			savedOrder.setPayosOrderCode(payosOrderCode);
		}

		PayOsPaymentLinkData paymentLinkData = payOsClient.createPaymentLink(
				buildPaymentLinkRequest(payosOrderCode, primaryOrder, user, cartItems, request, totalAmount)
		);
		for (Order savedOrder : savedOrders) {
			savedOrder.setPaymentLinkId(paymentLinkData.paymentLinkId());
			savedOrder.setPaymentCheckoutUrl(paymentLinkData.checkoutUrl());
			savedOrder.setPaymentQrCode(paymentLinkData.qrCode());
		}
		List<Order> finalizedOrders = orderRepository.saveAll(savedOrders);
		sendPendingPaymentReminder(finalizedOrders);
		createOrderCreatedNotifications(finalizedOrders);

		cartItemRepository.deleteAllByCartId(cart.getId());
		return toCheckoutResponse(finalizedOrders);
	}

	@Transactional(readOnly = true)
	public PageResponse<OrderResponse> listMyOrders(String authorizationHeader, int page, int size) {
		User user = requireBuyerUser(authorizationHeader);
		return PageResponse.from(orderRepository.findAllByUserId(user.getId(), buildPageable(page, size))
				.map(order -> toResponse(order, null, user)));
	}

	@Transactional(readOnly = true)
	public OrderResponse getMyOrder(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		Order order = orderRepository.findByIdAndUserId(id, user.getId())
				.orElseThrow(() -> new NotFoundException("Order not found"));
		return toResponse(order, null, user);
	}

	@Transactional
	public OrderResponse refreshMyPaymentStatus(String authorizationHeader, Long id, String originHeader, String refererHeader) {
		User user = requireBuyerUser(authorizationHeader);
		Order order = orderRepository.findByIdAndUserId(id, user.getId())
				.orElseThrow(() -> new NotFoundException("Order not found"));
		refreshPaymentStatus(order, originHeader, refererHeader);
		return toResponse(findOrder(id), null, user);
	}

	@Transactional(readOnly = true)
	public OrderInvoiceDocument getMyOrderInvoice(String authorizationHeader, Long id) {
		User user = requireBuyerUser(authorizationHeader);
		Order order = orderRepository.findByIdAndUserId(id, user.getId())
				.orElseThrow(() -> new NotFoundException("Order not found"));
		return buildInvoiceDocument(order);
	}

	@Transactional(readOnly = true)
	public OrderInvoiceDocument getAdminOrderInvoice(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		resolveVisibleStoreId(operator, order);
		return buildInvoiceDocument(order);
	}

	@Transactional(readOnly = true)
	public OrderInvoiceDocument getPublicInvoiceByQrToken(String qrToken) {
		Order order = findOrderByQrToken(qrToken);
		return buildInvoiceDocument(order);
	}

	@Transactional(readOnly = true)
	public String buildPublicOrderQrEntryPage(String qrToken) {
		Order order = findOrderByQrToken(qrToken);
		String deepLinkUrl = buildMobileOrderQrDeepLink(order.getInvoiceQrToken());
		String fallbackUrl = buildAbsolutePublicInvoiceUrl(order);
		return """
				<!DOCTYPE html>
				<html lang="en">
				<head>
				  <meta charset="UTF-8" />
				  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
				  <title>Open Tea Matcha App</title>
				  <style>
				    body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
				    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
				    .card { width: min(460px, 100%%); background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); }
				    h1 { margin: 0 0 10px; font-size: 26px; }
				    p { margin: 0 0 12px; line-height: 1.55; color: #475569; }
				    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
				    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 600; }
				    .btn-primary { background: #0f766e; color: #ffffff; }
				    .btn-secondary { background: #e2e8f0; color: #0f172a; }
				    .small { margin-top: 16px; font-size: 13px; color: #64748b; }
				  </style>
				</head>
				<body>
				  <div class="wrap">
				    <div class="card">
				      <h1>Open Tea Matcha App</h1>
				      <p>This QR can open the Tea Matcha mobile app for order tracking or staff delivery workflow.</p>
				      <p>If the app does not open automatically, use one of the buttons below.</p>
				      <div class="actions">
				        <a class="btn btn-primary" href="%s">Open App</a>
				        <a class="btn btn-secondary" href="%s">View Web Invoice</a>
				      </div>
				      <div class="small">If the app is installed, this page will try to open it automatically.</div>
				    </div>
				  </div>
				  <script>
				    const appUrl = %s;
				    const fallbackUrl = %s;
				    const startedAt = Date.now();
				    window.location.replace(appUrl);
				    window.setTimeout(() => {
				      if (Date.now() - startedAt < 1800) {
				        window.location.replace(fallbackUrl);
				      }
				    }, 1200);
				  </script>
				</body>
				</html>
				""".formatted(
				escapeHtml(deepLinkUrl),
				escapeHtml(fallbackUrl),
				toJsStringLiteral(deepLinkUrl),
				toJsStringLiteral(fallbackUrl)
		);
	}

	@Transactional
	public MobileOrderQrResolveResponse resolveMobileOrderQr(String authorizationHeader, String qrToken) {
		User actor = sessionAuthService.requireUser(authorizationHeader);
		Order order = findOrderByQrToken(qrToken);
		return switch (actor.getRole()) {
			case USER -> resolveUserMobileQr(actor, order);
			case STAFF -> resolveStaffMobileQr(actor, order);
			case SHIPPER -> resolveShipperMobileQr(actor, order);
			case ADMIN, MANAGER -> resolveAdminMobileQr(actor, order);
		};
	}

	@Transactional
	public OrderResponse confirmOrder(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		if (!canConfirmOrder(order)) {
			throw new BadRequestException("Order is not ready for confirmation");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setStatus(OrderStatus.CONFIRMED);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, visibleStoreId, operator);
	}

	@Transactional
	public OrderResponse cancelOrderByAdmin(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		List<Order> paymentGroup = loadPaymentGroup(order);
		if (paymentGroup.size() > 1) {
			throw new BadRequestException("Shared payment orders cannot be cancelled individually");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		cancelOrder(order);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, visibleStoreId, operator);
	}

	@Transactional
	public OrderResponse markOrderPaidByAdmin(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		List<Order> paymentGroup = loadPaymentGroup(order);
		if (visibleStoreId != null && paymentGroup.size() > 1) {
			throw new BadRequestException("Shared payment orders can only be marked paid by admin");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(paymentGroup);
		boolean newlyPaid = applyPaymentStatusUpdate(paymentGroup, PaymentStatus.PAID);
		List<Order> savedOrders = orderRepository.saveAll(paymentGroup);
		if (newlyPaid) {
			sendPaymentSuccessThanks(savedOrders);
		}
		notifyEmployeeTaskChanges(savedOrders, previousStates);
		notifyOrderStateChanges(savedOrders, previousStates);
		return toResponse(findOrder(id), visibleStoreId, operator);
	}

	@Transactional
	public OrderResponse generateInvoice(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Invoice can only be generated for paid orders");
		}
		if (order.getStatus() == OrderStatus.CANCELLED) {
			throw new BadRequestException("Invoice cannot be generated for cancelled orders");
		}
		ensureInvoiceGenerated(order);
		Order savedOrder = orderRepository.save(order);
		return toResponse(savedOrder, visibleStoreId, operator);
	}

	@Transactional(readOnly = true)
	public List<OrderScanAuditResponse> listOrderScanHistory(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		resolveVisibleStoreId(operator, order);
		return orderScanAuditRepository.findAllByOrderIdOrderByScannedAtDesc(id).stream()
				.map(OrderScanAuditResponse::from)
				.toList();
	}

	@Transactional
	public EmployeeOrderScanResponse scanOrder(String authorizationHeader, EmployeeOrderScanRequest request) {
		User employee = requireEmployeeOperator(authorizationHeader, null);
		String qrToken = normalizeQrToken(request.qrToken());
		Order order = orderRepository.findByInvoiceQrToken(qrToken).orElse(null);
		if (order == null) {
			return new EmployeeOrderScanResponse(false, "Invoice QR is invalid or expired", null, null, null, null);
		}

		Long visibleStoreId = employee.getWorkingStore().getId();
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), visibleStoreId)) {
			recordScanAudit(order, employee, request.action(), false, "Order does not belong to your store");
			return new EmployeeOrderScanResponse(false, "Order does not belong to your store", null, null, null, null);
		}

		try {
			Order savedOrder = switch (request.action()) {
				case ACCEPT_PREPARING -> acceptPreparingOrderScan(order, employee);
				case ACCEPT_DELIVERY -> acceptDeliveryOrderScan(order, employee);
			};
			OrderResponse response = toResponse(savedOrder, visibleStoreId, employee);
			User claimedBy = request.action() == EmployeeOrderScanAction.ACCEPT_PREPARING
					? savedOrder.getPreparingStaff()
					: savedOrder.getDeliveringShipper();
			recordScanAudit(savedOrder, employee, request.action(), true, null);
			return new EmployeeOrderScanResponse(
					true,
					"Order claimed successfully",
					response,
					claimedBy != null ? claimedBy.getId() : null,
					claimedBy != null ? claimedBy.getFullName() : null,
					claimedBy != null ? claimedBy.getRole() : null
			);
		} catch (BadRequestException | ConflictException | ForbiddenException exception) {
			recordScanAudit(order, employee, request.action(), false, exception.getMessage());
			return new EmployeeOrderScanResponse(
					false,
					exception.getMessage(),
					toResponse(order, visibleStoreId, employee),
					order.getPreparingStaff() != null ? order.getPreparingStaff().getId() : order.getDeliveringShipper() != null ? order.getDeliveringShipper().getId() : null,
					order.getPreparingStaff() != null ? order.getPreparingStaff().getFullName() : order.getDeliveringShipper() != null ? order.getDeliveringShipper().getFullName() : null,
					order.getPreparingStaff() != null ? order.getPreparingStaff().getRole() : order.getDeliveringShipper() != null ? order.getDeliveringShipper().getRole() : null
			);
		}
	}

	@Transactional(readOnly = true)
	public PageResponse<OrderResponse> listEmployeeOrders(
			String authorizationHeader,
			Boolean mine,
			String search,
			int page,
			int size
	) {
		User employee = requireEmployeeOperator(authorizationHeader, null);
		Long visibleStoreId = employee.getWorkingStore().getId();
		Specification<Order> specification = buildEmployeeOrderSpecification(employee, Boolean.TRUE.equals(mine), search);
		return PageResponse.from(orderRepository.findAll(specification, buildPageable(page, size))
				.map(order -> toResponse(order, visibleStoreId, employee)));
	}

	@Transactional(readOnly = true)
	public OrderResponse getEmployeeOrder(String authorizationHeader, Long id) {
		User employee = requireEmployeeOperator(authorizationHeader, null);
		Order order = findOrder(id);
		ensureEmployeeCanAccessOrder(employee, order);
		return toResponse(order, employee.getWorkingStore().getId(), employee);
	}

	@Transactional
	public OrderResponse acceptPreparingOrder(String authorizationHeader, Long id) {
		User staff = requireEmployeeOperator(authorizationHeader, Role.STAFF);
		Order order = findOrder(id);
		ensureEmployeeCanAccessOrder(staff, order);
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Only paid orders can be accepted for preparation");
		}
		if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.PREPARING) {
			throw new BadRequestException("Order is not available for preparation");
		}
		if (order.getPreparingStaff() != null && !order.getPreparingStaff().getId().equals(staff.getId())) {
			throw new ConflictException("Order is already being prepared by another staff member");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setPreparingStaff(staff);
		order.setStatus(OrderStatus.PREPARING);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, staff.getWorkingStore().getId(), staff);
	}

	@Transactional
	public OrderResponse markOrderReadyForShipper(String authorizationHeader, Long id) {
		User staff = requireEmployeeOperator(authorizationHeader, Role.STAFF);
		Order order = findOrder(id);
		ensureEmployeeCanAccessOrder(staff, order);
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Only paid orders can be marked ready for shipper");
		}
		if (order.getStatus() != OrderStatus.PREPARING) {
			throw new BadRequestException("Order is not currently being prepared");
		}
		if (order.getPreparingStaff() == null || !order.getPreparingStaff().getId().equals(staff.getId())) {
			throw new ForbiddenException("Only the assigned staff can mark this order ready for shipper");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setStatus(OrderStatus.READY_FOR_SHIPPER);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, staff.getWorkingStore().getId(), staff);
	}

	@Transactional
	public OrderResponse acceptDeliveryOrder(String authorizationHeader, Long id) {
		User shipper = requireEmployeeOperator(authorizationHeader, Role.SHIPPER);
		Order order = findOrder(id);
		ensureEmployeeCanAccessOrder(shipper, order);
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Only paid orders can be accepted for delivery");
		}
		if (order.getStatus() != OrderStatus.READY_FOR_SHIPPER && order.getStatus() != OrderStatus.OUT_FOR_DELIVERY) {
			throw new BadRequestException("Order is not available for delivery");
		}
		if (order.getDeliveringShipper() != null && !order.getDeliveringShipper().getId().equals(shipper.getId())) {
			throw new ConflictException("Order is already being delivered by another shipper");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setDeliveringShipper(shipper);
		order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, shipper.getWorkingStore().getId(), shipper);
	}

	@Transactional
	public OrderResponse completeDeliveryOrder(String authorizationHeader, Long id) {
		User shipper = requireEmployeeOperator(authorizationHeader, Role.SHIPPER);
		Order order = findOrder(id);
		ensureEmployeeCanAccessOrder(shipper, order);
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Only paid orders can be completed");
		}
		if (order.getStatus() != OrderStatus.OUT_FOR_DELIVERY) {
			throw new BadRequestException("Order is not out for delivery");
		}
		if (order.getDeliveringShipper() == null || !order.getDeliveringShipper().getId().equals(shipper.getId())) {
			throw new ForbiddenException("Only the assigned shipper can complete this delivery");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setStatus(OrderStatus.COMPLETED);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return toResponse(savedOrder, shipper.getWorkingStore().getId(), shipper);
	}

	@Transactional(readOnly = true)
	public PageResponse<OrderResponse> listOrders(
			String authorizationHeader,
			OrderStatus status,
			PaymentStatus paymentStatus,
			OrderStageFilter stage,
			Long storeId,
			String search,
			int page,
			int size
	) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Long visibleStoreId = resolveOrderListStoreId(operator, storeId);
		Specification<Order> specification = buildOrderSpecification(status, paymentStatus, stage, visibleStoreId, search);
		return PageResponse.from(orderRepository.findAll(specification, buildPageable(page, size))
				.map(order -> toResponse(order, visibleStoreId, operator)));
	}

	@Transactional(readOnly = true)
	public OrderResponse getOrder(String authorizationHeader, Long id) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		return toResponse(order, visibleStoreId, operator);
	}

	@Transactional
	public OrderResponse updateOrderStatus(String authorizationHeader, Long id, OrderStatusUpdateRequest request) {
		User operator = sessionAuthService.requireAdminOrManager(authorizationHeader);
		Order order = findOrder(id);
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		if (request.status() == null
				&& request.paymentStatus() == null
				&& request.preparingStaffId() == null
				&& request.deliveringShipperId() == null) {
			throw new BadRequestException("At least one order update field is required");
		}
		if (request.preparingStaffId() != null || request.deliveringShipperId() != null) {
			throw new BadRequestException("Direct staff or shipper assignment is not allowed in this workflow");
		}
		if (request.status() != null
				&& request.status() != OrderStatus.CONFIRMED
				&& request.status() != OrderStatus.CANCELLED) {
			throw new BadRequestException("Admin or Manager can only confirm or cancel orders directly");
		}
		if (request.status() == OrderStatus.CONFIRMED
				&& request.paymentStatus() != PaymentStatus.PAID
				&& order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Order must be marked paid before it can be confirmed");
		}

		List<Order> paymentGroup = loadPaymentGroup(order);
		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(paymentGroup);
		boolean newlyPaid = applyPaymentStatusUpdate(paymentGroup, request.paymentStatus());
		if (request.status() != null) {
			if (request.status() == OrderStatus.CANCELLED && paymentGroup.size() > 1) {
				throw new BadRequestException("Shared payment orders cannot be cancelled individually");
			}
			applyStatusUpdate(order, request.status());
		}

		orderRepository.saveAll(paymentGroup);
		Order savedOrder = orderRepository.save(order);
		if (newlyPaid) {
			sendPaymentSuccessThanks(paymentGroup);
		}
		notifyEmployeeTaskChanges(paymentGroup, previousStates);
		notifyOrderStateChanges(paymentGroup, previousStates);
		return toResponse(savedOrder, visibleStoreId, operator);
	}

	@Transactional
	public void handlePayOsWebhook(PayOsWebhookRequest request) {
		if (request == null || request.data() == null) {
			throw new BadRequestException("Invalid payOS webhook payload");
		}
		if (!payOsSignatureService.isValidWebhookSignature(request.data(), request.signature())) {
			throw new BadRequestException("Invalid payOS webhook signature");
		}
		List<Order> orders = orderRepository.findAllByPayosOrderCode(request.data().orderCode());
		if (orders.isEmpty()) {
			return;
		}
		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(orders);

		boolean newlyPaid = false;
		if (Boolean.TRUE.equals(request.success()) && "00".equals(request.data().code())) {
			for (Order order : orders) {
				order.setPaymentReference(request.data().reference());
				order.setPaymentLinkId(request.data().paymentLinkId());
				newlyPaid = markOrderPaid(order, request.data().reference()) || newlyPaid;
			}
		} else {
			for (Order order : orders) {
				order.setPaymentReference(request.data().reference());
				order.setPaymentLinkId(request.data().paymentLinkId());
			}
		}
		List<Order> savedOrders = orderRepository.saveAll(orders);
		if (newlyPaid) {
			sendPaymentSuccessThanks(savedOrders);
		}
		notifyEmployeeTaskChanges(savedOrders, previousStates);
		notifyOrderStateChanges(savedOrders, previousStates);
	}

	private void refreshPaymentStatus(Order order, String originHeader, String refererHeader) {
		List<Order> paymentGroup = loadPaymentGroup(order);
		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(paymentGroup);
		Order primaryOrder = primaryOrder(paymentGroup);
		if (primaryOrder.getPayosOrderCode() == null) {
			throw new BadRequestException("Order is not linked to payOS");
		}
		PayOsPaymentStatusResponse paymentStatus;
		try {
			paymentStatus = payOsClient.getPaymentStatus(primaryOrder.getPayosOrderCode());
		} catch (BadRequestException exception) {
			if (canRecreatePayment(primaryOrder, paymentGroup) && isPaymentLinkExpired(primaryOrder)) {
				recreatePaymentLink(paymentGroup, primaryOrder, originHeader, refererHeader);
				return;
			}
			throw exception;
		}
		String status = paymentStatus.status();
		boolean newlyPaid = false;
		if ("PAID".equalsIgnoreCase(status)) {
			for (Order groupOrder : paymentGroup) {
				groupOrder.setPaymentLinkId(paymentStatus.id());
				newlyPaid = markOrderPaid(groupOrder, groupOrder.getPaymentReference()) || newlyPaid;
			}
		} else if (shouldRecreatePaymentLink(primaryOrder, paymentGroup, status)) {
			recreatePaymentLink(paymentGroup, primaryOrder, originHeader, refererHeader);
			return;
		} else if ("CANCELLED".equalsIgnoreCase(status)) {
			for (Order groupOrder : paymentGroup) {
				groupOrder.setPaymentLinkId(paymentStatus.id());
				cancelOrder(groupOrder);
			}
		} else if ("PENDING".equalsIgnoreCase(status)) {
			for (Order groupOrder : paymentGroup) {
				groupOrder.setPaymentLinkId(paymentStatus.id());
				groupOrder.setPaymentStatus(PaymentStatus.PENDING);
				groupOrder.setStatus(OrderStatus.PENDING);
			}
		}
		List<Order> savedOrders = orderRepository.saveAll(paymentGroup);
		if (newlyPaid) {
			sendPaymentSuccessThanks(savedOrders);
		}
		notifyEmployeeTaskChanges(savedOrders, previousStates);
		notifyOrderStateChanges(savedOrders, previousStates);
	}

	private boolean canRecreatePayment(Order primaryOrder, List<Order> paymentGroup) {
		if (primaryOrder.getPaymentStatus() == PaymentStatus.PAID || primaryOrder.getStatus() == OrderStatus.CANCELLED) {
			return false;
		}
		if (primaryOrder.getPaymentStatus() == PaymentStatus.CANCELLED) {
			return false;
		}
		return paymentGroup.stream().noneMatch(groupOrder ->
				groupOrder.getPaymentStatus() == PaymentStatus.PAID
						|| groupOrder.getPaymentStatus() == PaymentStatus.CANCELLED
						|| groupOrder.getStatus() == OrderStatus.CANCELLED
		);
	}

	private boolean shouldRecreatePaymentLink(Order primaryOrder, List<Order> paymentGroup, String payOsStatus) {
		if (!canRecreatePayment(primaryOrder, paymentGroup)) {
			return false;
		}
		if (!StringUtils.hasText(primaryOrder.getPaymentCheckoutUrl())) {
			return true;
		}
		if (isPaymentLinkExpired(primaryOrder)) {
			return true;
		}
		return !StringUtils.hasText(payOsStatus) || !"PENDING".equalsIgnoreCase(payOsStatus);
	}

	private boolean isPaymentLinkExpired(Order order) {
		return order.getPaymentExpiresAt() == null || !order.getPaymentExpiresAt().isAfter(Instant.now());
	}

	private void recreatePaymentLink(List<Order> paymentGroup, Order primaryOrder, String originHeader, String refererHeader) {
		ensurePaymentRedirectUrls(primaryOrder, originHeader, refererHeader);

		List<OrderItem> orderItems = new ArrayList<>();
		for (Order groupOrder : paymentGroup) {
			orderItems.addAll(orderItemRepository.findAllByOrderId(groupOrder.getId()));
		}
		if (orderItems.isEmpty()) {
			throw new BadRequestException("Order has no items for payment recreation");
		}

		PayOsPaymentLinkData paymentLinkData = null;
		Long payosOrderCode = null;
		Long oldPayosOrderCode = primaryOrder.getPayosOrderCode();
		String oldPaymentLinkId = primaryOrder.getPaymentLinkId();
		String oldPaymentCheckoutUrl = primaryOrder.getPaymentCheckoutUrl();
		for (int attempt = 0; attempt < 5; attempt++) {
			payosOrderCode = nextPayOsOrderCode();
			Instant paymentExpiresAt = Instant.now().plusSeconds(resolvePaymentExpirySeconds());
			primaryOrder.setPaymentExpiresAt(paymentExpiresAt);
			try {
				paymentLinkData = payOsClient.createPaymentLink(
						buildPaymentLinkRequest(
								payosOrderCode,
								primaryOrder,
								orderItems,
								sumOrderAmounts(paymentGroup)
						)
				);
				break;
			} catch (ConflictException exception) {
				log.warn("PayOS order code {} already exists while recreating payment for order {}", payosOrderCode, primaryOrder.getId());
			}
		}

		if (paymentLinkData == null || payosOrderCode == null) {
			throw new ConflictException("Could not create a new payOS payment session");
		}
		validateRecreatedPaymentLink(primaryOrder, oldPaymentCheckoutUrl, payosOrderCode, paymentLinkData);

		for (Order groupOrder : paymentGroup) {
			groupOrder.setPayosOrderCode(payosOrderCode);
			groupOrder.setPaymentStatus(PaymentStatus.PENDING);
			groupOrder.setStatus(OrderStatus.PENDING);
			groupOrder.setPaidAt(null);
			groupOrder.setPaymentReference(null);
			groupOrder.setPaymentLinkId(paymentLinkData.paymentLinkId());
			groupOrder.setPaymentCheckoutUrl(paymentLinkData.checkoutUrl());
			groupOrder.setPaymentQrCode(paymentLinkData.qrCode());
			groupOrder.setPaymentExpiresAt(primaryOrder.getPaymentExpiresAt());
		}
		orderRepository.saveAll(paymentGroup);
		log.info(
				"Recreated PayOS payment session for orderId={} oldPayosOrderCode={} newPayosOrderCode={} oldPaymentLinkId={} newPaymentLinkId={} newPaymentCheckoutUrl={} newPaymentExpiresAt={}",
				primaryOrder.getId(),
				oldPayosOrderCode,
				payosOrderCode,
				oldPaymentLinkId,
				paymentLinkData.paymentLinkId(),
				paymentLinkData.checkoutUrl(),
				primaryOrder.getPaymentExpiresAt()
		);
	}

	private void ensurePaymentRedirectUrls(Order primaryOrder, String originHeader, String refererHeader) {
		if (StringUtils.hasText(primaryOrder.getPaymentReturnUrl()) && StringUtils.hasText(primaryOrder.getPaymentCancelUrl())) {
			return;
		}

		String resolvedOrigin = resolveRequestOrigin(originHeader, refererHeader);
		if (!StringUtils.hasText(resolvedOrigin)) {
			throw new ConflictException("Order was created before payment refresh patch and cannot recreate PayOS link automatically");
		}

		if (!StringUtils.hasText(primaryOrder.getPaymentReturnUrl())) {
			primaryOrder.setPaymentReturnUrl(resolvedOrigin + "/payment/success");
		}
		if (!StringUtils.hasText(primaryOrder.getPaymentCancelUrl())) {
			primaryOrder.setPaymentCancelUrl(resolvedOrigin + "/payment/cancel");
		}
		log.info(
				"Backfilled payment redirect URLs for orderId={} origin={} returnUrl={} cancelUrl={}",
				primaryOrder.getId(),
				resolvedOrigin,
				primaryOrder.getPaymentReturnUrl(),
				primaryOrder.getPaymentCancelUrl()
		);
	}

	private String resolveRequestOrigin(String originHeader, String refererHeader) {
		if (StringUtils.hasText(originHeader)) {
			return trimTrailingSlash(originHeader.trim());
		}
		if (!StringUtils.hasText(refererHeader)) {
			return null;
		}
		try {
			URI referer = new URI(refererHeader.trim());
			if (!StringUtils.hasText(referer.getScheme()) || !StringUtils.hasText(referer.getHost())) {
				return null;
			}
			StringBuilder origin = new StringBuilder()
					.append(referer.getScheme())
					.append("://")
					.append(referer.getHost());
			if (referer.getPort() != -1) {
				origin.append(":").append(referer.getPort());
			}
			return origin.toString();
		} catch (URISyntaxException exception) {
			return null;
		}
	}

	private String trimTrailingSlash(String value) {
		if (!StringUtils.hasText(value)) {
			return value;
		}
		int endIndex = value.length();
		while (endIndex > 0 && value.charAt(endIndex - 1) == '/') {
			endIndex--;
		}
		return value.substring(0, endIndex);
	}

	private void validateRecreatedPaymentLink(
			Order primaryOrder,
			String oldPaymentCheckoutUrl,
			Long newPayosOrderCode,
			PayOsPaymentLinkData paymentLinkData
	) {
		if (!StringUtils.hasText(paymentLinkData.checkoutUrl())) {
			throw new ConflictException("payOS did not return a new checkout URL");
		}
		if (StringUtils.hasText(oldPaymentCheckoutUrl) && oldPaymentCheckoutUrl.equals(paymentLinkData.checkoutUrl())) {
			throw new ConflictException("payOS returned the same checkout URL; new payment session was not created");
		}
		if (primaryOrder.getPaymentExpiresAt() == null || !primaryOrder.getPaymentExpiresAt().isAfter(Instant.now())) {
			throw new ConflictException("payOS returned an expired payment session");
		}
		if (newPayosOrderCode == null || !newPayosOrderCode.equals(paymentLinkData.orderCode())) {
			throw new ConflictException("payOS returned mismatched order code for recreated payment session");
		}
	}

	private boolean markOrderPaid(Order order, String paymentReference) {
		if (order.getPaymentStatus() == PaymentStatus.PAID) {
			return false;
		}
		order.setPaymentStatus(PaymentStatus.PAID);
		if (order.getStatus() == OrderStatus.PENDING) {
			order.setStatus(OrderStatus.PENDING);
		}
		order.setPaidAt(Instant.now());
		if (StringUtils.hasText(paymentReference)) {
			order.setPaymentReference(paymentReference);
		}
		markDeliveryAddressVerified(order);
		ensureInvoiceGenerated(order);
		return true;
	}

	private void applyStatusUpdate(Order order, OrderStatus targetStatus) {
		if (targetStatus == OrderStatus.CANCELLED) {
			cancelOrder(order);
			return;
		}
		order.setStatus(targetStatus);
	}

	private boolean applyPaymentStatusUpdate(List<Order> orders, PaymentStatus targetPaymentStatus) {
		boolean newlyPaid = false;
		for (Order order : orders) {
			newlyPaid = applyPaymentStatusUpdate(order, targetPaymentStatus) || newlyPaid;
		}
		return newlyPaid;
	}

	private boolean applyPaymentStatusUpdate(Order order, PaymentStatus targetPaymentStatus) {
		if (targetPaymentStatus == null) {
			return false;
		}
		if (targetPaymentStatus != PaymentStatus.PENDING && targetPaymentStatus != PaymentStatus.PAID) {
			throw new BadRequestException("Only paymentStatus PENDING or PAID can be updated manually");
		}
		if (targetPaymentStatus == PaymentStatus.PAID) {
			boolean newlyPaid = order.getPaymentStatus() != PaymentStatus.PAID;
			order.setPaymentStatus(PaymentStatus.PAID);
			if (order.getPaidAt() == null) {
				order.setPaidAt(Instant.now());
			}
			if (order.getStatus() == OrderStatus.PENDING) {
				order.setStatus(OrderStatus.PENDING);
			}
			if (newlyPaid) {
				markDeliveryAddressVerified(order);
				ensureInvoiceGenerated(order);
			}
			return newlyPaid;
		}

		order.setPaymentStatus(PaymentStatus.PENDING);
		order.setPaidAt(null);
		order.setStatus(OrderStatus.PENDING);
		order.setPreparingStaff(null);
		order.setDeliveringShipper(null);
		clearInvoiceData(order);
		return false;
	}

	private void applyAssignments(Order order, OrderStatusUpdateRequest request, Long visibleStoreId) {
		if (request.preparingStaffId() != null) {
			order.setPreparingStaff(resolveAssignedUser(request.preparingStaffId(), Role.STAFF, order, visibleStoreId, "preparingStaffId"));
		}
		if (request.deliveringShipperId() != null) {
			order.setDeliveringShipper(resolveAssignedUser(request.deliveringShipperId(), Role.SHIPPER, order, visibleStoreId, "deliveringShipperId"));
		}
	}

	private User resolveAssignedUser(Long userId, Role expectedRole, Order order, Long visibleStoreId, String fieldName) {
		User assignedUser = userRepository.findById(userId)
				.orElseThrow(() -> new NotFoundException("Assigned user not found"));
		if (assignedUser.getRole() != expectedRole) {
			throw new BadRequestException(fieldName + " must belong to role " + expectedRole);
		}
		if (assignedUser.getWorkingStore() == null) {
			throw new BadRequestException(fieldName + " must have a working store");
		}
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), assignedUser.getWorkingStore().getId())) {
			throw new BadRequestException(fieldName + " must belong to a store included in this order");
		}
		if (visibleStoreId != null && !visibleStoreId.equals(assignedUser.getWorkingStore().getId())) {
			throw new ForbiddenException("Assigned user must belong to your store");
		}
		return assignedUser;
	}

	private void cancelOrder(Order order) {
		if (order.getPaymentStatus() == PaymentStatus.CANCELLED && order.getStatus() == OrderStatus.CANCELLED) {
			return;
		}
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			restoreInventory(order);
			restorePromotionUsage(order);
		}
		order.setPaymentStatus(PaymentStatus.CANCELLED);
		order.setStatus(OrderStatus.CANCELLED);
	}

	private void restoreInventory(Order order) {
		List<OrderItem> items = orderItemRepository.findAllByOrderId(order.getId());
		for (OrderItem item : items) {
			StoreDish storeDish = storeDishRepository.findByStoreIdAndDishId(item.getStore().getId(), item.getDish().getId())
					.orElseThrow(() -> new NotFoundException("Store dish not found"));
			storeDish.setQuantity(storeDish.getQuantity() + item.getQuantity());
			storeDish.setAvailable(true);
			storeDishRepository.save(storeDish);
		}
	}

	private void restorePromotionUsage(Order order) {
		if (!StringUtils.hasText(order.getPromotionCode())) {
			return;
		}
		promotionRepository.findByCodeIgnoreCase(order.getPromotionCode())
				.ifPresent(promotionService::decrementUsage);
	}

	private void sendPendingPaymentReminder(List<Order> orders) {
		Order primaryOrder = primaryOrder(orders);
		if (primaryOrder.getPaymentStatus() != PaymentStatus.PENDING || !StringUtils.hasText(primaryOrder.getPaymentCheckoutUrl())) {
			return;
		}
		try {
			emailSender.sendPaymentReminderEmail(
					primaryOrder.getUser().getEmail(),
					primaryOrder.getUser().getFullName(),
					primaryOrder.getId(),
					sumOrderAmounts(orders),
					primaryOrder.getPaymentCheckoutUrl(),
					primaryOrder.getPaymentExpiresAt(),
					primaryOrder.getDeliveryType(),
					primaryOrder.getScheduledDeliveryAt()
			);
		} catch (RuntimeException exception) {
			log.warn("Failed to send payment reminder email for order {}", primaryOrder.getId(), exception);
		}
	}

	private void sendPaymentSuccessThanks(List<Order> orders) {
		Order primaryOrder = primaryOrder(orders);
		try {
			emailSender.sendPaymentSuccessEmail(
					primaryOrder.getUser().getEmail(),
					primaryOrder.getUser().getFullName(),
					primaryOrder.getId(),
					sumOrderAmounts(orders)
			);
		} catch (RuntimeException exception) {
			log.warn("Failed to send payment success email for order {}", primaryOrder.getId(), exception);
		}
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can manage orders");
		}
		return user;
	}

	private User requireEmployeeOperator(String authorizationHeader, Role expectedRole) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.STAFF && user.getRole() != Role.SHIPPER) {
			throw new ForbiddenException("Only STAFF and SHIPPER accounts can manage employee orders");
		}
		if (expectedRole != null && user.getRole() != expectedRole) {
			throw new ForbiddenException("This action requires role " + expectedRole);
		}
		if (!user.isEnabled()) {
			throw new ForbiddenException("Employee account is disabled");
		}
		if (user.getWorkingStore() == null || user.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Employee account must be assigned to a working store");
		}
		return user;
	}

	private void ensureEmployeeCanAccessOrder(User employee, Order order) {
		Long workingStoreId = employee.getWorkingStore().getId();
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), workingStoreId)) {
			throw new ForbiddenException("Order does not belong to your store");
		}
		if (employee.getRole() == Role.STAFF) {
			ensureStaffCanAccessOrder(employee, order);
			return;
		}
		ensureShipperCanAccessOrder(employee, order);
	}

	private void ensureStaffCanAccessOrder(User staff, Order order) {
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new ForbiddenException("Only paid orders are available for staff workflow");
		}
		Long assignedStaffId = order.getPreparingStaff() != null ? order.getPreparingStaff().getId() : null;
		boolean canAccess = switch (order.getStatus()) {
			case CONFIRMED -> assignedStaffId == null || assignedStaffId.equals(staff.getId());
			case PREPARING, READY_FOR_SHIPPER -> assignedStaffId != null && assignedStaffId.equals(staff.getId());
			default -> false;
		};
		if (!canAccess) {
			throw new ForbiddenException("Order is not available for your staff workflow");
		}
	}

	private void ensureShipperCanAccessOrder(User shipper, Order order) {
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new ForbiddenException("Only paid orders are available for shipper workflow");
		}
		Long assignedShipperId = order.getDeliveringShipper() != null ? order.getDeliveringShipper().getId() : null;
		boolean canAccess = switch (order.getStatus()) {
			case READY_FOR_SHIPPER -> assignedShipperId == null || assignedShipperId.equals(shipper.getId());
			case OUT_FOR_DELIVERY, COMPLETED -> assignedShipperId != null && assignedShipperId.equals(shipper.getId());
			default -> false;
		};
		if (!canAccess) {
			throw new ForbiddenException("Order is not available for your shipper workflow");
		}
	}

	private void markDeliveryAddressUsed(UserDeliveryAddress deliveryAddress) {
		Instant now = Instant.now();
		deliveryAddress.setLastUsedAt(now);
		if (deliveryAddress.getVerifiedAt() == null) {
			deliveryAddress.setVerifiedAt(now);
		}
		deliveryAddress.setPrimaryAddress(true);
		userDeliveryAddressRepository.save(deliveryAddress);
		clearOtherPrimaryAddresses(deliveryAddress.getUser().getId(), deliveryAddress.getId());
	}

	private void markDeliveryAddressVerified(Order order) {
		if (order.getDeliveryAddressId() == null || order.getUser() == null || order.getUser().getId() == null) {
			return;
		}
		userDeliveryAddressRepository.findByIdAndUserId(order.getDeliveryAddressId(), order.getUser().getId())
				.ifPresent(deliveryAddress -> {
					Instant now = Instant.now();
					if (deliveryAddress.getVerifiedAt() == null) {
						deliveryAddress.setVerifiedAt(now);
					}
					if (deliveryAddress.getLastUsedAt() == null) {
						deliveryAddress.setLastUsedAt(now);
					}
					deliveryAddress.setPrimaryAddress(true);
					userDeliveryAddressRepository.save(deliveryAddress);
					clearOtherPrimaryAddresses(order.getUser().getId(), deliveryAddress.getId());
				});
	}

	private void clearOtherPrimaryAddresses(Long userId, Long retainedAddressId) {
		List<UserDeliveryAddress> addressesToUpdate = userDeliveryAddressRepository.findAllByUserIdOrderByUpdatedAtDesc(userId)
				.stream()
				.filter(address -> !address.getId().equals(retainedAddressId))
				.filter(UserDeliveryAddress::isPrimaryAddress)
				.peek(address -> address.setPrimaryAddress(false))
				.toList();
		if (!addressesToUpdate.isEmpty()) {
			userDeliveryAddressRepository.saveAll(addressesToUpdate);
		}
	}

	private void ensureInvoiceGenerated(Order order) {
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Invoice can only be generated for paid orders");
		}
		if (!StringUtils.hasText(order.getInvoiceNumber())) {
			order.setInvoiceNumber("TM-INV-%08d".formatted(order.getId()));
		}
		if (!StringUtils.hasText(order.getInvoiceQrToken())) {
			order.setInvoiceQrToken(nextInvoiceQrToken());
		}
		if (order.getInvoiceIssuedAt() == null) {
			order.setInvoiceIssuedAt(order.getPaidAt() != null ? order.getPaidAt() : Instant.now());
		}
	}

	private void clearInvoiceData(Order order) {
		order.setInvoiceNumber(null);
		order.setInvoiceIssuedAt(null);
		order.setInvoiceQrToken(null);
	}

	private String nextInvoiceQrToken() {
		String candidate = tokenGenerator.generate();
		while (orderRepository.findByInvoiceQrToken(candidate).isPresent()) {
			candidate = tokenGenerator.generate();
		}
		return candidate;
	}

	private String normalizeQrToken(String qrToken) {
		if (!StringUtils.hasText(qrToken)) {
			throw new NotFoundException("Invoice QR is invalid or expired");
		}
		String normalized = qrToken.trim();
		String extracted = extractInvoiceQrToken(normalized);
		return StringUtils.hasText(extracted) ? extracted : normalized;
	}

	private OrderInvoiceDocument buildInvoiceDocument(Order order) {
		if (!hasInvoice(order)) {
			throw new NotFoundException("Invoice not found");
		}

		List<OrderItem> orderItems = orderItemRepository.findAllByOrderId(order.getId());
		Store store = orderItems.isEmpty() ? null : orderItems.get(0).getStore();
		String qrEntryUrl = buildAbsolutePublicQrEntryUrl(order);
		String qrImageDataUri = buildQrImageDataUri(qrEntryUrl);
		StringBuilder rows = new StringBuilder();
		for (OrderItem item : orderItems) {
			BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
			rows.append("<tr>")
					.append("<td>").append(escapeHtml(item.getDish().getName())).append("</td>")
					.append("<td>").append(item.getQuantity()).append("</td>")
					.append("<td>").append(escapeHtml(item.getUnitPrice().toPlainString())).append("</td>")
					.append("<td>").append(escapeHtml(lineTotal.toPlainString())).append("</td>")
					.append("</tr>");
		}

		String html = """
				<!DOCTYPE html>
				<html lang="en">
				<head>
				  <meta charset="UTF-8" />
				  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
				  <title>%s</title>
				  <style>
				    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
				    .sheet { max-width: 880px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
				    h1 { margin: 0 0 8px; font-size: 28px; }
				    .muted { color: #6b7280; }
				    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
				    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fafafa; }
				    table { width: 100%%; border-collapse: collapse; margin-top: 16px; }
				    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; }
				    th { background: #f9fafb; }
				    .totals { margin-top: 20px; width: 320px; margin-left: auto; }
				    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
				    .qr { margin-top: 24px; padding: 16px; border: 1px dashed #9ca3af; border-radius: 12px; }
				    .qr-layout { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
				    .qr-image-box { width: 180px; height: 180px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; padding: 10px; }
				    .qr-image { width: 100%%; height: 100%%; object-fit: contain; }
				    .qr-copy { flex: 1 1 280px; min-width: 240px; }
				    .qr-copy strong { display: block; margin-bottom: 8px; }
				    .qr-link { margin-top: 12px; word-break: break-all; }
				    .qr-link a { color: #0f766e; text-decoration: none; }
				    .qr-link a:hover { text-decoration: underline; }
				    .footer { margin-top: 24px; font-size: 13px; color: #6b7280; }
				    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .qr-layout { align-items: flex-start; } }
				  </style>
				</head>
				<body>
				  <div class="sheet">
				    <h1>Invoice %s</h1>
				    <div class="muted">Order #%d</div>
				    <div class="grid">
				      <div class="card">
				        <strong>Store</strong>
				        <div>%s</div>
				        <div class="muted">%s</div>
				        <div class="muted">%s</div>
				      </div>
				      <div class="card">
				        <strong>Invoice Info</strong>
				        <div>Issued At: %s</div>
				        <div>Paid At: %s</div>
				        <div>Payment Provider: %s</div>
				        <div>Payment Status: %s</div>
				        <div>Order Status: %s</div>
				      </div>
				    </div>
				    <table>
				      <thead>
				        <tr>
				          <th>Item</th>
				          <th>Qty</th>
				          <th>Unit Price</th>
				          <th>Line Total</th>
				        </tr>
				      </thead>
				      <tbody>
				        %s
				      </tbody>
				    </table>
				    <div class="totals">
				      <div><span>Subtotal</span><strong>%s</strong></div>
				      <div><span>Discount</span><strong>%s</strong></div>
				      <div><span>Total</span><strong>%s</strong></div>
				    </div>
				    <div class="qr">
				      <div class="qr-layout">
				        <div class="qr-image-box">
				          <img class="qr-image" src="%s" alt="Invoice QR code" />
				        </div>
				        <div class="qr-copy">
				          <strong>Scan QR To Open Invoice</strong>
				          <div class="muted">Users can open order status in the Tea Matcha mobile app. Staff and shippers can scan the same QR to continue the fulfillment workflow.</div>
				          <div class="qr-link"><a href="%s">Open invoice in browser</a></div>
				        </div>
				      </div>
				    </div>
				    <div class="footer">Printable invoice generated by Tea Matcha backend.</div>
				  </div>
				</body>
				</html>
				""".formatted(
				escapeHtml(order.getInvoiceNumber()),
				escapeHtml(order.getInvoiceNumber()),
				order.getId(),
				escapeHtml(store != null ? store.getName() : "Unknown Store"),
				escapeHtml(store != null ? store.getAddress() : ""),
				escapeHtml(store != null ? store.getPhoneNumber() : ""),
				escapeHtml(formatInstant(order.getInvoiceIssuedAt())),
				escapeHtml(formatInstant(order.getPaidAt())),
				escapeHtml(order.getPaymentProvider()),
				escapeHtml(String.valueOf(order.getPaymentStatus())),
				escapeHtml(String.valueOf(order.getStatus())),
				rows.toString(),
				escapeHtml(order.getSubtotalAmount().toPlainString()),
				escapeHtml(order.getDiscountAmount().toPlainString()),
				escapeHtml(order.getTotalAmount().toPlainString()),
				escapeHtml(qrImageDataUri),
				escapeHtml(buildAbsolutePublicInvoiceUrl(order))
		);
		return new OrderInvoiceDocument("invoice-" + order.getInvoiceNumber() + ".html", html);
	}

	private Order acceptPreparingOrderScan(Order order, User staff) {
		if (staff.getRole() != Role.STAFF) {
			throw new ForbiddenException("Only staff can accept preparing orders");
		}
		if (order.getPaymentStatus() != PaymentStatus.PAID || order.getStatus() != OrderStatus.CONFIRMED) {
			throw new BadRequestException("Order is not ready for staff pickup");
		}
		if (order.getPreparingStaff() != null && !order.getPreparingStaff().getId().equals(staff.getId())) {
			throw new ConflictException("Order already claimed by another staff");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setPreparingStaff(staff);
		order.setStatus(OrderStatus.PREPARING);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return savedOrder;
	}

	private Order acceptDeliveryOrderScan(Order order, User shipper) {
		if (shipper.getRole() != Role.SHIPPER) {
			throw new ForbiddenException("Only shipper can accept delivery orders");
		}
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			throw new BadRequestException("Order must be paid before shipper can accept it");
		}
		if (order.getStatus() != OrderStatus.READY_FOR_SHIPPER) {
			throw new BadRequestException("Order must be prepared by staff before shipper can accept it");
		}
		if (order.getDeliveringShipper() != null && !order.getDeliveringShipper().getId().equals(shipper.getId())) {
			throw new ConflictException("Order already claimed by another shipper");
		}

		Map<Long, OrderStateSnapshot> previousStates = snapshotOrderStates(List.of(order));
		order.setDeliveringShipper(shipper);
		order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
		Order savedOrder = orderRepository.save(order);
		notifyEmployeeTaskChanges(List.of(savedOrder), previousStates);
		notifyOrderStateChanges(List.of(savedOrder), previousStates);
		return savedOrder;
	}

	private void recordScanAudit(
			Order order,
			User scannedBy,
			EmployeeOrderScanAction action,
			boolean success,
			String failureReason
	) {
		OrderScanAudit audit = new OrderScanAudit();
		audit.setOrder(order);
		audit.setScannedByUserId(scannedBy != null ? scannedBy.getId() : null);
		audit.setScannedByUserName(scannedBy != null ? scannedBy.getFullName() : null);
		audit.setRole(scannedBy != null ? scannedBy.getRole() : null);
		audit.setAction(action);
		audit.setSuccess(success);
		audit.setFailureReason(failureReason);
		orderScanAuditRepository.save(audit);
	}

	private String formatInstant(Instant instant) {
		return instant == null ? "-" : instant.toString();
	}

	private String extractInvoiceQrToken(String rawValue) {
		if (!StringUtils.hasText(rawValue)) {
			return null;
		}

		List<String> markers = List.of(
				"/api/public/order-qr/",
				"/api/public/order-qr-entry/"
		);
		try {
			URI uri = new URI(rawValue);
			String path = uri.getPath();
			if (StringUtils.hasText(path)) {
				for (String marker : markers) {
					int markerIndex = path.indexOf(marker);
					if (markerIndex >= 0) {
						String token = path.substring(markerIndex + marker.length());
						return stripTokenSuffix(token);
					}
				}
			}
		} catch (URISyntaxException ignored) {
			// Fall back to string parsing below.
		}

		for (String marker : markers) {
			int markerIndex = rawValue.indexOf(marker);
			if (markerIndex >= 0) {
				return stripTokenSuffix(rawValue.substring(markerIndex + marker.length()));
			}
		}
		return rawValue;
	}

	private String stripTokenSuffix(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		String token = value.trim();
		int queryIndex = token.indexOf('?');
		if (queryIndex >= 0) {
			token = token.substring(0, queryIndex);
		}
		int fragmentIndex = token.indexOf('#');
		if (fragmentIndex >= 0) {
			token = token.substring(0, fragmentIndex);
		}
		return token.trim();
	}

	private String buildQrImageDataUri(String content) {
		try {
			Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
			hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
			hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
			hints.put(EncodeHintType.MARGIN, 1);
			BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 240, 240, hints);
			String svg = buildQrSvg(matrix);
			String base64 = Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));
			return "data:image/svg+xml;base64," + base64;
		} catch (WriterException exception) {
			throw new IllegalStateException("Failed to generate invoice QR image", exception);
		}
	}

	private String buildQrSvg(BitMatrix matrix) {
		int width = matrix.getWidth();
		int height = matrix.getHeight();
		StringBuilder svg = new StringBuilder();
		svg.append("<svg xmlns=\"http://www.w3.org/2000/svg\" shape-rendering=\"crispEdges\" viewBox=\"0 0 ")
				.append(width)
				.append(' ')
				.append(height)
				.append("\">");
		svg.append("<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>");
		for (int y = 0; y < height; y++) {
			for (int x = 0; x < width; x++) {
				if (matrix.get(x, y)) {
					svg.append("<rect x=\"")
							.append(x)
							.append("\" y=\"")
							.append(y)
							.append("\" width=\"1\" height=\"1\" fill=\"#111827\"/>");
				}
			}
		}
		svg.append("</svg>");
		return svg.toString();
	}

	private String toJsStringLiteral(String value) {
		if (value == null) {
			return "null";
		}
		return "\""
				+ value
						.replace("\\", "\\\\")
						.replace("\"", "\\\"")
						.replace("\r", "")
						.replace("\n", "\\n")
				+ "\"";
	}

	private String escapeHtml(String value) {
		if (value == null) {
			return "";
		}
		return value
				.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&#39;");
	}

	private Order findOrder(Long id) {
		return orderRepository.findById(id)
				.orElseThrow(() -> new NotFoundException("Order not found"));
	}

	private Long resolveOrderListStoreId(User operator, Long requestedStoreId) {
		if (operator.getRole() == Role.ADMIN) {
			return requestedStoreId;
		}

		Long workingStoreId = requireWorkingStoreId(operator);
		if (requestedStoreId != null && !workingStoreId.equals(requestedStoreId)) {
			throw new ForbiddenException("You can only filter orders for your store");
		}
		return workingStoreId;
	}

	private Long resolveVisibleStoreId(User operator, Order order) {
		if (operator.getRole() == Role.ADMIN) {
			return null;
		}
		Long visibleStoreId = requireWorkingStoreId(operator);
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), visibleStoreId)) {
			throw new ForbiddenException("Order does not belong to your store");
		}
		return visibleStoreId;
	}

	private Long requireWorkingStoreId(User operator) {
		if (operator.getWorkingStore() == null || operator.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Manager account must be assigned to a working store");
		}
		return operator.getWorkingStore().getId();
	}

	private Specification<Order> buildEmployeeOrderSpecification(User employee, boolean mine, String search) {
		Long storeId = employee.getWorkingStore().getId();
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			if (query != null) {
				query.distinct(true);
			}
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(criteriaBuilder.equal(root.get("paymentStatus"), PaymentStatus.PAID));
			predicates.add(buildStorePredicate(root, query, criteriaBuilder, storeId));

			if (employee.getRole() == Role.STAFF) {
				Join<Order, User> preparingStaff = root.join("preparingStaff", JoinType.LEFT);
				if (mine) {
					predicates.add(criteriaBuilder.equal(root.get("status"), OrderStatus.PREPARING));
					predicates.add(criteriaBuilder.equal(preparingStaff.get("id"), employee.getId()));
				} else {
					Predicate availableConfirmed = criteriaBuilder.and(
							criteriaBuilder.equal(root.get("status"), OrderStatus.CONFIRMED),
							criteriaBuilder.or(
									criteriaBuilder.isNull(preparingStaff.get("id")),
									criteriaBuilder.equal(preparingStaff.get("id"), employee.getId())
							)
					);
					Predicate myPreparing = criteriaBuilder.and(
							criteriaBuilder.equal(root.get("status"), OrderStatus.PREPARING),
							criteriaBuilder.equal(preparingStaff.get("id"), employee.getId())
					);
					predicates.add(criteriaBuilder.or(availableConfirmed, myPreparing));
				}
			} else {
				Join<Order, User> deliveringShipper = root.join("deliveringShipper", JoinType.LEFT);
				if (mine) {
					predicates.add(criteriaBuilder.equal(root.get("status"), OrderStatus.OUT_FOR_DELIVERY));
					predicates.add(criteriaBuilder.equal(deliveringShipper.get("id"), employee.getId()));
				} else {
					Predicate availableReady = criteriaBuilder.and(
							criteriaBuilder.equal(root.get("status"), OrderStatus.READY_FOR_SHIPPER),
							criteriaBuilder.or(
									criteriaBuilder.isNull(deliveringShipper.get("id")),
									criteriaBuilder.equal(deliveringShipper.get("id"), employee.getId())
							)
					);
					Predicate myDelivery = criteriaBuilder.and(
							criteriaBuilder.equal(root.get("status"), OrderStatus.OUT_FOR_DELIVERY),
							criteriaBuilder.equal(deliveringShipper.get("id"), employee.getId())
					);
					predicates.add(criteriaBuilder.or(availableReady, myDelivery));
				}
			}

			if (normalizedSearch != null) {
				predicates.add(buildSearchPredicate(root, query, criteriaBuilder, normalizedSearch));
			}
			return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Specification<Order> buildOrderSpecification(
			OrderStatus status,
			PaymentStatus paymentStatus,
			OrderStageFilter stage,
			Long storeId,
			String search
	) {
		String normalizedSearch = normalizeSearch(search);
		return (root, query, criteriaBuilder) -> {
			if (query != null) {
				query.distinct(true);
			}
			List<Predicate> predicates = new ArrayList<>();
			if (status != null) {
				predicates.add(criteriaBuilder.equal(root.get("status"), status));
			}
			if (paymentStatus != null) {
				predicates.add(criteriaBuilder.equal(root.get("paymentStatus"), paymentStatus));
			}
			if (stage != null) {
				predicates.add(buildStagePredicate(root, criteriaBuilder, stage));
			}
			if (storeId != null) {
				predicates.add(buildStorePredicate(root, query, criteriaBuilder, storeId));
			}
			if (normalizedSearch != null) {
				predicates.add(buildSearchPredicate(root, query, criteriaBuilder, normalizedSearch));
			}
			return predicates.isEmpty()
					? criteriaBuilder.conjunction()
					: criteriaBuilder.and(predicates.toArray(Predicate[]::new));
		};
	}

	private Predicate buildSearchPredicate(
			Root<Order> root,
			CriteriaQuery<?> query,
			CriteriaBuilder criteriaBuilder,
			String normalizedSearch
	) {
		String likeValue = toLikeValue(normalizedSearch);
		List<Predicate> matches = new ArrayList<>();
		Join<Order, User> userJoin = root.join("user", JoinType.LEFT);

		matches.add(criteriaBuilder.like(criteriaBuilder.lower(userJoin.get("fullName")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(userJoin.get("email")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("deliveryFullName")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("deliveryPhoneNumber")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("deliveryAddress")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("paymentReference")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("paymentLinkId")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("paymentProvider")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("promotionCode")), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("status").as(String.class)), likeValue));
		matches.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("paymentStatus").as(String.class)), likeValue));

		if (query != null) {
			Subquery<Long> itemSearchSubquery = query.subquery(Long.class);
			Root<OrderItem> orderItemRoot = itemSearchSubquery.from(OrderItem.class);
			Join<OrderItem, Store> storeJoin = orderItemRoot.join("store", JoinType.LEFT);
			Join<OrderItem, Dish> dishJoin = orderItemRoot.join("dish", JoinType.LEFT);

			itemSearchSubquery.select(orderItemRoot.get("id"));
			itemSearchSubquery.where(
					criteriaBuilder.equal(orderItemRoot.get("order").get("id"), root.get("id")),
					criteriaBuilder.or(
							criteriaBuilder.like(criteriaBuilder.lower(storeJoin.get("name")), likeValue),
							criteriaBuilder.like(criteriaBuilder.lower(storeJoin.get("slug")), likeValue),
							criteriaBuilder.like(criteriaBuilder.lower(storeJoin.get("address")), likeValue),
							criteriaBuilder.like(criteriaBuilder.lower(dishJoin.get("name")), likeValue),
							criteriaBuilder.like(criteriaBuilder.lower(dishJoin.get("description")), likeValue)
					)
			);
			matches.add(criteriaBuilder.exists(itemSearchSubquery));
		}

		if (normalizedSearch.chars().allMatch(Character::isDigit)) {
			Long numericSearch = Long.valueOf(normalizedSearch);
			matches.add(criteriaBuilder.equal(root.get("id"), numericSearch));
			matches.add(criteriaBuilder.equal(root.get("payosOrderCode"), numericSearch));
		}

		return criteriaBuilder.or(matches.toArray(Predicate[]::new));
	}

	private Predicate buildStagePredicate(Root<Order> root, CriteriaBuilder criteriaBuilder, OrderStageFilter stage) {
		return switch (stage) {
			case UNPAID -> criteriaBuilder.and(
					root.get("paymentStatus").in(PaymentStatus.PENDING, PaymentStatus.FAILED),
					criteriaBuilder.notEqual(root.get("status"), OrderStatus.CANCELLED)
			);
			case PAID -> criteriaBuilder.and(
					criteriaBuilder.equal(root.get("paymentStatus"), PaymentStatus.PAID),
					root.get("status").in(OrderStatus.PENDING, OrderStatus.CONFIRMED)
			);
			case PREPARING -> root.get("status").in(OrderStatus.PREPARING, OrderStatus.READY_FOR_SHIPPER);
			case DELIVERING -> criteriaBuilder.equal(root.get("status"), OrderStatus.OUT_FOR_DELIVERY);
			case COMPLETED -> criteriaBuilder.equal(root.get("status"), OrderStatus.COMPLETED);
			case CANCELLED -> criteriaBuilder.or(
					criteriaBuilder.equal(root.get("status"), OrderStatus.CANCELLED),
					criteriaBuilder.equal(root.get("paymentStatus"), PaymentStatus.CANCELLED)
			);
		};
	}

	private Predicate buildStorePredicate(
			Root<Order> root,
			CriteriaQuery<?> query,
			CriteriaBuilder criteriaBuilder,
			Long storeId
	) {
		Subquery<Long> subquery = query.subquery(Long.class);
		Root<OrderItem> orderItemRoot = subquery.from(OrderItem.class);
		subquery.select(orderItemRoot.get("id"));
		subquery.where(
				criteriaBuilder.equal(orderItemRoot.get("order").get("id"), root.get("id")),
				criteriaBuilder.equal(orderItemRoot.get("store").get("id"), storeId)
		);
		return criteriaBuilder.exists(subquery);
	}

	private Pageable buildPageable(int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		return PageRequest.of(resolvedPage, resolvedSize, DEFAULT_SORT);
	}

	private String normalizeSearch(String search) {
		if (!StringUtils.hasText(search)) {
			return null;
		}
		return search.trim().toLowerCase(Locale.ROOT);
	}

	private String toLikeValue(String normalizedSearch) {
		return "%" + normalizedSearch + "%";
	}

	private PageResponse<OrderResponse> paginate(List<OrderResponse> items, int page, int size) {
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

	private OrderResponse toResponse(Order order, Long visibleStoreId, User actor) {
		List<OrderItem> visibleItems = visibleStoreId == null
				? orderItemRepository.findAllByOrderId(order.getId())
				: orderItemRepository.findAllByOrderIdAndStoreId(order.getId(), visibleStoreId);
		List<OrderItemResponse> items = visibleItems.stream()
				.map(OrderItemResponse::from)
				.toList();
		boolean invoiceAvailable = hasInvoice(order);
		String invoicePreviewUrl = invoiceAvailable ? buildPublicInvoiceUrl(order) : null;
		String invoiceDownloadUrl = invoiceAvailable ? buildPublicInvoiceUrl(order) + "?download=true" : null;
		return new OrderResponse(
				order.getId(),
				order.getUser().getId(),
				resolveStoreId(items),
				resolveStoreSlug(items),
				resolveStoreName(items),
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
				resolveAllowedActions(order, actor, visibleStoreId, invoiceAvailable),
				resolveStatusSummary(order),
				items,
				order.getCreatedAt(),
				order.getUpdatedAt()
		);
	}

	private CheckoutResponse toCheckoutResponse(List<Order> orders) {
		Order primaryOrder = primaryOrder(orders);
		User actor = primaryOrder.getUser();
		List<OrderResponse> orderResponses = orders.stream()
				.sorted(Comparator.comparing(Order::getId))
				.map(order -> toResponse(order, null, actor))
				.toList();
		return new CheckoutResponse(
				primaryOrder.getId(),
				primaryOrder.getStatus(),
				primaryOrder.getPaymentStatus(),
				primaryOrder.getPaymentProvider(),
				primaryOrder.getPayosOrderCode(),
				primaryOrder.getPaymentLinkId(),
				primaryOrder.getPaymentCheckoutUrl(),
				primaryOrder.getPaymentQrCode(),
				primaryOrder.getPaymentExpiresAt(),
				primaryOrder.getPaidAt(),
				primaryOrder.getPaymentReference(),
				sumOrderSubtotals(orders),
				sumOrderDiscounts(orders),
				sumOrderAmounts(orders),
				orders.stream()
						.map(Order::getPromotionCode)
						.filter(StringUtils::hasText)
						.findFirst()
						.orElse(null),
				primaryOrder.getDeliveryType(),
				primaryOrder.getScheduledDeliveryAt(),
				primaryOrder.getDeliveryFullName(),
				primaryOrder.getDeliveryPhoneNumber(),
				primaryOrder.getDeliveryAddress(),
				resolveStatusSummary(primaryOrder),
				orderResponses,
				primaryOrder.getCreatedAt(),
				primaryOrder.getUpdatedAt()
		);
	}

	private List<OrderAllowedAction> resolveAllowedActions(Order order, User actor, Long visibleStoreId, boolean invoiceAvailable) {
		if (actor == null) {
			return List.of();
		}

		List<OrderAllowedAction> actions = new ArrayList<>();
		switch (actor.getRole()) {
			case ADMIN, MANAGER -> {
				if (canConfirmOrder(order)) {
					actions.add(OrderAllowedAction.CONFIRM_ORDER);
				}
				if (canCancelOrder(order)) {
					actions.add(OrderAllowedAction.CANCEL_ORDER);
				}
				if (canMarkPaid(order)) {
					actions.add(OrderAllowedAction.MARK_PAID);
				}
				if (canGenerateInvoice(order)) {
					actions.add(OrderAllowedAction.GENERATE_INVOICE);
				}
				if (invoiceAvailable) {
					actions.add(OrderAllowedAction.VIEW_INVOICE);
				}
			}
			case STAFF -> {
				if (visibleStoreId != null && actor.getWorkingStore() != null && visibleStoreId.equals(actor.getWorkingStore().getId())) {
					if (order.getPaymentStatus() == PaymentStatus.PAID
							&& order.getStatus() == OrderStatus.CONFIRMED
							&& (order.getPreparingStaff() == null || actor.getId().equals(order.getPreparingStaff().getId()))) {
						actions.add(OrderAllowedAction.ACCEPT_PREPARING);
					}
					if (order.getPaymentStatus() == PaymentStatus.PAID
							&& order.getStatus() == OrderStatus.PREPARING
							&& order.getPreparingStaff() != null
							&& actor.getId().equals(order.getPreparingStaff().getId())) {
						actions.add(OrderAllowedAction.MARK_READY);
					}
				}
				if (invoiceAvailable) {
					actions.add(OrderAllowedAction.VIEW_INVOICE);
				}
			}
			case SHIPPER -> {
				if (visibleStoreId != null && actor.getWorkingStore() != null && visibleStoreId.equals(actor.getWorkingStore().getId())) {
					if (order.getPaymentStatus() == PaymentStatus.PAID
							&& order.getStatus() == OrderStatus.READY_FOR_SHIPPER
							&& (order.getDeliveringShipper() == null || actor.getId().equals(order.getDeliveringShipper().getId()))) {
						actions.add(OrderAllowedAction.ACCEPT_DELIVERY);
					}
					if (order.getPaymentStatus() == PaymentStatus.PAID
							&& order.getStatus() == OrderStatus.OUT_FOR_DELIVERY
							&& order.getDeliveringShipper() != null
							&& actor.getId().equals(order.getDeliveringShipper().getId())) {
						actions.add(OrderAllowedAction.MARK_COMPLETED);
					}
				}
				if (invoiceAvailable) {
					actions.add(OrderAllowedAction.VIEW_INVOICE);
				}
			}
			case USER -> {
				if (canRefreshPayment(order, actor)) {
					actions.add(OrderAllowedAction.REFRESH_PAYMENT);
				}
				if (invoiceAvailable) {
					actions.add(OrderAllowedAction.VIEW_INVOICE);
				}
			}
		}
		return List.copyOf(actions);
	}

	private boolean canConfirmOrder(Order order) {
		return order.getPaymentStatus() == PaymentStatus.PAID && order.getStatus() == OrderStatus.PENDING;
	}

	private boolean canCancelOrder(Order order) {
		return order.getStatus() != OrderStatus.CANCELLED && order.getStatus() != OrderStatus.COMPLETED;
	}

	private boolean canMarkPaid(Order order) {
		return order.getStatus() != OrderStatus.CANCELLED && order.getPaymentStatus() != PaymentStatus.PAID;
	}

	private boolean canGenerateInvoice(Order order) {
		return order.getPaymentStatus() == PaymentStatus.PAID && order.getStatus() != OrderStatus.CANCELLED && !hasInvoice(order);
	}

	private boolean canRefreshPayment(Order order, User actor) {
		return actor.getRole() == Role.USER
				&& order.getUser() != null
				&& actor.getId().equals(order.getUser().getId())
				&& order.getPaymentStatus() != PaymentStatus.PAID
				&& order.getStatus() != OrderStatus.CANCELLED;
	}

	private boolean hasInvoice(Order order) {
		return order.getInvoiceIssuedAt() != null
				&& StringUtils.hasText(order.getInvoiceNumber())
				&& StringUtils.hasText(order.getInvoiceQrToken());
	}

	private String buildPublicInvoiceUrl(Order order) {
		return "/api/public/order-qr/" + order.getInvoiceQrToken();
	}

	private String buildAbsolutePublicInvoiceUrl(Order order) {
		return buildAbsoluteUrl(buildPublicInvoiceUrl(order));
	}

	private String buildPublicQrEntryUrl(Order order) {
		return "/api/public/order-qr-entry/" + order.getInvoiceQrToken();
	}

	private String buildAbsolutePublicQrEntryUrl(Order order) {
		return buildAbsoluteUrl(buildPublicQrEntryUrl(order));
	}

	private String buildAbsoluteUrl(String path) {
		if (StringUtils.hasText(appMobileProperties.getPublicBaseUrl())) {
			String base = appMobileProperties.getPublicBaseUrl().trim();
			if (base.endsWith("/")) {
				base = base.substring(0, base.length() - 1);
			}
			return base + path;
		}
		try {
			return ServletUriComponentsBuilder.fromCurrentContextPath()
					.path(path)
					.toUriString();
		} catch (IllegalStateException exception) {
			return path;
		}
	}

	private String buildMobileOrderQrDeepLink(String qrToken) {
		String base = appMobileProperties.getOrderQrDeepLinkBase();
		if (!StringUtils.hasText(base)) {
			return "teamatcha://order-qr/" + qrToken;
		}
		String normalizedBase = base.endsWith("/") ? base : base + "/";
		return normalizedBase + qrToken;
	}

	private Order findOrderByQrToken(String qrToken) {
		return orderRepository.findByInvoiceQrToken(normalizeQrToken(qrToken))
				.orElseThrow(() -> new NotFoundException("Invoice QR is invalid or expired"));
	}

	private MobileOrderQrResolveResponse resolveUserMobileQr(User user, Order order) {
		if (order.getUser() == null || !user.getId().equals(order.getUser().getId())) {
			throw new ForbiddenException("Order does not belong to current user");
		}
		return new MobileOrderQrResolveResponse(
				user.getRole(),
				"USER_ORDER_STATUS",
				false,
				"Order status loaded",
				null,
				null,
				null,
				null,
				toResponse(order, null, user)
		);
	}

	private MobileOrderQrResolveResponse resolveAdminMobileQr(User operator, Order order) {
		Long visibleStoreId = resolveVisibleStoreId(operator, order);
		return new MobileOrderQrResolveResponse(
				operator.getRole(),
				"ADMIN_ORDER_DETAIL",
				false,
				"Order loaded",
				null,
				null,
				null,
				null,
				toResponse(order, visibleStoreId, operator)
		);
	}

	private MobileOrderQrResolveResponse resolveStaffMobileQr(User staff, Order order) {
		Long visibleStoreId = requireWorkingStoreId(staff);
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), visibleStoreId)) {
			throw new ForbiddenException("Order does not belong to your store");
		}
		try {
			Order savedOrder = acceptPreparingOrderScan(order, staff);
			recordScanAudit(savedOrder, staff, EmployeeOrderScanAction.ACCEPT_PREPARING, true, null);
			return new MobileOrderQrResolveResponse(
					staff.getRole(),
					"EMPLOYEE_ORDER_DETAIL",
					true,
					"Order claimed successfully",
					EmployeeOrderScanAction.ACCEPT_PREPARING,
					savedOrder.getPreparingStaff() != null ? savedOrder.getPreparingStaff().getId() : null,
					savedOrder.getPreparingStaff() != null ? savedOrder.getPreparingStaff().getFullName() : null,
					savedOrder.getPreparingStaff() != null ? savedOrder.getPreparingStaff().getRole() : null,
					toResponse(savedOrder, visibleStoreId, staff)
			);
		} catch (BadRequestException | ConflictException | ForbiddenException exception) {
			recordScanAudit(order, staff, EmployeeOrderScanAction.ACCEPT_PREPARING, false, exception.getMessage());
			return new MobileOrderQrResolveResponse(
					staff.getRole(),
					"EMPLOYEE_ORDER_DETAIL",
					false,
					exception.getMessage(),
					null,
					order.getPreparingStaff() != null ? order.getPreparingStaff().getId() : null,
					order.getPreparingStaff() != null ? order.getPreparingStaff().getFullName() : null,
					order.getPreparingStaff() != null ? order.getPreparingStaff().getRole() : null,
					toResponse(order, visibleStoreId, staff)
			);
		}
	}

	private MobileOrderQrResolveResponse resolveShipperMobileQr(User shipper, Order order) {
		Long visibleStoreId = requireWorkingStoreId(shipper);
		if (!orderItemRepository.existsByOrderIdAndStoreId(order.getId(), visibleStoreId)) {
			throw new ForbiddenException("Order does not belong to your store");
		}
		try {
			Order savedOrder = acceptDeliveryOrderScan(order, shipper);
			recordScanAudit(savedOrder, shipper, EmployeeOrderScanAction.ACCEPT_DELIVERY, true, null);
			return new MobileOrderQrResolveResponse(
					shipper.getRole(),
					"EMPLOYEE_ORDER_DETAIL",
					true,
					"Order claimed successfully",
					EmployeeOrderScanAction.ACCEPT_DELIVERY,
					savedOrder.getDeliveringShipper() != null ? savedOrder.getDeliveringShipper().getId() : null,
					savedOrder.getDeliveringShipper() != null ? savedOrder.getDeliveringShipper().getFullName() : null,
					savedOrder.getDeliveringShipper() != null ? savedOrder.getDeliveringShipper().getRole() : null,
					toResponse(savedOrder, visibleStoreId, shipper)
			);
		} catch (BadRequestException | ConflictException | ForbiddenException exception) {
			recordScanAudit(order, shipper, EmployeeOrderScanAction.ACCEPT_DELIVERY, false, exception.getMessage());
			return new MobileOrderQrResolveResponse(
					shipper.getRole(),
					"EMPLOYEE_ORDER_DETAIL",
					false,
					exception.getMessage(),
					null,
					order.getDeliveringShipper() != null ? order.getDeliveringShipper().getId() : null,
					order.getDeliveringShipper() != null ? order.getDeliveringShipper().getFullName() : null,
					order.getDeliveringShipper() != null ? order.getDeliveringShipper().getRole() : null,
					toResponse(order, visibleStoreId, shipper)
			);
		}
	}

	private String resolveStatusSummary(Order order) {
		if (order.getStatus() == OrderStatus.CANCELLED || order.getPaymentStatus() == PaymentStatus.CANCELLED) {
			return "Don hang da huy";
		}
		if (order.getPaymentStatus() == PaymentStatus.FAILED) {
			return "Thanh toan that bai";
		}
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			return "Cho thanh toan";
		}
		if (order.getStatus() == OrderStatus.PENDING) {
			return "Cho cua hang xac nhan";
		}
		if (order.getStatus() == OrderStatus.CONFIRMED) {
			return "Cho nhan vien nhan don";
		}
		if (order.getStatus() == OrderStatus.READY_FOR_SHIPPER) {
			return "Da lam xong - cho shipper";
		}
		if (order.getStatus() == OrderStatus.OUT_FOR_DELIVERY) {
			return order.getDeliveringShipper() != null
					? order.getDeliveringShipper().getFullName() + " dang giao hang"
					: "Shipper dang giao hang";
		}
		if (order.getStatus() == OrderStatus.PREPARING) {
			return order.getPreparingStaff() != null
					? "Nhan vien " + order.getPreparingStaff().getFullName() + " dang lam mon"
					: "Don hang dang lam mon";
		}
		if (order.getStatus() == OrderStatus.COMPLETED) {
			return order.getDeliveringShipper() != null
					? order.getDeliveringShipper().getFullName() + " da giao hang thanh cong"
					: "Giao hang thanh cong";
		}
		return "Khach da thanh toan";
	}

	private Long resolveStoreId(List<OrderItemResponse> items) {
		return items.isEmpty() ? null : items.get(0).storeId();
	}

	private String resolveStoreName(List<OrderItemResponse> items) {
		return items.isEmpty() ? null : items.get(0).storeName();
	}

	private String resolveStoreSlug(List<OrderItemResponse> items) {
		return items.isEmpty() ? null : items.get(0).storeSlug();
	}

	private PayOsCreatePaymentLinkRequest buildPaymentLinkRequest(
			Long payosOrderCode,
			Order primaryOrder,
			User user,
			List<CartItem> cartItems,
			CheckoutRequest checkoutRequest,
			BigDecimal totalAmount
	) {
		List<PayOsCreatePaymentLinkRequest.Item> items = cartItems.stream()
				.map(cartItem -> new PayOsCreatePaymentLinkRequest.Item(
						cartItem.getDish().getName(),
						cartItem.getQuantity(),
						toIntegerAmount(cartItem.getUnitPrice()),
						"ly"
				))
				.toList();

		return new PayOsCreatePaymentLinkRequest(
				payosOrderCode,
				toIntegerAmount(totalAmount),
				buildPayOsDescription(payosOrderCode),
				primaryOrder.getDeliveryFullName(),
				user.getEmail(),
				primaryOrder.getDeliveryPhoneNumber(),
				primaryOrder.getDeliveryAddress(),
				items,
				checkoutRequest.cancelUrl().trim(),
				checkoutRequest.returnUrl().trim(),
				primaryOrder.getPaymentExpiresAt().getEpochSecond()
		);
	}

	private PayOsCreatePaymentLinkRequest buildPaymentLinkRequest(
			Long payosOrderCode,
			Order primaryOrder,
			List<OrderItem> orderItems,
			BigDecimal totalAmount
	) {
		List<PayOsCreatePaymentLinkRequest.Item> items = orderItems.stream()
				.map(orderItem -> new PayOsCreatePaymentLinkRequest.Item(
						orderItem.getDish().getName(),
						orderItem.getQuantity(),
						toIntegerAmount(orderItem.getUnitPrice()),
						"ly"
				))
				.toList();

		return new PayOsCreatePaymentLinkRequest(
				payosOrderCode,
				toIntegerAmount(totalAmount),
				buildPayOsDescription(payosOrderCode),
				primaryOrder.getDeliveryFullName(),
				primaryOrder.getUser().getEmail(),
				primaryOrder.getDeliveryPhoneNumber(),
				primaryOrder.getDeliveryAddress(),
				items,
				primaryOrder.getPaymentCancelUrl().trim(),
				primaryOrder.getPaymentReturnUrl().trim(),
				primaryOrder.getPaymentExpiresAt().getEpochSecond()
		);
	}

	private int toIntegerAmount(BigDecimal amount) {
		try {
			return amount.intValueExact();
		} catch (ArithmeticException exception) {
			throw new BadRequestException("Payment amount must be an integer number of VND");
		}
	}

	private String buildPayOsDescription(Long payosOrderCode) {
		return "TM" + payosOrderCode;
	}

	private long resolvePaymentExpirySeconds() {
		int minutes = payOsProperties.getPaymentExpiryMinutes() == null ? 15 : Math.max(payOsProperties.getPaymentExpiryMinutes(), 5);
		return minutes * 60L;
	}

	private Long nextPayOsOrderCode() {
		long candidate = Math.max(System.currentTimeMillis(), Instant.now().toEpochMilli());
		while (orderRepository.findByPayosOrderCode(candidate).isPresent()) {
			candidate++;
		}
		return candidate;
	}

	private DeliveryType resolveDeliveryType(CheckoutRequest request) {
		return request.deliveryType() == null ? DeliveryType.IMMEDIATE : request.deliveryType();
	}

	private Instant resolveScheduledDeliveryAt(CheckoutRequest request, DeliveryType deliveryType) {
		if (deliveryType == DeliveryType.SCHEDULED) {
			if (request.scheduledDeliveryAt() == null) {
				throw new BadRequestException("scheduledDeliveryAt is required when deliveryType is SCHEDULED");
			}
			if (!request.scheduledDeliveryAt().isAfter(Instant.now())) {
				throw new BadRequestException("scheduledDeliveryAt must be in the future");
			}
			return request.scheduledDeliveryAt();
		}
		if (request.scheduledDeliveryAt() != null) {
			throw new BadRequestException("scheduledDeliveryAt is only allowed when deliveryType is SCHEDULED");
		}
		return null;
	}

	private String buildAvailabilityMessage(String disabledReason, DeliveryType deliveryType) {
		if ("OUTSIDE_OPEN_HOURS".equals(disabledReason)) {
			if (deliveryType == DeliveryType.SCHEDULED) {
				return "scheduledDeliveryAt must fall within the store operating hours";
			}
			return "Store is currently closed. Choose deliveryType SCHEDULED with a delivery time inside operating hours";
		}
		return "Dish is not available at this store: " + disabledReason;
	}

	private List<Order> loadPaymentGroup(Order order) {
		if (order.getPayosOrderCode() == null) {
			return List.of(order);
		}
		List<Order> orders = orderRepository.findAllByPayosOrderCode(order.getPayosOrderCode());
		return orders.isEmpty() ? List.of(order) : orders;
	}

	private Order primaryOrder(List<Order> orders) {
		return orders.stream()
				.min(Comparator.comparing(Order::getId))
				.orElseThrow(() -> new BadRequestException("Order group is empty"));
	}

	private BigDecimal sumOrderAmounts(List<Order> orders) {
		return orders.stream()
				.map(Order::getTotalAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private BigDecimal sumOrderSubtotals(List<Order> orders) {
		return orders.stream()
				.map(Order::getSubtotalAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private BigDecimal sumOrderDiscounts(List<Order> orders) {
		return orders.stream()
				.map(Order::getDiscountAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);
	}

	private Map<Long, OrderStateSnapshot> snapshotOrderStates(List<Order> orders) {
		Map<Long, OrderStateSnapshot> snapshots = new LinkedHashMap<>();
		for (Order order : orders) {
			snapshots.put(order.getId(), new OrderStateSnapshot(order.getStatus(), order.getPaymentStatus()));
		}
		return snapshots;
	}

	private void createOrderCreatedNotifications(List<Order> orders) {
		for (Order order : orders) {
			notificationService.notifyOrderCreated(order);
		}
	}

	private void notifyOrderStateChanges(List<Order> orders, Map<Long, OrderStateSnapshot> previousStates) {
		for (Order order : orders) {
			OrderStateSnapshot snapshot = previousStates.get(order.getId());
			if (snapshot != null) {
				notificationService.notifyOrderStatusChanged(order, snapshot.status(), snapshot.paymentStatus());
			}
		}
	}

	private void notifyEmployeeTaskChanges(List<Order> orders, Map<Long, OrderStateSnapshot> previousStates) {
		for (Order order : orders) {
			OrderStateSnapshot snapshot = previousStates.get(order.getId());
			if (snapshot == null) {
				continue;
			}
			if (snapshot.status() != OrderStatus.CONFIRMED
					&& order.getStatus() == OrderStatus.CONFIRMED
					&& order.getPaymentStatus() == PaymentStatus.PAID) {
				notificationService.notifyPaidOrderWaitingForStaff(order);
			}
			if (snapshot.status() != OrderStatus.READY_FOR_SHIPPER && order.getStatus() == OrderStatus.READY_FOR_SHIPPER) {
				notificationService.notifyReadyOrderWaitingForShipper(order);
			}
		}
	}

	private record StoreOrderPlan(
			Store store,
			List<CartItem> cartItems,
			BigDecimal subtotalAmount,
			BigDecimal discountAmount,
			BigDecimal totalAmount,
			Promotion appliedPromotion,
			BigDecimal promotionEligibleAmount,
			List<Long> promotionDishIds
	) {
	}

	private record StoreCheckoutDraft(
			Store store,
			List<CartItem> cartItems,
			BigDecimal subtotalAmount
	) {
	}

	private record OrderStateSnapshot(
			OrderStatus status,
			PaymentStatus paymentStatus
	) {
	}
}
