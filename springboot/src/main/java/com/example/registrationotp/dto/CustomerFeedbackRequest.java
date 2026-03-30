package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.FeedbackCategory;

public record CustomerFeedbackRequest(
		@NotNull(message = "category is required")
		FeedbackCategory category,
		Long relatedStoreId,
		Long relatedOrderId,
		@NotBlank(message = "subject is required")
		@Size(max = 180, message = "subject must be at most 180 characters")
		String subject,
		@NotBlank(message = "message is required")
		@Size(max = 3000, message = "message must be at most 3000 characters")
		String message
) {
}
