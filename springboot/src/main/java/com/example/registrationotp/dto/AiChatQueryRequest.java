package com.example.registrationotp.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatQueryRequest(
		@NotBlank(message = "message is required")
		@Size(max = 4000, message = "message must be at most 4000 characters")
		String message,
		List<@Valid AiChatHistoryItem> history
) {
}
