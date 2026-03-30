package com.example.registrationotp.controller;

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

import com.example.registrationotp.dto.DeliveryAddressRequest;
import com.example.registrationotp.dto.DeliveryAddressResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.service.DeliveryAddressService;

@RestController
@RequestMapping("/api/user/delivery-addresses")
public class DeliveryAddressController {

	private final DeliveryAddressService deliveryAddressService;

	public DeliveryAddressController(DeliveryAddressService deliveryAddressService) {
		this.deliveryAddressService = deliveryAddressService;
	}

	@GetMapping
	public ResponseEntity<java.util.List<DeliveryAddressResponse>> listMyAddresses(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(deliveryAddressService.listMyAddresses(authorizationHeader));
	}

	@GetMapping("/primary")
	public ResponseEntity<DeliveryAddressResponse> getMyPrimaryAddress(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(deliveryAddressService.getMyPrimaryAddress(authorizationHeader));
	}

	@GetMapping("/{id}")
	public ResponseEntity<DeliveryAddressResponse> getMyAddress(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(deliveryAddressService.getMyAddress(authorizationHeader, id));
	}

	@PostMapping
	public ResponseEntity<DeliveryAddressResponse> createMyAddress(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody DeliveryAddressRequest request
	) {
		return ResponseEntity.status(HttpStatus.CREATED).body(deliveryAddressService.createMyAddress(authorizationHeader, request));
	}

	@PutMapping("/{id}")
	public ResponseEntity<DeliveryAddressResponse> updateMyAddress(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody DeliveryAddressRequest request
	) {
		return ResponseEntity.ok(deliveryAddressService.updateMyAddress(authorizationHeader, id, request));
	}

	@PutMapping("/{id}/primary")
	public ResponseEntity<DeliveryAddressResponse> setPrimaryAddress(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(deliveryAddressService.setPrimaryAddress(authorizationHeader, id));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<MessageResponse> deleteMyAddress(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(deliveryAddressService.deleteMyAddress(authorizationHeader, id));
	}
}
