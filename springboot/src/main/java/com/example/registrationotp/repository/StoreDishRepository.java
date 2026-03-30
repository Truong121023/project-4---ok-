package com.example.registrationotp.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.StoreDish;

public interface StoreDishRepository extends JpaRepository<StoreDish, Long>, JpaSpecificationExecutor<StoreDish> {

	List<StoreDish> findAllByStoreId(Long storeId);

	List<StoreDish> findAllByDishId(Long dishId);

	List<StoreDish> findAllByStoreIdAndDishIdIn(Long storeId, Collection<Long> dishIds);

	Optional<StoreDish> findByStoreIdAndDishId(Long storeId, Long dishId);

	void deleteAllByStoreId(Long storeId);

	void deleteAllByDishId(Long dishId);
}
