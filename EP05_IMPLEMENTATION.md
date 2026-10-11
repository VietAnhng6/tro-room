# EP-05 — Theo dõi tiến độ chốt chỉ số theo kỳ

## Nội dung
- Trang nhập chỉ số hiển thị bảng tiến độ theo từng tòa nhà và kỳ: tổng phòng đang thuê, đã chốt, còn thiếu, tỷ lệ hoàn thành và người quản lý phụ trách.
- Bấm số phòng còn thiếu để chọn tòa nhà và lọc danh sách phòng chưa chốt.
- API trả thêm trạng thái `locked` cho từng phòng. Nếu hóa đơn của hợp đồng trong kỳ có trạng thái `ISSUED`, frontend khóa trường nhập và backend từ chối thao tác lưu với mã `PERIOD_LOCKED`.
- Trang chủ chủ nhà hiển thị cảnh báo khi đến ngày cuối tháng mà vẫn còn phòng chưa chốt chỉ số.

## API hiện dùng
- `GET /api/manager/meter-readings/buildings`
- `GET /api/manager/meter-readings?buildingId={id}&period=yyyy-MM`
- `POST /api/manager/meter-readings`

## Kiểm thử cần chạy trong môi trường dự án
1. Chạy backend với PostgreSQL và frontend theo README hiện tại.
2. Đăng nhập tài khoản chủ nhà có ít nhất một tòa nhà, chọn kỳ và kiểm tra tổng phòng/đã chốt/còn thiếu.
3. Bấm số phòng còn thiếu; danh sách chỉ còn các phòng chưa chốt và thông tin quản lý hiển thị theo tòa.
4. Lưu một chỉ số trong kỳ chưa phát hành hóa đơn, xác nhận số liệu tiến độ cập nhật.
5. Phát hành hóa đơn ở trạng thái `ISSUED`, quay lại kỳ đó và xác nhận trường nhập bị khóa; gọi trực tiếp API lưu phải nhận HTTP 409 `PERIOD_LOCKED`.
6. Để kỳ hiện tại đến ngày cuối tháng với phòng còn thiếu và kiểm tra cảnh báo trang chủ chủ nhà.

## Ghi chú
Môi trường đóng gói này không có `.git`; do đó không thể xác minh remote/nhánh GitHub từ ZIP. Việc build tự động cũng cần tải Maven/npm dependencies nhưng kết nối tải phụ thuộc chưa thành công trong môi trường hiện tại.
