package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;

public record FavoriteResponse(
		Long id,
		FavoriteTargetType targetType,
		Long targetId,
		String targetSlug,
		String targetLabel,
		List<String> targetImagePaths,
		boolean purchased,
		Instant createdAt
) {

	public static FavoriteResponse from(
			Favorite favorite,
			String targetSlug,
			String targetLabel,
			List<String> targetImagePaths,
			boolean purchased
	) {
		return new FavoriteResponse(
				favorite.getId(),
				favorite.getTargetType(),
				favorite.getTargetId(),
				targetSlug,
				targetLabel,
				targetImagePaths,
				purchased,
				favorite.getCreatedAt()
		);
	}
}
