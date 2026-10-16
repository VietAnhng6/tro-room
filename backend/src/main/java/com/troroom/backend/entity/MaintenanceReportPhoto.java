package com.troroom.backend.entity;

import jakarta.persistence.*;

/** Ảnh đính kèm riêng của một báo hỏng; không dùng chung thư viện ảnh phòng. */
@Entity
@Table(name = "maintenance_report_photos", indexes = {
        @Index(name = "idx_maintenance_photo_report", columnList = "report_id")
})
public class MaintenanceReportPhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private MaintenanceReport report;

    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    public MaintenanceReportPhoto() { }
    public Long getId() { return id; }
    public MaintenanceReport getReport() { return report; }
    public void setReport(MaintenanceReport report) { this.report = report; }
    public String getStoredFilename() { return storedFilename; }
    public void setStoredFilename(String storedFilename) { this.storedFilename = storedFilename; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
}
