package com.example.registrationotp.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
		Long storeId,
		@NotBlank(message = "name is required")
		@Size(max = 120, message = "name must be at most 120 characters")
		String name,
		@Size(max = 1000, message = "description must be at most 1000 characters")
		String description,
		List<@Size(max = 500, message = "Each image path must be at most 500 characters") String> imagePaths,
		Integer sortOrder,
		@NotNull(message = "active is required")
		Boolean active
) {
}
