package com.example.registrationotp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.AiChatMessage;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {

	List<AiChatMessage> findAllByThreadIdOrderByCreatedAtAscIdAsc(Long threadId);

	void deleteAllByThreadId(Long threadId);
}
