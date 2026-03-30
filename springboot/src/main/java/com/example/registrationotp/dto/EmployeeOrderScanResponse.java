package com.example.registrationotp.dto;

import com.example.registrationotp.model.Role;

public record EmployeeOrderScanResponse(
		boolean success,
		String message,
		OrderResponse order,
		Long claimedByUserId,
		String claimedByUserName,
		Role claimedByUserRole
) {
}
