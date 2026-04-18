package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

public record AiChatThreadDetailResponse(
		Long threadId,
		String title,
		List<AiChatMessageResponse> messages,
		Instant createdAt,
		Instant updatedAt
) {
}
