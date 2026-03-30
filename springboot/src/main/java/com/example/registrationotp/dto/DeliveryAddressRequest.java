package com.example.registrationotp.dto;

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
		Boolean primary
) {
}
