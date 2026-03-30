package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.DeliveryType;
import com.example.registrationotp.model.OrderAllowedAction;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.PromotionScope;

public record OrderResponse(
		Long id,
		Long userId,
		Long storeId,
		String storeSlug,
		String storeName,
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
		BigDecimal totalAmount,
		String promotionCode,
		PromotionScope promotionScope,
		BigDecimal promotionEligibleAmount,
		List<Long> promotionDishIds,
		DeliveryType deliveryType,
		Instant scheduledDeliveryAt,
		String deliveryFullName,
		String deliveryPhoneNumber,
		String deliveryAddress,
		Long preparingStaffId,
		String preparingStaffName,
		Long deliveringShipperId,
		String deliveringShipperName,
		boolean invoiceAvailable,
		Long invoiceId,
		String invoiceNumber,
		Instant invoiceIssuedAt,
		String invoiceDownloadUrl,
		String invoicePreviewUrl,
		String orderQrToken,
		List<OrderAllowedAction> allowedActions,
		String statusSummary,
		List<OrderItemResponse> items,
		Instant createdAt,
		Instant updatedAt
) {
}
