package com.example.registrationotp.dto;

import com.example.registrationotp.model.User;

public record AiChatCurrentUserStatusResponse(
		Long id,
		String fullName,
		String email,
		String role,
		boolean enabled,
		boolean verified,
		boolean profileCompleted,
		Long workingStoreId,
		String workingStoreName
) {

	public static AiChatCurrentUserStatusResponse from(User user) {
		return new AiChatCurrentUserStatusResponse(
				user.getId(),
				user.getFullName(),
				user.getEmail(),
				user.getRole().name(),
				user.isEnabled(),
				user.getVerifiedAt() != null,
				user.isProfileCompleted(),
				user.getWorkingStore() == null ? null : user.getWorkingStore().getId(),
				user.getWorkingStore() == null ? null : user.getWorkingStore().getName()
		);
	}
}
