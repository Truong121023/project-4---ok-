package com.example.registrationotp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

	List<OrderItem> findAllByOrderId(Long orderId);

	List<OrderItem> findAllByOrderIdAndStoreId(Long orderId, Long storeId);

	List<OrderItem> findAllByDishId(Long dishId);

	long countByStoreId(Long storeId);

	long countByDishId(Long dishId);

	boolean existsByOrderIdAndStoreId(Long orderId, Long storeId);

	boolean existsByOrderUserIdAndStoreId(Long userId, Long storeId);

	boolean existsByOrderUserIdAndDishId(Long userId, Long dishId);

	boolean existsByOrderUserIdAndDishCategoryId(Long userId, Long categoryId);

	void deleteAllByOrderId(Long orderId);
}
