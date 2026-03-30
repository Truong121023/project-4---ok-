package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.Role;

public record RegisterResponse(
		String message,
		Long userId,
		String email,
		Role role,
		Instant otpExpiresAt
) {
}
