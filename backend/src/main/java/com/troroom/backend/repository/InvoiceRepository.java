
package com.troroom.backend.repository;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

         Optional<Invoice> findByContractAndPeriod(
            RentalContract contract, String period);

         boolean existsByContractAndPeriod(
            RentalContract contract, String period);

        boolean existsByContractAndPeriodAndStatus(
            RentalContract contract, String period, Invoice.Status status);

        boolean existsByInvoiceCode(String invoiceCode);
        boolean existsByContractAndPeriodAndStatusNot(
        RentalContract contract,
        String period,
        Invoice.Status status);

        Optional<Invoice> findByContractAndPeriodAndStatusNot(
        RentalContract contract,
        String period,
        Invoice.Status status);
    @Query("select i from Invoice i "
            + "join fetch i.contract c "
            + "join fetch i.room r "
            + "join fetch c.tenant "
            + "where r.building.id = :buildingId "
            + "and i.period = :period "
            + "order by r.floor asc, r.code asc")
    List<Invoice> findByBuildingAndPeriod(
            @Param("buildingId") Long buildingId,
            @Param("period") String period);

        /** Chỉ lấy hóa đơn đã phát hành của khách thuê. */
        @Query("select i from Invoice i "
                + "join fetch i.contract c "
                + "join fetch i.room r "
                + "join fetch r.building "
                + "where c.tenant = :tenant "
                + "and i.status = :status "
                + "order by i.period desc")
        List<Invoice> findByTenant(
                @Param("tenant") User tenant,
                @Param("status") Invoice.Status status);
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select i from Invoice i "
                + "join fetch i.contract c "
                + "join fetch c.tenant "
                + "join fetch i.room r "
                + "join fetch r.building "
                + "where i.id = :invoiceId")
        Optional<Invoice> findByIdForPaymentUpdate(
                @Param("invoiceId") Long invoiceId
        );

    /** S4-03: Lấy các hóa đơn chưa trả hết của danh sách tòa nhà để tính công nợ. */
    @Query("select i from Invoice i "
            + "join fetch i.room r "
            + "join fetch r.building b "
            + "join fetch i.contract c "
            + "left join fetch c.tenant t "
            + "where b.id in :buildingIds "
            + "and i.status = :status "
            + "and i.totalAmount > i.paidAmount "
            + "order by i.dueDate asc, i.id asc")
    List<Invoice> findUnpaidInvoicesByBuildingIds(
            @Param("buildingIds") List<Long> buildingIds,
            @Param("status") Invoice.Status status);

    /** S4-04: Các hóa đơn đã phát hành nhưng chưa trả hết của một hợp đồng. */
    @Query("select i from Invoice i "
            + "where i.contract.id = :contractId "
            + "and i.status = com.troroom.backend.entity.Invoice.Status.ISSUED "
            + "and i.totalAmount > i.paidAmount "
            + "order by i.dueDate asc, i.id asc")
    List<Invoice> findUnpaidByContractId(
            @Param("contractId") Long contractId);
}
