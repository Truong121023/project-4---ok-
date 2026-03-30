package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.FeedbackCategory;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.model.Role;

public record CustomerFeedbackResponse(
		Long id,
		Long userId,
		String userName,
		String userEmail,
		FeedbackCategory category,
		Long relatedStoreId,
		String relatedStoreSlug,
		String relatedStoreName,
		String relatedStoreAddress,
		Long relatedOrderId,
		OrderStatus relatedOrderStatus,
		PaymentStatus relatedOrderPaymentStatus,
		String relatedOrderPaymentReference,
		String subject,
		String message,
		String replyMessage,
		Instant repliedAt,
		Long repliedByUserId,
		String repliedByUserName,
		Role repliedByUserRole,
		Instant createdAt,
		Instant updatedAt
) {

	public static CustomerFeedbackResponse from(CustomerFeedback feedback) {
		return new CustomerFeedbackResponse(
				feedback.getId(),
				feedback.getUser().getId(),
				feedback.getUser().getFullName(),
				feedback.getUser().getEmail(),
				feedback.getCategory(),
				feedback.getRelatedStore() != null ? feedback.getRelatedStore().getId() : null,
				feedback.getRelatedStore() != null ? feedback.getRelatedStore().getSlug() : null,
				feedback.getRelatedStore() != null ? feedback.getRelatedStore().getName() : null,
				feedback.getRelatedStore() != null ? feedback.getRelatedStore().getAddress() : null,
				feedback.getRelatedOrder() != null ? feedback.getRelatedOrder().getId() : null,
				feedback.getRelatedOrder() != null ? feedback.getRelatedOrder().getStatus() : null,
				feedback.getRelatedOrder() != null ? feedback.getRelatedOrder().getPaymentStatus() : null,
				feedback.getRelatedOrder() != null ? feedback.getRelatedOrder().getPaymentReference() : null,
				feedback.getSubject(),
				feedback.getMessage(),
				feedback.getReplyMessage(),
				feedback.getRepliedAt(),
				feedback.getRepliedByUserId(),
				feedback.getRepliedByUserName(),
				feedback.getRepliedByUserRole(),
				feedback.getCreatedAt(),
				feedback.getUpdatedAt()
		);
	}
}
