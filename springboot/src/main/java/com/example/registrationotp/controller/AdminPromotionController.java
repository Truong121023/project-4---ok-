package com.example.registrationotp.controller;

import java.util.List;

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
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PromotionRequest;
import com.example.registrationotp.dto.PromotionResponse;
import com.example.registrationotp.service.PromotionService;

@RestController
@RequestMapping("/api/admin/promotions")
public class AdminPromotionController {

	private final PromotionService promotionService;

	public AdminPromotionController(PromotionService promotionService) {
		this.promotionService = promotionService;
	}

	@GetMapping
	public ResponseEntity<List<PromotionResponse>> listPromotions(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(promotionService.listPromotions(authorizationHeader));
	}

	@GetMapping("/{id}")
	public ResponseEntity<PromotionResponse> getPromotion(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(promotionService.getPromotion(authorizationHeader, id));
	}

	@PostMapping
	public ResponseEntity<PromotionResponse> createPromotion(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody PromotionRequest request
	) {
		return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.createPromotion(authorizationHeader, request));
	}

	@PutMapping("/{id}")
	public ResponseEntity<PromotionResponse> updatePromotion(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody PromotionRequest request
	) {
		return ResponseEntity.ok(promotionService.updatePromotion(authorizationHeader, id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deletePromotion(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(promotionService.deletePromotion(authorizationHeader, id));
	}
}
