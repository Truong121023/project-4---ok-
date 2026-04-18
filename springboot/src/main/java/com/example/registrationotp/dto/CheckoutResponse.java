package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;

public record CheckoutResponse(
		Long id,
		OrderStatus status,
		PaymentStatus paymentStatus,
		String paymentProvider,
		Long payosOrderCode,
		String paymentLinkId,
		String paymentCheckoutUrl,
		String paymentQrCode,
		Instant paymentExpiresAt,
		Instant paidAt,
		String paymentReference,
		BigDecimal subtotalAmount,
		BigDecimal discountAmount,
		BigDecimal shippingDistanceKm,
		BigDecimal shippingFeeAmount,
		List<ShippingFeeBreakdownItemResponse> shippingFeeBreakdown,
		BigDecimal totalAmount,
		String promotionCode,
		DeliveryType deliveryType,
		Instant scheduledDeliveryAt,
		String deliveryFullName,
		String deliveryPhoneNumber,
		String deliveryAddress,
		String statusSummary,
		List<OrderResponse> orders,
		Instant createdAt,
		Instant updatedAt
) {
}
