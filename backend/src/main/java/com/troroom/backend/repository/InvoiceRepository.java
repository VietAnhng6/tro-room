
package com.troroom.backend.repository;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("""
            select i.period,
                   sum(i.totalAmount),
                   sum(i.paidAmount),
                   sum(case when i.totalAmount > i.paidAmount
                            then i.totalAmount - i.paidAmount else 0 end)
            from Invoice i
            where i.room.building.id in :buildingIds
              and i.period between :fromPeriod and :toPeriod
              and i.status in :statuses
            group by i.period
            order by i.period
            """)
    List<Object[]> aggregateForMonthlyReport(
            @Param("buildingIds") Collection<Long> buildingIds,
            @Param("fromPeriod") String fromPeriod,
            @Param("toPeriod") String toPeriod,
            @Param("statuses") Collection<Invoice.Status> statuses
    );

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

        /** Chỉ lấy hóa đơn đã phát hành của khách thuê đang đăng nhập. */
        @Query("select i from Invoice i "
                + "join fetch i.contract c "
                + "join fetch i.room r "
                + "join fetch r.building "
                + "where c.tenant = :tenant "
                + "and i.status in :statuses "
                + "order by i.period desc")
        List<Invoice> findByTenant(
                @Param("tenant") User tenant,
                @Param("statuses") Collection<Invoice.Status> statuses);
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
            + "and i.status in :statuses "
            + "and i.totalAmount > i.paidAmount "
            + "order by i.dueDate asc, i.id asc")
    List<Invoice> findUnpaidInvoicesByBuildingIds(
            @Param("buildingIds") List<Long> buildingIds,
            @Param("statuses") Collection<Invoice.Status> statuses);

    /** S4-04: Các hóa đơn đã phát hành nhưng chưa trả hết của một hợp đồng. */
    @Query("select i from Invoice i "
            + "where i.contract.id = :contractId "
            + "and i.status in ("
            + "com.troroom.backend.entity.Invoice.Status.ISSUED, "
            + "com.troroom.backend.entity.Invoice.Status.PARTIALLY_PAID) "
            + "and i.totalAmount > i.paidAmount "
            + "order by i.dueDate asc, i.id asc")
    List<Invoice> findUnpaidByContractId(
            @Param("contractId") Long contractId);
                /** S4-08: Lấy hóa đơn đã phát hành, còn nợ và có hạn thanh toán. */
    @Query("select i from Invoice i "
            + "join fetch i.contract c "
            + "join fetch c.tenant t "
            + "join fetch i.room r "
            + "where i.status in ("
                + "com.troroom.backend.entity.Invoice.Status.ISSUED, "
                + "com.troroom.backend.entity.Invoice.Status.PARTIALLY_PAID) "
            + "and i.totalAmount > i.paidAmount "
            + "and i.dueDate is not null "
            + "order by i.dueDate asc, i.id asc")
    List<Invoice> findUnpaidInvoicesForReminders();
}
