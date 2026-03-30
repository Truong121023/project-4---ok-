package com.example.registrationotp.dto;

import java.time.Instant;

import com.example.registrationotp.model.CustomerFeedback;
import com.example.registrationotp.model.Role;

public record AdminFeedbackReplyResponse(
		Long feedbackId,
		String replyMessage,
		Instant repliedAt,
		Long repliedByUserId,
		String repliedByUserName,
		Role repliedByUserRole
) {

	public static AdminFeedbackReplyResponse from(CustomerFeedback feedback) {
		return new AdminFeedbackReplyResponse(
				feedback.getId(),
				feedback.getReplyMessage(),
				feedback.getRepliedAt(),
				feedback.getRepliedByUserId(),
				feedback.getRepliedByUserName(),
				feedback.getRepliedByUserRole()
		);
	}
}
