package com.example.registrationotp.service;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.example.registrationotp.config.PayOsProperties;
import com.example.registrationotp.dto.PayOsCreatePaymentLinkRequest;
import com.example.registrationotp.dto.PayOsWebhookData;
import com.example.registrationotp.exception.BadRequestException;

@Service
public class PayOsSignatureService {

	private final PayOsProperties payOsProperties;

	public PayOsSignatureService(PayOsProperties payOsProperties) {
		this.payOsProperties = payOsProperties;
	}

	public String createPaymentRequestSignature(PayOsCreatePaymentLinkRequest request) {
		String data = "amount=" + request.amount()
				+ "&cancelUrl=" + safe(request.cancelUrl())
				+ "&description=" + safe(request.description())
				+ "&orderCode=" + request.orderCode()
				+ "&returnUrl=" + safe(request.returnUrl());
		return hmacSha256(data, requireChecksumKey());
	}

	public boolean isValidWebhookSignature(PayOsWebhookData data, String signature) {
		if (data == null || !StringUtils.hasText(signature)) {
			return false;
		}
		Map<String, Object> sorted = new LinkedHashMap<>();
		sorted.put("accountNumber", data.accountNumber());
		sorted.put("amount", data.amount());
		sorted.put("code", data.code());
		sorted.put("counterAccountBankId", data.counterAccountBankId());
		sorted.put("counterAccountBankName", data.counterAccountBankName());
		sorted.put("counterAccountName", data.counterAccountName());
		sorted.put("counterAccountNumber", data.counterAccountNumber());
		sorted.put("currency", data.currency());
		sorted.put("desc", data.desc());
		sorted.put("description", data.description());
		sorted.put("orderCode", data.orderCode());
		sorted.put("paymentLinkId", data.paymentLinkId());
		sorted.put("reference", data.reference());
		sorted.put("transactionDateTime", data.transactionDateTime());
		sorted.put("virtualAccountName", data.virtualAccountName());
		sorted.put("virtualAccountNumber", data.virtualAccountNumber());
		String query = sorted.entrySet().stream()
				.map(entry -> entry.getKey() + "=" + normalizeValue(entry.getValue()))
				.collect(Collectors.joining("&"));
		String expected = hmacSha256(query, requireChecksumKey());
		return expected.equalsIgnoreCase(signature);
	}

	private String normalizeValue(Object value) {
		if (value == null) {
			return "";
		}
		if (value instanceof List<?> list) {
			return list.stream().map(this::normalizeValue).collect(Collectors.joining(",", "[", "]"));
		}
		String stringValue = String.valueOf(value);
		if ("undefined".equalsIgnoreCase(stringValue) || "null".equalsIgnoreCase(stringValue)) {
			return "";
		}
		return stringValue;
	}

	private String safe(String value) {
		return value == null ? "" : value;
	}

	private String requireChecksumKey() {
		if (!StringUtils.hasText(payOsProperties.getChecksumKey())) {
			throw new BadRequestException("payOS checksum key is not configured");
		}
		return payOsProperties.getChecksumKey();
	}

	private String hmacSha256(String data, String secret) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
			mac.init(keySpec);
			byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
			StringBuilder builder = new StringBuilder();
			for (byte value : hash) {
				builder.append(String.format("%02x", value));
			}
			return builder.toString();
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to create payOS signature", exception);
		}
	}
}
