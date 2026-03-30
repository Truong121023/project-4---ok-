package com.example.registrationotp.model;

import java.time.Instant;
import java.time.LocalDate;

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
		name = "employee_attendances",
		uniqueConstraints = @UniqueConstraint(
				name = "uk_employee_attendances_user_work_date",
				columnNames = {"user_id", "work_date"}
		)
)
public class EmployeeAttendance {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	@JoinColumn(name = "store_id", nullable = false)
	private Store store;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "work_schedule_id")
	private EmployeeWorkSchedule workSchedule;

	@Enumerated(EnumType.STRING)
	@Column(name = "employee_role", nullable = false, length = 20)
	private Role employeeRole;

	@Column(name = "work_date", nullable = false)
	private LocalDate workDate;

	@Column(name = "check_in_at", nullable = false)
	private Instant checkInAt;

	@Column(name = "check_out_at")
	private Instant checkOutAt;

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

	public EmployeeWorkSchedule getWorkSchedule() {
		return workSchedule;
	}

	public void setWorkSchedule(EmployeeWorkSchedule workSchedule) {
		this.workSchedule = workSchedule;
	}

	public LocalDate getWorkDate() {
		return workDate;
	}

	public void setWorkDate(LocalDate workDate) {
		this.workDate = workDate;
	}

	public Instant getCheckInAt() {
		return checkInAt;
	}

	public void setCheckInAt(Instant checkInAt) {
		this.checkInAt = checkInAt;
	}

	public Instant getCheckOutAt() {
		return checkOutAt;
	}

	public void setCheckOutAt(Instant checkOutAt) {
		this.checkOutAt = checkOutAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
