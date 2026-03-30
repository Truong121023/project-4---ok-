package com.example.registrationotp.dto;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

import com.example.registrationotp.model.Store;

public record StoreResponse(
		Long id,
		String slug,
		String name,
		String description,
		String address,
		String contactEmail,
		String phoneNumber,
		Double latitude,
		Double longitude,
		String area,
		String positionLabel,
		String hoursText,
		LocalTime openTime,
		LocalTime closeTime,
		String personality,
		String designSignature,
		String franchiseMood,
		String specialty,
		String highlightSummary,
		List<String> highlightTags,
		List<String> serviceTags,
		List<String> imagePaths,
		List<ContentSectionResponse> sections,
		boolean active,
		Instant createdAt,
		Instant updatedAt
) {

	public static StoreResponse from(Store store) {
		return new StoreResponse(
				store.getId(),
				store.getSlug(),
				store.getName(),
				store.getDescription(),
				store.getAddress(),
				store.getContactEmail(),
				store.getPhoneNumber(),
				store.getLatitude(),
				store.getLongitude(),
				store.getArea(),
				store.getPositionLabel(),
				store.getHoursText(),
				store.getOpenTime(),
				store.getCloseTime(),
				store.getPersonality(),
				store.getDesignSignature(),
				store.getFranchiseMood(),
				store.getSpecialty(),
				store.getHighlightSummary(),
				List.copyOf(store.getHighlightTags()),
				List.copyOf(store.getServiceTags()),
				List.copyOf(store.getImagePaths()),
				ContentSectionResponse.fromList(store.getSections()),
				store.isActive(),
				store.getCreatedAt(),
				store.getUpdatedAt()
		);
	}
}
