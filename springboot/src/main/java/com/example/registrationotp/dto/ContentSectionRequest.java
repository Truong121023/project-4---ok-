package com.example.registrationotp.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContentSectionRequest(
		@NotBlank(message = "section title is required")
		@Size(max = 200, message = "section title must be at most 200 characters")
		String title,
		@NotBlank(message = "section content is required")
		@Size(max = 10000, message = "section content must be at most 10000 characters")
		String content,
		@Size(max = 500, message = "section imagePath must be at most 500 characters")
		String imagePath,
		@Size(max = 20, message = "section imagePaths must contain at most 20 items")
		List<@Size(max = 500, message = "section imagePath must be at most 500 characters") String> imagePaths
) {
}
