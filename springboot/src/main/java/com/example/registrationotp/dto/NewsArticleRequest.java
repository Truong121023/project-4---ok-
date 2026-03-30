package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NewsArticleRequest(
		@NotBlank(message = "title is required")
		@Size(max = 180, message = "title must be at most 180 characters")
		String title,
		@Size(max = 200, message = "slug must be at most 200 characters")
		String slug,
		@NotBlank(message = "summary is required")
		@Size(max = 500, message = "summary must be at most 500 characters")
		String summary,
		@NotBlank(message = "content is required")
		@Size(max = 20000, message = "content must be at most 20000 characters")
		String content,
		Long relatedStoreId,
		List<@Size(max = 120, message = "Each tag must be at most 120 characters") String> tags,
		List<@Size(max = 500, message = "Each image path must be at most 500 characters") String> imagePaths,
		List<@Valid ContentSectionRequest> sections,
		@NotNull(message = "featured is required")
		Boolean featured,
		@NotNull(message = "published is required")
		Boolean published,
		Instant publishedAt
) {
}
