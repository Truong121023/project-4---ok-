package com.example.registrationotp.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.annotation.PostConstruct;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.registrationotp.dto.SupportChatStoreItemResponse;
import com.example.registrationotp.dto.SupportChatStoreListResponse;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.Store;
import com.example.registrationotp.model.User;
import com.example.registrationotp.repository.StoreRepository;

import io.socket.socketio.server.SocketIoServer;
import io.socket.socketio.server.SocketIoSocket;
import io.socket.socketio.server.SocketIoSocket.ReceivedByLocalAcknowledgementCallback;

@Service
public class SupportChatService {

	private static final String DEFAULT_NAMESPACE = "/";
	private static final String SOCKET_EVENT_START = "support:user_session:start";
	private static final String SOCKET_EVENT_SEND = "support:message:send";
	private static final String SOCKET_EVENT_USER_STATE = "support:user_state";
	private static final String SOCKET_EVENT_ADMIN_STATE = "support:admin_state";

	private final SessionAuthService sessionAuthService;
	private final StoreRepository storeRepository;
	private final SocketIoServer socketIoServer;

	// Chat state is intentionally in-memory only so frontend can work without SQL persistence.
	private final Map<String, ConnectedClient> connectedClientsBySocketId = new HashMap<>();
	private final Map<String, ChatSession> sessionsById = new HashMap<>();
	private final Map<Long, String> sessionIdByUserId = new HashMap<>();

	public SupportChatService(
			SessionAuthService sessionAuthService,
			StoreRepository storeRepository,
			SocketIoServer socketIoServer
	) {
		this.sessionAuthService = sessionAuthService;
		this.storeRepository = storeRepository;
		this.socketIoServer = socketIoServer;
	}

	@PostConstruct
	void registerSocketHandlers() {
		socketIoServer.namespace(DEFAULT_NAMESPACE)
				.on("connection", args -> handleSocketConnected((SocketIoSocket) args[0]));
	}

	public SupportChatStoreListResponse listStores(String authorizationHeader) {
		sessionAuthService.requireUser(authorizationHeader);
		List<SupportChatStoreItemResponse> items = storeRepository.findAll(Sort.by("name", "id"))
				.stream()
				.filter(Store::isActive)
				.map(store -> new SupportChatStoreItemResponse(store.getId(), store.getName()))
				.toList();
		return new SupportChatStoreListResponse(items);
	}

	private void handleSocketConnected(SocketIoSocket socket) {
		ConnectedClient client;
		try {
			client = authenticate(socket);
		} catch (RuntimeException exception) {
			socket.disconnect(true);
			return;
		}

		synchronized (this) {
			connectedClientsBySocketId.put(socket.getId(), client);
		}

		socket.on(SOCKET_EVENT_START, args -> handleStartEvent(socket.getId(), args));
		socket.on(SOCKET_EVENT_SEND, args -> handleSendEvent(socket.getId(), args));
		socket.on("disconnect", args -> handleSocketDisconnected(socket.getId()));

		if (client.user().getRole() == Role.USER) {
			emitUserStateIfPresent(client.user().getId());
		} else {
			emitAdminState(socket.getId());
		}
	}

	private void handleStartEvent(String socketId, Object... args) {
		EventEnvelope envelope = EventEnvelope.from(args);
		try {
			handleStartEventInternal(socketId, envelope.payload());
			sendAck(envelope.ack(), true, "Support chat started.");
		} catch (RuntimeException exception) {
			sendAck(envelope.ack(), false, exception.getMessage());
		}
	}

	private void handleSendEvent(String socketId, Object... args) {
		EventEnvelope envelope = EventEnvelope.from(args);
		try {
			handleSendEventInternal(socketId, envelope.payload());
			sendAck(envelope.ack(), true, "Message sent.");
		} catch (RuntimeException exception) {
			sendAck(envelope.ack(), false, exception.getMessage());
		}
	}

