package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.UserNotification;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

	Page<UserNotification> findAllByUserId(Long userId, Pageable pageable);

	Page<UserNotification> findAllByUserIdAndReadAtIsNull(Long userId, Pageable pageable);

	Page<UserNotification> findAllByUserIdAndReadAtIsNotNull(Long userId, Pageable pageable);

	Optional<UserNotification> findByIdAndUserId(Long id, Long userId);

	List<UserNotification> findAllByUserIdAndReadAtIsNull(Long userId);

	long countByUserIdAndReadAtIsNull(Long userId);

	void deleteAllByUserId(Long userId);
}
