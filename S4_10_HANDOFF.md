# S4-10: Staging và dữ liệu nghiệm thu

## Khởi động

Tạo `.env.staging` tại thư mục gốc repo với `DB_PASSWORD`, `JWT_SECRET` (ít nhất 32 ký tự), `DEMO_PASSWORD`. Không commit tệp này.

```powershell
docker compose --env-file .env.staging -f compose.staging.yml config --quiet
docker compose --env-file .env.staging -f compose.staging.yml up -d --build
```

Mở http://localhost:8088. API có thể trả 502 khi backend vừa khởi động. `GET /api/auth/me` không có token trả 403 khi backend đã sẵn sàng.

## Tài khoản mẫu

Tất cả dùng mật khẩu trong biến `DEMO_PASSWORD` của `.env.staging`.

| Vai trò | Tài khoản |
| --- | --- |
| Admin | `admin@demo.local` |
| Chủ nhà | `landlord@demo.local` |
| Quản lý | `manager@demo.local` |
| Khách thuê | `tenant01@demo.local` đến `tenant20@demo.local` |

Seed tạo 2 tòa, 30 phòng, 20 hợp đồng và 60 hóa đơn trong 3 kỳ, gồm đã trả, trả thiếu và quá hạn.

## Reset và kiểm tra

Lệnh reset **xóa hai volume staging** (`staging_db`, `staging_uploads`) và tạo lại dữ liệu demo; không dùng trên môi trường có dữ liệu cần giữ.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\reset-demo.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\check-s4-10-permissions.ps1
```

Reset mục tiêu dưới 2 phút. Script phân quyền kiểm tra 78 trường hợp đại diện của bốn vai trò; kết quả mục tiêu `PASS: 78`, `FAIL: 0`. Script không bao phủ mọi endpoint.

## Kịch bản demo giao diện

1. Chủ nhà: mở Công nợ, xem hóa đơn trả thiếu và quá hạn.
2. Quản lý: mở Quản lý phòng, xem danh sách; thao tác sửa hiện `Chỉ xem`.
3. Khách thuê: mở Hóa đơn của tôi, xem hóa đơn của chính mình.
4. Admin: xem các màn hình theo quyền đọc; không sửa dữ liệu nghiệp vụ.
5. Sau demo, chạy lại `scripts\reset-demo.ps1` để khôi phục seed.

## Git

Trước commit, kiểm tra `git branch --show-current` là `feature/s4-10`, `git check-ignore .env.staging` in ra `.env.staging`, và `git diff --cached --check` không báo lỗi. Khi tạo Pull Request, chọn base `develop`, compare `feature/s4-10`. Không chọn `main`.
