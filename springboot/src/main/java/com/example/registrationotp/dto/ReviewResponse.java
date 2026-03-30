package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;

public record ReviewResponse(
		Long id,
		Long userId,
		String userName,
		String userEmail,
		ReviewTargetType targetType,
		Long targetId,
		String targetSlug,
		String targetLabel,
		List<String> targetImagePaths,
		Integer rating,
		String title,
		String comment,
		boolean approved,
		Instant createdAt,
		Instant updatedAt
) {

	public static ReviewResponse from(
			Review review,
			String targetSlug,
			String targetLabel,
			List<String> targetImagePaths
	) {
		return new ReviewResponse(
				review.getId(),
				review.getUser().getId(),
				review.getUser().getFullName(),
				review.getUser().getEmail(),
				review.getTargetType(),
				review.getTargetId(),
				targetSlug,
				targetLabel,
				targetImagePaths,
				review.getRating(),
				review.getTitle(),
				review.getComment(),
				review.isApproved(),
				review.getCreatedAt(),
				review.getUpdatedAt()
		);
	}
}
