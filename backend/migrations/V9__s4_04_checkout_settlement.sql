-- S4-04: Xử lý trả phòng và tất toán tiền cọc có trừ hư hỏng.
-- Chạy sau các migration trước (sau V8__s4_03_debt_and_payments.sql).

-- Hợp đồng cần một trạng thái lưu trữ để phân biệt "Đã kết thúc" (ENDED)
-- với việc hết hạn tự nhiên theo ngày. Trước đây chỉ có cờ terminated.
ALTER TABLE rental_contracts
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Bảng tất toán lưu kết quả cuối cùng khi trả phòng.
-- refund_amount dương nghĩa là tiền hoàn lại cho khách, âm nghĩa là khách còn
-- phải trả thêm (số dương của nó là số tiền phải trả thêm).
CREATE TABLE IF NOT EXISTS settlements (
    id                    BIGSERIAL PRIMARY KEY,
    contract_id           BIGINT      NOT NULL REFERENCES rental_contracts(id),
    room_id               BIGINT      NOT NULL REFERENCES rooms(id),
    checkout_date         DATE        NOT NULL,
    last_electricity      INTEGER     NOT NULL,
    last_water            INTEGER     NOT NULL,
    final_electricity     INTEGER     NOT NULL,
    final_water           INTEGER     NOT NULL,
    final_invoice_id      BIGINT      REFERENCES invoices(id),
    deposit_amount        BIGINT      NOT NULL,
    total_deductions      BIGINT      NOT NULL DEFAULT 0,
    previous_debt         BIGINT      NOT NULL DEFAULT 0,
    final_invoice_amount  BIGINT      NOT NULL DEFAULT 0,
    refund_amount         BIGINT      NOT NULL DEFAULT 0,
    early_terminated      BOOLEAN     NOT NULL DEFAULT FALSE,
    termination_reason    VARCHAR(1000),
    created_by            BIGINT      NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP   NOT NULL,
    CONSTRAINT uk_settlement_contract UNIQUE (contract_id)
);

-- Các dòng khấu trừ trong bảng tất toán (hư hỏng, phạt cọc, ...).
CREATE TABLE IF NOT EXISTS settlement_items (
    id            BIGSERIAL PRIMARY KEY,
    settlement_id BIGINT      NOT NULL REFERENCES settlements(id),
    label         VARCHAR(150) NOT NULL,
    type          VARCHAR(30) NOT NULL,
    amount        BIGINT      NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_settlement_room
    ON settlements(room_id);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement
    ON settlement_items(settlement_id);
