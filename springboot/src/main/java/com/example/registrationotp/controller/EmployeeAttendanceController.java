package com.example.registrationotp.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.EmployeeAttendanceResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.service.AttendanceService;

@RestController
@RequestMapping("/api/employee/attendance")
public class EmployeeAttendanceController {

	private final AttendanceService attendanceService;

	public EmployeeAttendanceController(AttendanceService attendanceService) {
		this.attendanceService = attendanceService;
	}

	@GetMapping("/today")
	public ResponseEntity<EmployeeAttendanceResponse> getTodayAttendance(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(attendanceService.getTodayAttendance(authorizationHeader));
	}

	@PostMapping("/check-in")
	public ResponseEntity<EmployeeAttendanceResponse> checkIn(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(attendanceService.checkIn(authorizationHeader));
	}

	@PostMapping("/check-out")
	public ResponseEntity<EmployeeAttendanceResponse> checkOut(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(attendanceService.checkOut(authorizationHeader));
	}

	@GetMapping("/history")
	public ResponseEntity<PageResponse<EmployeeAttendanceResponse>> listMyAttendanceHistory(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(attendanceService.listMyAttendanceHistory(
				authorizationHeader,
				fromDate,
				toDate,
				page,
				size
		));
	}
}
