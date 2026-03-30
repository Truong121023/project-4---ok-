package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PayOsWebhookRequest;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/payos")
public class PayOsWebhookController {

	private final OrderService orderService;

	public PayOsWebhookController(OrderService orderService) {
		this.orderService = orderService;
	}

	@PostMapping("/webhook")
	public ResponseEntity<MessageResponse> handleWebhook(@RequestBody PayOsWebhookRequest request) {
		orderService.handlePayOsWebhook(request);
		return ResponseEntity.ok(new MessageResponse("Webhook processed"));
	}
}
