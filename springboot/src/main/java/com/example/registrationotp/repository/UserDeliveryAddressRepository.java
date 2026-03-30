package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.UserDeliveryAddress;

public interface UserDeliveryAddressRepository extends JpaRepository<UserDeliveryAddress, Long> {

	List<UserDeliveryAddress> findAllByUserIdOrderByUpdatedAtDesc(Long userId);

	Optional<UserDeliveryAddress> findByIdAndUserId(Long id, Long userId);

	boolean existsByUserIdAndPrimaryAddressTrue(Long userId);

	void deleteAllByUserId(Long userId);
}
