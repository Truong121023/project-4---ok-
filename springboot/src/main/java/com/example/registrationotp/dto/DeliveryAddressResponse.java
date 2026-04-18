package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.UserDeliveryAddress;

public record DeliveryAddressResponse(
		Long id,
		Long userId,
		String fullName,
		String phoneNumber,
		String deliveryAddress,
		Double latitude,
		Double longitude,
		boolean primary,
		boolean verified,
		Instant verifiedAt,
		Instant lastUsedAt,
		Instant createdAt,
		Instant updatedAt
) {

	public static DeliveryAddressResponse from(UserDeliveryAddress deliveryAddress) {
		return new DeliveryAddressResponse(
				deliveryAddress.getId(),
				deliveryAddress.getUser().getId(),
				deliveryAddress.getFullName(),
				deliveryAddress.getPhoneNumber(),
				deliveryAddress.getDeliveryAddress(),
				deliveryAddress.getLatitude(),
				deliveryAddress.getLongitude(),
				deliveryAddress.isPrimaryAddress(),
				deliveryAddress.getVerifiedAt() != null,
				deliveryAddress.getVerifiedAt(),
				deliveryAddress.getLastUsedAt(),
				deliveryAddress.getCreatedAt(),
				deliveryAddress.getUpdatedAt()
		);
	}
}
