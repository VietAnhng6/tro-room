package com.troroom.backend.security;

import com.troroom.backend.entity.User;
import com.troroom.backend.service.PermissionService;

import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

import org.springframework.security.core.Authentication;

@Component
public class PermissionAuthorizationManager
        implements AuthorizationManager<RequestAuthorizationContext> {

    private final PermissionService permissionService;

    public PermissionAuthorizationManager(
            PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Override
    public AuthorizationResult authorize(
            Supplier<? extends Authentication> authentication,
            RequestAuthorizationContext context) {

        Authentication auth = authentication.get();

        if (auth == null || !auth.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        if (!(auth.getPrincipal() instanceof User user)) {
            return new AuthorizationDecision(false);
        }

        String permission = getPermission(
                context.getRequest().getRequestURI()
        );

        if (permission == null) {
            return new AuthorizationDecision(true);
        }

       boolean allowed =
        permissionService.hasPermission(
                user.getRole(),
                permission
        );

    System.out.println(
        "AUTH DEBUG -> URI: "
        + context.getRequest().getRequestURI()
        + " | METHOD: "
        + context.getRequest().getMethod()
        + " | ROLE: "
        + user.getRole()
        + " | PERMISSION: "
        + permission
        + " | ALLOWED: "
        + allowed
    );

    return new AuthorizationDecision(allowed);
    }

    private String getPermission(String uri) {

        if (uri.startsWith("/api/admin/")) {
            return "ADMIN_ACCESS";
        }

        if (uri.startsWith("/api/buildings")) {
            return "BUILDING_MANAGE";
        }

        if (uri.startsWith("/api/rooms")) {
            return "ROOM_MANAGE";
        }

        if (uri.startsWith("/api/services")) {
            return "SERVICE_MANAGE";
        }
        
                if (uri.startsWith("/api/listings")) {
            return "LISTING_MANAGE";
        }

        if (uri.startsWith("/api/manager/")) {
            return "METER_MANAGE";
        }

        if (uri.startsWith("/api/invoices")) {
            return "INVOICE_MANAGE";
        }

        if (uri.startsWith("/api/profile")) {
            return "PROFILE_VIEW";
        }

        return null;
    }
}