package com.example.registrationotp.dto;

public record PayOsPaymentStatusResponse(
		String id,
		Long orderCode,
		Integer amount,
		Integer amountPaid,
		Integer amountRemaining,
		String status
) {
}
