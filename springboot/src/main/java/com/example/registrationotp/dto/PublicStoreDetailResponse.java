package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

public record PublicStoreDetailResponse(
		StoreResponse store,
		PublicStoreStatsResponse stats,
		List<CategorySection> categories,
		List<PublicEventCardResponse> events,
		List<PublicReviewItemResponse> reviews
) {
	public record CategorySection(
			Long id,
			String title,
			String name,
			String description,
			List<String> imagePaths,
			double averageRating,
			long reviewCount,
			List<StoreDishItem> items
	) {
	}

	public record StoreDishItem(
			Long id,
			Long categoryId,
			String name,
			String description,
			String note,
			BigDecimal price,
			String priceDisplay,
			boolean franchiseRequired,
			String franchiseNote,
			List<String> imagePaths,
			String highlightSummary,
			List<String> highlightTags,
			double averageRating,
			long reviewCount,
			long orderCount,
			long favoriteCount,
			int stock,
			boolean available,
			boolean disabled,
			boolean schedulable
	) {
	}
}
