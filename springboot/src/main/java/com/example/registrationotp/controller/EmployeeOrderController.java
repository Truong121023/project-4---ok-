package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.registrationotp.dto.DeliveryProofUploadResponse;
import com.example.registrationotp.dto.EmployeeOrderScanRequest;
import com.example.registrationotp.dto.EmployeeOrderScanResponse;
import com.example.registrationotp.dto.OrderResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/employee/orders")
public class EmployeeOrderController {

	private final OrderService orderService;

	public EmployeeOrderController(OrderService orderService) {
		this.orderService = orderService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<OrderResponse>> listOrders(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Boolean mine,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(orderService.listEmployeeOrders(authorizationHeader, mine, search, page, size));
	}

	@GetMapping("/{id}")
	public ResponseEntity<OrderResponse> getOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.getEmployeeOrder(authorizationHeader, id));
	}

	@PostMapping("/{id}/accept-preparing")
	public ResponseEntity<OrderResponse> acceptPreparingOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.acceptPreparingOrder(authorizationHeader, id));
	}

	@PostMapping("/{id}/mark-ready")
	public ResponseEntity<OrderResponse> markReadyForShipper(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.markOrderReadyForShipper(authorizationHeader, id));
	}

	@PostMapping("/{id}/complete-preparing")
	public ResponseEntity<OrderResponse> completePreparingOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.markOrderReadyForShipper(authorizationHeader, id));
	}

	@PostMapping("/{id}/accept-delivery")
	public ResponseEntity<OrderResponse> acceptDeliveryOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.acceptDeliveryOrder(authorizationHeader, id));
	}

	@PostMapping("/{id}/complete-delivery")
	public ResponseEntity<OrderResponse> completeDeliveryOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.completeDeliveryOrder(authorizationHeader, id));
	}

	@PostMapping(value = "/{id}/delivery-proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<DeliveryProofUploadResponse> uploadDeliveryProof(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@RequestParam("file") MultipartFile file,
			@RequestParam(value = "capturedAt", required = false) String capturedAt,
			@RequestParam(value = "note", required = false) String note
	) {
		return ResponseEntity.ok(orderService.uploadDeliveryProof(authorizationHeader, id, file, capturedAt, note));
	}

	@PostMapping("/scan")
	public ResponseEntity<EmployeeOrderScanResponse> scanOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody EmployeeOrderScanRequest request
	) {
		return ResponseEntity.ok(orderService.scanOrder(authorizationHeader, request));
	}
}
