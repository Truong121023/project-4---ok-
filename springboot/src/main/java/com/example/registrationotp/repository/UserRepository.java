package com.example.registrationotp.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

	Optional<User> findByEmail(String email);

	List<User> findAllByRoleAndEnabledTrue(Role role);

	List<User> findAllByRoleInAndEnabledTrue(Collection<Role> roles);

	List<User> findAllByWorkingStoreIdAndRoleInAndEnabledTrue(Long workingStoreId, Collection<Role> roles);

	boolean existsByWorkingStoreId(Long workingStoreId);
}
