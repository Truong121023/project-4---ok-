package com.example.registrationotp.dto;

public record PayOsWebhookRequest(
		String code,
		String desc,
		Boolean success,
		PayOsWebhookData data,
		String signature
) {
}
