package com.example.registrationotp.dto;

import java.time.Instant;

public record PasswordResetOtpResponse(
		String message,
		String email,
		Instant otpExpiresAt
) {
}
