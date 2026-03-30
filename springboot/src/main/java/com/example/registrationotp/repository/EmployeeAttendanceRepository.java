package com.example.registrationotp.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.EmployeeAttendance;

public interface EmployeeAttendanceRepository extends JpaRepository<EmployeeAttendance, Long>, JpaSpecificationExecutor<EmployeeAttendance> {

	Optional<EmployeeAttendance> findByUserIdAndWorkDate(Long userId, LocalDate workDate);

	Optional<EmployeeAttendance> findTopByUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(Long userId);

	List<EmployeeAttendance> findAllByUserIdAndWorkDateBetween(Long userId, LocalDate fromDate, LocalDate toDate);

	List<EmployeeAttendance> findAllByStoreIdAndWorkDateBetween(Long storeId, LocalDate fromDate, LocalDate toDate);
}
