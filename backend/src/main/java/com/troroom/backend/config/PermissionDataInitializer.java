package com.troroom.backend.config;

import com.troroom.backend.entity.RolePermission;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RolePermissionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PermissionDataInitializer {

    @Bean
    CommandLineRunner initPermissions(
            RolePermissionRepository repository) {

        return args -> {

            // ADMIN
            addIfNotExists(
                    repository,
                    User.Role.ADMIN,
                    "ADMIN_ACCESS"
            );

            // LANDLORD
            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "BUILDING_MANAGE"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "ROOM_MANAGE"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "SERVICE_MANAGE"
            );
                        addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "LISTING_MANAGE"
            );

            // MANAGER
            addIfNotExists(
                    repository,
                    User.Role.MANAGER,
                    "ROOM_MANAGE"
            );

            // TENANT
            addIfNotExists(
                    repository,
                    User.Role.TENANT,
                    "PROFILE_VIEW"
            );
        };
    }

    private void addIfNotExists(
            RolePermissionRepository repository,
            User.Role role,
            String permission) {

        boolean exists = repository
                .findByRole(role)
                .stream()
                .anyMatch(p ->
                        p.getPermission().equals(permission));

        if (!exists) {
            repository.save(
                    new RolePermission(role, permission)
            );
        }
    }
}