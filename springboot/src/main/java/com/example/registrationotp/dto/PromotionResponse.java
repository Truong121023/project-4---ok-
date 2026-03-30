package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Promotion;
import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;

public record PromotionResponse(
		Long id,
		String code,
		String name,
		String description,
		PromotionScope scope,
		PromotionDiscountType discountType,
		BigDecimal discountValue,
		BigDecimal minOrderAmount,
		BigDecimal minimumOrderAmount,
		BigDecimal maxDiscountAmount,
		BigDecimal maximumDiscountAmount,
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
				promotion.getDiscountValue(),
				promotion.getMinOrderAmount(),
				promotion.getMinOrderAmount(),
				promotion.getMaxDiscountAmount(),
				promotion.getMaxDiscountAmount(),
				promotion.getMinStoreBillAmount(),
				promotion.getMinCrossStoreBillAmount(),
				promotion.getUsageLimit(),
				promotion.getUsedCount(),
				promotion.getStartsAt(),
				promotion.getEndsAt(),
				List.copyOf(promotion.getApplicableDishIds()),
				List.copyOf(promotion.getApplicableDishIds()),
				List.copyOf(promotion.getEligibleStoreIds()),
				List.copyOf(promotion.getEligibleUserLevelIds()),
				promotion.isActive(),
				promotion.getCreatedAt(),
				promotion.getUpdatedAt()
		);
	}
}
