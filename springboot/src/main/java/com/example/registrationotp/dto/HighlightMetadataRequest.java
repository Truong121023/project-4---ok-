package com.example.registrationotp.dto;

import java.util.List;

import jakarta.validation.constraints.Size;

public record HighlightMetadataRequest(
		@Size(max = 1000, message = "highlightSummary must be at most 1000 characters")
		String highlightSummary,
		List<@Size(max = 160, message = "Each highlight tag must be at most 160 characters") String> highlightTags
) {
}
