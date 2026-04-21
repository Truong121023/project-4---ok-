package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;

public record CustomerFeedbackOrderHistoryItemResponse(
		Long orderId,
		OrderStatus status,
		PaymentStatus paymentStatus,
		String paymentReference,
		BigDecimal totalAmount,
		Instant paidAt,
		Instant createdAt,
		Instant updatedAt
) {

	public static CustomerFeedbackOrderHistoryItemResponse from(Order order) {
		return new CustomerFeedbackOrderHistoryItemResponse(
				order.getId(),
				order.getStatus(),
				order.getPaymentStatus(),
				order.getPaymentReference(),
				order.getTotalAmount(),
				order.getPaidAt(),
				order.getCreatedAt(),
				order.getUpdatedAt()
		);
	}
}
