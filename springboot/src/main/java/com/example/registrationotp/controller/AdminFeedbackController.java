package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.AdminFeedbackReplyRequest;
import com.example.registrationotp.dto.AdminFeedbackReplyResponse;
import com.example.registrationotp.dto.CustomerFeedbackResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.service.CustomerFeedbackService;

@RestController
@RequestMapping("/api/admin/feedbacks")
public class AdminFeedbackController {

	private final CustomerFeedbackService customerFeedbackService;

	public AdminFeedbackController(CustomerFeedbackService customerFeedbackService) {
		this.customerFeedbackService = customerFeedbackService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<CustomerFeedbackResponse>> listFeedbacks(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(customerFeedbackService.listFeedbacks(authorizationHeader, page, size, search));
	}

	@GetMapping("/{id}")
	public ResponseEntity<CustomerFeedbackResponse> getFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.getFeedback(authorizationHeader, id));
	}

	@GetMapping("/{id}/reply")
	public ResponseEntity<AdminFeedbackReplyResponse> getFeedbackReply(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.getFeedbackReply(authorizationHeader, id));
	}

	@PutMapping("/{id}/reply")
	public ResponseEntity<AdminFeedbackReplyResponse> replyFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody AdminFeedbackReplyRequest request
	) {
		return ResponseEntity.ok(customerFeedbackService.replyFeedback(authorizationHeader, id, request));
	}

	@DeleteMapping("/{id}/reply")
	public ResponseEntity<MessageResponse> deleteFeedbackReply(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.deleteFeedbackReply(authorizationHeader, id));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deleteFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.deleteFeedback(authorizationHeader, id));
	}
}
