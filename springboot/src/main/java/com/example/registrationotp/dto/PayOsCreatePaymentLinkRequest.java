package com.example.registrationotp.dto;

import java.util.List;

public record PayOsCreatePaymentLinkRequest(
		Long orderCode,
		Integer amount,
		String description,
		String buyerName,
		String buyerEmail,
		String buyerPhone,
		String buyerAddress,
		List<Item> items,
		String cancelUrl,
		String returnUrl,
		Long expiredAt
) {
	public record Item(
			String name,
			Integer quantity,
			Integer price,
			String unit
	) {
	}
}
