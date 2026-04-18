package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountTarget;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;

public record PromotionResponse(
		Long id,
		String code,
		String name,
		String description,
		PromotionScope scope,
		PromotionDiscountType discountType,
		PromotionDiscountTarget discountTarget,
		BigDecimal discountValue,
		BigDecimal minOrderAmount,
		BigDecimal minimumOrderAmount,
		BigDecimal maxDiscountAmount,
		BigDecimal maximumDiscountAmount,
		Integer creditCost,
		BigDecimal minStoreBillAmount,
		BigDecimal minCrossStoreBillAmount,
		Integer usageLimit,
		Integer usedCount,
		Instant startsAt,
		Instant endsAt,
		List<Long> applicableDishIds,
		List<Long> promotionDishIds,
		List<Long> eligibleStoreIds,
		List<Long> eligibleUserLevelIds,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static PromotionResponse from(Promotion promotion) {
		return new PromotionResponse(
				promotion.getId(),
				promotion.getCode(),
				promotion.getName(),
				promotion.getDescription(),
				promotion.getScope(),
				promotion.getDiscountType(),
				promotion.getDiscountTarget(),
				promotion.getDiscountValue(),
				promotion.getMinOrderAmount(),
				promotion.getMinOrderAmount(),
				promotion.getMaxDiscountAmount(),
				promotion.getMaxDiscountAmount(),
				promotion.getCreditCost(),
				null,
				null,
				promotion.getUsageLimit(),
				promotion.getUsedCount(),
				promotion.getStartsAt(),
				promotion.getEndsAt(),
				List.copyOf(promotion.getApplicableDishIds()),
				List.copyOf(promotion.getApplicableDishIds()),
				List.of(),
				List.copyOf(promotion.getEligibleUserLevelIds()),
				promotion.isActive(),
				promotion.getCreatedAt(),
				promotion.getUpdatedAt()
		);
	}
}
