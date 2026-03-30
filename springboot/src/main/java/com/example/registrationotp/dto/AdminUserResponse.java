package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;

public record AdminUserResponse(
		Long id,
		String fullName,
		String email,
		Role role,
		Long workingStoreId,
		String workingStoreName,
		String workingStoreAddress,
		boolean enabled,
		boolean verified,
		Instant createdAt,
		Instant updatedAt,
		Instant verifiedAt
) {

	public static AdminUserResponse from(User user) {
		return new AdminUserResponse(
				user.getId(),
				user.getFullName(),
				user.getEmail(),
				user.getRole(),
				user.getWorkingStore() != null ? user.getWorkingStore().getId() : null,
				user.getWorkingStore() != null ? user.getWorkingStore().getName() : null,
				user.getWorkingStore() != null ? user.getWorkingStore().getAddress() : null,
				user.isEnabled(),
				user.getVerifiedAt() != null,
				user.getCreatedAt(),
				user.getUpdatedAt(),
				user.getVerifiedAt()
		);
	}
}
