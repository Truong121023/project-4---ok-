package com.example.registrationotp.dto;

import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;

public record OrderStatusUpdateRequest(
		OrderStatus status,
		PaymentStatus paymentStatus,
		Long preparingStaffId,
		Long deliveringShipperId
) {
}
