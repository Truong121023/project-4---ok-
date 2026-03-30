package com.example.registrationotp.dto;

public record PayOsWebhookData(
		Long orderCode,
		Integer amount,
		String description,
		String accountNumber,
		String reference,
		String transactionDateTime,
		String currency,
		String paymentLinkId,
		String code,
		String desc,
		String counterAccountBankId,
		String counterAccountBankName,
		String counterAccountName,
		String counterAccountNumber,
		String virtualAccountName,
		String virtualAccountNumber
) {
}
