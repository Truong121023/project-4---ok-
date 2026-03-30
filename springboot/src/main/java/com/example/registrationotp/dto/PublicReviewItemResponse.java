package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.ReviewTargetType;

public record PublicReviewItemResponse(
		Long id,
		Long userId,
		String userName,
		String userEmail,
		ReviewTargetType targetType,
		Long targetId,
		String targetSlug,
		String targetLabel,
		java.util.List<String> targetImagePaths,
		Integer rating,
		String title,
		String comment,
		Instant createdAt,
		Instant updatedAt
) {
}
