package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

public record PublicEventCardResponse(
		Long id,
		String slug,
		Long storeId,
		String storeSlug,
		String storeName,
		String storeAddress,
		String storeArea,
		String title,
		String name,
		String summary,
		String description,
		String location,
		String scheduleText,
		List<String> imagePaths,
		List<ContentSectionResponse> sections,
		String highlightSummary,
		List<String> highlightTags,
		Instant startsAt,
		Instant endsAt,
		double averageRating,
		long reviewCount,
		long favoriteCount,
		Integer capacity,
		Integer bookedCount,
		Integer remainingSlots,
		boolean disabled,
		String disabledReason,
		Double distanceKm,
		StorePreview store,
		List<PublicReviewItemResponse> reviews,
		List<FeaturedDishPreview> featuredDishes
) {
	public record StorePreview(
			Long id,
			String slug,
			String storeSlug,
			String name,
			String storeName,
			String address,
			String area,
			boolean open,
			boolean disabled,
			String disabledReason,
			List<String> imagePaths
	) {
	}

	public record FeaturedDishPreview(
			Long id,
			String name,
			java.math.BigDecimal price,
			List<String> imagePaths
	) {
	}
}
