package com.troroom.backend.repository;

import com.troroom.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhone(String phone);

    Optional<User> findByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);

    Page<User> findByRole(User.Role role, Pageable pageable);

    Page<User> findByActive(boolean active, Pageable pageable);

    Page<User> findByRoleAndActive(
            User.Role role,
            boolean active,
            Pageable pageable
    );
    Page<User> findByRoleIn(
        java.util.Collection<User.Role> roles,
        Pageable pageable
    );
}