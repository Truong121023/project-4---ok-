package com.example.registrationotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "fullName is required")
		@Size(max = 100, message = "fullName must be at most 100 characters")
		String fullName,
		@NotBlank(message = "email is required")
		@Email(message = "email is invalid")
		@Size(max = 150, message = "email must be at most 150 characters")
		String email,
		@NotBlank(message = "password is required")
		@Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
		String password
) {
}
