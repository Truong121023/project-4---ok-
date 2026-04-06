package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatHistoryItem(
		@NotBlank(message = "role is required")
		@Size(max = 20, message = "role must be at most 20 characters")
		String role,
		@NotBlank(message = "content is required")
		@Size(max = 4000, message = "content must be at most 4000 characters")
		String content
) {
}
