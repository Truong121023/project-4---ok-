package com.example.registrationotp.dto;

public record GoogleCompleteProfileResponse(
		String message,
		UserResponse user
) {
}
