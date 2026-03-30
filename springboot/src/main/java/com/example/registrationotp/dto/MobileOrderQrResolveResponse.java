package com.example.registrationotp.dto;

import com.example.registrationotp.model.EmployeeOrderScanAction;
import com.example.registrationotp.model.Role;

public record MobileOrderQrResolveResponse(
		Role resolvedRole,
		String targetScreen,
		boolean actionExecuted,
		String message,
		EmployeeOrderScanAction executedAction,
		Long claimedByUserId,
		String claimedByUserName,
		Role claimedByUserRole,
		OrderResponse order
) {
}
