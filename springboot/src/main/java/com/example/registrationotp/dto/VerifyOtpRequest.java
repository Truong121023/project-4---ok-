package com.example.registrationotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
		@NotBlank(message = "email is required")
		@Email(message = "email is invalid")
		String email,
		@NotBlank(message = "otp is required")
		@Size(min = 4, max = 8, message = "otp must be between 4 and 8 digits")
		@Pattern(regexp = "\\d+", message = "otp must contain digits only")
		String otp
) {
}
