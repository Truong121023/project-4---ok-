package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.example.registrationotp.model.PromotionDiscountType;
import com.example.registrationotp.model.PromotionScope;

public record PromotionRequest(
		@NotBlank(message = "code is required")
		@Size(max = 50, message = "code must be at most 50 characters")
		String code,
		@Size(max = 150, message = "name must be at most 150 characters")
		String name,
		@Size(max = 500, message = "description must be at most 500 characters")
		String description,
		@NotNull(message = "scope is required")
		PromotionScope scope,
		@NotNull(message = "discountType is required")
		PromotionDiscountType discountType,
		@NotNull(message = "discountValue is required")
		@DecimalMin(value = "0.01", message = "discountValue must be greater than 0")
		BigDecimal discountValue,
		@DecimalMin(value = "0.00", message = "minOrderAmount must be at least 0")
		BigDecimal minOrderAmount,
		@DecimalMin(value = "0.00", message = "minimumOrderAmount must be at least 0")
		BigDecimal minimumOrderAmount,
		@DecimalMin(value = "0.00", message = "maxDiscountAmount must be at least 0")
		BigDecimal maxDiscountAmount,
		@DecimalMin(value = "0.00", message = "maximumDiscountAmount must be at least 0")
		BigDecimal maximumDiscountAmount,
		@DecimalMin(value = "0.00", message = "minStoreBillAmount must be at least 0")
		BigDecimal minStoreBillAmount,
		@DecimalMin(value = "0.00", message = "minCrossStoreBillAmount must be at least 0")
		BigDecimal minCrossStoreBillAmount,
		Integer usageLimit,
		Instant startsAt,
		Instant endsAt,
		java.util.List<Long> applicableDishIds,
		java.util.List<Long> promotionDishIds,
		java.util.List<Long> eligibleStoreIds,
		java.util.List<Long> eligibleUserLevelIds,
		boolean active
) {
}
