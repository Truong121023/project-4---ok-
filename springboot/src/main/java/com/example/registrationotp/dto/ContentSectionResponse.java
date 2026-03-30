package com.example.registrationotp.dto;

import java.util.List;

import com.example.registrationotp.model.ContentSection;

public record ContentSectionResponse(
		String title,
		String content,
		String imagePath,
		List<String> imagePaths
) {

	public static ContentSectionResponse from(ContentSection section) {
		return new ContentSectionResponse(
				section.getTitle(),
				section.getContent(),
				section.getImagePath(),
				section.getImagePaths()
		);
	}

	public static List<ContentSectionResponse> fromList(List<ContentSection> sections) {
		return sections == null ? List.of() : sections.stream()
				.map(ContentSectionResponse::from)
				.toList();
	}
}
