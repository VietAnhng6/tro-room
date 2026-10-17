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
            addIfNotExists(repository, User.Role.ADMIN, "BUILDING_VIEW");
            addIfNotExists(repository, User.Role.ADMIN, "ROOM_VIEW");
            addIfNotExists(repository, User.Role.ADMIN, "INVOICE_VIEW");
            addIfNotExists(repository, User.Role.ADMIN, "CONTRACT_VIEW");
            addIfNotExists(repository, User.Role.ADMIN, "SERVICE_VIEW");
            addIfNotExists(repository, User.Role.ADMIN, "METER_VIEW");

            // LANDLORD
            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "BUILDING_MANAGE"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "BUILDING_VIEW"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "ROOM_MANAGE"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "ROOM_VIEW"
            );

            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "SERVICE_MANAGE"
            );
            addIfNotExists(repository, User.Role.LANDLORD, "SERVICE_VIEW");
                        addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "LISTING_MANAGE"
            );

            // S3-05: nhập chỉ số điện nước
            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "METER_MANAGE"
            );
            addIfNotExists(repository, User.Role.LANDLORD, "METER_VIEW");

            // S3-06: phát hành và xem hoá đơn tháng
            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "INVOICE_MANAGE"
            );
            addIfNotExists(repository, User.Role.LANDLORD, "INVOICE_VIEW");

            // S4-04: trả phòng và tất toán tiền cọc
            addIfNotExists(
                    repository,
                    User.Role.LANDLORD,
                    "CONTRACT_MANAGE"
            );
            addIfNotExists(repository, User.Role.LANDLORD, "CONTRACT_VIEW");

            // MANAGER
            addIfNotExists(
                    repository,
                    User.Role.MANAGER,
                    "BUILDING_VIEW"
            );

            // Manager chỉ được xem phòng; loại bỏ quyền ghi đã seed ở bản cũ.
            repository.findByRole(User.Role.MANAGER).stream()
                    .filter(p -> "ROOM_MANAGE".equals(p.getPermission()))
                    .forEach(repository::delete);

            addIfNotExists(
                    repository,
                    User.Role.MANAGER,
                    "ROOM_VIEW"
            );

            addIfNotExists(
                    repository,
                    User.Role.MANAGER,
                    "METER_MANAGE"
            );
            addIfNotExists(repository, User.Role.MANAGER, "METER_VIEW");
            addIfNotExists(repository, User.Role.MANAGER, "SERVICE_VIEW");

            // Manager chỉ xem hóa đơn; xóa quyền ghi từ dữ liệu đã seed trước đây.
            repository.findByRole(User.Role.MANAGER).stream()
                    .filter(p -> "INVOICE_MANAGE".equals(p.getPermission()))
                    .forEach(repository::delete);
            addIfNotExists(repository, User.Role.MANAGER, "INVOICE_VIEW");

            // Manager chỉ xem hợp đồng và bản xem trước tất toán.
            repository.findByRole(User.Role.MANAGER).stream()
                    .filter(p -> "CONTRACT_MANAGE".equals(p.getPermission()))
                    .forEach(repository::delete);
            addIfNotExists(repository, User.Role.MANAGER, "CONTRACT_VIEW");

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
