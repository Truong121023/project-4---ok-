package com.example.registrationotp.model;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum DeliveryType {
	IMMEDIATE,
	SCHEDULED;

	@JsonCreator
	public static DeliveryType fromValue(String rawValue) {
		if (rawValue == null) {
			return null;
		}
		String normalized = rawValue.trim().toUpperCase(Locale.ROOT);
		if ("DELIVERY".equals(normalized)) {
			return IMMEDIATE;
		}
		return DeliveryType.valueOf(normalized);
	}
}
