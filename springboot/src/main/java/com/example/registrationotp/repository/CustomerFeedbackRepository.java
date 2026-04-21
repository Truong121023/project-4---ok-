package com.example.registrationotp.repository;

import java.util.Collection;
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

	List<CustomerFeedback> findAllByUserIdAndRelatedOrderIdIn(Long userId, Collection<Long> relatedOrderIds);

	Optional<CustomerFeedback> findByIdAndUserId(Long id, Long userId);

	Optional<CustomerFeedback> findByRelatedOrderIdAndUserId(Long relatedOrderId, Long userId);

	List<CustomerFeedback> findAllByRelatedStoreId(Long relatedStoreId);
}
