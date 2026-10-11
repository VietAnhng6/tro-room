
-- S3-08: Ho tro chinh sua hoa don nhap.
-- Ghi chu cho cac khoan muc dieu chinh.
ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS note VARCHAR(500);
