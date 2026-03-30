package com.example.registrationotp.dto;

public record PayOsPaymentLinkData(
		String paymentLinkId,
		String checkoutUrl,
		String qrCode,
		String status,
		Long orderCode,
		Integer amount
) {
}
