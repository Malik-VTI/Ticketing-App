-- Migration: V006 - Create Payment Domain Schema
-- Description: Creates tables for payment domain (payments)
-- Service: Payment Service

-- Create payments table (payment_transactions)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    status VARCHAR(20) NOT NULL DEFAULT 'initiated', -- initiated, succeeded, failed, refunded
    payment_method VARCHAR(50), -- card, bank_transfer, ewallet
    provider_response JSONB, -- JSON for payment gateway response
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT FK_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT FK_payment_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for payment domain
CREATE INDEX IX_payments_booking_id ON payments(booking_id);
CREATE INDEX IX_payments_user_id ON payments(user_id);
CREATE INDEX IX_payments_status ON payments(status);
CREATE INDEX IX_payments_created_at ON payments(created_at);
CREATE INDEX IX_payments_payment_method ON payments(payment_method);

