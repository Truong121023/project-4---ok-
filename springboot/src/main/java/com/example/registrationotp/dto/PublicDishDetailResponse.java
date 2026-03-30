package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

public record PublicDishDetailResponse(
		DishResponse dish,
		CategoryResponse category,
		PublicDishStatsResponse stats,
		List<StoreAvailability> stores,
		List<PublicReviewItemResponse> reviews,
		List<PublicDishCardResponse> relatedDishes
) {
	public record StoreAvailability(
			Long id,
			Long storeId,
			String slug,
			String storeSlug,
			String name,
			String storeName,
			String address,
			String area,
			Double distanceKm,
			boolean storeOpen,
			boolean storeDisabled,
			int stock,
			boolean available,
			boolean disabled,
			boolean schedulable,
			BigDecimal price,
			List<String> imagePaths
	) {
	}
}
