package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.CustomerFeedback;

public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long>, JpaSpecificationExecutor<CustomerFeedback> {

	void deleteAllByUserId(Long userId);

	Page<CustomerFeedback> findAllByUserId(Long userId, Pageable pageable);

	Optional<CustomerFeedback> findByIdAndUserId(Long id, Long userId);

	List<CustomerFeedback> findAllByRelatedStoreId(Long relatedStoreId);
}
