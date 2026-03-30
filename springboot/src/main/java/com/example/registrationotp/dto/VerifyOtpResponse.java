package com.example.registrationotp.dto;

public record VerifyOtpResponse(
		String message,
		UserResponse user
) {
}
