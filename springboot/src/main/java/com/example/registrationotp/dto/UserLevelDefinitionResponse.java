package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.registrationotp.model.UserLevelDefinition;

public record UserLevelDefinitionResponse(
		Long id,
		Long storeId,
		String storeSlug,
		String storeName,
		String code,
		String name,
		BigDecimal minPaidAmount,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static UserLevelDefinitionResponse from(UserLevelDefinition definition) {
		return new UserLevelDefinitionResponse(
				definition.getId(),
				definition.getStore().getId(),
				definition.getStore().getSlug(),
				definition.getStore().getName(),
				definition.getCode(),
				definition.getName(),
				definition.getMinPaidAmount(),
				definition.isActive(),
				definition.getCreatedAt(),
				definition.getUpdatedAt()
		);
	}
}
