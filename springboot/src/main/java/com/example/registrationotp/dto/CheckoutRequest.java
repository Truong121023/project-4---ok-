package com.example.registrationotp.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.DeliveryType;

public record CheckoutRequest(
		@NotNull(message = "deliveryAddressId is required")
		Long deliveryAddressId,
		@Size(max = 50, message = "promotionCode must be at most 50 characters")
		String promotionCode,
		DeliveryType deliveryType,
		Instant scheduledDeliveryAt,
		@NotBlank(message = "returnUrl is required")
		@Size(max = 500, message = "returnUrl must be at most 500 characters")
		String returnUrl,
		@NotBlank(message = "cancelUrl is required")
		@Size(max = 500, message = "cancelUrl must be at most 500 characters")
		String cancelUrl
) {
}
