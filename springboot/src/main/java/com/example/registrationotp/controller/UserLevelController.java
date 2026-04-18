package com.example.registrationotp.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.UserCurrentLevelResponse;
import com.example.registrationotp.service.UserLevelService;

@RestController
@RequestMapping("/api/user/levels")
public class UserLevelController {

	private final UserLevelService userLevelService;

	public UserLevelController(UserLevelService userLevelService) {
		this.userLevelService = userLevelService;
	}

	@GetMapping("/current")
	public ResponseEntity<List<UserCurrentLevelResponse>> listCurrentLevels(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId
	) {
		return ResponseEntity.ok(userLevelService.listCurrentLevels(authorizationHeader, storeId));
	}

	@GetMapping("/definitions")
	public ResponseEntity<List<com.example.registrationotp.dto.UserLevelDefinitionResponse>> listActiveDefinitions(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(userLevelService.listActiveDefinitionsForUser(authorizationHeader));
	}
}
