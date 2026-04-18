package com.example.registrationotp.dto;

import java.time.Instant;

public record AiChatThreadSummaryResponse(
		Long threadId,
		String title,
		int messageCount,
		String lastMessageRole,
		String lastMessagePreview,
		Instant lastMessageAt,
		Instant updatedAt
) {
}
