package com.example.registrationotp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.ReviewTargetType;

public record ReviewRequest(
		@NotNull(message = "userId is required")
		Long userId,
		@NotNull(message = "targetType is required")
		ReviewTargetType targetType,
		@NotNull(message = "targetId is required")
		Long targetId,
		@NotNull(message = "rating is required")
		@Min(value = 1, message = "rating must be at least 1")
		@Max(value = 5, message = "rating must be at most 5")
		Integer rating,
		@Size(max = 150, message = "title must be at most 150 characters")
		String title,
		@Size(max = 2000, message = "comment must be at most 2000 characters")
		String comment,
		@NotNull(message = "approved is required")
		Boolean approved
) {
}
