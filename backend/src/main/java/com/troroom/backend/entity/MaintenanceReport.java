package com.troroom.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** S4-06: yêu cầu báo hỏng do khách thuê tạo. */
@Entity
@Table(name = "maintenance_reports", indexes = {
        @Index(name = "idx_maintenance_report_tenant_created", columnList = "tenant_id, created_at"),
        @Index(name = "idx_maintenance_report_contract", columnList = "contract_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_maintenance_report_code", columnNames = "report_code")
})
public class MaintenanceReport {
    public enum Urgency { NORMAL, URGENT }
    public enum Status { NEW, IN_PROGRESS, COMPLETED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_code", nullable = false, unique = true, length = 20)
    private String reportCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "device_type", nullable = false, length = 120)
    private String deviceType;

    @Column(nullable = false, length = 3000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Urgency urgency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.NEW;

    /** Nội dung phản hồi gần nhất của quản lý; được dùng bởi luồng S4-07. */
    @Column(name = "manager_response", length = 3000)
    private String managerResponse;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MaintenanceReportPhoto> photos = new ArrayList<>();

    public MaintenanceReport() { }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        if (status == null) status = Status.NEW;
    }

    public Long getId() { return id; }
    public String getReportCode() { return reportCode; }
    public void setReportCode(String reportCode) { this.reportCode = reportCode; }
    public User getTenant() { return tenant; }
    public void setTenant(User tenant) { this.tenant = tenant; }
    public RentalContract getContract() { return contract; }
    public void setContract(RentalContract contract) { this.contract = contract; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Urgency getUrgency() { return urgency; }
    public void setUrgency(Urgency urgency) { this.urgency = urgency; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getManagerResponse() { return managerResponse; }
    public void setManagerResponse(String managerResponse) { this.managerResponse = managerResponse; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<MaintenanceReportPhoto> getPhotos() { return photos; }
    public void addPhoto(MaintenanceReportPhoto photo) { photos.add(photo); photo.setReport(this); }
}
