package com.example.registrationotp.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmployeeWorkScheduleEntryRequest(
		@NotNull(message = "userId is required")
		Long userId,
		@NotNull(message = "workDate is required")
		LocalDate workDate,
		@NotNull(message = "scheduledStartTime is required")
		LocalTime scheduledStartTime,
		@NotNull(message = "scheduledEndTime is required")
		LocalTime scheduledEndTime,
		@Size(max = 1000, message = "note must be at most 1000 characters")
		String note
) {
}
