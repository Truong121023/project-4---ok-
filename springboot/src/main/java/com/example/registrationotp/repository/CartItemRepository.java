package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.CartItem;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

	List<CartItem> findAllByCartId(Long cartId);

	List<CartItem> findAllByDishId(Long dishId);

	long countByDishId(Long dishId);

	Optional<CartItem> findByIdAndCartId(Long id, Long cartId);

	Optional<CartItem> findByCartIdAndStoreIdAndDishId(Long cartId, Long storeId, Long dishId);

	void deleteAllByCartId(Long cartId);

	void deleteAllByStoreId(Long storeId);

	void deleteAllByDishId(Long dishId);
}
