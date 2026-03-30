package com.example.registrationotp.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_scan_audits")
public class OrderScanAudit {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "order_id", nullable = false)
	private Order order;

	@Column(name = "scanned_by_user_id")
	private Long scannedByUserId;

	@Column(name = "scanned_by_user_name", length = 180)
	private String scannedByUserName;

	@Enumerated(EnumType.STRING)
	@Column(name = "role", length = 20)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(name = "action", nullable = false, length = 40)
	private EmployeeOrderScanAction action;

	@Column(name = "success", nullable = false)
	private boolean success;

	@Column(name = "failure_reason", length = 500)
	private String failureReason;

	@Column(name = "scanned_at", nullable = false, updatable = false)
	private Instant scannedAt;

	@PrePersist
	void onCreate() {
		scannedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Order getOrder() {
		return order;
	}

	public void setOrder(Order order) {
		this.order = order;
	}

	public Long getScannedByUserId() {
		return scannedByUserId;
	}

	public void setScannedByUserId(Long scannedByUserId) {
		this.scannedByUserId = scannedByUserId;
	}

	public String getScannedByUserName() {
		return scannedByUserName;
	}

	public void setScannedByUserName(String scannedByUserName) {
		this.scannedByUserName = scannedByUserName;
	}

	public Role getRole() {
		return role;
	}

	public void setRole(Role role) {
		this.role = role;
	}

	public EmployeeOrderScanAction getAction() {
		return action;
	}

	public void setAction(EmployeeOrderScanAction action) {
		this.action = action;
	}

	public boolean isSuccess() {
		return success;
	}

	public void setSuccess(boolean success) {
		this.success = success;
	}

	public String getFailureReason() {
		return failureReason;
	}

	public void setFailureReason(String failureReason) {
		this.failureReason = failureReason;
	}

	public Instant getScannedAt() {
		return scannedAt;
	}
}
