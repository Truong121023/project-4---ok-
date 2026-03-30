package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.CartItem;

public record CartItemResponse(
		Long id,
		Long storeId,
		String storeSlug,
		String storeName,
		Long dishId,
		String dishName,
		Integer quantity,
		BigDecimal unitPrice,
		BigDecimal totalPrice,
		List<String> imagePaths,
		Integer stock,
		boolean available,
		boolean disabled,
		boolean schedulable,
		Instant createdAt,
		Instant updatedAt
) {

	public static CartItemResponse from(
			CartItem cartItem,
			Integer stock,
			boolean available,
			boolean disabled,
			boolean schedulable
	) {
		BigDecimal totalPrice = cartItem.getUnitPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
		return new CartItemResponse(
				cartItem.getId(),
				cartItem.getStore().getId(),
				cartItem.getStore().getSlug(),
				cartItem.getStore().getName(),
				cartItem.getDish().getId(),
				cartItem.getDish().getName(),
				cartItem.getQuantity(),
				cartItem.getUnitPrice(),
				totalPrice,
				List.copyOf(cartItem.getDish().getImagePaths()),
				stock,
				available,
				disabled,
				schedulable,
				cartItem.getCreatedAt(),
				cartItem.getUpdatedAt()
		);
	}
}
