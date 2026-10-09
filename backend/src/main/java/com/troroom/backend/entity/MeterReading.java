package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * S3-05: Chỉ số điện nước cuối kỳ của một phòng (theo hợp đồng) trong một kỳ.
 *
 * Mỗi hợp đồng chỉ có một bản ghi cho mỗi kỳ (yyyy-MM). Chỉ số kỳ trước được
 * lưu lại ngay trên bản ghi (electricityPrev, waterPrev) để sau này hoá đơn
 * tính mức tiêu thụ không phụ thuộc vào việc sửa dữ liệu về sau.
 */
@Entity
@Table(
        name = "meter_readings",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_meter_contract_period",
                        columnNames = {"contract_id", "period"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_meter_room_period",
                        columnList = "room_id,period"
                )
        }
)
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /** Kỳ ghi, dạng yyyy-MM. */
    @Column(nullable = false, length = 7)
    private String period;

    @Column(name = "electricity_prev", nullable = false)
    private int electricityPrev;

    @Column(nullable = false)
    private int electricity;

    @Column(name = "water_prev", nullable = false)
    private int waterPrev;

    @Column(nullable = false)
    private int water;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    /** Khoá lạc quan: hai người lưu cùng lúc thì người sau nhận lỗi. */
    @Version
    @Column(name = "row_version", nullable = false)
    private long version;

    public MeterReading() {
    }

    public Long getId() { return id; }

    public RentalContract getContract() { return contract; }
    public void setContract(RentalContract contract) { this.contract = contract; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public int getElectricityPrev() { return electricityPrev; }
    public void setElectricityPrev(int electricityPrev) { this.electricityPrev = electricityPrev; }

    public int getElectricity() { return electricity; }
    public void setElectricity(int electricity) { this.electricity = electricity; }

    public int getWaterPrev() { return waterPrev; }
    public void setWaterPrev(int waterPrev) { this.waterPrev = waterPrev; }

    public int getWater() { return water; }
    public void setWater(int water) { this.water = water; }

    public User getRecordedBy() { return recordedBy; }
    public void setRecordedBy(User recordedBy) { this.recordedBy = recordedBy; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }

    public long getVersion() { return version; }

    /** Mức điện tiêu thụ trong kỳ. */
    public int electricityUsed() { return electricity - electricityPrev; }

    /** Mức nước tiêu thụ trong kỳ. */
    public int waterUsed() { return water - waterPrev; }
}
