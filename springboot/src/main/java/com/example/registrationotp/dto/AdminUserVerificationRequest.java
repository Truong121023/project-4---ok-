package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotNull;

public record AdminUserVerificationRequest(
		@NotNull(message = "verified is required")
		Boolean verified
) {
}
