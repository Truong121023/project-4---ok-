package com.example.registrationotp.dto;

import jakarta.validation.constraints.NotNull;

import com.example.registrationotp.model.FavoriteTargetType;

public record FavoriteRequest(
		@NotNull(message = "targetType is required")
		FavoriteTargetType targetType,
		@NotNull(message = "targetId is required")
		Long targetId
) {
}
