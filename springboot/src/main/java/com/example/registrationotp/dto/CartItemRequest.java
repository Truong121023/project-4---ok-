package com.example.registrationotp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItemRequest(
		@NotNull(message = "storeId is required")
		Long storeId,
		@NotNull(message = "dishId is required")
		Long dishId,
		@NotNull(message = "quantity is required")
		@Min(value = 1, message = "quantity must be at least 1")
		Integer quantity
) {
}
