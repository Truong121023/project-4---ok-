package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminTopSellingDishResponse(
		Long storeId,
		String storeName,
		Long dishId,
		String dishName,
		List<String> imagePaths,
		Long quantitySold,
		Long orderCount,
		BigDecimal revenue
) {
}
