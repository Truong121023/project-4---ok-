package com.example.registrationotp.dto;

import java.time.Instant;

public record LoginResponse(
		String message,
		String tokenType,
		String accessToken,
		Instant expiresAt,
		UserResponse user
) {
}
