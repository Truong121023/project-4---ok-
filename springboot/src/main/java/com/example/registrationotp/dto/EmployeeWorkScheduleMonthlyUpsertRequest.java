package com.example.registrationotp.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmployeeWorkScheduleMonthlyUpsertRequest(
		@NotNull(message = "storeId is required")
		Long storeId,
		@NotBlank(message = "month is required")
		String month,
		@NotEmpty(message = "entries are required")
		@Size(max = 500, message = "entries must contain at most 500 items")
		List<@Valid EmployeeWorkScheduleEntryRequest> entries
) {
}
