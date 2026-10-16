package com.troroom.backend.repository;

import com.troroom.backend.entity.MaintenanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MaintenanceReportRepository extends JpaRepository<MaintenanceReport, Long> {
    List<MaintenanceReport> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<MaintenanceReport> findByIdAndTenantId(Long id, Long tenantId);
    boolean existsByReportCode(String reportCode);
}
