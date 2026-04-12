package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutPreviewResponse(
		BigDecimal subtotalAmount,
		BigDecimal discountAmount,
		BigDecimal shippingDistanceKm,
		BigDecimal shippingFeeAmount,
		List<ShippingFeeBreakdownItemResponse> shippingFeeBreakdown,
		BigDecimal totalAmount,
		String promotionCode,
		String statusSummary
) {
}