	private synchronized void handleStartEventInternal(String socketId, Object payload) {
		ConnectedClient client = requireConnectedClient(socketId);
		if (client.user().getRole() != Role.USER) {
			throw new IllegalArgumentException("Only USER can start support chat.");
		}

		JSONObject json = requireJsonObject(payload, "Support chat start payload is required.");
		Long storeId = requireLong(json, "storeId");
		Store store = storeRepository.findById(storeId)
				.filter(Store::isActive)
				.orElseThrow(() -> new NotFoundException("Store not found"));

		ChatSession session = findSessionByUserId(client.user().getId());
		if (session != null && !Objects.equals(session.storeId(), storeId)) {
			throw new IllegalArgumentException("User already has an active support chat session.");
		}

		if (session == null) {
			session = new ChatSession(
					"chat_" + compactId(),
					store.getId(),
					store.getName(),
					client.user().getId(),
					client.user().getFullName(),
					client.user().getEmail(),
					true,
					null,
					null,
					Instant.now(),
					new ArrayList<>()
			);
			sessionsById.put(session.id(), session);
			sessionIdByUserId.put(client.user().getId(), session.id());
		}

		emitUserState(session);
		emitAdminStates();
	}

	private synchronized void handleSendEventInternal(String socketId, Object payload) {
		ConnectedClient client = requireConnectedClient(socketId);
		JSONObject json = requireJsonObject(payload, "Support message payload is required.");
		String content = requireContent(json);

		if (client.user().getRole() == Role.USER) {
			ChatSession session = requireUserSession(client.user().getId());
			session.messages().add(new ChatMessage(
					"msg_" + compactId(),
					client.user().getId(),
					client.user().getFullName(),
					client.user().getRole().name(),
					content,
					Instant.now()
			));
			emitUserState(session);
			emitAdminStates();
			return;
		}

		if (client.user().getRole() != Role.ADMIN && client.user().getRole() != Role.MANAGER) {
			throw new IllegalArgumentException("Only USER, ADMIN, or MANAGER can send support messages.");
		}

		String sessionId = requireString(json, "sessionId");
		ChatSession session = sessionsById.get(sessionId);
		if (session == null) {
			throw new NotFoundException("Support chat session not found.");
		}
		if (!canAccessAdminSession(client.user(), session)) {
			throw new IllegalArgumentException("You cannot access this support chat session.");
		}
		if (session.assignedAdminId() != null && !Objects.equals(session.assignedAdminId(), client.user().getId())) {
			throw new IllegalArgumentException("Support chat session is already claimed by another admin.");
		}

		if (session.assignedAdminId() == null) {
			session.setAssignedAdminId(client.user().getId());
			session.setAssignedAdminName(client.user().getFullName());
			session.setWaitingForAdmin(false);
		}

		session.messages().add(new ChatMessage(
				"msg_" + compactId(),
				client.user().getId(),
				client.user().getFullName(),
				client.user().getRole().name(),
				content,
				Instant.now()
		));

		emitUserState(session);
		emitAdminStates();
	}

	private synchronized void handleSocketDisconnected(String socketId) {
		ConnectedClient client = connectedClientsBySocketId.remove(socketId);
		if (client == null) {
			return;
		}

		User user = client.user();
		if (user.getRole() == Role.USER) {
			if (!hasConnectedSocket(user.getId(), Role.USER)) {
				removeUserSession(user.getId());
				emitAdminStates();
			}
			return;
		}

		if ((user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER)
				&& !hasConnectedAdminSocket(user.getId())) {
			releaseClaimedSessions(user.getId());
		}
	}

	private ConnectedClient authenticate(SocketIoSocket socket) {
		JSONObject connectData = requireJsonObject(socket.getConnectData(), "Socket auth is required.");
		String token = requireString(connectData, "token");
		String tokenType = connectData.optString("tokenType", "Bearer").trim();
		User user = sessionAuthService.requireUser(tokenType + " " + token);
		Role role = user.getRole();
		if (role != Role.USER && role != Role.ADMIN && role != Role.MANAGER) {
			throw new IllegalArgumentException("Socket role is not allowed for support chat.");
		}
		return new ConnectedClient(socket, user);
	}

	private ConnectedClient requireConnectedClient(String socketId) {
		ConnectedClient client = connectedClientsBySocketId.get(socketId);
		if (client == null) {
			throw new IllegalArgumentException("Socket is not connected.");
		}
		return client;
	}

	private ChatSession requireUserSession(Long userId) {
		ChatSession session = findSessionByUserId(userId);
		if (session == null) {
			throw new NotFoundException("Support chat session not found.");
		}
		return session;
	}

