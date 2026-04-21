package com.example.registrationotp.service;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.annotation.PostConstruct;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderItem;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserNotification;
import com.example.registrationotp.repository.OrderItemRepository;
import com.example.registrationotp.repository.UserNotificationRepository;
import com.example.registrationotp.repository.UserRepository;

import io.socket.socketio.server.SocketIoServer;
import io.socket.socketio.server.SocketIoSocket;

@Service
public class AppRealtimeService {

	private static final String NAMESPACE = "/app";
	private static final String ORDER_UPDATE_EVENT = "app:order:update";
	private static final String NOTIFICATION_UPDATE_EVENT = "app:notification:update";

	private final SessionAuthService sessionAuthService;
	private final SocketIoServer socketIoServer;
	private final UserRepository userRepository;
	private final OrderItemRepository orderItemRepository;
	private final UserNotificationRepository userNotificationRepository;

	private final Map<String, ConnectedClient> connectedClientsBySocketId = new ConcurrentHashMap<>();

	public AppRealtimeService(
			SessionAuthService sessionAuthService,
			SocketIoServer socketIoServer,
			UserRepository userRepository,
			OrderItemRepository orderItemRepository,
			UserNotificationRepository userNotificationRepository
	) {
		this.sessionAuthService = sessionAuthService;
		this.socketIoServer = socketIoServer;
		this.userRepository = userRepository;
		this.orderItemRepository = orderItemRepository;
		this.userNotificationRepository = userNotificationRepository;
	}

	@PostConstruct
	void registerSocketHandlers() {
		socketIoServer.namespace(NAMESPACE)
				.on("connection", args -> handleSocketConnected((SocketIoSocket) args[0]));
	}

	public void publishOrderUpdated(Order order) {
		if (order == null || order.getId() == null) {
			return;
		}

		Set<Long> recipientIds = resolveOrderRecipientIds(order);
		if (recipientIds.isEmpty()) {
			return;
		}

		Long storeId = resolveOrderStoreId(order);
		Long userId = order.getUser() == null ? null : order.getUser().getId();
		Long shipperId = order.getDeliveringShipper() == null ? null : order.getDeliveringShipper().getId();
		String status = order.getStatus() == null ? null : order.getStatus().name();
		String paymentStatus = order.getPaymentStatus() == null ? null : order.getPaymentStatus().name();
		Instant emittedAt = Instant.now();

		runAfterCommitOrNow(() -> emitOrderUpdated(recipientIds, order.getId(), status, paymentStatus, storeId, userId, shipperId, emittedAt));
	}

	public void publishNotificationUpdates(Collection<UserNotification> notifications) {
		if (notifications == null || notifications.isEmpty()) {
			return;
		}

		Map<Long, Set<Long>> notificationIdsByUserId = new LinkedHashMap<>();
		for (UserNotification notification : notifications) {
			Long userId = notification != null && notification.getUser() != null ? notification.getUser().getId() : null;
			if (userId == null) {
				continue;
			}
			notificationIdsByUserId
					.computeIfAbsent(userId, key -> new LinkedHashSet<>())
					.add(notification.getId());
		}

		if (notificationIdsByUserId.isEmpty()) {
			return;
		}

		runAfterCommitOrNow(() -> notificationIdsByUserId.forEach((userId, notificationIds) -> emitNotificationUpdated(
				userId,
				notificationIds,
				userNotificationRepository.countByUserIdAndReadAtIsNull(userId),
				Instant.now()
		)));
	}

	public void publishNotificationStateChanged(User user, Long notificationId) {
		Long userId = user == null ? null : user.getId();
		if (userId == null) {
			return;
		}

		Set<Long> notificationIds = new LinkedHashSet<>();
		if (notificationId != null) {
			notificationIds.add(notificationId);
		}

		runAfterCommitOrNow(() -> emitNotificationUpdated(
				userId,
				notificationIds,
				userNotificationRepository.countByUserIdAndReadAtIsNull(userId),
				Instant.now()
		));
	}

	private void handleSocketConnected(SocketIoSocket socket) {
		try {
			ConnectedClient client = authenticate(socket);
			connectedClientsBySocketId.put(socket.getId(), client);
			socket.on("disconnect", args -> handleSocketDisconnected(socket.getId()));
		} catch (RuntimeException exception) {
			socket.disconnect(true);
		}
	}

	private void handleSocketDisconnected(String socketId) {
		connectedClientsBySocketId.remove(socketId);
	}

