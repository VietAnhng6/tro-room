package com.troroom.backend.service;

import com.troroom.backend.dto.RentalContractDetailResponse;
import com.troroom.backend.dto.RentalContractPersonResponse;
import com.troroom.backend.dto.RentalContractServiceItemResponse;
import com.troroom.backend.entity.User;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class RentalContractPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final float MARGIN = 44f;

    private final RentalContractViewService contractViewService;

    public RentalContractPdfService(RentalContractViewService contractViewService) {
        this.contractViewService = contractViewService;
    }

    public byte[] generatePdf(Long contractId, User currentUser) {
        RentalContractDetailResponse detail = contractViewService.getMyContract(contractId, currentUser);

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PdfCanvas canvas = new PdfCanvas(document);
            canvas.title("HỢP ĐỒNG THUÊ PHÒNG");
            canvas.line("Mã hợp đồng: " + detail.contractCode());
            canvas.line("Trạng thái: " + statusLabel(detail.status()));
            canvas.line("Phòng: " + detail.roomCode() + " | Tòa nhà: " + detail.buildingName());
            canvas.line("Địa chỉ: " + detail.buildingAddress());
            canvas.blank();

            canvas.section("1. THÔNG TIN HỢP ĐỒNG");
            canvas.line("Giá thuê: " + money(detail.rent()) + " VND/tháng");
            canvas.line("Tiền cọc: " + money(detail.deposit()) + " VND");
            canvas.line("Ngày bắt đầu: " + date(detail.startDate()));
            canvas.line("Ngày kết thúc: " + date(detail.endDate()));
            canvas.line("Kỳ hạn: " + detail.termMonths() + " tháng");
            canvas.line("Ngày chốt hóa đơn: ngày " + detail.billingCutoffDay());
            canvas.line("Diện tích: " + detail.roomArea() + " m² | Sức chứa: " + detail.maxPeople() + " người");
            if (detail.initialElectricity() != null || detail.initialWater() != null) {
                canvas.line("Chỉ số đầu kỳ: điện " + value(detail.initialElectricity())
                        + " | nước " + value(detail.initialWater()));
            }
            if (detail.expiringSoon()) {
                canvas.warning("CẢNH BÁO: Hợp đồng còn " + detail.daysRemaining() + " ngày sẽ hết hạn.");
            } else if ("EXPIRED".equals(detail.status())) {
                canvas.warning("Hợp đồng đã hết hạn.");
            }

            canvas.blank();
            canvas.section("2. NGƯỜI THAM GIA HỢP ĐỒNG");
            for (RentalContractPersonResponse person : detail.people()) {
                canvas.tableLine(
                        person.role(),
                        person.fullName(),
                        person.phone(),
                        date(person.startDate()),
                        dateOrDash(person.endDate())
                );
            }

            canvas.blank();
            canvas.section("3. DỊCH VỤ VÀ ĐƠN GIÁ ÁP DỤNG");
            if (detail.services().isEmpty()) {
                canvas.line("Chưa có dịch vụ được gán cho phòng.");
            } else {
                canvas.tableHeader("Dịch vụ", "Cách tính", "Đơn vị", "Đơn giá");
                for (RentalContractServiceItemResponse service : detail.services()) {
                    canvas.tableLine(
                            service.name(),
                            calculationLabel(service.calculationMethod()),
                            service.unit(),
                            money(service.price()) + " VND"
                    );
                }
            }

            canvas.blank();
            canvas.section("Ghi chú");
            canvas.line("Bản PDF này được tạo từ thông tin hợp đồng đang lưu trên hệ thống TroRoom.");
            canvas.close();

            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo PDF hợp đồng", e);
        }
    }

    private String date(java.time.LocalDate date) {
        return date == null ? "-" : DATE.format(date);
    }

    private String dateOrDash(java.time.LocalDate date) {
        return date == null ? "-" : DATE.format(date);
    }

    private String money(long value) {
        return String.format("%,d", value).replace(',', '.');
    }

    private String value(Integer value) {
        return value == null ? "-" : String.valueOf(value);
    }

    private String statusLabel(String status) {
        return switch (status) {
            case "ACTIVE" -> "Đang hiệu lực";
            case "EXPIRED" -> "Đã hết hạn";
            case "NOT_STARTED" -> "Chưa bắt đầu";
            default -> status;
        };
    }

    private String calculationLabel(String method) {
        return switch (method) {
            case "BY_METER" -> "Theo chỉ số";
            case "BY_PERSON" -> "Theo đầu người";
            case "FIXED_ROOM" -> "Cố định phòng";
            default -> method;
        };
    }

    private static PDFont loadFont(PDDocument document) throws IOException {
        for (String candidate : fontCandidates()) {
            Path path = Paths.get(candidate);
            if (Files.exists(path)) {
                try (InputStream in = Files.newInputStream(path)) {
                    return PDType0Font.load(document, in);
                }
            }
        }
        return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    }

    private static List<String> fontCandidates() {
        List<String> candidates = new ArrayList<>();
        candidates.add("C:/Windows/Fonts/arial.ttf");
        candidates.add("C:/Windows/Fonts/segoeui.ttf");
        candidates.add("C:/Windows/Fonts/tahoma.ttf");
        candidates.add("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
        candidates.add("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf");
        return candidates;
    }

    private static String sanitizeForFallback(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return normalized.replace('Đ', 'D').replace('đ', 'd');
    }

    private static class PdfCanvas {
        private final PDDocument document;
        private final PDFont font;
        private final PDFont boldFont;
        private PDPage page;
        private PDPageContentStream stream;
        private float y;

        PdfCanvas(PDDocument document) throws IOException {
            this.document = document;
            this.font = loadFont(document);
            this.boldFont = font;
            openPage();
        }

        void openPage() throws IOException {
            if (stream != null) {
                stream.close();
            }
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            y = page.getMediaBox().getHeight() - MARGIN;
        }

        void title(String text) throws IOException {
            ensure(42);
            stream.beginText();
            stream.setFont(boldFont, 18);
            stream.newLineAtOffset(MARGIN, y);
            stream.showText(safe(text));
            stream.endText();
            y -= 30;
        }

        void section(String text) throws IOException {
            ensure(26);
            stream.beginText();
            stream.setFont(boldFont, 11);
            stream.newLineAtOffset(MARGIN, y);
            stream.showText(safe(text));
            stream.endText();
            y -= 18;
        }

        void line(String text) throws IOException {
            for (String wrapped : wrap(safe(text), 105)) {
                ensure(17);
                stream.beginText();
                stream.setFont(font, 10);
                stream.newLineAtOffset(MARGIN, y);
                stream.showText(wrapped);
                stream.endText();
                y -= 15;
            }
        }

        void warning(String text) throws IOException {
            line("[CANH BAO] " + text);
        }

        void blank() {
            y -= 7;
        }

        void tableHeader(String c1, String c2, String c3, String c4) throws IOException {
            ensure(20);
            float x1 = MARGIN;
            float x2 = 235;
            float x3 = 335;
            float x4 = 410;
            tableCell(x1, c1, 180, true);
            tableCell(x2, c2, 90, true);
            tableCell(x3, c3, 65, true);
            tableCell(x4, c4, 120, true);
            y -= 15;
        }

        void tableLine(String c1, String c2, String c3, String c4, String c5) throws IOException {
            ensure(20);
            float x1 = MARGIN;
            float x2 = 205;
            float x3 = 345;
            float x4 = 410;
            float x5 = 475;
            tableCell(x1, c1, 155, false);
            tableCell(x2, c2, 130, false);
            tableCell(x3, c3, 60, false);
            tableCell(x4, c4, 60, false);
            tableCell(x5, c5, 70, false);
            y -= 15;
        }

        void tableLine(String c1, String c2, String c3, String c4) throws IOException {
            ensure(20);
            float x1 = MARGIN;
            float x2 = 225;
            float x3 = 360;
            float x4 = 430;
            tableCell(x1, c1, 175, false);
            tableCell(x2, c2, 125, false);
            tableCell(x3, c3, 60, false);
            tableCell(x4, c4, 110, false);
            y -= 15;
        }

        void close() throws IOException {
            if (stream != null) {
                stream.close();
                stream = null;
            }
        }

        private void tableCell(float x, String text, float width, boolean bold) throws IOException {
            stream.beginText();
            stream.setFont(bold ? boldFont : font, 8.5f);
            stream.newLineAtOffset(x, y);
            String value = text == null ? "" : text;
            if (width > 0) {
                float maxWidth = width;
                String[] lines = wrapToWidth(value, bold ? boldFont : font, 8.5f, maxWidth);
                stream.showText(lines.length == 0 ? "" : lines[0]);
            } else {
                stream.showText(value);
            }
            stream.endText();
        }

        private void ensure(float needed) throws IOException {
            if (y - needed < MARGIN) {
                openPage();
            }
        }

        private String safe(String text) {
            if (text == null) return "";
            if (font instanceof PDType0Font) return text;
            return sanitizeForFallback(text);
        }

        private List<String> wrap(String text, int maxChars) {
            List<String> out = new ArrayList<>();
            if (text == null || text.isBlank()) {
                out.add("");
                return out;
            }
            String remaining = text.trim();
            while (remaining.length() > maxChars) {
                int cut = remaining.lastIndexOf(' ', maxChars);
                if (cut <= 0) cut = maxChars;
                out.add(remaining.substring(0, cut).trim());
                remaining = remaining.substring(cut).trim();
            }
            out.add(remaining);
            return out;
        }

        private String[] wrapToWidth(String text, PDFont pdfFont, float size, float maxWidth) throws IOException {
            if (text == null || text.isBlank()) return new String[]{""};
            String[] words = text.split("\\s+");
            List<String> lines = new ArrayList<>();
            String current = "";
            for (String word : words) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                float width = pdfFont.getStringWidth(candidate) / 1000f * size;
                if (width <= maxWidth) {
                    current = candidate;
                } else if (!current.isEmpty()) {
                    lines.add(current);
                    current = word;
                }
            }
            if (!current.isEmpty()) lines.add(current);
            return lines.toArray(new String[0]);
        }
    }
}
