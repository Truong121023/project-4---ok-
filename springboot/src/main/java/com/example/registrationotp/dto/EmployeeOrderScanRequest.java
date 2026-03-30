package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.EmployeeOrderScanAction;

public record EmployeeOrderScanRequest(
		@NotBlank(message = "qrToken is required")
		@Size(max = 255, message = "qrToken must be at most 255 characters")
		String qrToken,
		@NotNull(message = "action is required")
		EmployeeOrderScanAction action
) {
}
