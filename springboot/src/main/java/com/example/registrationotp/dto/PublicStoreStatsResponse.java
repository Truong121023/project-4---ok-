package com.example.registrationotp.dto;

public record PublicStoreStatsResponse(
		double averageRating,
		long reviewCount,
		long favoriteCount,
		long availableItemCount
) {
}
