package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

public record AiChatMessageResponse(
		Long id,
		String role,
		String content,
		List<AiChatReferenceResponse> references,
		List<AiChatActionResponse> actions,
		String model,
		Instant createdAt
) {
}
