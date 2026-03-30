package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DishRequest(
		@NotNull(message = "categoryId is required")
		Long categoryId,
		@NotBlank(message = "name is required")
		@Size(max = 150, message = "name must be at most 150 characters")
		String name,
		@Size(max = 2000, message = "description must be at most 2000 characters")
		String description,
		@Size(max = 1000, message = "note must be at most 1000 characters")
		String note,
		@NotNull(message = "price is required")
		@DecimalMin(value = "0.0", inclusive = true, message = "price must be non-negative")
		BigDecimal price,
		@Size(max = 50, message = "status must be at most 50 characters")
		String status,
		Boolean available,
		Boolean franchiseRequired,
		@Size(max = 1000, message = "franchiseNote must be at most 1000 characters")
		String franchiseNote,
		@Size(max = 1000, message = "highlightSummary must be at most 1000 characters")
		String highlightSummary,
		List<@Size(max = 160, message = "Each highlight tag must be at most 160 characters") String> highlightTags,
		List<@Size(max = 500, message = "Each image path must be at most 500 characters") String> imagePaths,
		List<@Valid ContentSectionRequest> sections,
		Boolean active
) {
}
