package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.PromotionDiscountTarget;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;

public record CheckoutPromotionSuggestionResponse(
		Long id,
		String code,
		String name,
		String description,
		PromotionScope scope,
		PromotionDiscountType discountType,
		PromotionDiscountTarget discountTarget,
		BigDecimal discountValue,
		BigDecimal minOrderAmount,
		BigDecimal maxDiscountAmount,
		BigDecimal estimatedDiscountAmount,
		BigDecimal eligibleAmount,
		List<Long> matchedDishIds,
		Long storeId,
		String storeName,
		Instant startsAt,
		Instant endsAt
) {
}
