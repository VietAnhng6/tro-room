-- S2-06: tenant rental/viewing requests.
-- Run after the base schema and the S2-05 listing-detail migration.

CREATE TABLE IF NOT EXISTS rental_requests (
    id BIGSERIAL PRIMARY KEY,
    request_code VARCHAR(20) NOT NULL UNIQUE,
    listing_id BIGINT NOT NULL REFERENCES listings(id),
    tenant_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    desired_date DATE NOT NULL,
    expected_people INTEGER NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rental_requests_listing_tenant_status
    ON rental_requests(listing_id, tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant_created
    ON rental_requests(tenant_id, created_at DESC);

-- At most one OPEN request for the same tenant and listing.
CREATE UNIQUE INDEX IF NOT EXISTS uk_rental_request_listing_tenant_open
    ON rental_requests(listing_id, tenant_id)
    WHERE status = 'OPEN';
