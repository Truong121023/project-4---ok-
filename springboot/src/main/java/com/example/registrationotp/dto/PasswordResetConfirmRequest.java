package com.example.registrationotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmRequest(
		@NotBlank(message = "email is required")
		@Email(message = "email is invalid")
		@Size(max = 150, message = "email must be at most 150 characters")
		String email,
		@NotBlank(message = "otp is required")
		@Size(max = 8, message = "otp must be at most 8 characters")
		String otp,
		@NotBlank(message = "newPassword is required")
		@Size(min = 8, max = 72, message = "newPassword must be between 8 and 72 characters")
		String newPassword
) {
}
