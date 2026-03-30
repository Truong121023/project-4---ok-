package com.example.registrationotp.config;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.server.HandshakeInterceptor;

import io.socket.engineio.server.EngineIoServer;
import io.socket.engineio.server.EngineIoWebSocket;
import io.socket.engineio.server.utils.ParseQS;

@Controller
public class SupportChatSocketHandler implements HandshakeInterceptor, WebSocketHandler {

	private static final String ATTRIBUTE_ENGINEIO_BRIDGE = "engineIo.bridge";
	private static final String ATTRIBUTE_ENGINEIO_QUERY = "engineIo.query";
	private static final String ATTRIBUTE_ENGINEIO_HEADERS = "engineIo.headers";

	private final EngineIoServer engineIoServer;

	public SupportChatSocketHandler(EngineIoServer engineIoServer) {
		this.engineIoServer = engineIoServer;
	}

	@RequestMapping(
			value = { "/socket.io", "/socket.io/" },
			method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS },
			headers = "Connection!=Upgrade"
	)
	public void httpHandler(HttpServletRequest request, HttpServletResponse response) throws IOException {
		engineIoServer.handleRequest(request, response);
	}

	@Override
	public boolean beforeHandshake(
			ServerHttpRequest request,
			ServerHttpResponse response,
			WebSocketHandler wsHandler,
			Map<String, Object> attributes
	) {
		attributes.put(ATTRIBUTE_ENGINEIO_QUERY, request.getURI().getQuery());
		attributes.put(ATTRIBUTE_ENGINEIO_HEADERS, request.getHeaders());
		return true;
	}

	@Override
	public void afterHandshake(
			ServerHttpRequest request,
			ServerHttpResponse response,
			WebSocketHandler wsHandler,
			Exception exception
	) {
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		EngineIoSpringWebSocket webSocket = new EngineIoSpringWebSocket(session);
		session.getAttributes().put(ATTRIBUTE_ENGINEIO_BRIDGE, webSocket);
		engineIoServer.handleWebSocket(webSocket);
	}

	@Override
	public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) {
		EngineIoSpringWebSocket webSocket = (EngineIoSpringWebSocket) session.getAttributes()
				.get(ATTRIBUTE_ENGINEIO_BRIDGE);
		if (webSocket != null) {
			webSocket.handleMessage(message);
		}
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) {
		EngineIoSpringWebSocket webSocket = (EngineIoSpringWebSocket) session.getAttributes()
				.get(ATTRIBUTE_ENGINEIO_BRIDGE);
		if (webSocket != null) {
			webSocket.handleTransportError(exception);
		}
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
		EngineIoSpringWebSocket webSocket = (EngineIoSpringWebSocket) session.getAttributes()
				.get(ATTRIBUTE_ENGINEIO_BRIDGE);
		if (webSocket != null) {
			webSocket.afterConnectionClosed(closeStatus);
		}
	}

	@Override
	public boolean supportsPartialMessages() {
		return false;
	}

	private static final class EngineIoSpringWebSocket extends EngineIoWebSocket {

		private final WebSocketSession session;
		private final Map<String, String> query;
		private final Map<String, List<String>> headers;

		@SuppressWarnings("unchecked")
		private EngineIoSpringWebSocket(WebSocketSession session) {
			this.session = session;
			String queryString = (String) session.getAttributes().get(ATTRIBUTE_ENGINEIO_QUERY);
			this.query = queryString == null ? new HashMap<>() : ParseQS.decode(queryString);
			this.headers = (Map<String, List<String>>) session.getAttributes().get(ATTRIBUTE_ENGINEIO_HEADERS);
		}

		@Override
		public Map<String, String> getQuery() {
			return query;
		}

		@Override
		public Map<String, List<String>> getConnectionHeaders() {
			return headers;
		}

		@Override
		public void write(String message) throws IOException {
			session.sendMessage(new TextMessage(message));
		}

		@Override
		public void write(byte[] message) throws IOException {
			session.sendMessage(new BinaryMessage(message));
		}

		@Override
		public void close() {
			try {
				session.close();
			} catch (IOException ignore) {
			}
		}

		private void afterConnectionClosed(CloseStatus closeStatus) {
			emit("close");
		}

		private void handleMessage(WebSocketMessage<?> message) {
			Object payload = message.getPayload();
			if (payload instanceof String || payload instanceof byte[]) {
				emit("message", payload);
				return;
			}
			throw new IllegalStateException(
					"Invalid websocket payload type: " + payload.getClass().getName()
			);
		}

		private void handleTransportError(Throwable exception) {
			emit("error", "write error", exception.getMessage());
		}
	}
}
