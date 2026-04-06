package com.example.registrationotp.dto;

import java.time.Instant;

public record DeliveryProofUploadResponse(
		String message,
		Long orderId,
		String imagePath,
		Instant capturedAt,
		String note,
		Instant uploadedAt
) {
}
