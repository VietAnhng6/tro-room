-- S4-07: manager maintenance workflow.
-- Keep S4-06 schema intact; only add fields and history.

ALTER TABLE maintenance_reports
    ADD COLUMN IF NOT EXISTS repair_cost BIGINT,
    ADD COLUMN IF NOT EXISTS cost_payer VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tenant_invoice_pending BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS maintenance_report_status_history (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL
        REFERENCES maintenance_reports(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    note VARCHAR(3000) NOT NULL,
    changed_by BIGINT NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_report_history_report
    ON maintenance_report_status_history(report_id, changed_at);

-- Liên kết dòng hóa đơn với báo sửa chữa để tránh tính trùng.
ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS maintenance_report_id BIGINT
        REFERENCES maintenance_reports(id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_invoice_item_maintenance_report
    ON invoice_items(maintenance_report_id)
    WHERE maintenance_report_id IS NOT NULL;