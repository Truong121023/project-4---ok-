package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.PromotionDiscountTarget;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;

public record PublicPromotionCardResponse(
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
		Integer creditCost,
		List<Long> applicableDishIds,
		List<String> storeNames,
		Instant startsAt,
		Instant endsAt,
		Integer availableRedemptions
) {
}