	private ChatSession findSessionByUserId(Long userId) {
		String sessionId = sessionIdByUserId.get(userId);
		if (sessionId == null) {
			return null;
		}
		return sessionsById.get(sessionId);
	}

	private void removeUserSession(Long userId) {
		String sessionId = sessionIdByUserId.remove(userId);
		if (sessionId != null) {
			sessionsById.remove(sessionId);
		}
	}

	private void releaseClaimedSessions(Long adminUserId) {
		boolean changed = false;
		for (ChatSession session : sessionsById.values()) {
			if (Objects.equals(session.assignedAdminId(), adminUserId) && hasConnectedSocket(session.userId(), Role.USER)) {
				session.setAssignedAdminId(null);
				session.setAssignedAdminName(null);
				session.setWaitingForAdmin(true);
				changed = true;
				emitUserState(session);
			}
		}
		if (changed) {
			emitAdminStates();
		}
	}

	private boolean hasConnectedSocket(Long userId, Role role) {
		return connectedClientsBySocketId.values()
				.stream()
				.anyMatch(client -> Objects.equals(client.user().getId(), userId) && client.user().getRole() == role);
	}

	private boolean hasConnectedAdminSocket(Long userId) {
		return connectedClientsBySocketId.values()
				.stream()
				.anyMatch(client -> Objects.equals(client.user().getId(), userId)
						&& (client.user().getRole() == Role.ADMIN || client.user().getRole() == Role.MANAGER));
	}

	private boolean canAccessAdminSession(User user, ChatSession session) {
		if (user.getRole() == Role.ADMIN) {
			return true;
		}
		if (user.getRole() == Role.MANAGER) {
			return user.getWorkingStore() != null
					&& Objects.equals(user.getWorkingStore().getId(), session.storeId());
		}
		return false;
	}

	private boolean isVisibleToAdmin(User user, ChatSession session) {
		return canAccessAdminSession(user, session)
				&& (session.assignedAdminId() == null || Objects.equals(session.assignedAdminId(), user.getId()));
	}

	private void emitUserStateIfPresent(Long userId) {
		ChatSession session = findSessionByUserId(userId);
		if (session != null) {
			emitUserState(session);
		}
	}

	private void emitUserState(ChatSession session) {
		JSONObject state = toUserState(session);
		connectedClientsBySocketId.values()
				.stream()
				.filter(client -> client.user().getRole() == Role.USER)
				.filter(client -> Objects.equals(client.user().getId(), session.userId()))
				.forEach(client -> client.socket().send(SOCKET_EVENT_USER_STATE, state));
	}

	private void emitAdminStates() {
		for (String socketId : connectedClientsBySocketId.keySet()) {
			emitAdminState(socketId);
		}
	}

	private void emitAdminState(String socketId) {
		ConnectedClient client = connectedClientsBySocketId.get(socketId);
		if (client == null) {
			return;
		}
		Role role = client.user().getRole();
		if (role != Role.ADMIN && role != Role.MANAGER) {
			return;
		}

		JSONArray state = new JSONArray(
				sessionsById.values()
						.stream()
						.filter(session -> isVisibleToAdmin(client.user(), session))
						.sorted(Comparator.comparing(ChatSession::createdAt))
						.map(this::toAdminState)
						.collect(Collectors.toList())
		);
		client.socket().send(SOCKET_EVENT_ADMIN_STATE, state);
	}

	private void sendAck(ReceivedByLocalAcknowledgementCallback ack, boolean ok, String message) {
		if (ack == null) {
			return;
		}
		JSONObject response = new JSONObject();
		response.put("ok", ok);
		response.put("message", message);
		ack.sendAcknowledgement(response);
	}

	private JSONObject toUserState(ChatSession session) {
		JSONObject state = new JSONObject();
		state.put("id", session.id());
		state.put("storeId", session.storeId());
		state.put("storeName", session.storeName());
		state.put("assignedAdminId", session.assignedAdminId());
		state.put("assignedAdminName", session.assignedAdminName());
		state.put("messages", toMessages(session.messages()));
		return state;
	}

