package com.example.registrationotp.model;

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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(
		name = "content_sections",
		indexes = {
				@Index(name = "idx_content_sections_owner_type", columnList = "owner_type"),
				@Index(name = "idx_content_sections_store_sort", columnList = "store_id, sort_order"),
				@Index(name = "idx_content_sections_dish_sort", columnList = "dish_id, sort_order"),
				@Index(name = "idx_content_sections_event_sort", columnList = "event_id, sort_order"),
				@Index(name = "idx_content_sections_news_sort", columnList = "news_article_id, sort_order")
		}
)
public class ContentSection {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "owner_type", nullable = false, length = 30)
	private ContentSectionOwnerType ownerType;

	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder = 0;

	@Column(name = "title", length = 200, nullable = false)
	private String title;

	@Lob
	@Column(name = "content", nullable = false, columnDefinition = "TEXT")
	private String content;

	@Column(name = "image_path", length = 500)
	private String imagePath;

	@ElementCollection
	@CollectionTable(name = "content_section_image_paths", joinColumns = @JoinColumn(name = "content_section_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "image_path", length = 500)
	private List<String> imagePaths = new ArrayList<>();

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "store_id")
	private Store store;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "dish_id")
	private Dish dish;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "event_id")
	private EventItem eventItem;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "news_article_id")
	private NewsArticle newsArticle;

	public void attachToStore(Store store, int sortOrder) {
		detachFromOwner();
		this.store = store;
		this.ownerType = ContentSectionOwnerType.STORE;
		this.sortOrder = sortOrder;
	}

	public void attachToDish(Dish dish, int sortOrder) {
		detachFromOwner();
		this.dish = dish;
		this.ownerType = ContentSectionOwnerType.DISH;
		this.sortOrder = sortOrder;
	}

	public void attachToEvent(EventItem eventItem, int sortOrder) {
		detachFromOwner();
		this.eventItem = eventItem;
		this.ownerType = ContentSectionOwnerType.EVENT;
		this.sortOrder = sortOrder;
	}

	public void attachToNewsArticle(NewsArticle newsArticle, int sortOrder) {
		detachFromOwner();
		this.newsArticle = newsArticle;
		this.ownerType = ContentSectionOwnerType.NEWS_ARTICLE;
		this.sortOrder = sortOrder;
	}

	public void detachFromOwner() {
		this.store = null;
		this.dish = null;
		this.eventItem = null;
		this.newsArticle = null;
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public ContentSectionOwnerType getOwnerType() {
		return ownerType;
	}

	public void setOwnerType(ContentSectionOwnerType ownerType) {
		this.ownerType = ownerType;
	}

	public Integer getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(Integer sortOrder) {
		this.sortOrder = sortOrder;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getContent() {
		return content;
	}

	public void setContent(String content) {
		this.content = content;
	}

	public String getImagePath() {
		if (imagePath != null && !imagePath.isBlank()) {
			return imagePath;
		}
		return imagePaths.isEmpty() ? null : imagePaths.get(0);
	}

	public void setImagePath(String imagePath) {
		this.imagePath = imagePath;
		this.imagePaths = imagePath == null || imagePath.isBlank()
				? new ArrayList<>()
				: new ArrayList<>(List.of(imagePath));
	}

	public List<String> getImagePaths() {
		if (!imagePaths.isEmpty()) {
			return List.copyOf(imagePaths);
		}
		String legacyImagePath = getImagePath();
		return legacyImagePath == null ? List.of() : List.of(legacyImagePath);
	}

	public void setImagePaths(List<String> imagePaths) {
		if (imagePaths == null || imagePaths.isEmpty()) {
			this.imagePaths = new ArrayList<>();
			this.imagePath = null;
			return;
		}
		this.imagePaths = new ArrayList<>(imagePaths);
		this.imagePath = this.imagePaths.get(0);
	}

	public Store getStore() {
		return store;
	}

	public void setStore(Store store) {
		this.store = store;
	}

	public Dish getDish() {
		return dish;
	}

	public void setDish(Dish dish) {
		this.dish = dish;
	}

	public EventItem getEventItem() {
		return eventItem;
	}

	public void setEventItem(EventItem eventItem) {
		this.eventItem = eventItem;
	}

	public NewsArticle getNewsArticle() {
		return newsArticle;
	}

	public void setNewsArticle(NewsArticle newsArticle) {
		this.newsArticle = newsArticle;
	}
}
