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
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(
		name = "ai_chat_messages",
		indexes = {
				@Index(name = "idx_ai_chat_messages_thread_created", columnList = "thread_id, created_at"),
				@Index(name = "idx_ai_chat_messages_thread_role", columnList = "thread_id, role")
		}
)
public class AiChatMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "thread_id", nullable = false)
	private AiChatThread thread;

	@Column(name = "role", nullable = false, length = 20)
	private String role;

	@Lob
	@Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
	private String content;

	@Lob
	@Column(name = "references_json", nullable = false, columnDefinition = "LONGTEXT")
	private String referencesJson = "[]";

	@Lob
	@Column(name = "actions_json", nullable = false, columnDefinition = "LONGTEXT")
	private String actionsJson = "[]";

	@Column(name = "model", length = 120)
	private String model;

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

	public AiChatThread getThread() {
		return thread;
	}

	public void setThread(AiChatThread thread) {
		this.thread = thread;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public String getContent() {
		return content;
	}

	public void setContent(String content) {
		this.content = content;
	}

	public String getReferencesJson() {
		return referencesJson;
	}

	public void setReferencesJson(String referencesJson) {
		this.referencesJson = referencesJson;
	}

	public String getActionsJson() {
		return actionsJson;
	}

	public void setActionsJson(String actionsJson) {
		this.actionsJson = actionsJson;
	}

	public String getModel() {
		return model;
	}

	public void setModel(String model) {
		this.model = model;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
