package com.example.registrationotp.dto;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import com.example.registrationotp.model.EmployeeAttendance;
import com.example.registrationotp.model.EmployeeWorkSchedule;
import com.example.registrationotp.model.Role;

public record EmployeeAttendanceResponse(
		Long id,
		Long workScheduleId,
		Long userId,
		String fullName,
		String email,
		Role role,
		Long storeId,
		String storeName,
		String storeAddress,
		LocalDate workDate,
		LocalTime scheduledStartTime,
		LocalTime scheduledEndTime,
		String scheduleNote,
		Instant checkInAt,
		Instant checkOutAt,
		Long workedMinutes,
		boolean checkedIn,
		boolean checkedOut,
		boolean currentlyWorking
) {

	public static EmployeeAttendanceResponse from(EmployeeAttendance attendance) {
		EmployeeWorkSchedule workSchedule = attendance.getWorkSchedule();
		Instant checkInAt = attendance.getCheckInAt();
		Instant checkOutAt = attendance.getCheckOutAt();
		Long workedMinutes = null;
		if (checkInAt != null && checkOutAt != null) {
			workedMinutes = Math.max(Duration.between(checkInAt, checkOutAt).toMinutes(), 0L);
		}
		return new EmployeeAttendanceResponse(
				attendance.getId(),
				workSchedule != null ? workSchedule.getId() : null,
				attendance.getUser().getId(),
				attendance.getUser().getFullName(),
				attendance.getUser().getEmail(),
				attendance.getEmployeeRole(),
				attendance.getStore().getId(),
				attendance.getStore().getName(),
				attendance.getStore().getAddress(),
				attendance.getWorkDate(),
				workSchedule != null ? workSchedule.getScheduledStartTime() : null,
				workSchedule != null ? workSchedule.getScheduledEndTime() : null,
				workSchedule != null ? workSchedule.getNote() : null,
				checkInAt,
				checkOutAt,
				workedMinutes,
				checkInAt != null,
				checkOutAt != null,
				checkInAt != null && checkOutAt == null
		);
	}
}
