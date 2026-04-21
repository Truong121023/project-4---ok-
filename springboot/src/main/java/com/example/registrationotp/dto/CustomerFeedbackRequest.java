package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CustomerFeedbackRequest(
		@NotNull(message = "relatedOrderId is required")
		Long relatedOrderId,
		@NotBlank(message = "message is required")
		@Size(max = 3000, message = "message must be at most 3000 characters")
		String message
) {
}
