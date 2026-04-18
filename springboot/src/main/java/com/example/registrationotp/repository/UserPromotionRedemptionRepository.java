package com.example.registrationotp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.UserPromotionRedemption;

public interface UserPromotionRedemptionRepository extends JpaRepository<UserPromotionRedemption, Long> {

	List<UserPromotionRedemption> findAllByUserIdAndUsedAtIsNull(Long userId);

	Optional<UserPromotionRedemption> findFirstByUserIdAndPromotionIdAndUsedAtIsNullOrderByRedeemedAtAsc(
			Long userId,
			Long promotionId
	);

	List<UserPromotionRedemption> findAllByUsedOrderId(Long orderId);

	long countByUserIdAndPromotionIdAndUsedAtIsNull(Long userId, Long promotionId);
}
