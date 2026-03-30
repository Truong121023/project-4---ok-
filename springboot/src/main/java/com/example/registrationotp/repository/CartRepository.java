package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.Cart;
import com.example.registrationotp.model.CartStatus;

public interface CartRepository extends JpaRepository<Cart, Long> {

	Optional<Cart> findByUserIdAndStatus(Long userId, CartStatus status);
}
