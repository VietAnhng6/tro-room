-- Sprint 2 migration: S2-07 / S2-08 (landlord xử lý yêu cầu thuê)
-- Run after V2__sprint2_listings_requests.sql

ALTER TABLE rental_requests
    ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(30),
    ADD COLUMN IF NOT EXISTS reject_note   TEXT;

CREATE INDEX IF NOT EXISTS idx_rental_requests_status_created
    ON rental_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS rental_request_history (
    id          BIGSERIAL PRIMARY KEY,
    request_id  BIGINT      NOT NULL REFERENCES rental_requests(id),
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    actor_id    BIGINT      NOT NULL REFERENCES users(id),
    note        TEXT,
    created_at  TIMESTAMP   NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rr_history_request
    ON rental_request_history(request_id, created_at);