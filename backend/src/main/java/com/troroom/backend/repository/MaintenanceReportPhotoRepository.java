package com.troroom.backend.repository;

import com.troroom.backend.entity.MaintenanceReportPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MaintenanceReportPhotoRepository extends JpaRepository<MaintenanceReportPhoto, Long> {
    Optional<MaintenanceReportPhoto> findByIdAndReportId(Long id, Long reportId);
}
