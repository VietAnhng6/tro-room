# S3-06 — Chủ nhà phát hành hoá đơn tháng cho cả toà

Nhánh: `s3_06`.

## Lưu ý quan trọng

Commit revert `17acba3` ("Revert Feature/s3 05") đã xoá nhầm toàn bộ backend Sprint 3
(hợp đồng, chỉ số điện nước, người ở ghép). Nhánh này khôi phục lại nền Sprint 3 từ
commit `5137ff6` (trước revert) rồi triển khai S3-06 bên trên, vì S3-06 phụ thuộc vào
`RentalContract` (S3-01) và `MeterReading` (S3-05).

## Phạm vi

### Backend
- Bảng mới `invoices` và `invoice_items` (migration `backend/migrations/V5__s3_06_invoices.sql`):
  - `invoices`: mỗi hợp đồng một hoá đơn cho một kỳ `yyyy-MM` (unique `contract_id + period`),
    lưu `rent_amount`, `total_amount`, `status` (DRAFT/ISSUED/CANCELLED), `issue_date`,
    `due_date`, `row_version` (khoá lạc quan).
  - `invoice_items`: các dòng khoản mục (tiền phòng, điện, nước, dịch vụ cố định, khoán theo
    đầu người), có chỉ số đầu kỳ/cuối kỳ cho điện nước để đối chiếu.
- API (quyền `INVOICE_MANAGE`, gán cho `LANDLORD` và `MANAGER`; chỉ `LANDLORD` được phát hành):
  - `POST /api/invoices/generate` `{buildingId, period, issueDate?, dueDate?}`: phát hành hàng loạt.
  - `GET /api/invoices?buildingId=&period=yyyy-MM`: danh sách hoá đơn của toà trong kỳ.
  - `GET /api/invoices/{id}`: chi tiết hoá đơn kèm các dòng (khách thuê chỉ xem hoá đơn của mình).
- Công thức hoá đơn (tách trong `InvoiceCalculator` để kiểm thử tự động):
  - Tiền phòng = `contract.rent`.
  - Điện/nước = (chỉ số cuối − chỉ số đầu) × đơn giá có hiệu lực tại ngày chốt kỳ.
  - Đơn giá ưu tiên: `building_services` (effectiveFrom ≤ ngày chốt kỳ) → `room_services` → `services`.
  - Dịch vụ cố định (`FIXED_ROOM`) × 1; khoản khoán theo đầu người (`BY_PERSON`) × số người ở
    (1 người đứng tên + người ở ghép đang ACTIVE).
- Phòng chưa chốt chỉ số hoặc đã có hoá đơn trong kỳ bị bỏ qua và liệt kê rõ trong kết quả.
- Ghi nhật ký (AuditLog) cho mỗi hoá đơn tạo.

### Frontend
- Trang `/invoices` (mục menu **Hoá đơn tháng** cho `LANDLORD`, `MANAGER`): chọn toà + kỳ,
  thanh tiến độ "X phòng đang thuê · Y đã chốt chỉ số · Z chưa chốt", nút phát hành cho cả
  toà, hiển thị kết quả (số hoá đơn tạo + danh sách phòng bị bỏ qua kèm lý do) và bảng hoá
  đơn trong kỳ với modal chi tiết bóc tách từng khoản.

## File mới
- `backend/migrations/V5__s3_06_invoices.sql`
- `entity/Invoice.java`, `entity/InvoiceItem.java`
- `repository/InvoiceRepository.java`, `repository/InvoiceItemRepository.java`
- `service/InvoiceService.java`, `service/InvoiceCalculator.java`
- `controller/InvoiceController.java`, `dto/InvoiceDtos.java`
- `src/test/.../service/InvoiceCalculatorTest.java`
- `frontend/src/pages/Invoices.tsx`

## File sửa
- `SecurityConfig.java`, `security/PermissionAuthorizationManager.java`, `config/PermissionDataInitializer.java`
- `frontend/src/App.tsx`, `frontend/src/layouts/MainLayout.tsx`

## Kiểm thử thủ công đề nghị
1. Đăng nhập LANDLORD sở hữu toà có phòng đang thuê, đã nhập chỉ số điện nước kỳ hiện tại →
   vào **Hoá đơn tháng**, thấy tiến độ chốt chỉ số.
2. Bấm **Phát hành hoá đơn cả toà** → kết quả hiển thị số hoá đơn tạo và các phòng bị bỏ qua
   (nếu có phòng chưa chốt chỉ số).
3. Bấm lại lần hai → không tạo hoá đơn trùng (các phòng rơi vào danh sách "Đã có hoá đơn trong kỳ").
4. Mở **Chi tiết** một hoá đơn → thấy từng dòng: tiền phòng, điện (chỉ số đầu → cuối × đơn giá),
   nước, dịch vụ cố định, khoán theo người, và tổng cộng.
5. Dùng token MANAGER của toà khác gọi `POST /api/invoices/generate` → 403 (chỉ LANDLORD được phát hành);
   MANAGER phụ trách toà gọi `GET /api/invoices` → xem được.
6. Token TENANT gọi `GET /api/invoices/{id}` hoá đơn của mình → xem được; hoá đơn khác → 403.
7. Kiểm tra bảng `audit_logs` có dòng `Invoice`.
