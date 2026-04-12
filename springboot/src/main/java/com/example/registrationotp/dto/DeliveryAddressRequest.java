package com.example.registrationotp.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryAddressRequest(
		@NotBlank(message = "fullName is required")
		@Size(max = 100, message = "fullName must be at most 100 characters")
		String fullName,
		@NotBlank(message = "phoneNumber is required")
		@Size(max = 30, message = "phoneNumber must be at most 30 characters")
		String phoneNumber,
		@NotBlank(message = "deliveryAddress is required")
		@Size(max = 255, message = "deliveryAddress must be at most 255 characters")
		String deliveryAddress,
		@DecimalMin(value = "-90.0", inclusive = true, message = "latitude must be at least -90")
		@DecimalMax(value = "90.0", inclusive = true, message = "latitude must be at most 90")
		Double latitude,
		@DecimalMin(value = "-180.0", inclusive = true, message = "longitude must be at least -180")
		@DecimalMax(value = "180.0", inclusive = true, message = "longitude must be at most 180")
		Double longitude,
		Boolean primary
) {
}
