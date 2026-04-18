package com.example.registrationotp.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.registrationotp.model.Order;
import com.example.registrationotp.model.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

	Page<Order> findAllByUserId(Long userId, Pageable pageable);

	List<Order> findAllByUserId(Long userId);

	Optional<Order> findByIdAndUserId(Long id, Long userId);

	Optional<Order> findByPayosOrderCode(Long payosOrderCode);

	List<Order> findAllByPayosOrderCode(Long payosOrderCode);

	Optional<Order> findByInvoiceQrToken(String invoiceQrToken);

	long countByDeliveringShipperIdAndStatusIn(Long deliveringShipperId, Collection<OrderStatus> statuses);

	@Query("""
			select coalesce(sum(o.totalAmount), 0)
			from Order o
			where o.paymentStatus = com.example.registrationotp.model.PaymentStatus.PAID
			  and o.paidAt >= :start
			  and o.paidAt < :end
			""")
	BigDecimal sumPaidTotalAmountBetween(
			@Param("start") Instant start,
			@Param("end") Instant end
	);

	@Query("""
			select coalesce(sum(o.totalAmount), 0)
			from Order o
			where o.paymentStatus = com.example.registrationotp.model.PaymentStatus.PAID
			  and o.paidAt >= :start
			  and o.paidAt < :end
			  and exists (
			  	select 1
			  	from OrderItem oi
			  	where oi.order = o
			  	  and oi.store.id = :storeId
			  )
			""")
	BigDecimal sumPaidTotalAmountByStoreIdBetween(
			@Param("storeId") Long storeId,
			@Param("start") Instant start,
			@Param("end") Instant end
	);

	@Query("""
			select coalesce(sum(o.totalAmount), 0)
			from Order o
			where o.user.id = :userId
			  and o.paymentStatus = com.example.registrationotp.model.PaymentStatus.PAID
			""")
	BigDecimal sumPaidTotalAmountByUserId(
			@Param("userId") Long userId
	);

	@Query("""
			select coalesce(sum(o.totalAmount), 0)
			from Order o
			where o.user.id = :userId
			  and o.paymentStatus = com.example.registrationotp.model.PaymentStatus.PAID
			  and o.paidAt >= :start
			  and o.paidAt < :end
			  and exists (
			  	select 1
			  	from OrderItem oi
			  	where oi.order = o
			  	  and oi.store.id = :storeId
			  )
			""")
	BigDecimal sumPaidTotalAmountByUserIdAndStoreIdBetween(
			@Param("userId") Long userId,
			@Param("storeId") Long storeId,
			@Param("start") Instant start,
			@Param("end") Instant end
	);
}
