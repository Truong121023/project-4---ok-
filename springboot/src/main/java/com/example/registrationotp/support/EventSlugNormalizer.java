package com.example.registrationotp.support;

import java.text.Normalizer;
import java.util.Locale;

public final class EventSlugNormalizer {

	private EventSlugNormalizer() {
	}

	public static String normalize(String rawValue) {
		if (rawValue == null) {
			return null;
		}
		String normalized = Normalizer.normalize(rawValue, Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("-{2,}", "-")
				.replaceAll("^-+", "")
				.replaceAll("-+$", "");
		return normalized.isBlank() ? null : normalized;
	}
}
