package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderCancellationRequest(
		@NotBlank(message = "Cancellation note is required")
		@Size(max = 500, message = "Cancellation note must be at most 500 characters")
		String note
) {
}
