-- S3-06: Chủ nhà phát hành hoá đơn tháng cho cả toà.
-- Chạy sau các migration trước (sau V4__s3_05_meter_readings.sql).

CREATE TABLE IF NOT EXISTS invoices (
    id               BIGSERIAL PRIMARY KEY,
    invoice_code     VARCHAR(30) NOT NULL UNIQUE,
    contract_id      BIGINT      NOT NULL REFERENCES rental_contracts(id),
    room_id          BIGINT      NOT NULL REFERENCES rooms(id),
    period           VARCHAR(7)  NOT NULL,            -- kỳ áp dụng, dạng yyyy-MM
    rent_amount      BIGINT      NOT NULL,
    total_amount     BIGINT      NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    issue_date       DATE        NOT NULL,
    due_date         DATE        NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    row_version      BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT uk_invoice_contract_period UNIQUE (contract_id, period)
);

CREATE INDEX IF NOT EXISTS idx_invoice_room_period
    ON invoices(room_id, period);

CREATE INDEX IF NOT EXISTS idx_invoice_status_due
    ON invoices(status, due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
    id               BIGSERIAL PRIMARY KEY,
    invoice_id       BIGINT      NOT NULL REFERENCES invoices(id),
    label            VARCHAR(150) NOT NULL,
    type             VARCHAR(20) NOT NULL,
    quantity         INTEGER     NOT NULL,
    unit             VARCHAR(20) NOT NULL,
    unit_price       BIGINT      NOT NULL,
    amount           BIGINT      NOT NULL,
    previous_reading INTEGER,
    current_reading  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
    ON invoice_items(invoice_id);
