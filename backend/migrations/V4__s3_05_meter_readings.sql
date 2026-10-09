-- S3-05: Quản lý toà nhà nhập chỉ số điện nước cuối kỳ
-- Chạy được trên cơ sở dữ liệu rỗng (sau các migration trước đó).

CREATE TABLE IF NOT EXISTS meter_readings (
    id               BIGSERIAL PRIMARY KEY,
    contract_id      BIGINT      NOT NULL REFERENCES rental_contracts(id),
    room_id          BIGINT      NOT NULL REFERENCES rooms(id),
    period           VARCHAR(7)  NOT NULL,            -- kỳ ghi, dạng yyyy-MM
    electricity_prev INTEGER     NOT NULL,
    electricity      INTEGER     NOT NULL,
    water_prev       INTEGER     NOT NULL,
    water            INTEGER     NOT NULL,
    recorded_by      BIGINT      NOT NULL REFERENCES users(id),
    recorded_at      TIMESTAMP   NOT NULL,
    row_version      BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT uk_meter_contract_period UNIQUE (contract_id, period),
    CONSTRAINT ck_meter_electricity CHECK (electricity >= electricity_prev),
    CONSTRAINT ck_meter_water CHECK (water >= water_prev)
);

CREATE INDEX IF NOT EXISTS idx_meter_room_period
    ON meter_readings(room_id, period);
