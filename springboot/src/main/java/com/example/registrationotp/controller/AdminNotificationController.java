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
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

	private final NotificationService notificationService;

	public AdminNotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@GetMapping
	public ResponseEntity<PageResponse<UserNotificationResponse>> listNotifications(
			@RequestHeader("Authorization") String authorizationHeader,
			@RequestParam(required = false) Boolean read,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size
	) {
		return ResponseEntity.ok(notificationService.listAdminNotifications(authorizationHeader, read, page, size));
	}

	@GetMapping("/unread-count")
	public ResponseEntity<UserNotificationUnreadCountResponse> getUnreadCount(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(notificationService.getAdminUnreadCount(authorizationHeader));
	}

	@PutMapping("/{id}/read")
	public ResponseEntity<UserNotificationResponse> markAsRead(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(notificationService.markAdminAsRead(authorizationHeader, id));
	}

	@PutMapping("/{id}/unread")
	public ResponseEntity<UserNotificationResponse> markAsUnread(
			@RequestHeader("Authorization") String authorizationHeader,
			@PathVariable Long id
	) {
		return ResponseEntity.ok(notificationService.markAdminAsUnread(authorizationHeader, id));
	}

	@PutMapping("/read-all")
	public ResponseEntity<MessageResponse> markAllAsRead(
			@RequestHeader("Authorization") String authorizationHeader
	) {
		return ResponseEntity.ok(notificationService.markAllAdminNotificationsAsRead(authorizationHeader));
	}
}
