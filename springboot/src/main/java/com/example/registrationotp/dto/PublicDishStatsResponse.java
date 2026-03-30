package com.example.registrationotp.dto;

public record PublicDishStatsResponse(
		double averageRating,
		long reviewCount,
		long orderCount,
		long favoriteCount,
		long totalStock
) {
}
