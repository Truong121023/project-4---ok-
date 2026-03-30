package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.Store;

public interface StoreRepository extends JpaRepository<Store, Long>, JpaSpecificationExecutor<Store> {

	Optional<Store> findBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
