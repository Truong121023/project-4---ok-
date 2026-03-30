package com.example.registrationotp.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "dishes")
public class Dish {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	@Column(name = "description", length = 2000)
	private String description;

	@Column(name = "note", length = 1000)
	private String note;

	@Column(name = "price", nullable = false, precision = 12, scale = 2)
	private BigDecimal price;

	@Column(name = "available", nullable = false)
	private boolean available = true;

	@Column(name = "status", length = 50)
	private String status = "ACTIVE";

	@Column(name = "franchise_required", nullable = false)
	private boolean franchiseRequired;

	@Column(name = "franchise_note", length = 1000)
	private String franchiseNote;

	@Column(name = "highlight_summary", length = 1000)
	private String highlightSummary;

	@Column(name = "active", nullable = false)
	private boolean active = true;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;

	@ElementCollection
	@CollectionTable(name = "dish_image_paths", joinColumns = @JoinColumn(name = "dish_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "image_path", length = 500)
	private List<String> imagePaths = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "dish_highlight_tags", joinColumns = @JoinColumn(name = "dish_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "highlight_tag", length = 160)
	private List<String> highlightTags = new ArrayList<>();

	@OneToMany(mappedBy = "dish", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sortOrder ASC, id ASC")
	private List<ContentSection> sections = new ArrayList<>();

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

	public String getName() {
		return name;
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

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public void setPrice(BigDecimal price) {
		this.price = price;
	}

	public boolean isAvailable() {
		return available;
	}

	public void setAvailable(boolean available) {
		this.available = available;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public boolean isFranchiseRequired() {
		return franchiseRequired;
	}

	public void setFranchiseRequired(boolean franchiseRequired) {
		this.franchiseRequired = franchiseRequired;
	}

	public String getFranchiseNote() {
		return franchiseNote;
	}

	public void setFranchiseNote(String franchiseNote) {
		this.franchiseNote = franchiseNote;
	}

	public String getHighlightSummary() {
		return highlightSummary;
	}

	public void setHighlightSummary(String highlightSummary) {
		this.highlightSummary = highlightSummary;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public Category getCategory() {
		return category;
	}

	public void setCategory(Category category) {
		this.category = category;
	}

	public List<String> getImagePaths() {
		return imagePaths;
	}

	public void setImagePaths(List<String> imagePaths) {
		this.imagePaths = imagePaths == null ? new ArrayList<>() : new ArrayList<>(imagePaths);
	}

	public List<String> getHighlightTags() {
		return highlightTags;
	}

	public void setHighlightTags(List<String> highlightTags) {
		this.highlightTags = highlightTags == null ? new ArrayList<>() : new ArrayList<>(highlightTags);
	}

	public List<ContentSection> getSections() {
		return sections;
	}

	public void setSections(List<ContentSection> sections) {
		clearSections();
		if (sections == null) {
			return;
		}
		int sortOrder = 0;
		for (ContentSection section : sections) {
			if (section == null) {
				continue;
			}
			section.attachToDish(this, sortOrder++);
			this.sections.add(section);
		}
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	private void clearSections() {
		for (ContentSection section : sections) {
			if (section != null) {
				section.detachFromOwner();
			}
		}
		sections.clear();
	}
}
