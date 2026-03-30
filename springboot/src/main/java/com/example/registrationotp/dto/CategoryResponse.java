package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Category;

public record CategoryResponse(
		Long id,
		Long storeId,
		String storeName,
		String name,
		String description,
		List<String> imagePaths,
		Integer sortOrder,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static CategoryResponse from(Category category) {
		Long storeId = category.getStore() != null ? category.getStore().getId() : null;
		String storeName = category.getStore() != null ? category.getStore().getName() : null;
		return new CategoryResponse(
				category.getId(),
				storeId,
				storeName,
				category.getName(),
				category.getDescription(),
				List.copyOf(category.getImagePaths()),
				category.getSortOrder(),
				category.isActive(),
				category.getCreatedAt(),
				category.getUpdatedAt()
		);
	}
}
