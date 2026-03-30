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
import com.example.registrationotp.dto.UserLevelDefinitionRequest;
import com.example.registrationotp.dto.UserLevelDefinitionResponse;
import com.example.registrationotp.service.UserLevelService;

@RestController
@RequestMapping("/api/admin/user-levels")
public class AdminUserLevelController {

	private final UserLevelService userLevelService;

	public AdminUserLevelController(UserLevelService userLevelService) {
		this.userLevelService = userLevelService;
	}

	@GetMapping
	public ResponseEntity<List<UserLevelDefinitionResponse>> listDefinitions(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(userLevelService.listDefinitions(authorizationHeader));
	}

	@GetMapping("/{id}")
	public ResponseEntity<UserLevelDefinitionResponse> getDefinition(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(userLevelService.getDefinition(authorizationHeader, id));
	}

	@PostMapping
	public ResponseEntity<UserLevelDefinitionResponse> createDefinition(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody UserLevelDefinitionRequest request
	) {
		return ResponseEntity.status(HttpStatus.CREATED).body(userLevelService.createDefinition(authorizationHeader, request));
	}

	@PutMapping("/{id}")
	public ResponseEntity<UserLevelDefinitionResponse> updateDefinition(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody UserLevelDefinitionRequest request
	) {
		return ResponseEntity.ok(userLevelService.updateDefinition(authorizationHeader, id, request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deleteDefinition(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(userLevelService.deleteDefinition(authorizationHeader, id));
	}
}
