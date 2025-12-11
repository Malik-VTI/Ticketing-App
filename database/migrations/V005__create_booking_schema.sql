-- Migration: V005 - Create Booking Domain Schema
-- Description: Creates tables for booking domain (bookings, booking_items)
-- Service: Booking Service

-- Create bookings table
CREATE TABLE bookings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booking_type VARCHAR(20) NOT NULL, -- flight, train, hotel
    total_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, expired
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_booking_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create booking_items table
CREATE TABLE booking_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    booking_id UNIQUEIDENTIFIER NOT NULL,
    item_type VARCHAR(20) NOT NULL, -- flight, train, hotel
    item_ref_id UNIQUEIDENTIFIER NOT NULL, -- references flight_schedule.id / train_schedule.id / room_rate.id
    price DECIMAL(18,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    metadata NVARCHAR(MAX), -- JSON string for seat numbers, room numbers, etc.
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_booking_item_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Create indexes for booking domain
CREATE INDEX IX_bookings_user_id ON bookings(user_id);
CREATE INDEX IX_bookings_booking_reference ON bookings(booking_reference);
CREATE INDEX IX_bookings_status ON bookings(status);
CREATE INDEX IX_bookings_created_at ON bookings(created_at);
CREATE INDEX IX_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IX_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IX_booking_items_item_type ON booking_items(item_type);
CREATE INDEX IX_booking_items_item_ref_id ON booking_items(item_ref_id);

