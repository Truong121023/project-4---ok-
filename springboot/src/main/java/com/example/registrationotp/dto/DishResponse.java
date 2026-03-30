package com.example.registrationotp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.Dish;

public record DishResponse(
		Long id,
		Long categoryId,
		String categoryName,
		String name,
		String description,
		String note,
		BigDecimal price,
		String status,
		boolean franchiseRequired,
		String franchiseNote,
		String highlightSummary,
		List<String> highlightTags,
		boolean active,
		boolean available,
		Long storeId,
		String storeName,
		List<String> imagePaths,
		List<ContentSectionResponse> sections,
		Instant createdAt,
		Instant updatedAt
) {

	public static DishResponse from(Dish dish) {
		Long storeId = dish.getCategory().getStore() != null ? dish.getCategory().getStore().getId() : null;
		String storeName = dish.getCategory().getStore() != null ? dish.getCategory().getStore().getName() : null;
		return new DishResponse(
				dish.getId(),
				dish.getCategory().getId(),
				dish.getCategory().getName(),
				dish.getName(),
				dish.getDescription(),
				dish.getNote(),
				dish.getPrice(),
				dish.getStatus(),
				dish.isFranchiseRequired(),
				dish.getFranchiseNote(),
				dish.getHighlightSummary(),
				List.copyOf(dish.getHighlightTags()),
				dish.isActive(),
				dish.isAvailable(),
				storeId,
				storeName,
				List.copyOf(dish.getImagePaths()),
				ContentSectionResponse.fromList(dish.getSections()),
				dish.getCreatedAt(),
				dish.getUpdatedAt()
		);
	}
}
