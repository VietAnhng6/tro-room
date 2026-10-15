
-- S4-02: Luu tung lan thanh toan cua mot hoa don.
CREATE TABLE IF NOT EXISTS invoice_payments (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    received_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('CASH', 'TRANSFER', 'QR', 'OTHER')),
    confirmed_by BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    cancel_reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    CONSTRAINT chk_invoice_payment_cancellation
        CHECK (
            (
                status = 'CONFIRMED'
                AND cancelled_at IS NULL
                AND cancel_reason IS NULL
            )
            OR
            (
                status = 'CANCELLED'
                AND cancelled_at IS NOT NULL
                AND cancel_reason IS NOT NULL
                AND LENGTH(TRIM(cancel_reason)) > 0
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_invoice
    ON invoice_payments(invoice_id, status);
