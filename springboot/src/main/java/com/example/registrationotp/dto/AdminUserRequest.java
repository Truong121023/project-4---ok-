package com.example.registrationotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.Role;

public record AdminUserRequest(
		@NotBlank(message = "fullName is required")
		@Size(max = 100, message = "fullName must be at most 100 characters")
		String fullName,
		@NotBlank(message = "email is required")
		@Email(message = "email is invalid")
		String email,
		String password,
		@NotNull(message = "role is required")
		Role role,
		Long workingStoreId,
		@NotNull(message = "enabled is required")
		Boolean enabled
) {
}
