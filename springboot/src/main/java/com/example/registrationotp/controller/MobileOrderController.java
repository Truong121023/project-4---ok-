package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.MobileOrderQrResolveResponse;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/mobile/order-qr")
public class MobileOrderController {

	private final OrderService orderService;

	public MobileOrderController(OrderService orderService) {
		this.orderService = orderService;
	}

	@GetMapping("/{token}")
	public ResponseEntity<MobileOrderQrResolveResponse> resolveOrderQr(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable String token
	) {
		return ResponseEntity.ok(orderService.resolveMobileOrderQr(authorizationHeader, token));
	}
}
