package com.example.registrationotp.dto;

import java.time.LocalDate;

public record EmployeeAttendanceSummaryResponse(
		LocalDate workDate,
		Long storeId,
		String storeName,
		long totalAssignedEmployees,
		long totalAssignedStaff,
		long totalAssignedShippers,
		long presentCount,
		long presentStaffCount,
		long presentShipperCount,
		long checkedOutCount,
		long currentlyWorkingCount
) {
}
