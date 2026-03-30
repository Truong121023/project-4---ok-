package com.example.registrationotp.dto;

import java.time.LocalTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoreRequest(
		@NotBlank(message = "name is required")
		@Size(max = 150, message = "name must be at most 150 characters")
		String name,
		@Size(max = 2000, message = "description must be at most 2000 characters")
		String description,
		@Size(max = 255, message = "address must be at most 255 characters")
		String address,
		@Size(max = 150, message = "contactEmail must be at most 150 characters")
		String contactEmail,
		@Size(max = 30, message = "phoneNumber must be at most 30 characters")
		String phoneNumber,
		@Size(max = 180, message = "slug must be at most 180 characters")
		String slug,
		@DecimalMin(value = "-90.0", inclusive = true, message = "latitude must be at least -90")
		@DecimalMax(value = "90.0", inclusive = true, message = "latitude must be at most 90")
		Double latitude,
		@DecimalMin(value = "-180.0", inclusive = true, message = "longitude must be at least -180")
		@DecimalMax(value = "180.0", inclusive = true, message = "longitude must be at most 180")
		Double longitude,
		@Size(max = 120, message = "area must be at most 120 characters")
		String area,
		@Size(max = 150, message = "positionLabel must be at most 150 characters")
		String positionLabel,
		@Size(max = 255, message = "hoursText must be at most 255 characters")
		String hoursText,
		LocalTime openTime,
		LocalTime closeTime,
		@Size(max = 255, message = "personality must be at most 255 characters")
		String personality,
		@Size(max = 255, message = "designSignature must be at most 255 characters")
		String designSignature,
		@Size(max = 255, message = "franchiseMood must be at most 255 characters")
		String franchiseMood,
		@Size(max = 255, message = "specialty must be at most 255 characters")
		String specialty,
		@Size(max = 1000, message = "highlightSummary must be at most 1000 characters")
		String highlightSummary,
		List<@Size(max = 160, message = "Each highlight tag must be at most 160 characters") String> highlightTags,
		List<@Size(max = 120, message = "Each service tag must be at most 120 characters") String> serviceTags,
		List<@Size(max = 500, message = "Each image path must be at most 500 characters") String> imagePaths,
		List<@Valid ContentSectionRequest> sections,
		@NotNull(message = "active is required")
		Boolean active
) {
}
