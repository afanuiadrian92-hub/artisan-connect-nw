-- Run this in psql to add CamPay-specific columns to existing tables
-- psql -U postgres -d trustlink_db -f server/db/migrations/001_campay_columns.sql

-- Payments table additions
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_reference  VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payer_phone         VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS financial_transaction_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS campay_code         VARCHAR(50);

-- Bookings table additions
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_state VARCHAR(20) DEFAULT 'pending';

-- Users table additions (for suspension feature)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Verify additions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('payments', 'bookings', 'users')
  AND column_name IN (
    'external_reference', 'payer_phone', 'financial_transaction_id',
    'campay_code', 'payment_state', 'is_suspended'
  )
ORDER BY table_name, column_name;