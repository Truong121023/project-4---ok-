package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EventItemRequest(
		@NotNull(message = "storeId is required")
		Long storeId,
		@NotBlank(message = "name is required")
		@Size(max = 150, message = "name must be at most 150 characters")
		String name,
		@Size(max = 200, message = "slug must be at most 200 characters")
		String slug,
		@Size(max = 2000, message = "description must be at most 2000 characters")
		String description,
		@Size(max = 255, message = "location must be at most 255 characters")
		String location,
		@Size(max = 255, message = "scheduleText must be at most 255 characters")
		String scheduleText,
		@Size(max = 1000, message = "highlightSummary must be at most 1000 characters")
		String highlightSummary,
		List<@Size(max = 160, message = "Each highlight tag must be at most 160 characters") String> highlightTags,
		Integer capacity,
		Integer bookedCount,
		List<Long> featuredDishIds,
		List<@Size(max = 500, message = "Each image path must be at most 500 characters") String> imagePaths,
		List<@Valid ContentSectionRequest> sections,
		@NotNull(message = "startsAt is required")
		Instant startsAt,
		@NotNull(message = "endsAt is required")
		Instant endsAt,
		@NotNull(message = "active is required")
		Boolean active
) {
}
