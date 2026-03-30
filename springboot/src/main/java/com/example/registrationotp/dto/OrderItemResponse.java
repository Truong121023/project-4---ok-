package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.OrderItem;

public record OrderItemResponse(
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
		Instant createdAt,
		Instant updatedAt
) {

	public static OrderItemResponse from(OrderItem orderItem) {
		return new OrderItemResponse(
				orderItem.getId(),
				orderItem.getStore().getId(),
				orderItem.getStore().getSlug(),
				orderItem.getStore().getName(),
				orderItem.getDish().getId(),
				orderItem.getDish().getName(),
				orderItem.getQuantity(),
				orderItem.getUnitPrice(),
				orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())),
				List.copyOf(orderItem.getDish().getImagePaths()),
				orderItem.getCreatedAt(),
				orderItem.getUpdatedAt()
		);
	}
}
