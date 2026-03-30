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
@Table(name = "user_notifications")
public class UserNotification {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 30)
	private UserNotificationType type;

	@Column(name = "title", nullable = false, length = 180)
	private String title;

	@Column(name = "message", nullable = false, length = 1000)
	private String message;

	@Column(name = "related_order_id")
	private Long relatedOrderId;

	@Column(name = "related_event_id")
	private Long relatedEventId;

	@Column(name = "related_event_slug", length = 220)
	private String relatedEventSlug;

	@Column(name = "related_news_id")
	private Long relatedNewsId;

	@Column(name = "related_news_slug", length = 220)
	private String relatedNewsSlug;

	@Column(name = "related_store_id")
	private Long relatedStoreId;

	@Column(name = "related_store_name", length = 180)
	private String relatedStoreName;

	@Column(name = "action_url", length = 500)
	private String actionUrl;

	@Column(name = "read_at")
	private Instant readAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate() {
		createdAt = Instant.now();
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

	public UserNotificationType getType() {
		return type;
	}

	public void setType(UserNotificationType type) {
		this.type = type;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public Long getRelatedOrderId() {
		return relatedOrderId;
	}

	public void setRelatedOrderId(Long relatedOrderId) {
		this.relatedOrderId = relatedOrderId;
	}

	public Long getRelatedEventId() {
		return relatedEventId;
	}

	public void setRelatedEventId(Long relatedEventId) {
		this.relatedEventId = relatedEventId;
	}

	public String getRelatedEventSlug() {
		return relatedEventSlug;
	}

	public void setRelatedEventSlug(String relatedEventSlug) {
		this.relatedEventSlug = relatedEventSlug;
	}

	public Long getRelatedNewsId() {
		return relatedNewsId;
	}

	public void setRelatedNewsId(Long relatedNewsId) {
		this.relatedNewsId = relatedNewsId;
	}

	public String getRelatedNewsSlug() {
		return relatedNewsSlug;
	}

	public void setRelatedNewsSlug(String relatedNewsSlug) {
		this.relatedNewsSlug = relatedNewsSlug;
	}

	public Long getRelatedStoreId() {
		return relatedStoreId;
	}

	public void setRelatedStoreId(Long relatedStoreId) {
		this.relatedStoreId = relatedStoreId;
	}

	public String getRelatedStoreName() {
		return relatedStoreName;
	}

	public void setRelatedStoreName(String relatedStoreName) {
		this.relatedStoreName = relatedStoreName;
	}

	public String getActionUrl() {
		return actionUrl;
	}

	public void setActionUrl(String actionUrl) {
		this.actionUrl = actionUrl;
	}

	public Instant getReadAt() {
		return readAt;
	}

	public void setReadAt(Instant readAt) {
		this.readAt = readAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
