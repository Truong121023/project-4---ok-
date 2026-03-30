package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.CustomerFeedbackRequest;
import com.example.registrationotp.dto.CustomerFeedbackResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.service.CustomerFeedbackService;

@RestController
@RequestMapping("/api/user/feedbacks")
public class CustomerFeedbackController {

	private final CustomerFeedbackService customerFeedbackService;

	public CustomerFeedbackController(CustomerFeedbackService customerFeedbackService) {
		this.customerFeedbackService = customerFeedbackService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<CustomerFeedbackResponse>> listMyFeedbacks(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(customerFeedbackService.listMyFeedbacks(authorizationHeader, page, size));
	}

	@GetMapping("/{id}")
	public ResponseEntity<CustomerFeedbackResponse> getMyFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.getMyFeedback(authorizationHeader, id));
	}

	@PostMapping
	public ResponseEntity<CustomerFeedbackResponse> createMyFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody CustomerFeedbackRequest request
	) {
		return ResponseEntity.status(HttpStatus.CREATED).body(customerFeedbackService.createMyFeedback(authorizationHeader, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deleteMyFeedback(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(customerFeedbackService.deleteMyFeedback(authorizationHeader, id));
	}
}
