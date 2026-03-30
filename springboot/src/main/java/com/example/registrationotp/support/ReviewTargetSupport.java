package com.example.registrationotp.support;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.model.ReviewTargetType;

public final class ReviewTargetSupport {

	private static final Set<ReviewTargetType> SUPPORTED_TARGET_TYPES = Collections.unmodifiableSet(
			EnumSet.of(ReviewTargetType.STORE, ReviewTargetType.EVENT, ReviewTargetType.DISH)
	);

	private ReviewTargetSupport() {
	}

	public static boolean isSupported(ReviewTargetType targetType) {
		return targetType != null && SUPPORTED_TARGET_TYPES.contains(targetType);
	}

	public static Set<ReviewTargetType> supportedTypes() {
		return SUPPORTED_TARGET_TYPES;
	}

	public static void requireSupported(ReviewTargetType targetType) {
		if (targetType != null && !isSupported(targetType)) {
			throw new BadRequestException("CATEGORY reviews are no longer supported");
		}
	}
}
