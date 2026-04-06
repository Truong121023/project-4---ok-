package com.example.registrationotp.dto;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;

public record AdminAiFormDraftRequest(
		@NotBlank(message = "prompt is required")
		String prompt,
		Long storeId,
		JsonNode currentForm
) {
}
