package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.Promotion;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

	Optional<Promotion> findByCodeIgnoreCase(String code);

	boolean existsByCodeIgnoreCase(String code);

	boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
