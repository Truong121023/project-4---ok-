package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.EmailOtp;
import com.example.registrationotp.model.OtpPurpose;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

	Optional<EmailOtp> findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(Long userId);

	Optional<EmailOtp> findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(Long userId, OtpPurpose purpose);

	void deleteAllByUserId(Long userId);

	void deleteAllByUserIdAndPurpose(Long userId, OtpPurpose purpose);
}
