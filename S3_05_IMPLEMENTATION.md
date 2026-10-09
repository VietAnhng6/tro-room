# S3-05 — Quản lý toà nhà nhập chỉ số điện nước cuối kỳ

Nhánh: `feature/S3-05` (từ `develop`, không đụng `main`).

## Phạm vi

### Backend
- Bảng mới `meter_readings` (migration `backend/migrations/V4__s3_05_meter_readings.sql`): mỗi hợp đồng có một bản ghi cho mỗi kỳ `yyyy-MM`, lưu cả chỉ số kỳ trước (`electricity_prev`, `water_prev`) và chỉ số mới (`electricity`, `water`), người ghi, thời điểm, `row_version` (khoá lạc quan).
- API (quyền `METER_MANAGE`, gán cho `MANAGER` và `LANDLORD`, kiểm tra thêm phạm vi toà nhà):
  - `GET /api/manager/meter-readings/buildings`: toà nhà được phép ghi.
  - `GET /api/manager/meter-readings?buildingId=&period=yyyy-MM`: phòng đang thuê của toà, xếp theo tầng rồi mã phòng, kèm chỉ số kỳ trước, tổng/đã chốt/còn thiếu.
  - `POST /api/manager/meter-readings`: lưu một phòng `{contractId, period, electricity, water, confirm}`.
- Chỉ số kỳ trước = bản ghi gần nhất của hợp đồng; chưa có thì lấy `initial_electricity` / `initial_water` của hợp đồng (null tính là 0).
- Chặn lưu khi chỉ số mới nhỏ hơn kỳ trước (400, kèm `fields.electricity` / `fields.water`).
- Cảnh báo khi mức tiêu thụ lớn hơn 3 lần trung bình 3 kỳ gần nhất (chênh hơn 200%): trả 409 `CONSUMPTION_WARNING`; gửi lại với `confirm=true` để lưu.
- Không sửa được kỳ cũ nếu đã có chỉ số kỳ sau (409 `LATER_PERIOD_EXISTS`).
- Ghi nhật ký (AuditLog) khi tạo / sửa.

### Frontend
- Trang `/meter-readings` (mục menu **Ghi điện nước** cho `MANAGER`, `LANDLORD`): chọn toà + kỳ, thanh tiến độ "Còn X / Y phòng chưa nhập", lọc phòng chưa nhập, mỗi phòng một thẻ có hai ô số (bật sẵn bàn phím số), lưu từng phòng, lỗi báo ngay tại dòng, hộp cảnh báo xác nhận.

## File mới
- `backend/migrations/V4__s3_05_meter_readings.sql`
- `entity/MeterReading.java`, `repository/MeterReadingRepository.java`
- `service/MeterReadingService.java`, `MeterReadingRules.java`, `MeterReadingException.java`
- `controller/MeterReadingController.java`, `dto/MeterReadingDtos.java`
- `src/test/.../service/MeterReadingRulesTest.java`
- `frontend/src/pages/MeterReadings.tsx`

## File sửa
- `repository/RentalContractRepository.java` (thêm `findActiveForMeter`)
- `SecurityConfig.java`, `security/PermissionAuthorizationManager.java`, `config/PermissionDataInitializer.java`
- `frontend/src/App.tsx`, `frontend/src/components/MainLayout.tsx`

## Kiểm thử thủ công đề nghị
1. Đăng nhập MANAGER phụ trách một toà có phòng đang thuê → vào **Ghi điện nước**, thấy phòng theo thứ tự tầng / mã phòng và chỉ số kỳ trước.
2. Nhập điện nhỏ hơn kỳ trước → báo lỗi ngay tại dòng, không lưu.
3. Nhập hợp lệ cho một phòng → "Đã lưu", số "Còn X phòng" giảm 1; phòng khác giữ "Chưa chốt".
4. Tạo 3 kỳ có mức tiêu thụ ~100 rồi nhập kỳ sau 400 → hiện cảnh báo, bấm **Xác nhận và lưu** mới lưu.
5. Dùng token MANAGER của toà khác gọi `buildingId` không phụ trách → 403. Token TENANT gọi API → 403.
6. Mở trang ở màn hình 360px, dùng một tay, ô nhập hiện bàn phím số.
7. Kiểm tra bảng `audit_logs` có dòng `MeterReading`.
