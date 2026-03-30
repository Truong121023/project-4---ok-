package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.UserLevelDefinition;

public interface UserLevelDefinitionRepository extends JpaRepository<UserLevelDefinition, Long> {

	boolean existsByStoreIdAndCodeIgnoreCase(Long storeId, String code);

	boolean existsByStoreIdAndCodeIgnoreCaseAndIdNot(Long storeId, String code, Long id);

	List<UserLevelDefinition> findAllByStoreIdOrderByMinPaidAmountAsc(Long storeId);

	List<UserLevelDefinition> findAllByStoreIdAndActiveTrueOrderByMinPaidAmountAsc(Long storeId);

	List<UserLevelDefinition> findAllByActiveTrueOrderByStoreIdAscMinPaidAmountAsc();

	Optional<UserLevelDefinition> findByIdAndActiveTrue(Long id);
}
