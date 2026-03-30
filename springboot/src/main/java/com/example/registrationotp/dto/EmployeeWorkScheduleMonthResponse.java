package com.example.registrationotp.dto;

import java.util.List;

public record EmployeeWorkScheduleMonthResponse(
		String month,
		Long storeId,
		String storeName,
		List<EmployeeWorkScheduleResponse> items
) {
}
