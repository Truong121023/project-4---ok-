package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.UserNotification;
import com.example.registrationotp.model.UserNotificationType;

public record UserNotificationResponse(
		Long id,
		UserNotificationType type,
		String title,
		String message,
		Long relatedOrderId,
		Long orderId,
		Long relatedEventId,
		Long eventId,
		String relatedEventSlug,
		String eventSlug,
		Long relatedNewsId,
		Long newsId,
		String relatedNewsSlug,
		String newsSlug,
		Long relatedStoreId,
		String relatedStoreName,
		String actionUrl,
		boolean read,
		Instant readAt,
		Instant createdAt,
		Instant updatedAt
) {

	public static UserNotificationResponse from(UserNotification notification) {
		Long orderId = notification.getRelatedOrderId();
		Long eventId = notification.getRelatedEventId();
		String eventSlug = notification.getRelatedEventSlug();
		Long newsId = notification.getRelatedNewsId();
		String newsSlug = notification.getRelatedNewsSlug();
		return new UserNotificationResponse(
				notification.getId(),
				notification.getType(),
				notification.getTitle(),
				notification.getMessage(),
				orderId,
				orderId,
				eventId,
				eventId,
				eventSlug,
				eventSlug,
				newsId,
				newsId,
				newsSlug,
				newsSlug,
				notification.getRelatedStoreId(),
				notification.getRelatedStoreName(),
				resolveActionUrl(notification),
				notification.getReadAt() != null,
				notification.getReadAt(),
				notification.getCreatedAt(),
				notification.getReadAt() != null ? notification.getReadAt() : notification.getCreatedAt()
		);
	}

	private static String resolveActionUrl(UserNotification notification) {
		if (notification.getActionUrl() != null && !notification.getActionUrl().isBlank()) {
			return notification.getActionUrl();
		}
		if (notification.getRelatedOrderId() != null) {
			return "/orders/" + notification.getRelatedOrderId();
		}
		if (notification.getRelatedNewsSlug() != null && !notification.getRelatedNewsSlug().isBlank()) {
			return "/news/" + notification.getRelatedNewsSlug();
		}
		if (notification.getRelatedEventSlug() != null && !notification.getRelatedEventSlug().isBlank()) {
			return "/events/" + notification.getRelatedEventSlug();
		}
		if (notification.getRelatedEventId() != null) {
			return "/events";
		}
		if (notification.getRelatedStoreId() != null) {
			return "/stores/" + notification.getRelatedStoreId();
		}
		return null;
	}
}
