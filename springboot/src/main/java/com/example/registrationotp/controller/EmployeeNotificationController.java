package com.example.registrationotp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PageResponse;
import com.example.registrationotp.dto.UserNotificationResponse;
import com.example.registrationotp.dto.UserNotificationUnreadCountResponse;
import com.example.registrationotp.service.NotificationService;

@RestController
@RequestMapping("/api/employee/notifications")
public class EmployeeNotificationController {

	private final NotificationService notificationService;

	public EmployeeNotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<UserNotificationResponse>> listMyNotifications(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Boolean read,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(notificationService.listMyEmployeeNotifications(authorizationHeader, read, page, size));
	}

	@GetMapping("/unread-count")
	public ResponseEntity<UserNotificationUnreadCountResponse> getUnreadCount(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(notificationService.getEmployeeUnreadCount(authorizationHeader));
	}

	@PutMapping("/{id}/read")
	public ResponseEntity<UserNotificationResponse> markAsRead(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(notificationService.markEmployeeAsRead(authorizationHeader, id));
	}

	@PutMapping("/{id}/unread")
	public ResponseEntity<UserNotificationResponse> markAsUnread(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(notificationService.markEmployeeAsUnread(authorizationHeader, id));
	}

	@PutMapping("/read-all")
	public ResponseEntity<MessageResponse> markAllAsRead(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(notificationService.markAllEmployeeNotificationsAsRead(authorizationHeader));
	}
}
