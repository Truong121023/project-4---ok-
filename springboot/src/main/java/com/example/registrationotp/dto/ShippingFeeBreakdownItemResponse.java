package com.example.registrationotp.dto;

import java.math.BigDecimal;

public record ShippingFeeBreakdownItemResponse(
		Long storeId,
		String storeName,
		BigDecimal distanceKm,
		BigDecimal shippingFeeAmount
) {
}
