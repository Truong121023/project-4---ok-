package com.example.registrationotp.dto;

import java.time.Instant;

public record MeResponse(
		String message,
		Instant expiresAt,
		UserResponse user
) {
}
