package com.example.registrationotp.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.CartResponse;
import com.example.registrationotp.dto.OrderInvoiceDocument;
import com.example.registrationotp.dto.OrderResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.service.OrderService;

@RestController
@RequestMapping("/api/user/orders")
public class OrderController {

	private final OrderService orderService;

	public OrderController(OrderService orderService) {
		this.orderService = orderService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<OrderResponse>> listMyOrders(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(orderService.listMyOrders(authorizationHeader, page, size));
	}

	@GetMapping("/{id}")
	public ResponseEntity<OrderResponse> getMyOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.getMyOrder(authorizationHeader, id));
	}

	@GetMapping(value = "/{id}/invoice", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> getMyOrderInvoice(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id,
			@RequestParam(defaultValue = "false") boolean download
	) {
		OrderInvoiceDocument document = orderService.getMyOrderInvoice(authorizationHeader, id);
		return toInvoiceResponse(document, download);
	}

	@PostMapping("/{id}/refresh-payment")
	public ResponseEntity<OrderResponse> refreshMyPaymentStatus(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestHeader(value = "Origin", required = false) String originHeader,
			@RequestHeader(value = "Referer", required = false) String refererHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.refreshMyPaymentStatus(authorizationHeader, id, originHeader, refererHeader));
	}

	@PostMapping("/{id}/cancel")
	public ResponseEntity<OrderResponse> cancelMyOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.cancelMyOrder(authorizationHeader, id));
	}

	@PostMapping("/{id}/reorder")
	public ResponseEntity<CartResponse> reorderMyOrder(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(orderService.reorderMyOrder(authorizationHeader, id));
	}

	private ResponseEntity<String> toInvoiceResponse(OrderInvoiceDocument document, boolean download) {
		ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
				.contentType(MediaType.TEXT_HTML);
		if (download) {
			builder.header(
					HttpHeaders.CONTENT_DISPOSITION,
					ContentDisposition.attachment().filename(document.fileName()).build().toString());
		}
		return builder.body(document.html());
	}
}
