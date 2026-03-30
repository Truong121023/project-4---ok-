package com.example.registrationotp.dto;

public record AdminSummaryResponse(
		long userCount,
		long storeCount,
		long eventCount,
		long categoryCount,
		long dishCount,
		long storeDishCount,
		long promotionCount,
		long orderCount,
		long reviewCount,
		long newsCount
) {
}
