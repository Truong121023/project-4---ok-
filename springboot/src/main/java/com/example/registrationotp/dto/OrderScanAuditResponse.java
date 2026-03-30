package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.EmployeeOrderScanAction;
import com.example.registrationotp.model.OrderScanAudit;
import com.example.registrationotp.model.Role;

public record OrderScanAuditResponse(
		Long id,
		Long orderId,
		Long scannedByUserId,
		String scannedByUserName,
		Role role,
		EmployeeOrderScanAction action,
		Instant scannedAt,
		boolean success,
		String failureReason
) {

	public static OrderScanAuditResponse from(OrderScanAudit audit) {
		return new OrderScanAuditResponse(
				audit.getId(),
				audit.getOrder() != null ? audit.getOrder().getId() : null,
				audit.getScannedByUserId(),
				audit.getScannedByUserName(),
				audit.getRole(),
				audit.getAction(),
				audit.getScannedAt(),
				audit.isSuccess(),
				audit.getFailureReason()
		);
	}
}
