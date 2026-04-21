package com.example.registrationotp.dto;

public record PublicAddressSuggestionResponse(
		String placeId,
		String label,
		String secondaryLabel,
		String sessionToken,
		String source,
		String normalizedAddress,
		Double latitude,
		Double longitude
) {
}
