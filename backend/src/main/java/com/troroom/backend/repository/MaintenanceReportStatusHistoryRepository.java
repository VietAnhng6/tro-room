
package com.troroom.backend.repository;

import com.troroom.backend.entity.MaintenanceReportStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaintenanceReportStatusHistoryRepository
        extends JpaRepository<MaintenanceReportStatusHistory, Long> {

    List<MaintenanceReportStatusHistory>
    findByReportIdOrderByChangedAtDesc(Long reportId);
}
