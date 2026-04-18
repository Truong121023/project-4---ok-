package com.example.registrationotp.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.UserNotificationResponse;
import com.example.registrationotp.dto.UserNotificationUnreadCountResponse;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.EventItem;
import com.example.registrationotp.model.NewsArticle;
import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserNotification;
import com.example.registrationotp.model.UserNotificationType;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.UserNotificationRepository;
import com.example.registrationotp.repository.UserRepository;

@Service
public class NotificationService {

	private static final int DEFAULT_PAGE_SIZE = 10;
	private static final int MAX_PAGE_SIZE = 100;
	private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
	private static final String BRAND_NAME = "Kamatcha";
	private static final Set<Role> EMPLOYEE_NOTIFICATION_ROLES = EnumSet.of(Role.STAFF, Role.SHIPPER);

	private final SessionAuthService sessionAuthService;
	private final UserNotificationRepository userNotificationRepository;
	private final UserRepository userRepository;
	private final OrderItemRepository orderItemRepository;

	public NotificationService(
			SessionAuthService sessionAuthService,
			UserNotificationRepository userNotificationRepository,
			UserRepository userRepository,
			OrderItemRepository orderItemRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.userNotificationRepository = userNotificationRepository;
		this.userRepository = userRepository;
		this.orderItemRepository = orderItemRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<UserNotificationResponse> listMyNotifications(
			String authorizationHeader,
			Boolean read,
			int page,
			int size
	) {
		return listNotifications(requireBuyerUser(authorizationHeader), read, page, size);
	}

	@Transactional(readOnly = true)
	public PageResponse<UserNotificationResponse> listMyEmployeeNotifications(
			String authorizationHeader,
			Boolean read,
			int page,
			int size
	) {
		return listNotifications(requireEmployeeNotificationUser(authorizationHeader), read, page, size);
	}

	@Transactional(readOnly = true)
	public PageResponse<UserNotificationResponse> listAdminNotifications(
			String authorizationHeader,
			Boolean read,
			int page,
			int size
	) {
		return listNotifications(requireAdminNotificationUser(authorizationHeader), read, page, size);
	}

	@Transactional(readOnly = true)
	public UserNotificationUnreadCountResponse getUnreadCount(String authorizationHeader) {
		return getUnreadCount(requireBuyerUser(authorizationHeader));
	}

	@Transactional(readOnly = true)
	public UserNotificationUnreadCountResponse getEmployeeUnreadCount(String authorizationHeader) {
		return getUnreadCount(requireEmployeeNotificationUser(authorizationHeader));
	}

	@Transactional(readOnly = true)
	public UserNotificationUnreadCountResponse getAdminUnreadCount(String authorizationHeader) {
		return getUnreadCount(requireAdminNotificationUser(authorizationHeader));
	}

	@Transactional
	public UserNotificationResponse markAsRead(String authorizationHeader, Long id) {
		return markAsRead(requireBuyerUser(authorizationHeader), id);
	}

	@Transactional
	public UserNotificationResponse markEmployeeAsRead(String authorizationHeader, Long id) {
		return markAsRead(requireEmployeeNotificationUser(authorizationHeader), id);
	}

	@Transactional
	public UserNotificationResponse markAdminAsRead(String authorizationHeader, Long id) {
		return markAsRead(requireAdminNotificationUser(authorizationHeader), id);
	}

	@Transactional
	public UserNotificationResponse markAsUnread(String authorizationHeader, Long id) {
		return markAsUnread(requireBuyerUser(authorizationHeader), id);
	}

	@Transactional
	public UserNotificationResponse markEmployeeAsUnread(String authorizationHeader, Long id) {
		return markAsUnread(requireEmployeeNotificationUser(authorizationHeader), id);
	}

	@Transactional
	public UserNotificationResponse markAdminAsUnread(String authorizationHeader, Long id) {
		return markAsUnread(requireAdminNotificationUser(authorizationHeader), id);
	}

	@Transactional
	public MessageResponse markAllAsRead(String authorizationHeader) {
		return markAllAsRead(requireBuyerUser(authorizationHeader));
	}

	@Transactional
	public MessageResponse markAllEmployeeNotificationsAsRead(String authorizationHeader) {
		return markAllAsRead(requireEmployeeNotificationUser(authorizationHeader));
	}

	@Transactional
	public MessageResponse markAllAdminNotificationsAsRead(String authorizationHeader) {
		return markAllAsRead(requireAdminNotificationUser(authorizationHeader));
	}

	@Transactional
	public void deleteAllNotificationsForUser(Long userId) {
		if (userId == null) {
			return;
		}
		userNotificationRepository.deleteAllByUserId(userId);
	}

	@Transactional
	public void notifyNewBrandEvent(EventItem eventItem) {
		if (eventItem == null || !eventItem.isActive()) {
			return;
		}

		List<User> users = userRepository.findAllByRoleAndEnabledTrue(Role.USER);
		if (users.isEmpty()) {
			return;
		}

		String storeName = eventItem.getStore() != null ? eventItem.getStore().getName() : null;
		String message = storeName == null
				? "%s has a new event: \"%s\".".formatted(BRAND_NAME, eventItem.getName())
				: "%s has a new event: \"%s\" at %s.".formatted(BRAND_NAME, eventItem.getName(), storeName);

		List<UserNotification> notifications = new ArrayList<>();
		for (User user : users) {
			UserNotification notification = new UserNotification();
			notification.setUser(user);
			notification.setType(UserNotificationType.BRAND_EVENT);
			notification.setTitle("New event from %s".formatted(BRAND_NAME));
			notification.setMessage(message);
			notification.setRelatedEventId(eventItem.getId());
			notification.setRelatedEventSlug(eventItem.getSlug());
			if (eventItem.getSlug() != null && !eventItem.getSlug().isBlank()) {
				notification.setActionUrl("/events/" + eventItem.getSlug());
			}
			if (eventItem.getStore() != null) {
				notification.setRelatedStoreId(eventItem.getStore().getId());
				notification.setRelatedStoreName(eventItem.getStore().getName());
			}
			notifications.add(notification);
		}
		userNotificationRepository.saveAll(notifications);
	}

	@Transactional
	public void notifyPublishedNews(NewsArticle newsArticle) {
		if (!isPublicNews(newsArticle)) {
			return;
		}

		List<User> users = userRepository.findAllByRoleAndEnabledTrue(Role.USER);
		if (users.isEmpty()) {
			return;
		}

		String storeName = newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getName() : null;
		String message = storeName == null
				? "%s has published a new article: \"%s\".".formatted(BRAND_NAME, newsArticle.getTitle())
				: "%s has published a new article: \"%s\" related to %s.".formatted(BRAND_NAME, newsArticle.getTitle(), storeName);
		String actionUrl = newsArticle.getSlug() == null || newsArticle.getSlug().isBlank()
				? null
				: "/news/" + newsArticle.getSlug();

		List<UserNotification> notifications = new ArrayList<>();
		for (User user : users) {
			UserNotification notification = new UserNotification();
			notification.setUser(user);
			notification.setType(UserNotificationType.NEWS_ARTICLE);
			notification.setTitle("Latest news from %s".formatted(BRAND_NAME));
			notification.setMessage(message);
			notification.setRelatedNewsId(newsArticle.getId());
			notification.setRelatedNewsSlug(newsArticle.getSlug());
			notification.setActionUrl(actionUrl);
			if (newsArticle.getRelatedStore() != null) {
				notification.setRelatedStoreId(newsArticle.getRelatedStore().getId());
				notification.setRelatedStoreName(newsArticle.getRelatedStore().getName());
			}
			notifications.add(notification);
		}
		userNotificationRepository.saveAll(notifications);
	}

	@Transactional
	public void notifyOrderCreated(Order order) {
		if (!canNotifyOrder(order)) {
			return;
		}
		createOrderNotification(
				order,
				"New order #%d".formatted(order.getId()),
				"Order #%d has been created. Please complete payment so the store can process it.".formatted(order.getId())
		);
	}

	@Transactional
	public void notifyManagerAboutNewOrder(Order order) {
		if (order == null || order.getId() == null) {
			return;
		}

		Optional<OrderStoreSnapshot> storeSnapshot = resolveOrderStore(order);
		if (storeSnapshot.isEmpty()) {
			return;
		}

		OrderStoreSnapshot orderStore = storeSnapshot.get();
		List<User> managers = userRepository.findAllByWorkingStoreIdAndRoleInAndEnabledTrue(
				orderStore.storeId(),
				List.of(Role.MANAGER)
		);
		if (managers.isEmpty()) {
			return;
		}

		String title = "New order at %s".formatted(orderStore.storeName());
		String message = order.getPaymentStatus() == PaymentStatus.PAID
				? "A customer just placed order #%d at %s. The order has been paid and is waiting for store processing."
						.formatted(order.getId(), orderStore.storeName())
				: "A customer just placed order #%d at %s. The order is awaiting payment."
						.formatted(order.getId(), orderStore.storeName());

		List<UserNotification> notifications = new ArrayList<>();
		for (User manager : managers) {
			UserNotification notification = new UserNotification();
			notification.setUser(manager);
			notification.setType(UserNotificationType.ORDER_STATUS);
			notification.setTitle(title);
			notification.setMessage(message);
			notification.setRelatedOrderId(order.getId());
			notification.setRelatedStoreId(orderStore.storeId());
			notification.setRelatedStoreName(orderStore.storeName());
			notification.setActionUrl("/admin/orders/" + order.getId());
			notifications.add(notification);
		}
		userNotificationRepository.saveAll(notifications);
	}

	@Transactional
	public void notifyOrderStatusChanged(Order order, OrderStatus previousStatus, PaymentStatus previousPaymentStatus) {
		if (!canNotifyOrder(order)) {
			return;
		}
		if (previousStatus == order.getStatus() && previousPaymentStatus == order.getPaymentStatus()) {
			return;
		}
		createOrderNotification(
				order,
				"Order update #%d".formatted(order.getId()),
				buildOrderStatusMessage(order)
		);
	}

	@Transactional
	public void notifyPaidOrderWaitingForManager(Order order) {
		if (!isEmployeeTaskOrder(order)) {
			return;
		}

		List<User> recipients = resolveTaskRecipients(order, Role.MANAGER, null);
		if (recipients.isEmpty()) {
			return;
		}

		String title = "Paid order #%d".formatted(order.getId());
		String message = "Order #%d at %s has been paid. The manager should confirm it and move it into processing."
				.formatted(order.getId(), resolveOrderStoreName(order));
		createOrderTaskNotifications(recipients, order, title, message, "/admin/orders/" + order.getId());
	}

	@Transactional
	public void notifyReadyOrderWaitingForShipper(Order order) {
		if (!isEmployeeTaskOrder(order)) {
			return;
		}

		List<User> recipients = resolveTaskRecipients(order, Role.SHIPPER, order.getDeliveringShipper());
		if (recipients.isEmpty()) {
			return;
		}

		String title = "Pickup ready for order #%d".formatted(order.getId());
		String message = order.getDeliveringShipper() != null
				? "The manager assigned you to order #%d at %s. Go to the store and scan the invoice QR to confirm pickup before delivery."
						.formatted(order.getId(), resolveOrderStoreName(order))
				: "Order #%d at %s is ready for pickup. Open the task and scan the invoice QR at the store to confirm pickup."
						.formatted(order.getId(), resolveOrderStoreName(order));
		createOrderTaskNotifications(recipients, order, title, message, "/employee/orders/" + order.getId());
	}

	private void createOrderNotification(Order order, String title, String message) {
		UserNotification notification = new UserNotification();
		notification.setUser(order.getUser());
		notification.setType(UserNotificationType.ORDER_STATUS);
		notification.setTitle(title);
		notification.setMessage(message);
		notification.setRelatedOrderId(order.getId());

		resolveOrderStore(order).ifPresent(orderStore -> {
			notification.setRelatedStoreId(orderStore.storeId());
			notification.setRelatedStoreName(orderStore.storeName());
		});

		userNotificationRepository.save(notification);
	}

	private void createOrderTaskNotifications(
			List<User> recipients,
			Order order,
			String title,
			String message,
			String actionUrl
	) {
		List<UserNotification> notifications = new ArrayList<>();
		for (User recipient : recipients) {
			UserNotification notification = new UserNotification();
			notification.setUser(recipient);
			notification.setType(UserNotificationType.ORDER_TASK);
			notification.setTitle(title);
			notification.setMessage(message);
			notification.setRelatedOrderId(order.getId());
			notification.setActionUrl(actionUrl);

			resolveOrderStore(order).ifPresent(orderStore -> {
				notification.setRelatedStoreId(orderStore.storeId());
				notification.setRelatedStoreName(orderStore.storeName());
			});
			notifications.add(notification);
		}
		userNotificationRepository.saveAll(notifications);
	}

	private String buildOrderStatusMessage(Order order) {
		Long orderId = order.getId();
		if (order.getStatus() == OrderStatus.CANCELLED || order.getPaymentStatus() == PaymentStatus.CANCELLED) {
			return "Order #%d has been cancelled.".formatted(orderId);
		}
		if (order.getPaymentStatus() == PaymentStatus.FAILED) {
			return "Payment for order #%d failed.".formatted(orderId);
		}
		if (order.getPaymentStatus() != PaymentStatus.PAID) {
			return "Order #%d is awaiting payment.".formatted(orderId);
		}
		return switch (order.getStatus()) {
			case PENDING -> "Order #%d has been paid successfully and is waiting for the store manager to confirm it.".formatted(orderId);
			case CONFIRMED -> "Order #%d has been confirmed by the store and is moving into processing.".formatted(orderId);
			case PREPARING -> "Order #%d is being prepared by the store.".formatted(orderId);
			case READY_FOR_SHIPPER -> "Order #%d is ready and waiting for the assigned shipper to pick it up.".formatted(orderId);
			case OUT_FOR_DELIVERY -> "Order #%d is on the way to you.".formatted(orderId);
			case COMPLETED -> "Order #%d has been delivered successfully.".formatted(orderId);
			case CANCELLED -> "Order #%d has been cancelled.".formatted(orderId);
		};
	}

	private boolean canNotifyOrder(Order order) {
		return order != null
				&& order.getId() != null
				&& order.getUser() != null
				&& order.getUser().getRole() == Role.USER;
	}

	private boolean isEmployeeTaskOrder(Order order) {
		return order != null
				&& order.getId() != null
				&& resolveOrderStore(order).isPresent();
	}

	private Optional<OrderStoreSnapshot> resolveOrderStore(Order order) {
		List<OrderItem> orderItems = orderItemRepository.findAllByOrderId(order.getId());
		if (orderItems.isEmpty() || orderItems.get(0).getStore() == null) {
			return Optional.empty();
		}
		return Optional.of(new OrderStoreSnapshot(
				orderItems.get(0).getStore().getId(),
				orderItems.get(0).getStore().getName()
		));
	}

	private List<User> resolveTaskRecipients(Order order, Role recipientRole, User assignedUser) {
		if (assignedUser != null && assignedUser.getId() != null && assignedUser.isEnabled()) {
			return List.of(assignedUser);
		}
		return resolveOrderStore(order)
				.map(orderStore -> userRepository.findAllByWorkingStoreIdAndRoleInAndEnabledTrue(
						orderStore.storeId(),
						List.of(recipientRole)
				))
				.orElse(List.of());
	}

	private String resolveOrderStoreName(Order order) {
		return resolveOrderStore(order)
				.map(OrderStoreSnapshot::storeName)
				.orElse(BRAND_NAME);
	}

	private boolean isPublicNews(NewsArticle newsArticle) {
		return newsArticle != null
				&& newsArticle.isPublished()
				&& newsArticle.getPublishedAt() != null
				&& !newsArticle.getPublishedAt().isAfter(Instant.now());
	}

	private PageResponse<UserNotificationResponse> listNotifications(User user, Boolean read, int page, int size) {
		Pageable pageable = buildPageable(page, size);
		if (read == null) {
			return PageResponse.from(userNotificationRepository.findAllByUserId(user.getId(), pageable)
					.map(UserNotificationResponse::from));
		}
		if (read) {
			return PageResponse.from(userNotificationRepository.findAllByUserIdAndReadAtIsNotNull(user.getId(), pageable)
					.map(UserNotificationResponse::from));
		}
		return PageResponse.from(userNotificationRepository.findAllByUserIdAndReadAtIsNull(user.getId(), pageable)
				.map(UserNotificationResponse::from));
	}

	private UserNotificationUnreadCountResponse getUnreadCount(User user) {
		return new UserNotificationUnreadCountResponse(userNotificationRepository.countByUserIdAndReadAtIsNull(user.getId()));
	}

	private UserNotificationResponse markAsRead(User user, Long id) {
		UserNotification notification = findOwnedNotification(id, user.getId());
		if (notification.getReadAt() == null) {
			notification.setReadAt(Instant.now());
			userNotificationRepository.save(notification);
		}
		return UserNotificationResponse.from(notification);
	}

	private UserNotificationResponse markAsUnread(User user, Long id) {
		UserNotification notification = findOwnedNotification(id, user.getId());
		notification.setReadAt(null);
		return UserNotificationResponse.from(userNotificationRepository.save(notification));
	}

	private MessageResponse markAllAsRead(User user) {
		List<UserNotification> unreadNotifications = userNotificationRepository.findAllByUserIdAndReadAtIsNull(user.getId());
		if (unreadNotifications.isEmpty()) {
			return new MessageResponse("No unread notifications");
		}

		Instant readAt = Instant.now();
		for (UserNotification notification : unreadNotifications) {
			notification.setReadAt(readAt);
		}
		userNotificationRepository.saveAll(unreadNotifications);
		return new MessageResponse("Marked %d notification(s) as read".formatted(unreadNotifications.size()));
	}

	private User requireBuyerUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.getRole() != Role.USER) {
			throw new ForbiddenException("Only USER accounts can access notifications");
		}
		return user;
	}

	private User requireEmployeeNotificationUser(String authorizationHeader) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (!EMPLOYEE_NOTIFICATION_ROLES.contains(user.getRole())) {
			throw new ForbiddenException("Only STAFF and SHIPPER accounts can access employee notifications");
		}
		if (!user.isEnabled()) {
			throw new ForbiddenException("Employee account is disabled");
		}
		if (user.getWorkingStore() == null || user.getWorkingStore().getId() == null) {
			throw new ForbiddenException("Employee account must be assigned to a working store");
		}
		return user;
	}

	private User requireAdminNotificationUser(String authorizationHeader) {
		return sessionAuthService.requireAdminOrManager(authorizationHeader);
	}

	private UserNotification findOwnedNotification(Long id, Long userId) {
		return userNotificationRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new NotFoundException("Notification not found"));
	}

	private Pageable buildPageable(int page, int size) {
		int resolvedPage = Math.max(page, 0);
		int resolvedSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
		return PageRequest.of(resolvedPage, resolvedSize, DEFAULT_SORT);
	}

	private record OrderStoreSnapshot(Long storeId, String storeName) {
	}
}
