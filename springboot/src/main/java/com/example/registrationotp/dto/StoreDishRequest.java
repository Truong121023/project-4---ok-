package com.example.registrationotp.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StoreDishRequest(
		@NotNull(message = "storeId is required")
		Long storeId,
		@NotNull(message = "dishId is required")
		Long dishId,
		@NotNull(message = "quantity is required")
		@Min(value = 0, message = "quantity must be non-negative")
		Integer quantity,
		@NotNull(message = "available is required")
		Boolean available,
		@DecimalMin(value = "0.0", inclusive = true, message = "priceOverride must be non-negative")
		BigDecimal priceOverride
) {
}
