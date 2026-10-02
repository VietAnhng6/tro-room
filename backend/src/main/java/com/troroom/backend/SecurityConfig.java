
package com.troroom.backend;

import com.troroom.backend.security.JwtAuthenticationFilter;
import com.troroom.backend.security.PermissionAuthorizationManager;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PermissionAuthorizationManager permissionAuthorizationManager;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            PermissionAuthorizationManager permissionAuthorizationManager) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.permissionAuthorizationManager =
                permissionAuthorizationManager;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            .authorizeHttpRequests(auth -> auth

                .requestMatchers(
                    "/api/auth/register",
                    "/api/auth/login",
                    "/api/auth/refresh",
                    "/api/auth/logout",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password/**",
                    "/api/auth/verify-email",
                    "/error"
                ).permitAll()

                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/public/listings/*/requests").authenticated()

                .requestMatchers(HttpMethod.GET, "/api/room-images/*").permitAll()

                // Quyền được kiểm tra từ DB
                .requestMatchers("/api/admin/**")
                .access(permissionAuthorizationManager)

                .requestMatchers("/api/buildings/**")
                .access(permissionAuthorizationManager)

                .requestMatchers("/api/rooms/**")
                .access(permissionAuthorizationManager)

                .requestMatchers("/api/services/**")
                .access(permissionAuthorizationManager)

                
                .requestMatchers("/api/listings/**")
                .access(permissionAuthorizationManager)

                // Audit Log: chỉ ADMIN được xem
                .requestMatchers("/api/audit-logs/**")
                .hasRole("ADMIN")

                .requestMatchers("/api/profile/**")
                .authenticated()

                .requestMatchers("/api/auth/me")
                .authenticated()

                // Các API khác phải đăng nhập
                .anyRequest()
                .authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}