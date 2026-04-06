package com.example.registrationotp.dto;

public record AiChatReferenceResponse(
		String referenceKey,
		String entityType,
		String tableName,
		Long id,
		String slug,
		String title,
		String subtitle,
		String imagePath,
		String publicApiPath,
		String adminApiPath,
		String userApiPath
) {
}
