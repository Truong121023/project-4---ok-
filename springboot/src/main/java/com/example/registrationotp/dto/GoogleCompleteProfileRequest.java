package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleCompleteProfileRequest(
		@NotBlank(message = "fullName is required")
		@Size(max = 100, message = "fullName must be at most 100 characters")
		String fullName,
		@NotBlank(message = "password is required")
		@Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
		String password
) {
}
