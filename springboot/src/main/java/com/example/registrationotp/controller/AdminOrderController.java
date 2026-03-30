package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.OrderInvoiceDocument;
import com.example.registrationotp.dto.OrderResponse;
import com.example.registrationotp.dto.OrderScanAuditResponse;
import com.example.registrationotp.dto.OrderStageFilter;
import com.example.registrationotp.dto.OrderStatusUpdateRequest;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.model.OrderStatus;
import com.example.registrationotp.model.PaymentStatus;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

	private final OrderService orderService;

	public AdminOrderController(OrderService orderService) {
		this.orderService = orderService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<OrderResponse>> listOrders(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) OrderStatus status,
			@RequestParam(required = false) PaymentStatus paymentStatus,
			@RequestParam(required = false) OrderStageFilter stage,
			@RequestParam(required = false) Long storeId,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(orderService.listOrders(
				authorizationHeader,
				status,
				paymentStatus,
				stage,
				storeId,
				search,
				page,
				size
		));
	}

	@GetMapping("/{id}")
	public ResponseEntity<OrderResponse> getOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.getOrder(authorizationHeader, id));
	}

	@PutMapping("/{id}/status")
	public ResponseEntity<OrderResponse> updateStatus(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@Valid @RequestBody OrderStatusUpdateRequest request
	) {
		return ResponseEntity.ok(orderService.updateOrderStatus(authorizationHeader, id, request));
	}

	@PostMapping("/{id}/confirm")
	public ResponseEntity<OrderResponse> confirmOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.confirmOrder(authorizationHeader, id));
	}

	@PostMapping("/{id}/cancel")
	public ResponseEntity<OrderResponse> cancelOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.cancelOrderByAdmin(authorizationHeader, id));
	}

	@PostMapping("/{id}/mark-paid")
	public ResponseEntity<OrderResponse> markPaid(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.markOrderPaidByAdmin(authorizationHeader, id));
	}

	@PostMapping("/{id}/invoice/generate")
	public ResponseEntity<OrderResponse> generateInvoice(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.generateInvoice(authorizationHeader, id));
	}

	@GetMapping(value = "/{id}/invoice", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> getInvoice(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@RequestParam(defaultValue = "false") boolean download
	) {
		OrderInvoiceDocument document = orderService.getAdminOrderInvoice(authorizationHeader, id);
		return toInvoiceResponse(document, download);
	}

	@GetMapping("/{id}/scan-history")
	public ResponseEntity<List<OrderScanAuditResponse>> getScanHistory(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.listOrderScanHistory(authorizationHeader, id));
	}

	private ResponseEntity<String> toInvoiceResponse(OrderInvoiceDocument document, boolean download) {
		ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
				.contentType(MediaType.TEXT_HTML);
		if (download) {
			builder.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
					.filename(document.fileName())
					.build()
					.toString());
		}
		return builder.body(document.html());
	}
}
