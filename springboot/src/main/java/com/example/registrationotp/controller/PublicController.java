package com.example.registrationotp.controller;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.OrderInvoiceDocument;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.PublicAddressResolveResponse;
import com.example.registrationotp.dto.PublicAddressSuggestionResponse;
import com.example.registrationotp.dto.PublicDishCardResponse;
import com.example.registrationotp.dto.PublicDishDetailResponse;
import com.example.registrationotp.dto.PublicEventCardResponse;
import com.example.registrationotp.dto.PublicHomeResponse;
import com.example.registrationotp.dto.PublicNewsCardResponse;
import com.example.registrationotp.dto.PublicNewsDetailResponse;
import com.example.registrationotp.dto.PublicReviewItemResponse;
import com.example.registrationotp.dto.PublicStoreCardResponse;
import com.example.registrationotp.dto.PublicStoreDetailResponse;
import com.example.registrationotp.model.ReviewTargetType;
import com.example.registrationotp.service.AddressLookupService;
import com.example.registrationotp.service.OrderService;
import com.example.registrationotp.service.PublicService;

@RestController
@RequestMapping("/api/public")
public class PublicController {

	private final PublicService publicService;
	private final OrderService orderService;
	private final AddressLookupService addressLookupService;

	public PublicController(
			PublicService publicService,
			OrderService orderService,
			AddressLookupService addressLookupService
	) {
		this.publicService = publicService;
		this.orderService = orderService;
		this.addressLookupService = addressLookupService;
	}

	@GetMapping("/home")
	public ResponseEntity<PublicHomeResponse> home() {
		return ResponseEntity.ok(publicService.home());
	}

	@GetMapping("/stores")
	public ResponseEntity<PageResponse<PublicStoreCardResponse>> listStores(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String sort,
			@RequestParam(required = false) Double minRating,
			@RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(publicService.listStores(search, sort, minRating, lat, lng, page, size));
	}

	@GetMapping("/stores/{storeKey}")
	public ResponseEntity<PublicStoreDetailResponse> getStore(@PathVariable String storeKey) {
		return ResponseEntity.ok(publicService.getStore(storeKey));
	}

	@GetMapping("/dishes")
	public ResponseEntity<PageResponse<PublicDishCardResponse>> listDishes(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String sort,
			@RequestParam(required = false) Double minRating,
			@RequestParam(required = false) Long categoryId,
			@RequestParam(required = false) Boolean franchiseRequired,
			@RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(publicService.listDishes(search, sort, minRating, categoryId, franchiseRequired, lat, lng, page, size));
	}

	@GetMapping("/dishes/{dishId}")
	public ResponseEntity<PublicDishDetailResponse> getDish(
			@PathVariable Long dishId,
			@RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng
	) {
		return ResponseEntity.ok(publicService.getDish(dishId, lat, lng));
	}

	@GetMapping("/events")
	public ResponseEntity<PageResponse<PublicEventCardResponse>> listEvents(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String sort,
			@RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(publicService.listEvents(search, sort, lat, lng, page, size));
	}

	@GetMapping("/events/{eventKey}")
	public ResponseEntity<PublicEventCardResponse> getEvent(
			@PathVariable String eventKey,
			@RequestParam(required = false) Double lat,
			@RequestParam(required = false) Double lng
	) {
		return ResponseEntity.ok(publicService.getEvent(eventKey, lat, lng));
	}

	@GetMapping("/news")
	public ResponseEntity<PageResponse<PublicNewsCardResponse>> listNews(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) Boolean featured,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(publicService.listNews(search, featured, page, size));
	}

	@GetMapping("/news/{newsKey}")
	public ResponseEntity<PublicNewsDetailResponse> getNews(@PathVariable String newsKey) {
		return ResponseEntity.ok(publicService.getNews(newsKey));
	}

	@GetMapping("/reviews")
	public ResponseEntity<PageResponse<PublicReviewItemResponse>> listReviews(
			@RequestParam(required = false) ReviewTargetType targetType,
			@RequestParam(required = false) Long targetId,
			@RequestParam(required = false) String sort,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(publicService.listReviews(targetType, targetId, sort, page, size));
	}

	@GetMapping("/address-suggestions")
	public ResponseEntity<java.util.List<PublicAddressSuggestionResponse>> suggestAddresses(
			@RequestParam String input,
			@RequestParam(required = false) String sessionToken,
			@RequestParam(defaultValue = "5") int limit
	) {
		return ResponseEntity.ok(addressLookupService.suggestAddresses(input, sessionToken, limit));
	}

	@GetMapping("/address-resolve")
	public ResponseEntity<PublicAddressResolveResponse> resolveAddress(
			@RequestParam(required = false) String input,
			@RequestParam(required = false) String placeId,
			@RequestParam(required = false) String sessionToken
	) {
		return ResponseEntity.ok(addressLookupService.resolveAddress(input, placeId, sessionToken));
	}

	@GetMapping(value = "/order-qr/{token}", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> getOrderInvoiceByQr(
			@PathVariable String token,
			@RequestParam(defaultValue = "false") boolean download
	) {
		OrderInvoiceDocument document = orderService.getPublicInvoiceByQrToken(token);
		return toInvoiceResponse(document, download);
	}

	@GetMapping(value = "/order-qr-entry/{token}", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> openOrderQrEntry(@PathVariable String token) {
		return ResponseEntity.ok()
				.contentType(MediaType.TEXT_HTML)
				.body(orderService.buildPublicOrderQrEntryPage(token));
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