	private ConnectedClient authenticate(SocketIoSocket socket) {
		JSONObject connectData = requireJsonObject(socket.getConnectData(), "Socket auth is required.");
		String token = requireString(connectData, "token");
		String tokenType = connectData.optString("tokenType", "Bearer").trim();
		User user = sessionAuthService.requireUser(tokenType + " " + token);
		return new ConnectedClient(socket, user.getId());
	}

	private JSONObject requireJsonObject(Object value, String message) {
		if (value instanceof JSONObject jsonObject) {
			return jsonObject;
		}
		throw new IllegalArgumentException(message);
	}

	private String requireString(JSONObject json, String field) {
		String value = json.optString(field, "").trim();
		if (value.isBlank()) {
			throw new IllegalArgumentException(field + " is required.");
		}
		return value;
	}

	private Set<Long> resolveOrderRecipientIds(Order order) {
		Set<Long> recipientIds = new LinkedHashSet<>();
		if (order.getUser() != null && order.getUser().getId() != null) {
			recipientIds.add(order.getUser().getId());
		}
		if (order.getDeliveringShipper() != null && order.getDeliveringShipper().getId() != null) {
			recipientIds.add(order.getDeliveringShipper().getId());
		}
		if (order.getPreparingStaff() != null && order.getPreparingStaff().getId() != null) {
			recipientIds.add(order.getPreparingStaff().getId());
		}

		Long storeId = resolveOrderStoreId(order);
		if (storeId != null) {
			userRepository.findAllByWorkingStoreIdAndRoleInAndEnabledTrue(storeId, List.of(Role.MANAGER))
					.stream()
					.map(User::getId)
					.filter(Objects::nonNull)
					.forEach(recipientIds::add);
		}

		userRepository.findAllByRoleAndEnabledTrue(Role.ADMIN)
				.stream()
				.map(User::getId)
				.filter(Objects::nonNull)
				.forEach(recipientIds::add);

		return recipientIds;
	}

	private Long resolveOrderStoreId(Order order) {
		if (order == null || order.getId() == null) {
			return null;
		}

		for (OrderItem item : orderItemRepository.findAllByOrderId(order.getId())) {
			if (item.getStore() != null && item.getStore().getId() != null) {
				return item.getStore().getId();
			}
		}
		return null;
	}

	private void emitOrderUpdated(
			Set<Long> recipientIds,
			Long orderId,
			String status,
			String paymentStatus,
			Long storeId,
			Long userId,
			Long shipperId,
			Instant emittedAt
	) {
		JSONObject payload = new JSONObject();
		payload.put("eventType", "ORDER_UPDATED");
		payload.put("orderId", orderId);
		if (status != null) {
			payload.put("status", status);
		}
		if (paymentStatus != null) {
			payload.put("paymentStatus", paymentStatus);
		}
		if (storeId != null) {
			payload.put("storeId", storeId);
		}
		if (userId != null) {
			payload.put("userId", userId);
		}
		if (shipperId != null) {
			payload.put("shipperId", shipperId);
		}
		payload.put("emittedAt", emittedAt.toString());

		connectedClientsBySocketId.values()
				.stream()
				.filter(client -> recipientIds.contains(client.userId()))
				.forEach(client -> client.socket().send(ORDER_UPDATE_EVENT, payload));
	}

	private void emitNotificationUpdated(Long userId, Set<Long> notificationIds, long unreadCount, Instant emittedAt) {
		JSONObject payload = new JSONObject();
		payload.put("eventType", "NOTIFICATIONS_CHANGED");
		payload.put("userId", userId);
		payload.put("unreadCount", unreadCount);
		payload.put("notificationIds", new JSONArray(notificationIds == null ? List.of() : notificationIds));
		payload.put("emittedAt", emittedAt.toString());

		connectedClientsBySocketId.values()
				.stream()
				.filter(client -> Objects.equals(client.userId(), userId))
				.forEach(client -> client.socket().send(NOTIFICATION_UPDATE_EVENT, payload));
	}

	private void runAfterCommitOrNow(Runnable action) {
		if (TransactionSynchronizationManager.isSynchronizationActive() && TransactionSynchronizationManager.isActualTransactionActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					action.run();
				}
			});
			return;
		}
		action.run();
	}

	private record ConnectedClient(
			SocketIoSocket socket,
			Long userId
	) {
	}
}
