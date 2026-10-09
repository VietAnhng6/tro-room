package com.troroom.backend.repository;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByContractAndPeriod(RentalContract contract, String period);

    boolean existsByContractAndPeriod(RentalContract contract, String period);

    boolean existsByInvoiceCode(String invoiceCode);

    /** Hoá đơn của một toà nhà trong một kỳ, theo thứ tự tầng rồi mã phòng. */
    @Query("select i from Invoice i "
            + "join fetch i.contract c join fetch i.room r join fetch c.tenant "
            + "where r.building.id = :buildingId and i.period = :period "
            + "order by r.floor asc, r.code asc")
    List<Invoice> findByBuildingAndPeriod(
            @Param("buildingId") Long buildingId,
            @Param("period") String period);

    /** Các hoá đơn của khách thuê (người đứng tên hợp đồng). */
    @Query("select i from Invoice i "
            + "join fetch i.contract c join fetch i.room r join fetch r.building "
            + "where c.tenant = :tenant order by i.period desc")
    List<Invoice> findByTenant(@Param("tenant") User tenant);
}
