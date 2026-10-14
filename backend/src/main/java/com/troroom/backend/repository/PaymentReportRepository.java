package com.troroom.backend.repository;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.PaymentReport;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;

public interface PaymentReportRepository extends JpaRepository<PaymentReport, Long> {

    List<PaymentReport> findByInvoiceOrderByCreatedAtDesc(Invoice invoice);

    List<PaymentReport> findByTenantOrderByCreatedAtDesc(User tenant);

    List<PaymentReport> findByInvoiceAndStatus(
            Invoice invoice,
            PaymentReport.Status status
    );

    List<PaymentReport> findByInvoiceAndStatusIn(
            Invoice invoice,
            List<PaymentReport.Status> statuses
    );

    boolean existsByInvoiceAndStatus(
            Invoice invoice,
            PaymentReport.Status status
    );

    @Query("""
            select coalesce(sum(p.amount), 0)
            from PaymentReport p
            where p.invoice.id = :invoiceId
              and p.status = :status
            """)
    long sumAmountByInvoiceAndStatus(
            @Param("invoiceId") Long invoiceId,
            @Param("status") PaymentReport.Status status
    );

    @Query("""
            select p from PaymentReport p
            join fetch p.invoice i
            join fetch p.tenant t
            where p.id = :id
            """)
    java.util.Optional<PaymentReport> findDetailById(
            @Param("id") Long id
    );
    @Query("""
        select p from PaymentReport p
        join fetch p.invoice i
        join fetch p.tenant t
        join fetch i.room r
        join fetch r.building b
        where b.landlord.id = :landlordId
        order by p.createdAt desc
        """)
    List<PaymentReport> findByLandlordId(
            @Param("landlordId") Long landlordId
    );

    @Query("""
            select p from PaymentReport p
            join fetch p.invoice i
            join fetch p.tenant t
            join fetch i.room r
            join fetch r.building b
            where b.landlord.id = :landlordId
            and p.status = :status
            order by p.createdAt desc
            """)
    List<PaymentReport> findByLandlordIdAndStatus(
            @Param("landlordId") Long landlordId,
            @Param("status") PaymentReport.Status status
    );
}