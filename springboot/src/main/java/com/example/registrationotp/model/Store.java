package com.example.registrationotp.model;

import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "stores")
public class Store {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	@Column(name = "slug", length = 180)
	private String slug;

	@Column(name = "description", length = 2000)
	private String description;

	@Column(name = "address", length = 255)
	private String address;

	@Column(name = "contact_email", length = 150)
	private String contactEmail;

	@Column(name = "phone_number", length = 30)
	private String phoneNumber;

	@Column(name = "latitude")
	private Double latitude;

	@Column(name = "longitude")
	private Double longitude;

	@Column(name = "area", length = 120)
	private String area;

	@Column(name = "position_label", length = 150)
	private String positionLabel;

	@Column(name = "hours_text", length = 255)
	private String hoursText;

	@Column(name = "open_time")
	private LocalTime openTime;

	@Column(name = "close_time")
	private LocalTime closeTime;

	@Column(name = "personality", length = 255)
	private String personality;

	@Column(name = "design_signature", length = 255)
	private String designSignature;

	@Column(name = "franchise_mood", length = 255)
	private String franchiseMood;

	@Column(name = "specialty", length = 255)
	private String specialty;

	@Column(name = "highlight_summary", length = 1000)
	private String highlightSummary;

	@ElementCollection
	@CollectionTable(name = "store_highlight_tags", joinColumns = @JoinColumn(name = "store_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "highlight_tag", length = 160)
	private List<String> highlightTags = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "store_service_tags", joinColumns = @JoinColumn(name = "store_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "service_tag", length = 120)
	private List<String> serviceTags = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "store_image_paths", joinColumns = @JoinColumn(name = "store_id"))
	@OrderColumn(name = "sort_order")
	@Column(name = "image_path", length = 500)
	private List<String> imagePaths = new ArrayList<>();

	@OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("sortOrder ASC, id ASC")
	private List<ContentSection> sections = new ArrayList<>();

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

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getContactEmail() {
		return contactEmail;
	}

	public void setContactEmail(String contactEmail) {
		this.contactEmail = contactEmail;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public Double getLatitude() {
		return latitude;
	}

	public void setLatitude(Double latitude) {
		this.latitude = latitude;
	}

	public Double getLongitude() {
		return longitude;
	}

	public void setLongitude(Double longitude) {
		this.longitude = longitude;
	}

	public String getArea() {
		return area;
	}

	public void setArea(String area) {
		this.area = area;
	}

	public String getPositionLabel() {
		return positionLabel;
	}

	public void setPositionLabel(String positionLabel) {
		this.positionLabel = positionLabel;
	}

	public String getHoursText() {
		return hoursText;
	}

	public void setHoursText(String hoursText) {
		this.hoursText = hoursText;
	}

	public LocalTime getOpenTime() {
		return openTime;
	}

	public void setOpenTime(LocalTime openTime) {
		this.openTime = openTime;
	}

	public LocalTime getCloseTime() {
		return closeTime;
	}

	public void setCloseTime(LocalTime closeTime) {
		this.closeTime = closeTime;
	}

	public String getPersonality() {
		return personality;
	}

	public void setPersonality(String personality) {
		this.personality = personality;
	}

	public String getDesignSignature() {
		return designSignature;
	}

	public void setDesignSignature(String designSignature) {
		this.designSignature = designSignature;
	}

	public String getFranchiseMood() {
		return franchiseMood;
	}

	public void setFranchiseMood(String franchiseMood) {
		this.franchiseMood = franchiseMood;
	}

	public String getSpecialty() {
		return specialty;
	}

	public void setSpecialty(String specialty) {
		this.specialty = specialty;
	}

	public String getHighlightSummary() {
		return highlightSummary;
	}

	public void setHighlightSummary(String highlightSummary) {
		this.highlightSummary = highlightSummary;
	}

	public List<String> getHighlightTags() {
		return highlightTags;
	}

	public void setHighlightTags(List<String> highlightTags) {
		this.highlightTags = highlightTags == null ? new ArrayList<>() : new ArrayList<>(highlightTags);
	}

	public List<String> getServiceTags() {
		return serviceTags;
	}

	public void setServiceTags(List<String> serviceTags) {
		this.serviceTags = serviceTags == null ? new ArrayList<>() : new ArrayList<>(serviceTags);
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
			section.attachToStore(this, sortOrder++);
			this.sections.add(section);
		}
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
