package com.example.registrationotp.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.example.registrationotp.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

	interface TopSellingDishProjection {
		Long getStoreId();

		String getStoreName();

		Long getDishId();

		String getDishName();

		Long getQuantitySold();

		Long getOrderCount();

		BigDecimal getRevenue();
	}

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

	@Query(value = """
			select
				oi.store_id as storeId,
				s.name as storeName,
				oi.dish_id as dishId,
				d.name as dishName,
				sum(oi.quantity) as quantitySold,
				count(distinct oi.order_id) as orderCount,
				coalesce(sum(oi.unit_price * oi.quantity), 0) as revenue
			from order_items oi
			join orders o on o.id = oi.order_id
			join stores s on s.id = oi.store_id
			join dishes d on d.id = oi.dish_id
			where o.payment_status = 'PAID'
			  and o.status <> 'CANCELLED'
			group by oi.store_id, s.name, oi.dish_id, d.name
			order by quantitySold desc, revenue desc, d.name asc
			""", nativeQuery = true)
	List<TopSellingDishProjection> findTopSellingDishStats(Pageable pageable);

	@Query(value = """
			select
				oi.store_id as storeId,
				s.name as storeName,
				oi.dish_id as dishId,
				d.name as dishName,
				sum(oi.quantity) as quantitySold,
				count(distinct oi.order_id) as orderCount,
				coalesce(sum(oi.unit_price * oi.quantity), 0) as revenue
			from order_items oi
			join orders o on o.id = oi.order_id
			join stores s on s.id = oi.store_id
			join dishes d on d.id = oi.dish_id
			where o.payment_status = 'PAID'
			  and o.status <> 'CANCELLED'
			  and oi.store_id = :storeId
			group by oi.store_id, s.name, oi.dish_id, d.name
			order by quantitySold desc, revenue desc, d.name asc
			""", nativeQuery = true)
	List<TopSellingDishProjection> findTopSellingDishStatsByStoreId(@Param("storeId") Long storeId, Pageable pageable);
}
