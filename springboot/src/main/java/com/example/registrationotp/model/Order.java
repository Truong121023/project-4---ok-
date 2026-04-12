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
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private OrderStatus status = OrderStatus.PENDING;

	@Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal totalAmount = BigDecimal.ZERO;

	@Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal subtotalAmount = BigDecimal.ZERO;

	@Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal discountAmount = BigDecimal.ZERO;

	@Column(name = "shipping_distance_km", precision = 10, scale = 3)
	private BigDecimal shippingDistanceKm = BigDecimal.ZERO;

	@Column(name = "shipping_fee_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal shippingFeeAmount = BigDecimal.ZERO;

	@Column(name = "promotion_code", length = 50)
	private String promotionCode;

	@Enumerated(EnumType.STRING)
	@Column(name = "promotion_scope", length = 20)
	private PromotionScope promotionScope;

	@Column(name = "promotion_eligible_amount", precision = 12, scale = 2)
	private BigDecimal promotionEligibleAmount;

	@ElementCollection
	@CollectionTable(name = "order_promotion_dish_ids", joinColumns = @JoinColumn(name = "order_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "dish_id", nullable = false)
	private List<Long> promotionDishIds = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	@Column(name = "delivery_type", nullable = false, length = 20)
	private DeliveryType deliveryType = DeliveryType.IMMEDIATE;

	@Column(name = "scheduled_delivery_at")
	private Instant scheduledDeliveryAt;

	@Column(name = "delivery_full_name", length = 100)
	private String deliveryFullName;

	@Column(name = "delivery_phone_number", length = 30)
	private String deliveryPhoneNumber;

	@Column(name = "delivery_address", length = 255)
	private String deliveryAddress;

	@Column(name = "delivery_address_id")
	private Long deliveryAddressId;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "preparing_staff_id")
	private User preparingStaff;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "delivering_shipper_id")
	private User deliveringShipper;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "confirmed_by_user_id")
	private User confirmedByUser;

	@Column(name = "confirmed_at")
	private Instant confirmedAt;

	@Column(name = "payment_provider", length = 30)
	private String paymentProvider;

	@Enumerated(EnumType.STRING)
	@Column(name = "payment_status", nullable = false, length = 20)
	private PaymentStatus paymentStatus = PaymentStatus.PENDING;

	@Column(name = "payos_order_code")
	private Long payosOrderCode;

	@Column(name = "payment_link_id", length = 100)
	private String paymentLinkId;

	@Column(name = "payment_checkout_url", length = 500)
	private String paymentCheckoutUrl;

	@Column(name = "payment_return_url", length = 500)
	private String paymentReturnUrl;

	@Column(name = "payment_cancel_url", length = 500)
	private String paymentCancelUrl;

	@Column(name = "payment_qr_code", length = 4000)
	private String paymentQrCode;

	@Column(name = "payment_reference", length = 100)
	private String paymentReference;

	@Column(name = "payment_expires_at")
	private Instant paymentExpiresAt;

	@Column(name = "credit_points_awarded", nullable = false)
	private Integer creditPointsAwarded = 0;

	@Column(name = "paid_at")
	private Instant paidAt;

	@Column(name = "invoice_number", length = 120, unique = true)
	private String invoiceNumber;

	@Column(name = "invoice_issued_at")
	private Instant invoiceIssuedAt;

	@Column(name = "invoice_qr_token", length = 255, unique = true)
	private String invoiceQrToken;

	@Column(name = "delivery_proof_image_path", length = 500)
	private String deliveryProofImagePath;

	@Column(name = "delivery_proof_captured_at")
	private Instant deliveryProofCapturedAt;

	@Column(name = "delivery_proof_uploaded_at")
	private Instant deliveryProofUploadedAt;

	@Column(name = "delivery_proof_note", length = 500)
	private String deliveryProofNote;

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

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public OrderStatus getStatus() {
		return status;
	}

	public void setStatus(OrderStatus status) {
		this.status = status;
	}

	public BigDecimal getTotalAmount() {
		return totalAmount;
	}

	public void setTotalAmount(BigDecimal totalAmount) {
		this.totalAmount = totalAmount;
	}

	public BigDecimal getSubtotalAmount() {
		return subtotalAmount;
	}

	public void setSubtotalAmount(BigDecimal subtotalAmount) {
		this.subtotalAmount = subtotalAmount;
	}

	public BigDecimal getDiscountAmount() {
		return discountAmount;
	}

	public void setDiscountAmount(BigDecimal discountAmount) {
		this.discountAmount = discountAmount;
	}

	public BigDecimal getShippingDistanceKm() {
		return shippingDistanceKm;
	}

	public void setShippingDistanceKm(BigDecimal shippingDistanceKm) {
		this.shippingDistanceKm = shippingDistanceKm == null ? BigDecimal.ZERO : shippingDistanceKm;
	}

	public BigDecimal getShippingFeeAmount() {
		return shippingFeeAmount;
	}

	public void setShippingFeeAmount(BigDecimal shippingFeeAmount) {
		this.shippingFeeAmount = shippingFeeAmount == null ? BigDecimal.ZERO : shippingFeeAmount;
	}

	public String getPromotionCode() {
		return promotionCode;
	}

	public void setPromotionCode(String promotionCode) {
		this.promotionCode = promotionCode;
	}

	public PromotionScope getPromotionScope() {
		return promotionScope;
	}

	public void setPromotionScope(PromotionScope promotionScope) {
		this.promotionScope = promotionScope;
	}

	public BigDecimal getPromotionEligibleAmount() {
		return promotionEligibleAmount;
	}

	public void setPromotionEligibleAmount(BigDecimal promotionEligibleAmount) {
		this.promotionEligibleAmount = promotionEligibleAmount;
	}

	public List<Long> getPromotionDishIds() {
		return promotionDishIds;
	}

	public void setPromotionDishIds(List<Long> promotionDishIds) {
		this.promotionDishIds = promotionDishIds == null ? new ArrayList<>() : new ArrayList<>(promotionDishIds);
	}

	public DeliveryType getDeliveryType() {
		return deliveryType == null ? DeliveryType.IMMEDIATE : deliveryType;
	}

	public void setDeliveryType(DeliveryType deliveryType) {
		this.deliveryType = deliveryType;
	}

	public Instant getScheduledDeliveryAt() {
		return scheduledDeliveryAt;
	}

	public void setScheduledDeliveryAt(Instant scheduledDeliveryAt) {
		this.scheduledDeliveryAt = scheduledDeliveryAt;
	}

	public String getDeliveryFullName() {
		return deliveryFullName;
	}

	public void setDeliveryFullName(String deliveryFullName) {
		this.deliveryFullName = deliveryFullName;
	}

	public String getDeliveryPhoneNumber() {
		return deliveryPhoneNumber;
	}

	public void setDeliveryPhoneNumber(String deliveryPhoneNumber) {
		this.deliveryPhoneNumber = deliveryPhoneNumber;
	}

	public String getDeliveryAddress() {
		return deliveryAddress;
	}

	public void setDeliveryAddress(String deliveryAddress) {
		this.deliveryAddress = deliveryAddress;
	}

	public Long getDeliveryAddressId() {
		return deliveryAddressId;
	}

	public void setDeliveryAddressId(Long deliveryAddressId) {
		this.deliveryAddressId = deliveryAddressId;
	}

	public User getPreparingStaff() {
		return preparingStaff;
	}

	public void setPreparingStaff(User preparingStaff) {
		this.preparingStaff = preparingStaff;
	}

	public User getDeliveringShipper() {
		return deliveringShipper;
	}

	public void setDeliveringShipper(User deliveringShipper) {
		this.deliveringShipper = deliveringShipper;
	}

	public User getConfirmedByUser() {
		return confirmedByUser;
	}

	public void setConfirmedByUser(User confirmedByUser) {
		this.confirmedByUser = confirmedByUser;
	}

	public Instant getConfirmedAt() {
		return confirmedAt;
	}

	public void setConfirmedAt(Instant confirmedAt) {
		this.confirmedAt = confirmedAt;
	}

	public String getPaymentProvider() {
		return paymentProvider;
	}

	public void setPaymentProvider(String paymentProvider) {
		this.paymentProvider = paymentProvider;
	}

	public PaymentStatus getPaymentStatus() {
		return paymentStatus;
	}

	public void setPaymentStatus(PaymentStatus paymentStatus) {
		this.paymentStatus = paymentStatus;
	}

	public Long getPayosOrderCode() {
		return payosOrderCode;
	}

	public void setPayosOrderCode(Long payosOrderCode) {
		this.payosOrderCode = payosOrderCode;
	}

	public String getPaymentLinkId() {
		return paymentLinkId;
	}

	public void setPaymentLinkId(String paymentLinkId) {
		this.paymentLinkId = paymentLinkId;
	}

	public String getPaymentCheckoutUrl() {
		return paymentCheckoutUrl;
	}

	public void setPaymentCheckoutUrl(String paymentCheckoutUrl) {
		this.paymentCheckoutUrl = paymentCheckoutUrl;
	}

	public String getPaymentQrCode() {
		return paymentQrCode;
	}

	public String getPaymentReturnUrl() {
		return paymentReturnUrl;
	}

	public void setPaymentReturnUrl(String paymentReturnUrl) {
		this.paymentReturnUrl = paymentReturnUrl;
	}

	public String getPaymentCancelUrl() {
		return paymentCancelUrl;
	}

	public void setPaymentCancelUrl(String paymentCancelUrl) {
		this.paymentCancelUrl = paymentCancelUrl;
	}

	public void setPaymentQrCode(String paymentQrCode) {
		this.paymentQrCode = paymentQrCode;
	}

	public String getPaymentReference() {
		return paymentReference;
	}

	public void setPaymentReference(String paymentReference) {
		this.paymentReference = paymentReference;
	}

	public Instant getPaymentExpiresAt() {
		return paymentExpiresAt;
	}

	public void setPaymentExpiresAt(Instant paymentExpiresAt) {
		this.paymentExpiresAt = paymentExpiresAt;
	}

	public Integer getCreditPointsAwarded() {
		return creditPointsAwarded;
	}

	public void setCreditPointsAwarded(Integer creditPointsAwarded) {
		this.creditPointsAwarded = creditPointsAwarded == null ? 0 : Math.max(creditPointsAwarded, 0);
	}

	public Instant getPaidAt() {
		return paidAt;
	}

	public void setPaidAt(Instant paidAt) {
		this.paidAt = paidAt;
	}

	public String getInvoiceNumber() {
		return invoiceNumber;
	}

	public void setInvoiceNumber(String invoiceNumber) {
		this.invoiceNumber = invoiceNumber;
	}

	public Instant getInvoiceIssuedAt() {
		return invoiceIssuedAt;
	}

	public void setInvoiceIssuedAt(Instant invoiceIssuedAt) {
		this.invoiceIssuedAt = invoiceIssuedAt;
	}

	public String getInvoiceQrToken() {
		return invoiceQrToken;
	}

	public void setInvoiceQrToken(String invoiceQrToken) {
		this.invoiceQrToken = invoiceQrToken;
	}

	public String getDeliveryProofImagePath() {
		return deliveryProofImagePath;
	}

	public void setDeliveryProofImagePath(String deliveryProofImagePath) {
		this.deliveryProofImagePath = deliveryProofImagePath;
	}

	public Instant getDeliveryProofCapturedAt() {
		return deliveryProofCapturedAt;
	}

	public void setDeliveryProofCapturedAt(Instant deliveryProofCapturedAt) {
		this.deliveryProofCapturedAt = deliveryProofCapturedAt;
	}

	public Instant getDeliveryProofUploadedAt() {
		return deliveryProofUploadedAt;
	}

	public void setDeliveryProofUploadedAt(Instant deliveryProofUploadedAt) {
		this.deliveryProofUploadedAt = deliveryProofUploadedAt;
	}

	public String getDeliveryProofNote() {
		return deliveryProofNote;
	}

	public void setDeliveryProofNote(String deliveryProofNote) {
		this.deliveryProofNote = deliveryProofNote;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
