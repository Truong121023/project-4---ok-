package com.example.registrationotp.dto;

public record PublicAddressResolveResponse(
		String placeId,
		String label,
		String normalizedAddress,
		Double latitude,
		Double longitude,
		String source
) {
}
