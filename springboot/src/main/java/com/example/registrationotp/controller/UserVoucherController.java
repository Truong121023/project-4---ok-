package com.example.registrationotp.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.PublicPromotionCardResponse;
import com.example.registrationotp.dto.UserVoucherRedeemResponse;
import com.example.registrationotp.service.PromotionService;

@RestController
@RequestMapping("/api/user/vouchers")
public class UserVoucherController {

	private final PromotionService promotionService;

	public UserVoucherController(PromotionService promotionService) {
		this.promotionService = promotionService;
	}

	@GetMapping
	public ResponseEntity<List<PublicPromotionCardResponse>> listVoucherCatalog(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(promotionService.listVoucherCatalogForUser(authorizationHeader));
	}

	@PostMapping("/{promotionId}/redeem")
	public ResponseEntity<UserVoucherRedeemResponse> redeemVoucher(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long promotionId
	) {
		return ResponseEntity.ok(promotionService.redeemVoucher(authorizationHeader, promotionId));
	}
}
