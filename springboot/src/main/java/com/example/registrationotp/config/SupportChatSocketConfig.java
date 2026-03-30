package com.example.registrationotp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class SupportChatSocketConfig implements WebSocketConfigurer {

	private final SupportChatSocketHandler supportChatSocketHandler;
	private final CorsProperties corsProperties;

	public SupportChatSocketConfig(
			SupportChatSocketHandler supportChatSocketHandler,
			CorsProperties corsProperties
	) {
		this.supportChatSocketHandler = supportChatSocketHandler;
		this.corsProperties = corsProperties;
	}

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(supportChatSocketHandler, "/socket.io", "/socket.io/")
				.addInterceptors(supportChatSocketHandler)
				.setAllowedOrigins(corsProperties.getAllowedOrigins().toArray(String[]::new));
	}
}
