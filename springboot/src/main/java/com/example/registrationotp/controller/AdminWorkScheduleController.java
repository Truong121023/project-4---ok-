package com.example.registrationotp.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.EmployeeWorkScheduleMonthResponse;
import com.example.registrationotp.dto.EmployeeWorkScheduleMonthlyUpsertRequest;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.service.AttendanceService;

@RestController
@RequestMapping("/api/admin/work-schedules")
public class AdminWorkScheduleController {

	private final AttendanceService attendanceService;

	public AdminWorkScheduleController(AttendanceService attendanceService) {
		this.attendanceService = attendanceService;
	}

	@PutMapping("/monthly")
	public ResponseEntity<EmployeeWorkScheduleMonthResponse> upsertMonthlyWorkSchedules(
			@RequestHeader("Authorization") String authorizationHeader,
			@Valid @RequestBody EmployeeWorkScheduleMonthlyUpsertRequest request
	) {
		return ResponseEntity.ok(attendanceService.upsertMonthlyWorkSchedules(authorizationHeader, request));
	}

	@GetMapping("/monthly")
	public ResponseEntity<EmployeeWorkScheduleMonthResponse> listMonthlyWorkSchedules(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId,
			@RequestParam(required = false) String month,
			@RequestParam(required = false) Long userId,
			@RequestParam(required = false) Role role,
			@RequestParam(required = false) String search
	) {
		return ResponseEntity.ok(attendanceService.listMonthlyWorkSchedules(
				authorizationHeader,
				storeId,
				month,
				userId,
				role,
				search
		));
	}
}
