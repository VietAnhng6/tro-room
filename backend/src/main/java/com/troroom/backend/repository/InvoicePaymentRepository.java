
package com.troroom.backend.repository;

import com.troroom.backend.entity.InvoicePayment;
import com.troroom.backend.entity.InvoicePayment.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoicePaymentRepository
        extends JpaRepository<InvoicePayment, Long> {

    List<InvoicePayment> findByInvoiceIdOrderByReceivedDateDescIdDesc(
            Long invoiceId
    );

    @Query("""
        select coalesce(sum(p.amount), 0)
        from InvoicePayment p
        where p.invoice.id = :invoiceId
          and p.status = :status
        """)
    long sumAmountByInvoiceAndStatus(
            @Param("invoiceId") Long invoiceId,
            @Param("status") Status status
    );

    @Query("""
        select p
        from InvoicePayment p
        join fetch p.invoice
        join fetch p.confirmedBy
        where p.id = :paymentId
        """)
    Optional<InvoicePayment> findDetailById(
            @Param("paymentId") Long paymentId
    );

    List<InvoicePayment> findByInvoiceIdAndStatusOrderByReceivedDateDesc(
            Long invoiceId,
            Status status
    );
}
