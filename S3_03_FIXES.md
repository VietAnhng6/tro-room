# S3_03 – Sửa trang hợp đồng dành cho khách thuê

## Nội dung thay đổi

- Tạo trang `frontend/src/pages/TenantContracts.tsx` riêng cho vai trò `TENANT`; không thay thế trang `/contracts` của chủ nhà.
- Nối danh sách, chi tiết và tải PDF vào các API `GET /api/tenant/contracts`, `GET /api/tenant/contracts/{id}` và `GET /api/tenant/contracts/{id}/pdf`, gửi Bearer token khi gọi API.
- Bổ sung route `/tenant/contracts`, quyền truy cập TENANT và mục “Hợp đồng của tôi” trên menu.
- Siết quyền người ở ghép: chỉ liệt kê/cho xem hợp đồng khi cùng phòng và khoảng thời gian cư trú giao với thời hạn của hợp đồng. Dữ liệu `MOVED_OUT` không có ngày kết thúc không được dùng để cấp quyền.
- Chỉ hiển thị cảnh báo còn hạn khi `expiringSoon=true` và trạng thái hợp đồng là `ACTIVE`; hiển thị riêng hợp đồng đã hết hạn.
- Thêm unit test cho người đứng tên, người ở ghép đúng kỳ, người ở ghép sai kỳ, vai trò không phải TENANT và chống lộ hợp đồng của kỳ khác.

## Kiểm thử

- `git diff --check`: đạt.
- TypeScript: kiểm tra `tsc -p tsconfig.app.json --noEmit` đã chạy với khai báo tạm cho hai thư viện bị thiếu trong bộ `node_modules` đính kèm (`react-router-dom`, `axios`); không phát hiện lỗi TypeScript trong source. Tệp stub kiểm tra không được đưa vào patch.
- Chưa xác nhận Maven compile/test: Maven Wrapper không tải được Maven 3.9.16 từ Maven Central trong môi trường kiểm tra.

## Chạy trên máy phát triển

1. Backend: `cd backend` rồi `mvnw.cmd test` trên Windows (hoặc `mvnw.cmd -DskipTests compile`).
2. Frontend: `cd frontend`, `npm ci`, `npm run build`.
3. Đăng nhập bằng tài khoản `TENANT`; mở “Hợp đồng của tôi”, xem chi tiết và tải PDF.
4. Gọi API bằng tài khoản tenant không liên quan để xác nhận `GET /api/tenant/contracts/{id}` trả HTTP 403.
