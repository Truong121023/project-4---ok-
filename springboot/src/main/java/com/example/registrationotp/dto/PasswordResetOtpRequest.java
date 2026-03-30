package com.example.registrationotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetOtpRequest(
		@NotBlank(message = "email is required")
		@Email(message = "email is invalid")
		@Size(max = 150, message = "email must be at most 150 characters")
		String email
) {
}
