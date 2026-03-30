package com.example.registrationotp.model;

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
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "news_articles")
public class NewsArticle {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "title", nullable = false, length = 180)
	private String title;

	@Column(name = "slug", nullable = false, length = 200)
	private String slug;

	@Column(name = "summary", nullable = false, length = 500)
	private String summary;

	@Lob
	@Column(name = "content", nullable = false, columnDefinition = "TEXT")
	private String content;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "related_store_id")
	private Store relatedStore;

	@ElementCollection
	@CollectionTable(name = "news_article_tags", joinColumns = @JoinColumn(name = "news_article_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "tag", length = 120)
	private List<String> tags = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "news_article_image_paths", joinColumns = @JoinColumn(name = "news_article_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "image_path", length = 500)
	private List<String> imagePaths = new ArrayList<>();

	@OneToMany(mappedBy = "newsArticle", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sortOrder ASC, id ASC")
	private List<ContentSection> sections = new ArrayList<>();

	@Column(name = "featured", nullable = false)
	private boolean featured;

	@Column(name = "published", nullable = false)
	private boolean published;

	@Column(name = "published_at")
	private Instant publishedAt;

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

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public String getSummary() {
		return summary;
	}

	public void setSummary(String summary) {
		this.summary = summary;
	}

	public String getContent() {
		return content;
	}

	public void setContent(String content) {
		this.content = content;
	}

	public Store getRelatedStore() {
		return relatedStore;
	}

	public void setRelatedStore(Store relatedStore) {
		this.relatedStore = relatedStore;
	}

	public List<String> getTags() {
		return tags;
	}

	public void setTags(List<String> tags) {
		this.tags = tags == null ? new ArrayList<>() : new ArrayList<>(tags);
	}

	public List<String> getImagePaths() {
		return imagePaths;
	}

	public void setImagePaths(List<String> imagePaths) {
		this.imagePaths = imagePaths == null ? new ArrayList<>() : new ArrayList<>(imagePaths);
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
			section.attachToNewsArticle(this, sortOrder++);
			this.sections.add(section);
		}
	}

	public boolean isFeatured() {
		return featured;
	}

	public void setFeatured(boolean featured) {
		this.featured = featured;
	}

	public boolean isPublished() {
		return published;
	}

	public void setPublished(boolean published) {
		this.published = published;
	}

	public Instant getPublishedAt() {
		return publishedAt;
	}

	public void setPublishedAt(Instant publishedAt) {
		this.publishedAt = publishedAt;
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
