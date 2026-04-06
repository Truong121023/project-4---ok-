package com.example.registrationotp.dto;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

public record AdminAiFormDraftResponse(
		String formType,
		JsonNode draft,
		List<String> warnings,
		List<String> missingFields,
		Long scopeStoreId,
		String scopeStoreName,
		String model
) {
}
