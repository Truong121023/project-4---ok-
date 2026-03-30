package com.example.registrationotp.model;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
		name = "employee_work_schedules",
		uniqueConstraints = @UniqueConstraint(
				name = "uk_employee_work_schedules_user_work_date",
				columnNames = {"user_id", "work_date"}
		)
)
public class EmployeeWorkSchedule {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "store_id", nullable = false)
	private Store store;

	@Enumerated(EnumType.STRING)
	@Column(name = "employee_role", nullable = false, length = 20)
	private Role employeeRole;

	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	@Column(name = "scheduled_start_time", nullable = false)
	private LocalTime scheduledStartTime;

	@Column(name = "scheduled_end_time", nullable = false)
	private LocalTime scheduledEndTime;

	@Column(name = "note", length = 1000)
	private String note;

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

	public Store getStore() {
		return store;
	}

	public void setStore(Store store) {
		this.store = store;
	}

	public Role getEmployeeRole() {
		return employeeRole;
	}

	public void setEmployeeRole(Role employeeRole) {
		this.employeeRole = employeeRole;
	}

	public LocalDate getWorkDate() {
		return workDate;
	}

	public void setWorkDate(LocalDate workDate) {
		this.workDate = workDate;
	}

	public LocalTime getScheduledStartTime() {
		return scheduledStartTime;
	}

	public void setScheduledStartTime(LocalTime scheduledStartTime) {
		this.scheduledStartTime = scheduledStartTime;
	}

	public LocalTime getScheduledEndTime() {
		return scheduledEndTime;
	}

	public void setScheduledEndTime(LocalTime scheduledEndTime) {
		this.scheduledEndTime = scheduledEndTime;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
