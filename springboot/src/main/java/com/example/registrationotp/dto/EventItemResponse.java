package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.EventItem;

public record EventItemResponse(
		Long id,
		String slug,
		Long storeId,
		String storeName,
		String name,
		String description,
		String location,
		String scheduleText,
		String highlightSummary,
		List<String> highlightTags,
		Integer capacity,
		Integer bookedCount,
		List<Long> featuredDishIds,
		List<String> imagePaths,
		List<ContentSectionResponse> sections,
		Instant startsAt,
		Instant endsAt,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static EventItemResponse from(EventItem eventItem) {
		return new EventItemResponse(
				eventItem.getId(),
				eventItem.getSlug(),
				eventItem.getStore().getId(),
				eventItem.getStore().getName(),
				eventItem.getName(),
				eventItem.getDescription(),
				eventItem.getLocation(),
				eventItem.getScheduleText(),
				eventItem.getHighlightSummary(),
				List.copyOf(eventItem.getHighlightTags()),
				eventItem.getCapacity(),
				eventItem.getBookedCount(),
				List.copyOf(eventItem.getFeaturedDishIds()),
				List.copyOf(eventItem.getImagePaths()),
				ContentSectionResponse.fromList(eventItem.getSections()),
				eventItem.getStartsAt(),
				eventItem.getEndsAt(),
				eventItem.isActive(),
				eventItem.getCreatedAt(),
				eventItem.getUpdatedAt()
		);
	}
}
