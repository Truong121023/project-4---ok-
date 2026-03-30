package com.example.registrationotp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.OrderScanAudit;

public interface OrderScanAuditRepository extends JpaRepository<OrderScanAudit, Long> {

	List<OrderScanAudit> findAllByOrderIdOrderByScannedAtDesc(Long orderId);
}
