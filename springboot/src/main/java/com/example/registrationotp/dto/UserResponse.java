package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;

public record UserResponse(
		Long id,
		String fullName,
		String email,
		Role role,
		Long workingStoreId,
		String workingStoreName,
		String workingStoreAddress,
		boolean verified,
		boolean profileCompleted,
		int creditPoints,
		Instant createdAt,
		Instant verifiedAt
) {

	public static UserResponse from(User user) {
		return new UserResponse(
				user.getId(),
				user.getFullName(),
				user.getEmail(),
				user.getRole(),
				user.getWorkingStore() != null ? user.getWorkingStore().getId() : null,
				user.getWorkingStore() != null ? user.getWorkingStore().getName() : null,
				user.getWorkingStore() != null ? user.getWorkingStore().getAddress() : null,
				user.getVerifiedAt() != null,
				user.isProfileCompleted(),
				user.getCreditPoints(),
				user.getCreatedAt(),
				user.getVerifiedAt()
		);
	}
}
