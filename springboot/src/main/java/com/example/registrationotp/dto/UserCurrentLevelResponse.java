package com.example.registrationotp.dto;

import java.math.BigDecimal;

public record UserCurrentLevelResponse(
		Long storeId,
		String storeSlug,
		String storeName,
		int currentYear,
		int currentQuarter,
		int evaluatedYear,
		int evaluatedQuarter,
		BigDecimal qualifyingPaidAmount,
		Long levelId,
		String levelCode,
		String levelName,
		BigDecimal levelMinPaidAmount
) {
}
