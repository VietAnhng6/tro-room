package com.troroom.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "role_permissions",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = {"role", "permission"}
        )
    }
)
public class RolePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private User.Role role;

    @Column(nullable = false)
    private String permission;

    public RolePermission() {
    }

    public RolePermission(User.Role role, String permission) {
        this.role = role;
        this.permission = permission;
    }

    public Long getId() {
        return id;
    }

    public User.Role getRole() {
        return role;
    }

    public void setRole(User.Role role) {
        this.role = role;
    }

    public String getPermission() {
        return permission;
    }

    public void setPermission(String permission) {
        this.permission = permission;
    }
}