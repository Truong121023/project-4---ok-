package com.example.registrationotp.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.EmployeeWorkSchedule;

public interface EmployeeWorkScheduleRepository extends JpaRepository<EmployeeWorkSchedule, Long>, JpaSpecificationExecutor<EmployeeWorkSchedule> {

	Optional<EmployeeWorkSchedule> findByUserIdAndWorkDate(Long userId, LocalDate workDate);

	List<EmployeeWorkSchedule> findAllByUserIdAndWorkDateBetween(Long userId, LocalDate fromDate, LocalDate toDate);

	List<EmployeeWorkSchedule> findAllByStoreIdAndWorkDateBetween(Long storeId, LocalDate fromDate, LocalDate toDate);

	void deleteAllByStoreIdAndWorkDateBetween(Long storeId, LocalDate fromDate, LocalDate toDate);
}
