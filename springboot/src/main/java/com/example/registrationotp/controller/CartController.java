package com.example.registrationotp.controller;

import jakarta.validation.Valid;

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

import com.example.registrationotp.dto.CartItemRequest;
import com.example.registrationotp.dto.CartResponse;
import com.example.registrationotp.dto.CheckoutPreviewRequest;
import com.example.registrationotp.dto.CheckoutPreviewResponse;
import com.example.registrationotp.dto.CheckoutRequest;
import com.example.registrationotp.dto.CheckoutResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.service.CartService;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/user/cart")
public class CartController {

	private final CartService cartService;
	private final OrderService orderService;

	public CartController(CartService cartService, OrderService orderService) {
		this.cartService = cartService;
		this.orderService = orderService;
	}

	@GetMapping
	public ResponseEntity<CartResponse> getCart(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(cartService.getCart(authorizationHeader));
	}

	@PostMapping("/items")
	public ResponseEntity<CartResponse> addCartItem(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody CartItemRequest request
	) {
		return ResponseEntity.ok(cartService.addCartItem(authorizationHeader, request));
	}

	@PutMapping("/items/{id}")
	public ResponseEntity<CartResponse> updateCartItem(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody CartItemRequest request
	) {
		return ResponseEntity.ok(cartService.updateCartItem(authorizationHeader, id, request));
	}

	@DeleteMapping("/items/{id}")
	public ResponseEntity<CartResponse> deleteCartItem(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(cartService.deleteCartItem(authorizationHeader, id));
	}

	@DeleteMapping
	public ResponseEntity<MessageResponse> clearCart(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(cartService.clearCart(authorizationHeader));
	}

	@PostMapping("/checkout")
	public ResponseEntity<CheckoutResponse> checkout(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody CheckoutRequest request
	) {
		return ResponseEntity.ok(orderService.checkout(authorizationHeader, request));
	}

	@PostMapping("/checkout-preview")
	public ResponseEntity<CheckoutPreviewResponse> checkoutPreview(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody CheckoutPreviewRequest request
	) {
		return ResponseEntity.ok(orderService.checkoutPreview(authorizationHeader, request));
	}
}