	private JSONObject toAdminState(ChatSession session) {
		JSONObject state = new JSONObject();
		state.put("id", session.id());
		state.put("storeId", session.storeId());
		state.put("storeName", session.storeName());
		state.put("userId", session.userId());
		state.put("userName", session.userName());
		state.put("userEmail", session.userEmail());
		state.put("waitingForAdmin", session.waitingForAdmin());
		state.put("assignedAdminId", session.assignedAdminId());
		state.put("assignedAdminName", session.assignedAdminName());
		state.put("messages", toMessages(session.messages()));
		return state;
	}

	private JSONArray toMessages(List<ChatMessage> messages) {
		JSONArray array = new JSONArray();
		for (ChatMessage message : messages) {
			JSONObject item = new JSONObject();
			item.put("id", message.id());
			item.put("senderId", message.senderId());
			item.put("senderName", message.senderName());
			item.put("senderRole", message.senderRole());
			item.put("content", message.content());
			item.put("createdAt", message.createdAt().toString());
			array.put(item);
		}
		return array;
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

	private Long requireLong(JSONObject json, String field) {
		if (!json.has(field) || json.isNull(field)) {
			throw new IllegalArgumentException(field + " is required.");
		}
		return json.getLong(field);
	}

	private String requireContent(JSONObject json) {
		String content = requireString(json, "content");
		if (content.length() > 4000) {
			throw new IllegalArgumentException("content is too long.");
		}
		return content;
	}

	private String compactId() {
		return UUID.randomUUID().toString().replace("-", "");
	}

	private record ConnectedClient(
			SocketIoSocket socket,
			User user
	) {
	}

	private record EventEnvelope(
			Object payload,
			ReceivedByLocalAcknowledgementCallback ack
	) {

		private static EventEnvelope from(Object... args) {
			ReceivedByLocalAcknowledgementCallback ack = null;
			int payloadCount = args.length;
			if (payloadCount > 0 && args[payloadCount - 1] instanceof ReceivedByLocalAcknowledgementCallback callback) {
				ack = callback;
				payloadCount--;
			}
			Object payload = payloadCount > 0 ? args[0] : null;
			return new EventEnvelope(payload, ack);
		}
	}

	private static final class ChatSession {

		private final String id;
		private final Long storeId;
		private final String storeName;
		private final Long userId;
		private final String userName;
		private final String userEmail;
		private boolean waitingForAdmin;
		private Long assignedAdminId;
		private String assignedAdminName;
		private final Instant createdAt;
		private final List<ChatMessage> messages;

		private ChatSession(
				String id,
				Long storeId,
				String storeName,
				Long userId,
				String userName,
				String userEmail,
				boolean waitingForAdmin,
				Long assignedAdminId,
				String assignedAdminName,
				Instant createdAt,
				List<ChatMessage> messages
		) {
			this.id = id;
			this.storeId = storeId;
			this.storeName = storeName;
			this.userId = userId;
			this.userName = userName;
			this.userEmail = userEmail;
			this.waitingForAdmin = waitingForAdmin;
			this.assignedAdminId = assignedAdminId;
			this.assignedAdminName = assignedAdminName;
			this.createdAt = createdAt;
			this.messages = messages;
		}

		private String id() {
			return id;
		}

		private Long storeId() {
			return storeId;
		}

		private String storeName() {
			return storeName;
		}

		private Long userId() {
			return userId;
		}

		private String userName() {
			return userName;
		}

		private String userEmail() {
			return userEmail;
		}

		private boolean waitingForAdmin() {
			return waitingForAdmin;
		}

		private void setWaitingForAdmin(boolean waitingForAdmin) {
			this.waitingForAdmin = waitingForAdmin;
		}

		private Long assignedAdminId() {
			return assignedAdminId;
		}

		private void setAssignedAdminId(Long assignedAdminId) {
			this.assignedAdminId = assignedAdminId;
		}

		private String assignedAdminName() {
			return assignedAdminName;
		}

		private void setAssignedAdminName(String assignedAdminName) {
			this.assignedAdminName = assignedAdminName;
		}

		private Instant createdAt() {
			return createdAt;
		}

		private List<ChatMessage> messages() {
			return messages;
		}
	}

	private record ChatMessage(
			String id,
			Long senderId,
			String senderName,
			String senderRole,
			String content,
			Instant createdAt
	) {
	}
}
