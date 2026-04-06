package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.AiChatQueryRequest;
import com.example.registrationotp.dto.AiChatResponse;
import com.example.registrationotp.service.AiChatService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai/chat")
public class AiChatController {

	private final AiChatService aiChatService;

	public AiChatController(AiChatService aiChatService) {
		this.aiChatService = aiChatService;
	}

	@PostMapping("/query")
	public ResponseEntity<AiChatResponse> query(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody AiChatQueryRequest request
	) {
		return ResponseEntity.ok(aiChatService.query(authorizationHeader, request));
	}
}
