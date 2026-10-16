
package com.troroom.backend.service;

import com.troroom.backend.entity.MaintenanceReport;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.MaintenanceReportRepository;
import com.troroom.backend.repository.MaintenanceReportStatusHistoryRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.troroom.backend.entity.InvoiceItem;
import com.troroom.backend.repository.InvoiceItemRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class MaintenanceReportManagementService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final MaintenanceReportRepository reportRepository;
    private final MaintenanceReportStatusHistoryRepository historyRepository;
    private final InvoiceItemRepository invoiceItemRepository;

    public MaintenanceReportManagementService(
        MaintenanceReportRepository reportRepository,
        MaintenanceReportStatusHistoryRepository historyRepository,
        InvoiceItemRepository invoiceItemRepository) {
    this.reportRepository = reportRepository;
    this.historyRepository = historyRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    }

    @Transactional
    public List<MaintenanceReport> list(
        User manager,
        Long buildingId,
        String statusText,
        String urgencyText) {

    requireManager(manager);

    List<MaintenanceReport> reports = reportRepository
            .findByRoomBuildingManagerIdOrderByCreatedAtDesc(manager.getId());

    MaintenanceReport.Status status = null;
    MaintenanceReport.Urgency urgency = null;

    if (statusText != null && !statusText.isBlank()) {
        try {
            status = MaintenanceReport.Status.valueOf(
                    statusText.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ.");
        }
    }

    if (urgencyText != null && !urgencyText.isBlank()) {
        try {
            urgency = MaintenanceReport.Urgency.valueOf(
                    urgencyText.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Mức độ ưu tiên không hợp lệ.");
        }
    }

    final MaintenanceReport.Status selectedStatus = status;
    final MaintenanceReport.Urgency selectedUrgency = urgency;

    return reports.stream()
            .filter(report -> buildingId == null
                    || (report.getRoom() != null
                    && report.getRoom().getBuilding() != null
                    && buildingId.equals(report.getRoom().getBuilding().getId())))
            .filter(report -> selectedStatus == null
                    || report.getStatus() == selectedStatus)
            .filter(report -> selectedUrgency == null
                    || report.getUrgency() == selectedUrgency)
            .toList();
    }

    @Transactional
    public MaintenanceReport get(User manager, Long reportId) {
        requireManager(manager);

        return reportRepository
                .findByIdAndRoomBuildingManagerId(reportId, manager.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy báo hỏng trong tòa nhà bạn phụ trách."));
    }

    @Transactional
    public MaintenanceReport updateStatus(
            User manager,
            Long reportId,
            String newStatusText,
            String note) {

        MaintenanceReport report = get(manager, reportId);

        if (note == null || note.trim().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập ghi chú khi cập nhật trạng thái.");
        }

        if (note.trim().length() > 3000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ghi chú không được vượt quá 3000 ký tự.");
        }

        MaintenanceReport.Status newStatus;
        try {
            newStatus = MaintenanceReport.Status.valueOf(
                    newStatusText == null ? "" : newStatusText.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ.");
        }

        MaintenanceReport.Status oldStatus = report.getStatus();

        if (oldStatus == newStatus) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái mới phải khác trạng thái hiện tại.");
        }
        boolean validTransition =
        (oldStatus == MaintenanceReport.Status.NEW
                && (newStatus == MaintenanceReport.Status.IN_PROGRESS
                || newStatus == MaintenanceReport.Status.REJECTED))
        || (oldStatus == MaintenanceReport.Status.IN_PROGRESS
                && (newStatus == MaintenanceReport.Status.COMPLETED
                || newStatus == MaintenanceReport.Status.REJECTED));

        if (!validTransition) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể chuyển trạng thái theo quy trình hiện tại.");
        }

        var history = new com.troroom.backend.entity.MaintenanceReportStatusHistory();
        history.setReport(report);
        history.setOldStatus(oldStatus == null ? null : oldStatus.name());
        history.setNewStatus(newStatus.name());
        history.setNote(note.trim());
        history.setChangedBy(manager);
        historyRepository.save(history);

        report.setStatus(newStatus);
        report.setManagerResponse(note.trim());
        report.setUpdatedAt(LocalDateTime.now(ZONE));

        return reportRepository.save(report);
    }

    @Transactional
    public MaintenanceReport updateCost(
            User manager,
            Long reportId,
            Long repairCost,
            String costPayer) {

        MaintenanceReport report = get(manager, reportId);

        if (repairCost == null || repairCost < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chi phí sửa chữa phải lớn hơn hoặc bằng 0.");
        }

        MaintenanceReport.CostPayer payer;
        try {
            payer = MaintenanceReport.CostPayer.valueOf(
                    costPayer == null ? "" : costPayer.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Người chịu phí chỉ được là LANDLORD hoặc TENANT.");
        }

                report.setRepairCost(repairCost);
        report.setCostPayer(payer);

        // Nếu đã có hóa đơn phát hành, không đánh dấu chờ đưa vào hóa đơn nữa.
        InvoiceItem existingItem = invoiceItemRepository
                .findFirstByMaintenanceReportId(report.getId())
                .orElse(null);

        boolean invoiceAlreadyIssued = existingItem != null
                && existingItem.getInvoice() != null
                && existingItem.getInvoice().getStatus()
                    == com.troroom.backend.entity.Invoice.Status.ISSUED;

        report.setTenantInvoicePending(
                payer == MaintenanceReport.CostPayer.TENANT
                        && !invoiceAlreadyIssued);

        report.setUpdatedAt(LocalDateTime.now(ZONE));

        return reportRepository.save(report);
    }
    @Transactional
public com.troroom.backend.dto.MaintenanceReportManagementResponse toResponse(
        MaintenanceReport report) {

    var item = invoiceItemRepository
            .findFirstByMaintenanceReportId(report.getId())
            .orElse(null);

    String invoiceCode = item != null && item.getInvoice() != null
            ? item.getInvoice().getInvoiceCode() : null;

    String invoiceStatus = item != null && item.getInvoice() != null
            && item.getInvoice().getStatus() != null
            ? item.getInvoice().getStatus().name() : null;

    return com.troroom.backend.dto.MaintenanceReportManagementResponse
            .from(report, invoiceCode, invoiceStatus);
    }
    private void requireManager(User manager) {
        if (manager == null || manager.getRole() != User.Role.MANAGER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chức năng này chỉ dành cho quản lý.");
        }
    }
}
