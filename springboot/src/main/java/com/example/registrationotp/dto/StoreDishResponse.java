package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.registrationotp.model.StoreDish;

public record StoreDishResponse(
		Long id,
		Long storeId,
		String storeName,
		Long dishId,
		String dishName,
		Long categoryId,
		String categoryName,
		BigDecimal basePrice,
		BigDecimal priceOverride,
		BigDecimal effectivePrice,
		Integer quantity,
		boolean available,
		Instant createdAt,
		Instant updatedAt
) {

	public static StoreDishResponse from(StoreDish storeDish) {
		BigDecimal effectivePrice = storeDish.getPriceOverride() != null
				? storeDish.getPriceOverride()
				: storeDish.getDish().getPrice();
		return new StoreDishResponse(
				storeDish.getId(),
				storeDish.getStore().getId(),
				storeDish.getStore().getName(),
				storeDish.getDish().getId(),
				storeDish.getDish().getName(),
				storeDish.getDish().getCategory().getId(),
				storeDish.getDish().getCategory().getName(),
				storeDish.getDish().getPrice(),
				storeDish.getPriceOverride(),
				effectivePrice,
				storeDish.getQuantity(),
				storeDish.isAvailable(),
				storeDish.getCreatedAt(),
				storeDish.getUpdatedAt()
		);
	}
}
