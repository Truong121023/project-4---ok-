package com.example.registrationotp.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.EmployeeAttendanceResponse;
import com.example.registrationotp.dto.EmployeeAttendanceSummaryResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.service.AttendanceService;

@RestController
@RequestMapping("/api/admin/attendances")
public class AdminAttendanceController {

	private final AttendanceService attendanceService;

	public AdminAttendanceController(AttendanceService attendanceService) {
		this.attendanceService = attendanceService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<EmployeeAttendanceResponse>> listAttendances(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId,
			@RequestParam(required = false) Long userId,
			@RequestParam(required = false) Role role,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate,
			@RequestParam(required = false) Boolean checkedOut,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(attendanceService.listAttendances(
				authorizationHeader,
				storeId,
				userId,
				role,
				workDate,
				checkedOut,
				search,
				page,
				size
		));
	}

	@GetMapping("/summary")
	public ResponseEntity<EmployeeAttendanceSummaryResponse> getAttendanceSummary(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Long storeId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate
	) {
		return ResponseEntity.ok(attendanceService.getAttendanceSummary(authorizationHeader, storeId, workDate));
	}
}
