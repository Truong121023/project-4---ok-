package com.example.registrationotp.dto;

import java.util.List;

public record PublicStoreCardResponse(
		Long id,
		String slug,
		String name,
		String description,
		String address,
		String area,
		String positionLabel,
		Double latitude,
		Double longitude,
		List<String> imagePaths,
		String highlightSummary,
		List<String> highlightTags,
		double averageRating,
		long reviewCount,
		long favoriteCount,
		long availableItemCount,
		Double distanceKm,
		boolean open,
		boolean disabled,
		String disabledReason
) {
}
