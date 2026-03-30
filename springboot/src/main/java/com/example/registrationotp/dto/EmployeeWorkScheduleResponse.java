package com.example.registrationotp.dto;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import com.example.registrationotp.model.EmployeeAttendance;
import com.example.registrationotp.model.EmployeeWorkSchedule;
import com.example.registrationotp.model.Role;

public record EmployeeWorkScheduleResponse(
		Long id,
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
		Long scheduledMinutes,
		String note,
		Long attendanceId,
		Instant checkInAt,
		Instant checkOutAt,
		Long workedMinutes,
		boolean checkedIn,
		boolean checkedOut,
		boolean currentlyWorking
) {

	public static EmployeeWorkScheduleResponse from(EmployeeWorkSchedule schedule, EmployeeAttendance attendance) {
		Instant checkInAt = attendance != null ? attendance.getCheckInAt() : null;
		Instant checkOutAt = attendance != null ? attendance.getCheckOutAt() : null;
		Long workedMinutes = null;
		if (checkInAt != null && checkOutAt != null) {
			workedMinutes = Math.max(Duration.between(checkInAt, checkOutAt).toMinutes(), 0L);
		}
		long scheduledMinutes = Math.max(Duration.between(
				schedule.getScheduledStartTime(),
				schedule.getScheduledEndTime()
		).toMinutes(), 0L);
		return new EmployeeWorkScheduleResponse(
				schedule.getId(),
				schedule.getUser().getId(),
				schedule.getUser().getFullName(),
				schedule.getUser().getEmail(),
				schedule.getEmployeeRole(),
				schedule.getStore().getId(),
				schedule.getStore().getName(),
				schedule.getStore().getAddress(),
				schedule.getWorkDate(),
				schedule.getScheduledStartTime(),
				schedule.getScheduledEndTime(),
				scheduledMinutes,
				schedule.getNote(),
				attendance != null ? attendance.getId() : null,
				checkInAt,
				checkOutAt,
				workedMinutes,
				checkInAt != null,
				checkOutAt != null,
				checkInAt != null && checkOutAt == null
		);
	}
}
