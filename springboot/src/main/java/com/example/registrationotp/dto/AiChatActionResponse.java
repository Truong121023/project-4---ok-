package com.example.registrationotp.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record AiChatActionResponse(
		String actionKey,
		String actionType,
		String label,
		String description,
		String method,
		String apiPath,
		String referenceKey,
		JsonNode payload
) {
}
