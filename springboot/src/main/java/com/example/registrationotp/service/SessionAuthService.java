package com.example.registrationotp.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.UnauthorizedException;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserSession;
import com.example.registrationotp.repository.UserSessionRepository;

@Service
public class SessionAuthService {

	private static final String TOKEN_TYPE = "Bearer";

	private final UserSessionRepository userSessionRepository;

	public SessionAuthService(UserSessionRepository userSessionRepository) {
		this.userSessionRepository = userSessionRepository;
	}

	@Transactional(readOnly = true)
	public UserSession requireSession(String authorizationHeader) {
		String token = extractBearerToken(authorizationHeader);
		UserSession session = userSessionRepository.findByToken(token)
				.orElseThrow(() -> new UnauthorizedException("Token is invalid"));

		if (session.getExpiresAt().isBefore(Instant.now())) {
			throw new UnauthorizedException("Token has expired");
		}

		return session;
	}

	@Transactional(readOnly = true)
	public User requireUser(String authorizationHeader) {
		return requireSession(authorizationHeader).getUser();
	}

	@Transactional(readOnly = true)
	public User requireAdmin(String authorizationHeader) {
		User user = requireUser(authorizationHeader);
		if (user.getRole() != Role.ADMIN) {
			throw new ForbiddenException("Admin role is required");
		}
		return user;
	}

	@Transactional(readOnly = true)
	public User requireAdminOrManager(String authorizationHeader) {
		User user = requireUser(authorizationHeader);
		if (user.getRole() != Role.ADMIN && user.getRole() != Role.MANAGER) {
			throw new ForbiddenException("Admin or Manager role is required");
		}
		return user;
	}

	@Transactional(readOnly = true)
	public User requireManager(String authorizationHeader) {
		User user = requireUser(authorizationHeader);
		if (user.getRole() != Role.MANAGER) {
			throw new ForbiddenException("Manager role is required");
		}
		return user;
	}

	private String extractBearerToken(String authorizationHeader) {
		if (authorizationHeader == null || !authorizationHeader.startsWith(TOKEN_TYPE + " ")) {
			throw new UnauthorizedException("Authorization header must be Bearer token");
		}
		return authorizationHeader.substring((TOKEN_TYPE + " ").length()).trim();
	}
}
