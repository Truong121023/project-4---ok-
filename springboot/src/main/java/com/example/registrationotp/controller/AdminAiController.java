package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.AdminAiFormDraftRequest;
import com.example.registrationotp.dto.AdminAiFormDraftResponse;
import com.example.registrationotp.model.AdminAiFormType;
import com.example.registrationotp.service.AdminAiDraftService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/ai")
public class AdminAiController {

	private final AdminAiDraftService adminAiDraftService;

	public AdminAiController(AdminAiDraftService adminAiDraftService) {
		this.adminAiDraftService = adminAiDraftService;
	}

	@PostMapping("/form-drafts/{formType}")
	public ResponseEntity<AdminAiFormDraftResponse> generateFormDraft(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable AdminAiFormType formType,
			@Valid @RequestBody AdminAiFormDraftRequest request
	) {
		return ResponseEntity.ok(adminAiDraftService.generateDraft(authorizationHeader, formType, request));
	}
}
