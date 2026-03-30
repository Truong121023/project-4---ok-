package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.CartStatus;

public record CartResponse(
		Long id,
		Long userId,
		CartStatus status,
		List<CartItemResponse> items,
		Integer totalItems,
		BigDecimal subtotal,
		Instant createdAt,
		Instant updatedAt
) {
}
