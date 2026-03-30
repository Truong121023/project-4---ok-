package com.example.registrationotp.dto;

import java.util.List;
import java.math.BigDecimal;

public record PublicBestStoreResponse(
		Long id,
		Long storeId,
		String slug,
		String storeSlug,
		String name,
		String storeName,
		String address,
		String area,
		Double distanceKm,
		Integer stock,
		boolean open,
		boolean available,
		boolean disabled,
		boolean schedulable,
		BigDecimal price,
		List<String> imagePaths
) {
}
