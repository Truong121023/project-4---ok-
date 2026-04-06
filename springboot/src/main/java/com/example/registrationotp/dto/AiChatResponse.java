package com.example.registrationotp.dto;

import java.util.List;

public record AiChatResponse(
		String answer,
		List<AiChatReferenceResponse> references,
		AiChatCurrentUserStatusResponse currentUserStatus,
		String model
) {
}
