package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;

import com.example.registrationotp.model.DeliveryType;

public interface EmailSender {

	void sendOtpEmail(String toEmail, String fullName, String otpCode, Duration expiresIn);

	void sendPasswordResetOtpEmail(String toEmail, String fullName, String otpCode, Duration expiresIn);

	void sendPaymentReminderEmail(
			String toEmail,
			String fullName,
			Long orderId,
			BigDecimal totalAmount,
			String paymentCheckoutUrl,
			Instant paymentExpiresAt,
			DeliveryType deliveryType,
			Instant scheduledDeliveryAt
	);

	void sendPaymentSuccessEmail(
			String toEmail,
			String fullName,
			Long orderId,
			BigDecimal totalAmount
	);
}
