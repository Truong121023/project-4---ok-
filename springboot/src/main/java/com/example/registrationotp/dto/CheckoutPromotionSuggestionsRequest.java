package com.example.registrationotp.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

import com.example.registrationotp.model.DeliveryType;

public record CheckoutPromotionSuggestionsRequest(
		@NotNull(message = "deliveryAddressId is required")
		Long deliveryAddressId,
		DeliveryType deliveryType,
		Instant scheduledDeliveryAt
) {
}
