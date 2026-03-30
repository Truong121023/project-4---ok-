package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

public record PublicDishCardResponse(
		Long id,
		Long categoryId,
		String categoryName,
		String name,
		String description,
		String note,
		BigDecimal price,
		String priceDisplay,
		String status,
		boolean franchiseRequired,
		String franchiseNote,
		List<String> imagePaths,
		String highlightSummary,
		List<String> highlightTags,
		double averageRating,
		long reviewCount,
		long orderCount,
		long favoriteCount,
		Integer stock,
		boolean available,
		boolean disabled,
		boolean active,
		Long storeId,
		String storeName,
		PublicBestStoreResponse bestStore
) {
}
