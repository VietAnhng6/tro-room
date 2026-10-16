-- S4-06: tenant maintenance/breakage reports and their private photo attachments.
CREATE TABLE IF NOT EXISTS maintenance_reports (
    id BIGSERIAL PRIMARY KEY,
    report_code VARCHAR(20) NOT NULL UNIQUE,
    tenant_id BIGINT NOT NULL REFERENCES users(id),
    contract_id BIGINT NOT NULL REFERENCES rental_contracts(id),
    room_id BIGINT NOT NULL REFERENCES rooms(id),
    device_type VARCHAR(120) NOT NULL,
    description VARCHAR(3000) NOT NULL,
    urgency VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    manager_response VARCHAR(3000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_report_tenant_created
    ON maintenance_reports(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_report_contract
    ON maintenance_reports(contract_id);

CREATE TABLE IF NOT EXISTS maintenance_report_photos (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES maintenance_reports(id) ON DELETE CASCADE,
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_photo_report
    ON maintenance_report_photos(report_id);
