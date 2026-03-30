package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminFeedbackReplyRequest(
		@NotBlank(message = "replyMessage is required")
		@Size(max = 3000, message = "replyMessage must be at most 3000 characters")
		String replyMessage
) {
}
