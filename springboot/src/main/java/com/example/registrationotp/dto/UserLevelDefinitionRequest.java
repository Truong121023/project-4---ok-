package com.example.registrationotp.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserLevelDefinitionRequest(
		Long storeId,
		@NotBlank(message = "code is required")
		@Size(max = 50, message = "code must be at most 50 characters")
		String code,
		@NotBlank(message = "name is required")
		@Size(max = 120, message = "name must be at most 120 characters")
		String name,
		@DecimalMin(value = "0.00", message = "minPaidAmount must be at least 0")
		BigDecimal minPaidAmount,
		@DecimalMin(value = "0.00", message = "minCreditPoints must be at least 0")
		BigDecimal minCreditPoints,
		@DecimalMin(value = "0.00", message = "minMembershipPoints must be at least 0")
		BigDecimal minMembershipPoints,
		boolean active
) {
}
