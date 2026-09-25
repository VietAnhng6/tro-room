package com.troroom.backend.repository;

import com.troroom.backend.entity.RolePermission;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepository
        extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRole(User.Role role);
}