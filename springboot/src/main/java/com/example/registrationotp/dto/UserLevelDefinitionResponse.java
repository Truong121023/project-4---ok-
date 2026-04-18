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
		BigDecimal minCreditPoints,
		BigDecimal minMembershipPoints,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static UserLevelDefinitionResponse from(UserLevelDefinition definition) {
		return new UserLevelDefinitionResponse(
				definition.getId(),
				definition.getStore() != null ? definition.getStore().getId() : null,
				definition.getStore() != null ? definition.getStore().getSlug() : "global",
				definition.getStore() != null ? definition.getStore().getName() : "Toan he thong",
				definition.getCode(),
				definition.getName(),
				definition.getMinPaidAmount(),
				null,
				definition.getMinPaidAmount(),
				definition.isActive(),
				definition.getCreatedAt(),
				definition.getUpdatedAt()
		);
	}
}
