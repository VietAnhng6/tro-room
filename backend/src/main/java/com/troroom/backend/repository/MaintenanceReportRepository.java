
package com.troroom.backend.repository;

import com.troroom.backend.entity.MaintenanceReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MaintenanceReportRepository extends JpaRepository<MaintenanceReport, Long> {

    // S4-06: Các truy vấn dành cho khách thuê
    List<MaintenanceReport> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    Optional<MaintenanceReport> findByIdAndTenantId(Long id, Long tenantId);

    boolean existsByReportCode(String reportCode);

    // S4-07: Danh sách báo hỏng thuộc các tòa nhà do quản lý phụ trách
    List<MaintenanceReport> findByRoomBuildingManagerIdOrderByCreatedAtDesc(Long managerId);

    // S4-07: Tìm báo hỏng theo ID, đồng thời xác minh quyền quản lý tòa nhà
    Optional<MaintenanceReport> findByIdAndRoomBuildingManagerId(Long id, Long managerId);
    List<MaintenanceReport> findByContractIdAndTenantInvoicePendingTrueAndStatus(
        Long contractId,
        MaintenanceReport.Status status
    );
}
