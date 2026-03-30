package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.EventItem;

public interface EventItemRepository extends JpaRepository<EventItem, Long>, JpaSpecificationExecutor<EventItem> {

	List<EventItem> findAllByStoreId(Long storeId);

	Optional<EventItem> findBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
