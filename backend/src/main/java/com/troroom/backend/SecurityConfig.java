
package com.troroom.backend;

import com.troroom.backend.security.JwtAuthenticationFilter;
import com.troroom.backend.security.PermissionAuthorizationManager;

import jakarta.servlet.http.HttpServletResponse;

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

            // Chưa đăng nhập -> 401 (để frontend tự chuyển về trang login),
            // đã đăng nhập nhưng thiếu quyền -> 403.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\":\"unauthorized\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\":\"forbidden\"}");
                })
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

                .requestMatchers("/api/tenant/contracts/**").authenticated()

                // Quyền được kiểm tra từ DB
                .requestMatchers("/api/admin/**")
                .access(permissionAuthorizationManager)

                .requestMatchers("/api/buildings/**")
                .access(permissionAuthorizationManager)

                .requestMatchers(HttpMethod.GET, "/api/rooms/my-rented")
                .hasRole("TENANT")

                .requestMatchers("/api/rooms/**")
                .access(permissionAuthorizationManager)

                .requestMatchers("/api/services/**")
                .access(permissionAuthorizationManager)

                
                .requestMatchers("/api/listings/**")
                .access(permissionAuthorizationManager)

                // S3-05: nhập chỉ số điện nước (Quản lý toà nhà, Chủ nhà)
                .requestMatchers("/api/manager/**")
                .access(permissionAuthorizationManager)

                // S3-06: hoá đơn tháng (Chủ nhà phát hành, Quản lý xem)
                .requestMatchers("/api/invoices/**")
                .access(permissionAuthorizationManager)

                // S4-03: xem công nợ theo phòng và theo toà (Chủ nhà, Quản lý)
                .requestMatchers("/api/debts/**")
                .access(permissionAuthorizationManager)

                // S4-04: trả phòng và tất toán tiền cọc (Chủ nhà, Quản lý; khách xem của mình)
                .requestMatchers("/api/checkout/**")
                .access(permissionAuthorizationManager)

                // Audit Log: chỉ ADMIN được xem
                .requestMatchers("/api/audit-logs/**")
                .hasRole("ADMIN")

                .requestMatchers("/api/profile/**")
                .authenticated()

                .requestMatchers(
                "/api/auth/me",
                "/api/auth/change-password"
                )
                .authenticated()

                // S4-01: Ảnh chứng từ dùng token tạm thời để xác thực
                .requestMatchers(
                    HttpMethod.GET,
                    "/api/payment-reports/proof/**"
                ).permitAll()

                // Các API khác phải đăng nhập
                .anyRequest().authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}