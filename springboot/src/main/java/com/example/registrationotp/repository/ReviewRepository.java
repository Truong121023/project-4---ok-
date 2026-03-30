package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.Review;
import com.example.registrationotp.model.ReviewTargetType;

public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

	void deleteAllByUserId(Long userId);

	void deleteAllByTargetTypeAndTargetId(ReviewTargetType targetType, Long targetId);

	Page<Review> findAllByUserId(Long userId, Pageable pageable);

	Optional<Review> findByIdAndUserId(Long id, Long userId);

	Optional<Review> findByUserIdAndTargetTypeAndTargetId(Long userId, ReviewTargetType targetType, Long targetId);
}
