# S3-03 — Khách thuê xem hợp đồng và tải PDF

## Phạm vi

S3-03 được triển khai trên nền code `develop` sau S3-01 và S3-02.

### Backend

- `GET /api/tenant/contracts`: danh sách hợp đồng mà tài khoản khách thuê được phép xem.
- `GET /api/tenant/contracts/{id}`: chi tiết một hợp đồng.
- `GET /api/tenant/contracts/{id}/pdf`: tạo và tải bản PDF.
- Backend kiểm tra quyền; truy cập hợp đồng của tài khoản khác trả `403`.
- Khách thuê là người đứng tên được xem hợp đồng của mình.
- Người ở ghép đang ACTIVE được nhận diện theo số điện thoại tài khoản và được xem hợp đồng phòng mình đang ở.
- Chi phí dịch vụ lấy từ `room_services.price`, tức đơn giá áp dụng riêng cho phòng.
- Cảnh báo hết hạn khi còn dưới 30 ngày và trả thêm `daysRemaining`.

### Frontend

- Thêm mục **Hợp đồng** cho vai trò `TENANT`.
- Trang `/contracts` hiển thị danh sách hợp đồng và panel chi tiết.
- Chi tiết hiển thị mã hợp đồng, phòng, giá thuê, tiền cọc, ngày bắt đầu/kết thúc, kỳ hạn, ngày chốt hóa đơn, chỉ số đầu kỳ, danh sách người ở, dịch vụ và đơn giá.
- Nút **Tải bản PDF** tải file từ API backend.
- Hiển thị cảnh báo khi hợp đồng còn dưới 30 ngày.
- Responsive cho màn hình nhỏ.

## Các file mới/chính

### Backend

- `backend/src/main/java/com/troroom/backend/controller/TenantContractController.java`
- `backend/src/main/java/com/troroom/backend/service/RentalContractViewService.java`
- `backend/src/main/java/com/troroom/backend/service/RentalContractPdfService.java`
- `backend/src/main/java/com/troroom/backend/dto/RentalContractDetailResponse.java`
- `backend/src/main/java/com/troroom/backend/dto/RentalContractListItemResponse.java`
- `backend/src/main/java/com/troroom/backend/dto/RentalContractPersonResponse.java`
- `backend/src/main/java/com/troroom/backend/dto/RentalContractServiceItemResponse.java`

### Backend thay đổi

- `backend/pom.xml`: thêm Apache PDFBox 3.0.3.
- `backend/src/main/java/com/troroom/backend/SecurityConfig.java`: bảo vệ API `/api/tenant/contracts/**` bằng đăng nhập.
- `backend/src/main/java/com/troroom/backend/repository/RoommateRepository.java`: hỗ trợ kiểm tra người ở ghép theo số điện thoại.

### Frontend

- `frontend/src/pages/Contracts.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/MainLayout.tsx`

## Kiểm thử thủ công đề nghị

1. Đăng nhập bằng tài khoản TENANT có hợp đồng; vào **Hợp đồng** và kiểm tra danh sách.
2. Chọn hợp đồng; kiểm tra đầy đủ mã, phòng, giá thuê, tiền cọc, ngày, người ở và dịch vụ.
3. Bấm **Tải bản PDF**; mở file và kiểm tra nội dung.
4. Dùng token của TENANT A gọi ID hợp đồng của TENANT B; API phải trả `403`.
5. Tạo hợp đồng có ngày kết thúc còn 29 ngày; giao diện phải hiển thị cảnh báo và số ngày còn lại.
6. Đăng nhập bằng tài khoản có số điện thoại trùng người ở ghép ACTIVE; API chi tiết hợp đồng phòng đó phải cho phép xem.
7. Kiểm tra trang `/contracts` trên màn hình khoảng 360px.

## Chạy dự án

Backend:

```powershell
cd "D:\My Documents\DEV\tro-room\backend"
.\mvnw.cmd spring-boot:run
```

Frontend:

```powershell
cd "D:\My Documents\DEV\tro-room\frontend"
npm run dev
```
