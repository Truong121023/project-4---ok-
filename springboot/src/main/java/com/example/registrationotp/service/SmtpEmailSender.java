package com.example.registrationotp.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.example.registrationotp.config.AppMailProperties;
import com.example.registrationotp.model.DeliveryType;

@Service
public class SmtpEmailSender implements EmailSender {

	private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
			.withZone(ZoneId.systemDefault());

	private final JavaMailSender javaMailSender;
	private final AppMailProperties appMailProperties;

	public SmtpEmailSender(JavaMailSender javaMailSender, AppMailProperties appMailProperties) {
		this.javaMailSender = javaMailSender;
		this.appMailProperties = appMailProperties;
	}

	@Override
	public void sendOtpEmail(String toEmail, String fullName, String otpCode, Duration expiresIn) {
		sendMail(
				toEmail,
				"OTP verification for registration",
				"""
				Hello %s,

				Your OTP code is: %s
				This code will expire in %d minute(s).

				If you did not request this registration, please ignore this email.
				""".formatted(fullName, otpCode, expiresIn.toMinutes())
		);
	}

	@Override
	public void sendPasswordResetOtpEmail(String toEmail, String fullName, String otpCode, Duration expiresIn) {
		sendMail(
				toEmail,
				"OTP password reset for Kamatcha",
				"""
				Hello %s,

				Your OTP code to reset the password is: %s
				This code will expire in %d minute(s).

				If you did not request a password reset, please ignore this email.
				""".formatted(fullName, otpCode, expiresIn.toMinutes())
		);
	}

	@Override
	public void sendPaymentReminderEmail(
			String toEmail,
			String fullName,
			Long orderId,
			BigDecimal totalAmount,
			String paymentCheckoutUrl,
			Instant paymentExpiresAt,
			DeliveryType deliveryType,
			Instant scheduledDeliveryAt
	) {
		String deliveryInfo = deliveryType == DeliveryType.SCHEDULED && scheduledDeliveryAt != null
				? "Scheduled delivery time: " + DATE_TIME_FORMATTER.format(scheduledDeliveryAt)
				: "Delivery type: Immediate";
		String paymentExpiryInfo = paymentExpiresAt == null
				? "Payment link is available now."
				: "Please complete payment before: " + DATE_TIME_FORMATTER.format(paymentExpiresAt);

		sendMail(
				toEmail,
				"Kamatcha order payment reminder",
				"""
				Hello %s,

				Your Kamatcha order #%d is waiting for payment.
				Total amount: %s VND
				%s
				%s

				Payment link:
				%s

				If you have already paid, you can ignore this reminder.
				""".formatted(
						fullName,
						orderId,
						formatMoney(totalAmount),
						deliveryInfo,
						paymentExpiryInfo,
						paymentCheckoutUrl
				)
		);
	}

	@Override
	public void sendPaymentSuccessEmail(String toEmail, String fullName, Long orderId, BigDecimal totalAmount) {
		sendMail(
				toEmail,
				"Kamatcha payment received",
				"""
				Hello %s,

				Thank you for your payment for order #%d.
				Amount received: %s VND

				Please keep following your order status for the latest updates on preparation and delivery.
				""".formatted(fullName, orderId, formatMoney(totalAmount))
		);
	}

	private void sendMail(String toEmail, String subject, String content) {
		if (!StringUtils.hasText(appMailProperties.getFrom())) {
			throw new IllegalStateException("MAIL_FROM or MAIL_USERNAME is not configured");
		}
		if (!StringUtils.hasText(toEmail)) {
			return;
		}

		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(appMailProperties.getFrom());
		message.setTo(toEmail);
		message.setSubject(subject);
		message.setText(content);
		javaMailSender.send(message);
	}

	private String formatMoney(BigDecimal amount) {
		if (amount == null) {
			return "0";
		}
		return amount.stripTrailingZeros().toPlainString();
	}
}
