package com.example.registrationotp.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(
		name = "user_promotion_redemptions",
		indexes = {
				@Index(name = "idx_user_promotion_redemptions_user", columnList = "user_id"),
				@Index(name = "idx_user_promotion_redemptions_promotion", columnList = "promotion_id"),
				@Index(name = "idx_user_promotion_redemptions_used_order", columnList = "used_order_id")
		}
)
public class UserPromotionRedemption {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "promotion_id", nullable = false)
	private Promotion promotion;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "used_order_id")
	private Order usedOrder;

	@Column(name = "credit_cost", nullable = false)
	private Integer creditCost = 0;

	@Column(name = "redeemed_at", nullable = false, updatable = false)
	private Instant redeemedAt;

	@Column(name = "used_at")
	private Instant usedAt;

	@PrePersist
	void onCreate() {
		if (redeemedAt == null) {
			redeemedAt = Instant.now();
		}
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public Promotion getPromotion() {
		return promotion;
	}

	public void setPromotion(Promotion promotion) {
		this.promotion = promotion;
	}

	public Order getUsedOrder() {
		return usedOrder;
	}

	public void setUsedOrder(Order usedOrder) {
		this.usedOrder = usedOrder;
	}

	public Integer getCreditCost() {
		return creditCost == null ? 0 : Math.max(creditCost, 0);
	}

	public void setCreditCost(Integer creditCost) {
		this.creditCost = creditCost == null ? 0 : Math.max(creditCost, 0);
	}

	public Instant getRedeemedAt() {
		return redeemedAt;
	}

	public void setRedeemedAt(Instant redeemedAt) {
		this.redeemedAt = redeemedAt;
	}

	public Instant getUsedAt() {
		return usedAt;
	}

	public void setUsedAt(Instant usedAt) {
		this.usedAt = usedAt;
	}
}
