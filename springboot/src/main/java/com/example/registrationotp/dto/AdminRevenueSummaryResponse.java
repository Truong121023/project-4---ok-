package com.example.registrationotp.dto;

import java.math.BigDecimal;

public record AdminRevenueSummaryResponse(
		Long scopeStoreId,
		String scopeStoreName,
		BigDecimal todayRevenue,
		BigDecimal weekRevenue,
		BigDecimal monthRevenue,
		BigDecimal yearRevenue
) {
}
