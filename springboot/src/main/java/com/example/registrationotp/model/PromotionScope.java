package com.example.registrationotp.model;

public enum PromotionScope {
	DISH(PromotionDiscountTarget.ITEMS),
	ORDER(PromotionDiscountTarget.BOTH),
	SHIP(PromotionDiscountTarget.SHIPPING);

	private final PromotionDiscountTarget discountTarget;

	PromotionScope(PromotionDiscountTarget discountTarget) {
		this.discountTarget = discountTarget;
	}

	public PromotionDiscountTarget discountTarget() {
		return discountTarget;
	}
}
