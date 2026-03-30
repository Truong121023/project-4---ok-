package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.UserSession;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

	Optional<UserSession> findByToken(String token);

	void deleteAllByUserId(Long userId);
}
