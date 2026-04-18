package com.example.registrationotp.dto;

import java.util.List;

public record AiChatResponse(
		Long threadId,
		String threadTitle,
		String answer,
		List<AiChatReferenceResponse> references,
		List<AiChatActionResponse> actions,
		AiChatCurrentUserStatusResponse currentUserStatus,
		String model
) {
}
