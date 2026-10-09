package com.troroom.backend.repository;

import com.troroom.backend.entity.MeterReading;
import com.troroom.backend.entity.RentalContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {

    Optional<MeterReading> findByContractAndPeriod(RentalContract contract, String period);

    /** Các bản ghi của một kỳ cho nhiều hợp đồng, dùng để dựng danh sách nhập liệu. */
    List<MeterReading> findByContractInAndPeriod(List<RentalContract> contracts, String period);

    /** Bản ghi gần nhất trước kỳ chỉ định, làm chỉ số kỳ trước. */
    Optional<MeterReading> findFirstByContractAndPeriodLessThanOrderByPeriodDesc(
            RentalContract contract, String period);

    /** Ba kỳ gần nhất trước kỳ chỉ định, dùng tính mức tiêu thụ trung bình. */
    List<MeterReading> findTop3ByContractAndPeriodLessThanOrderByPeriodDesc(
            RentalContract contract, String period);

    boolean existsByContractAndPeriodGreaterThan(RentalContract contract, String period);
}
