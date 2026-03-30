package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.GoogleCompleteProfileRequest;
import com.example.registrationotp.dto.GoogleCompleteProfileResponse;
import com.example.registrationotp.dto.GoogleLoginRequest;
import com.example.registrationotp.dto.LoginRequest;
import com.example.registrationotp.dto.LoginResponse;
import com.example.registrationotp.dto.LogoutResponse;
import com.example.registrationotp.dto.MeResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PasswordResetConfirmRequest;
import com.example.registrationotp.dto.PasswordResetOtpRequest;
import com.example.registrationotp.dto.PasswordResetOtpResponse;
import com.example.registrationotp.dto.RegisterRequest;
import com.example.registrationotp.dto.RegisterResponse;
import com.example.registrationotp.dto.VerifyOtpRequest;
import com.example.registrationotp.dto.VerifyOtpResponse;
import com.example.registrationotp.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/register")
	public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
		return ResponseEntity.accepted().body(authService.register(request));
	}

	@PostMapping("/verify-otp")
	public ResponseEntity<VerifyOtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(authService.verifyOtp(request));
	}

	@PostMapping("/password/request-otp")
	public ResponseEntity<PasswordResetOtpResponse> requestPasswordResetOtp(
			@Valid @RequestBody PasswordResetOtpRequest request
	) {
		return ResponseEntity.accepted().body(authService.requestPasswordResetOtp(request));
	}

	@PostMapping("/password/reset")
	public ResponseEntity<MessageResponse> resetPasswordWithOtp(
			@Valid @RequestBody PasswordResetConfirmRequest request
	) {
		return ResponseEntity.ok(authService.resetPasswordWithOtp(request));
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authService.login(request));
	}

	@PostMapping("/google/login")
	public ResponseEntity<LoginResponse> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
		return ResponseEntity.ok(authService.loginWithGoogle(request));
	}

	@PostMapping("/google/complete-profile")
	public ResponseEntity<GoogleCompleteProfileResponse> completeGoogleProfile(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody GoogleCompleteProfileRequest request
	) {
		return ResponseEntity.ok(authService.completeGoogleProfile(authorizationHeader, request));
	}

	@GetMapping("/me")
	public ResponseEntity<MeResponse> me(@RequestHeader("Authorization") String authorizationHeader) {
		return ResponseEntity.ok(authService.me(authorizationHeader));
	}

	@PostMapping("/logout")
	public ResponseEntity<LogoutResponse> logout(@RequestHeader("Authorization") String authorizationHeader) {
		return ResponseEntity.ok(authService.logout(authorizationHeader));
	}
}
