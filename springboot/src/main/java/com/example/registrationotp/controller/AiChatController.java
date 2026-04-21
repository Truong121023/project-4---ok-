package com.example.registrationotp.controller;

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

import com.example.registrationotp.dto.AiChatThreadDetailResponse;
import com.example.registrationotp.dto.AiChatThreadSummaryResponse;
import com.example.registrationotp.dto.AiChatQueryRequest;
import com.example.registrationotp.dto.AiChatResponse;
import com.example.registrationotp.dto.PageResponse;
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

	@GetMapping("/threads")
	public ResponseEntity<PageResponse<AiChatThreadSummaryResponse>> listThreads(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size
	) {
		return ResponseEntity.ok(aiChatService.listThreads(authorizationHeader, page, size));
	}

	@GetMapping("/threads/{threadId}")
	public ResponseEntity<AiChatThreadDetailResponse> getThread(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long threadId
	) {
		return ResponseEntity.ok(aiChatService.getThread(authorizationHeader, threadId));
	}

	@DeleteMapping("/threads/{threadId}")
	public ResponseEntity<Void> deleteThread(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long threadId
	) {
		aiChatService.deleteThread(authorizationHeader, threadId);
		return ResponseEntity.noContent().build();
	}
}
