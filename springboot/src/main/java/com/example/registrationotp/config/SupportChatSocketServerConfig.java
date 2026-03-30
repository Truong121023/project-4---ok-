package com.example.registrationotp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.socket.engineio.server.EngineIoServer;
import io.socket.engineio.server.EngineIoServerOptions;
import io.socket.socketio.server.SocketIoServer;

@Configuration
public class SupportChatSocketServerConfig {

	private final CorsProperties corsProperties;

	public SupportChatSocketServerConfig(CorsProperties corsProperties) {
		this.corsProperties = corsProperties;
	}

	@Bean
	EngineIoServer engineIoServer() {
		EngineIoServerOptions options = EngineIoServerOptions.newFromDefault();
		options.setAllowedCorsOrigins(corsProperties.getAllowedOrigins().toArray(String[]::new));
		return new EngineIoServer(options);
	}

	@Bean
	SocketIoServer socketIoServer(EngineIoServer engineIoServer) {
		return new SocketIoServer(engineIoServer);
	}
}
