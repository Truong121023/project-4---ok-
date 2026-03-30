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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "customer_feedbacks")
public class CustomerFeedback {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "related_store_id")
	private Store relatedStore;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "related_order_id")
	private Order relatedOrder;

	@Enumerated(EnumType.STRING)
	@Column(name = "category", nullable = false, length = 30)
	private FeedbackCategory category;

	@Column(name = "subject", nullable = false, length = 180)
	private String subject;

	@Column(name = "message", nullable = false, length = 3000)
	private String message;

	@Column(name = "reply_message", length = 3000)
	private String replyMessage;

	@Column(name = "replied_at")
	private Instant repliedAt;

	@Column(name = "replied_by_user_id")
	private Long repliedByUserId;

	@Column(name = "replied_by_user_name", length = 180)
	private String repliedByUserName;

	@Enumerated(EnumType.STRING)
	@Column(name = "replied_by_user_role", length = 30)
	private Role repliedByUserRole;

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

	public Store getRelatedStore() {
		return relatedStore;
	}

	public void setRelatedStore(Store relatedStore) {
		this.relatedStore = relatedStore;
	}

	public Order getRelatedOrder() {
		return relatedOrder;
	}

	public void setRelatedOrder(Order relatedOrder) {
		this.relatedOrder = relatedOrder;
	}

	public FeedbackCategory getCategory() {
		return category;
	}

	public void setCategory(FeedbackCategory category) {
		this.category = category;
	}

	public String getSubject() {
		return subject;
	}

	public void setSubject(String subject) {
		this.subject = subject;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public String getReplyMessage() {
		return replyMessage;
	}

	public void setReplyMessage(String replyMessage) {
		this.replyMessage = replyMessage;
	}

	public Instant getRepliedAt() {
		return repliedAt;
	}

	public void setRepliedAt(Instant repliedAt) {
		this.repliedAt = repliedAt;
	}

	public Long getRepliedByUserId() {
		return repliedByUserId;
	}

	public void setRepliedByUserId(Long repliedByUserId) {
		this.repliedByUserId = repliedByUserId;
	}

	public String getRepliedByUserName() {
		return repliedByUserName;
	}

	public void setRepliedByUserName(String repliedByUserName) {
		this.repliedByUserName = repliedByUserName;
	}

	public Role getRepliedByUserRole() {
		return repliedByUserRole;
	}

	public void setRepliedByUserRole(Role repliedByUserRole) {
		this.repliedByUserRole = repliedByUserRole;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
