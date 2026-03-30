package com.example.registrationotp.dto;

public record PublicStoreLocationResponse(
		Long storeId,
		String storeSlug,
		String storeName,
		String address,
		String area,
		Double latitude,
		Double longitude,
		String positionLabel
) {
}
