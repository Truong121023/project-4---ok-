package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.ReviewResponse;
import com.example.registrationotp.dto.UserReviewRequest;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.service.ReviewService;

@RestController
@RequestMapping({"/api/reviews", "/api/user/reviews"})
public class ReviewController {

	private final ReviewService reviewService;

	public ReviewController(ReviewService reviewService) {
		this.reviewService = reviewService;
	}

	@GetMapping({"", "/", "/mine", "/me"})
	public ResponseEntity<PageResponse<ReviewResponse>> listMyReviews(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) ReviewTargetType targetType,
			@RequestParam(required = false) String sort,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(reviewService.listMyReviews(authorizationHeader, targetType, sort, page, size));
	}

	@PostMapping
	public ResponseEntity<ReviewResponse> createReview(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody UserReviewRequest request
	) {
		return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(authorizationHeader, request));
	}

	@PutMapping("/{id}")
	public ResponseEntity<ReviewResponse> updateMyReview(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody UserReviewRequest request
	) {
		return ResponseEntity.ok(reviewService.updateMyReview(authorizationHeader, id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deleteMyReview(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(reviewService.deleteMyReview(authorizationHeader, id));
	}
}
