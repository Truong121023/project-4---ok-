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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "events")
public class EventItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	@Column(name = "slug", length = 200)
	private String slug;

	@Column(name = "description", length = 2000)
	private String description;

	@Column(name = "location", length = 255)
	private String location;

	@Column(name = "schedule_text", length = 255)
	private String scheduleText;

	@Column(name = "highlight_summary", length = 1000)
	private String highlightSummary;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "store_id", nullable = false)
	private Store store;

	@ElementCollection
	@CollectionTable(name = "event_image_paths", joinColumns = @JoinColumn(name = "event_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "image_path", length = 500)
	private List<String> imagePaths = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "event_highlight_tags", joinColumns = @JoinColumn(name = "event_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "highlight_tag", length = 160)
	private List<String> highlightTags = new ArrayList<>();

	@OneToMany(mappedBy = "eventItem", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sortOrder ASC, id ASC")
	private List<ContentSection> sections = new ArrayList<>();

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	@Column(name = "ends_at", nullable = false)
	private Instant endsAt;

	@Column(name = "capacity")
	private Integer capacity;

	@Column(name = "booked_count", nullable = false)
	private Integer bookedCount = 0;

	@ElementCollection
	@CollectionTable(name = "event_featured_dish_ids", joinColumns = @JoinColumn(name = "event_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "dish_id", nullable = false)
	private List<Long> featuredDishIds = new ArrayList<>();

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

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public String getScheduleText() {
		return scheduleText;
	}

	public void setScheduleText(String scheduleText) {
		this.scheduleText = scheduleText;
	}

	public String getHighlightSummary() {
		return highlightSummary;
	}

	public void setHighlightSummary(String highlightSummary) {
		this.highlightSummary = highlightSummary;
	}

	public Store getStore() {
		return store;
	}

	public void setStore(Store store) {
		this.store = store;
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
			section.attachToEvent(this, sortOrder++);
			this.sections.add(section);
		}
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

	public Integer getCapacity() {
		return capacity;
	}

	public void setCapacity(Integer capacity) {
		this.capacity = capacity;
	}

	public Integer getBookedCount() {
		return bookedCount;
	}

	public void setBookedCount(Integer bookedCount) {
		this.bookedCount = bookedCount;
	}

	public List<Long> getFeaturedDishIds() {
		return featuredDishIds;
	}

	public void setFeaturedDishIds(List<Long> featuredDishIds) {
		this.featuredDishIds = featuredDishIds == null ? new ArrayList<>() : new ArrayList<>(featuredDishIds);
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

	private void clearSections() {
		for (ContentSection section : sections) {
			if (section != null) {
				section.detachFromOwner();
			}
		}
		sections.clear();
	}
}
