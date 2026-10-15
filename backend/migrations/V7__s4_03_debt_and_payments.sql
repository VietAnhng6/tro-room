-- S4-03: Xem công nợ theo phòng và theo toà
-- Bổ sung trường paid_amount để theo dõi số tiền đã thanh toán của từng hoá đơn
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS paid_amount BIGINT NOT NULL DEFAULT 0;
