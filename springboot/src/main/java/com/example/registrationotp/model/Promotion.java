package com.example.registrationotp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
		name = "promotions",
		uniqueConstraints = @UniqueConstraint(name = "uk_promotions_code", columnNames = "code")
)
public class Promotion {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "code", nullable = false, length = 50)
	private String code;

	@Column(name = "name", length = 150)
	private String name;

	@Column(name = "description", length = 500)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(name = "scope", nullable = false, length = 20)
	private PromotionScope scope = PromotionScope.ORDER;

	@Enumerated(EnumType.STRING)
	@Column(name = "discount_type", nullable = false, length = 20)
	private PromotionDiscountType discountType = PromotionDiscountType.PERCENT;

	@Enumerated(EnumType.STRING)
	@Column(name = "discount_target", nullable = false, length = 20)
	private PromotionDiscountTarget discountTarget = PromotionDiscountTarget.ITEMS;

	@ElementCollection
	@CollectionTable(name = "promotion_applicable_dishes", joinColumns = @JoinColumn(name = "promotion_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "dish_id", nullable = false)
	private List<Long> applicableDishIds = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "promotion_eligible_stores", joinColumns = @JoinColumn(name = "promotion_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "store_id", nullable = false)
	private List<Long> eligibleStoreIds = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "promotion_eligible_user_levels", joinColumns = @JoinColumn(name = "promotion_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "user_level_id", nullable = false)
	private List<Long> eligibleUserLevelIds = new ArrayList<>();

	@Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
	private BigDecimal discountValue = BigDecimal.ZERO;

	@Column(name = "min_order_amount", precision = 12, scale = 2)
	private BigDecimal minOrderAmount;

	@Column(name = "max_discount_amount", precision = 12, scale = 2)
	private BigDecimal maxDiscountAmount;

	@Column(name = "credit_cost", nullable = false)
	private Integer creditCost = 0;

	@Column(name = "min_store_bill_amount", precision = 12, scale = 2)
	private BigDecimal minStoreBillAmount;

	@Column(name = "min_cross_store_bill_amount", precision = 12, scale = 2)
	private BigDecimal minCrossStoreBillAmount;

	@Column(name = "usage_limit")
	private Integer usageLimit;

	@Column(name = "used_count", nullable = false)
	private Integer usedCount = 0;

	@Column(name = "starts_at")
	private Instant startsAt;

	@Column(name = "ends_at")
	private Instant endsAt;

	@Column(name = "active", nullable = false)
	private boolean active = true;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getName() {
		if (name != null && !name.isBlank()) {
			return name;
		}
		if (description != null && !description.isBlank()) {
			return description;
		}
		return code;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public PromotionScope getScope() {
		return scope == null ? PromotionScope.ORDER : scope;
	}

	public void setScope(PromotionScope scope) {
		this.scope = scope;
	}

	public PromotionDiscountType getDiscountType() {
		return discountType;
	}

	public void setDiscountType(PromotionDiscountType discountType) {
		this.discountType = discountType;
	}

	public PromotionDiscountTarget getDiscountTarget() {
		return getScope().discountTarget();
	}

	public void setDiscountTarget(PromotionDiscountTarget discountTarget) {
		this.discountTarget = discountTarget == null ? PromotionDiscountTarget.ITEMS : discountTarget;
	}

	public List<Long> getApplicableDishIds() {
		return List.of();
	}

	public void setApplicableDishIds(List<Long> applicableDishIds) {
		this.applicableDishIds = applicableDishIds == null ? new ArrayList<>() : new ArrayList<>(applicableDishIds);
	}

	public List<Long> getEligibleStoreIds() {
		return eligibleStoreIds;
	}

	public void setEligibleStoreIds(List<Long> eligibleStoreIds) {
		this.eligibleStoreIds = eligibleStoreIds == null ? new ArrayList<>() : new ArrayList<>(eligibleStoreIds);
	}

	public List<Long> getEligibleUserLevelIds() {
		return eligibleUserLevelIds;
	}

	public void setEligibleUserLevelIds(List<Long> eligibleUserLevelIds) {
		this.eligibleUserLevelIds = eligibleUserLevelIds == null ? new ArrayList<>() : new ArrayList<>(eligibleUserLevelIds);
	}

	public BigDecimal getDiscountValue() {
		return discountValue;
	}

	public void setDiscountValue(BigDecimal discountValue) {
		this.discountValue = discountValue;
	}

	public BigDecimal getMinOrderAmount() {
		return minOrderAmount;
	}

	public void setMinOrderAmount(BigDecimal minOrderAmount) {
		this.minOrderAmount = minOrderAmount;
	}

	public BigDecimal getMaxDiscountAmount() {
		return maxDiscountAmount;
	}

	public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) {
		this.maxDiscountAmount = maxDiscountAmount;
	}

	public Integer getCreditCost() {
		return 0;
	}

	public void setCreditCost(Integer creditCost) {
		this.creditCost = creditCost == null ? 0 : Math.max(creditCost, 0);
	}

	public BigDecimal getMinStoreBillAmount() {
		return minStoreBillAmount;
	}

	public void setMinStoreBillAmount(BigDecimal minStoreBillAmount) {
		this.minStoreBillAmount = minStoreBillAmount;
	}

	public BigDecimal getMinCrossStoreBillAmount() {
		return minCrossStoreBillAmount;
	}

	public void setMinCrossStoreBillAmount(BigDecimal minCrossStoreBillAmount) {
		this.minCrossStoreBillAmount = minCrossStoreBillAmount;
	}

	public Integer getUsageLimit() {
		return usageLimit;
	}

	public void setUsageLimit(Integer usageLimit) {
		this.usageLimit = usageLimit;
	}

	public Integer getUsedCount() {
		return usedCount;
	}

	public void setUsedCount(Integer usedCount) {
		this.usedCount = usedCount;
	}

	public Instant getStartsAt() {
		return startsAt;
	}

	public void setStartsAt(Instant startsAt) {
		this.startsAt = startsAt;
	}

	public Instant getEndsAt() {
		return endsAt;
	}

	public void setEndsAt(Instant endsAt) {
		this.endsAt = endsAt;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
