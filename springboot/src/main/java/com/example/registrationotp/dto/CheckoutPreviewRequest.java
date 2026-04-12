package com.example.registrationotp.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.DeliveryType;

public record CheckoutPreviewRequest(
		@NotNull(message = "deliveryAddressId is required")
		Long deliveryAddressId,
		@Size(max = 50, message = "promotionCode must be at most 50 characters")
		String promotionCode,
		DeliveryType deliveryType,
		Instant scheduledDeliveryAt
) {
}
