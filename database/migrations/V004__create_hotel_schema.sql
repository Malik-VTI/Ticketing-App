-- Migration: V004 - Create Hotel Domain Schema
-- Description: Creates all tables for hotel domain (hotels, room_types, rooms, rates)
-- Service: Hotel Service

-- Create hotels table
CREATE TABLE hotels (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    address NVARCHAR(500),
    city NVARCHAR(100) NOT NULL,
    rating DECIMAL(2,1), -- e.g., 4.5
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2
);

-- Create room_types table
CREATE TABLE room_types (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    hotel_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    amenities NVARCHAR(MAX), -- JSON string for amenities
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_room_type_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

-- Create rooms table
CREATE TABLE rooms (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    room_type_id UNIQUEIDENTIFIER NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT,
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, occupied, maintenance
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_room_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

-- Create room_rates table
CREATE TABLE room_rates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    room_type_id UNIQUEIDENTIFIER NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_room_rate_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

-- Create indexes for hotel domain
CREATE INDEX IX_hotels_city ON hotels(city);
CREATE INDEX IX_room_types_hotel_id ON room_types(hotel_id);
CREATE INDEX IX_rooms_room_type_id ON rooms(room_type_id);
CREATE INDEX IX_rooms_status ON rooms(status);
CREATE INDEX IX_room_rates_room_type_id ON room_rates(room_type_id);
CREATE INDEX IX_room_rates_date ON room_rates(date);

