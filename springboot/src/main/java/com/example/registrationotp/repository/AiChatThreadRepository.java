package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.AiChatThread;

public interface AiChatThreadRepository extends JpaRepository<AiChatThread, Long> {

	Page<AiChatThread> findAllByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);

	Optional<AiChatThread> findByIdAndUserId(Long id, Long userId);
}
