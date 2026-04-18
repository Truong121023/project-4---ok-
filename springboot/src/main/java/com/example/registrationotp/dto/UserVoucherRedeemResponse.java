package com.example.registrationotp.dto;

public record UserVoucherRedeemResponse(
		String message,
		Long promotionId,
		String promotionCode,
		int remainingCreditPoints,
		int availableRedemptions
) {
}
