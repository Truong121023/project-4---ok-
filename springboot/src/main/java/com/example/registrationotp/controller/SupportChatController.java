package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.SupportChatStoreListResponse;
import com.example.registrationotp.service.SupportChatService;

@RestController
@RequestMapping("/api/support-chat")
public class SupportChatController {

	private final SupportChatService supportChatService;

	public SupportChatController(SupportChatService supportChatService) {
		this.supportChatService = supportChatService;
	}

	@GetMapping("/stores")
	public ResponseEntity<SupportChatStoreListResponse> listStores(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(supportChatService.listStores(authorizationHeader));
	}
}
