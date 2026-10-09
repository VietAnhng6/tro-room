package com.troroom.backend.repository;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {

    List<InvoiceItem> findByInvoiceOrderByIdAsc(Invoice invoice);
}
