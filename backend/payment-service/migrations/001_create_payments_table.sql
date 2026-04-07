-- Migration: Create payments table for the payment service
-- Run this against your ticketing_app database

CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY,
    booking_id      UUID NOT NULL,
    user_id         UUID NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'IDR',
    status          VARCHAR(20) NOT NULL DEFAULT 'initiated',
    payment_method  VARCHAR(30) NOT NULL,
    provider_response TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_status CHECK (status IN ('initiated', 'succeeded', 'failed', 'refunded')),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('bank_transfer', 'ewallet', 'credit_card')),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
