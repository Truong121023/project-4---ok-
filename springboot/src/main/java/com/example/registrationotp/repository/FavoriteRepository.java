package com.example.registrationotp.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.registrationotp.model.Favorite;
import com.example.registrationotp.model.FavoriteTargetType;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

	List<Favorite> findAllByUserId(Long userId);

	List<Favorite> findAllByTargetTypeAndTargetIdIn(FavoriteTargetType targetType, Collection<Long> targetIds);

	long countByTargetTypeAndTargetId(FavoriteTargetType targetType, Long targetId);

	Optional<Favorite> findByUserIdAndTargetTypeAndTargetId(Long userId, FavoriteTargetType targetType, Long targetId);

	void deleteAllByUserId(Long userId);

	void deleteAllByTargetTypeAndTargetId(FavoriteTargetType targetType, Long targetId);

	void deleteByUserIdAndTargetTypeAndTargetId(Long userId, FavoriteTargetType targetType, Long targetId);
}
