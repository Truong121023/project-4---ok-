package com.example.registrationotp.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.FavoriteRequest;
import com.example.registrationotp.dto.FavoriteResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.model.FavoriteTargetType;
import com.example.registrationotp.service.FavoriteService;

@RestController
@RequestMapping("/api/user/favorites")
public class FavoriteController {

	private final FavoriteService favoriteService;

	public FavoriteController(FavoriteService favoriteService) {
		this.favoriteService = favoriteService;
	}

	@GetMapping
	public ResponseEntity<List<FavoriteResponse>> listFavorites(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) FavoriteTargetType targetType,
			@RequestParam(defaultValue = "false") boolean purchasedOnly
	) {
		return ResponseEntity.ok(favoriteService.listFavorites(authorizationHeader, targetType, purchasedOnly));
	}

	@PostMapping
	public ResponseEntity<FavoriteResponse> createFavorite(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody FavoriteRequest request
	) {
		return ResponseEntity.ok(favoriteService.createFavorite(authorizationHeader, request));
	}

	@DeleteMapping
	public ResponseEntity<MessageResponse> deleteFavorite(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody FavoriteRequest request
	) {
		return ResponseEntity.ok(favoriteService.deleteFavorite(authorizationHeader, request));
	}
}
