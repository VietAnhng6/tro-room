package com.troroom.backend.demo;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.InvoiceItem;
import com.troroom.backend.entity.InvoicePayment;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.InvoiceItemRepository;
import com.troroom.backend.repository.InvoicePaymentRepository;
import com.troroom.backend.repository.InvoiceRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

@Service
@Profile("staging")
public class DemoInvoiceSeedService {

    private static final ZoneId VIETNAM =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final RentalContractRepository contracts;
    private final InvoiceRepository invoices;
    private final InvoiceItemRepository items;
    private final InvoicePaymentRepository payments;
    private final UserRepository users;

    public DemoInvoiceSeedService(
            RentalContractRepository contracts,
            InvoiceRepository invoices,
            InvoiceItemRepository items,
            InvoicePaymentRepository payments,
            UserRepository users
    ) {
        this.contracts = contracts;
        this.invoices = invoices;
        this.items = items;
        this.payments = payments;
        this.users = users;
    }

    @Transactional
    public void seed() {
        User landlord = users.findByEmail("landlord@demo.local")
                .orElseThrow();

        List<RentalContract> demoContracts = contracts.findAll()
                .stream()
                .filter(c -> c.getContractCode().startsWith("HD-S410-"))
                .sorted(Comparator.comparing(
                        RentalContract::getContractCode))
                .toList();

        if (demoContracts.size() != 20) {
            throw new IllegalStateException(
                    "Seed S4-10 cần đúng 20 hợp đồng mẫu"
            );
        }

        YearMonth firstMonth =
                YearMonth.now(VIETNAM).minusMonths(3);

        for (int i = 0; i < demoContracts.size(); i++) {
            RentalContract contract = demoContracts.get(i);
            int contractNumber = i + 1;

            for (int monthOffset = 0; monthOffset < 3; monthOffset++) {
                YearMonth month = firstMonth.plusMonths(monthOffset);
                createInvoiceIfMissing(
                        contract, contractNumber, month, landlord
                );
            }
        }
    }

    private void createInvoiceIfMissing(
            RentalContract contract,
            int contractNumber,
            YearMonth month,
            User landlord
    ) {
        String period = month.toString();

        if (invoices.findByContractAndPeriod(
                contract, period).isPresent()) {
            return;
        }

        long total = contract.getRent();
        long paid;

        if (contractNumber <= 8) {
            paid = total;                    // Trả đủ
        } else if (contractNumber <= 13) {
            paid = total / 2;                // 5 phòng trả thiếu
        } else if (contractNumber <= 15) {
            paid = 0;                        // 2 phòng nợ cả 3 kỳ
        } else {
            paid = total;                    // Trả đủ
        }

        LocalDate issueDate = month.atDay(1);
        LocalDate dueDate = month.atEndOfMonth().plusDays(5);

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(
                "DEMO-" + contract.getContractCode()
                        + "-" + period.replace("-", "")
        );
        invoice.setContract(contract);
        invoice.setRoom(contract.getRoom());
        invoice.setPeriod(period);
        invoice.setRentAmount(total);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(dueDate);
        invoice.setCreatedAt(issueDate.atStartOfDay());

        if (paid == 0) {
            invoice.setStatus(Invoice.Status.ISSUED);
        } else if (paid < total) {
            invoice.setStatus(Invoice.Status.PARTIALLY_PAID);
        } else {
            invoice.setStatus(Invoice.Status.PAID);
        }

        invoice = invoices.save(invoice);

        InvoiceItem rentItem = new InvoiceItem();
        rentItem.setInvoice(invoice);
        rentItem.setLabel("Tiền phòng " + period);
        rentItem.setType(InvoiceItem.Type.RENT);
        rentItem.setQuantity(1);
        rentItem.setUnit("tháng");
        rentItem.setUnitPrice(total);
        rentItem.setAmount(total);
        items.save(rentItem);

        if (paid > 0) {
            InvoicePayment payment = new InvoicePayment();
            payment.setInvoice(invoice);
            payment.setAmount(paid);
            payment.setReceivedDate(dueDate.minusDays(3));
            payment.setPaymentMethod(
                    InvoicePayment.Method.TRANSFER
            );
            payment.setConfirmedBy(landlord);
            payment.setStatus(
                    InvoicePayment.Status.CONFIRMED
            );
            payments.save(payment);
        }
    }
}