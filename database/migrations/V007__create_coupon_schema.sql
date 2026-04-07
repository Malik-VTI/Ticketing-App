-- Migration: V007 - Create Coupon Schema
-- Description: Creates tables for coupon/promo management (coupons, booking_coupons)
-- Service: Admin Service / Pricing Service

-- Create coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
    value DECIMAL(18,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    usage_limit INT, -- NULL means unlimited
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create booking_coupons table (junction table for bookings and coupons)
CREATE TABLE booking_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL,
    coupon_id UUID NOT NULL,
    discount_amount DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT FK_booking_coupon_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT FK_booking_coupon_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

-- Create indexes for coupon domain
CREATE INDEX IX_coupons_code ON coupons(code);
CREATE INDEX IX_coupons_is_active ON coupons(is_active);
CREATE INDEX IX_coupons_start_date ON coupons(start_date);
CREATE INDEX IX_coupons_end_date ON coupons(end_date);
CREATE INDEX IX_booking_coupons_booking_id ON booking_coupons(booking_id);
CREATE INDEX IX_booking_coupons_coupon_id ON booking_coupons(coupon_id);

