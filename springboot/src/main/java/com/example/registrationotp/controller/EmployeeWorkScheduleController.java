package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.EmployeeWorkScheduleMonthResponse;
import com.example.registrationotp.dto.EmployeeWorkScheduleResponse;
import com.example.registrationotp.service.AttendanceService;

@RestController
@RequestMapping("/api/employee/work-schedules")
public class EmployeeWorkScheduleController {

	private final AttendanceService attendanceService;

	public EmployeeWorkScheduleController(AttendanceService attendanceService) {
		this.attendanceService = attendanceService;
	}

	@GetMapping("/today")
	public ResponseEntity<EmployeeWorkScheduleResponse> getTodayWorkSchedule(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(attendanceService.getTodayWorkSchedule(authorizationHeader));
	}

	@GetMapping("/monthly")
	public ResponseEntity<EmployeeWorkScheduleMonthResponse> listMyMonthlyWorkSchedules(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) String month
	) {
		return ResponseEntity.ok(attendanceService.listMyMonthlyWorkSchedules(authorizationHeader, month));
	}
}
