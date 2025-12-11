-- Migration: V002 - Create Flight Domain Schema
-- Description: Creates all tables for flight domain (airlines, airports, flights, schedules, seats, fares)
-- Service: Flight Service

-- Create airlines table
CREATE TABLE airlines (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2
);

-- Create airports table
CREATE TABLE airports (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    code VARCHAR(10) UNIQUE NOT NULL, -- IATA code
    name NVARCHAR(255) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    country NVARCHAR(100) NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2
);

-- Create flights table
CREATE TABLE flights (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    airline_id UNIQUEIDENTIFIER NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    origin_airport_id UNIQUEIDENTIFIER NOT NULL,
    destination_airport_id UNIQUEIDENTIFIER NOT NULL,
    duration_minutes INT NOT NULL,
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_flight_airline FOREIGN KEY (airline_id) REFERENCES airlines(id),
    CONSTRAINT FK_flight_origin_airport FOREIGN KEY (origin_airport_id) REFERENCES airports(id),
    CONSTRAINT FK_flight_destination_airport FOREIGN KEY (destination_airport_id) REFERENCES airports(id)
);

-- Create flight_schedules table
CREATE TABLE flight_schedules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flight_id UNIQUEIDENTIFIER NOT NULL,
    departure_time DATETIME2 NOT NULL,
    arrival_time DATETIME2 NOT NULL,
    departure_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, delayed, cancelled, completed
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_flight_schedule_flight FOREIGN KEY (flight_id) REFERENCES flights(id)
);

-- Create flight_seats table
CREATE TABLE flight_seats (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flight_schedule_id UNIQUEIDENTIFIER NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_class VARCHAR(20) NOT NULL, -- economy, business, first
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, held, booked
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_flight_seat_schedule FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id)
);

-- Create flight_fares table
CREATE TABLE flight_fares (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    flight_schedule_id UNIQUEIDENTIFIER NOT NULL,
    seat_class VARCHAR(20) NOT NULL, -- economy, business, first
    base_price DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    rules NVARCHAR(MAX), -- JSON string for fare rules
    created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2,
    CONSTRAINT FK_flight_fare_schedule FOREIGN KEY (flight_schedule_id) REFERENCES flight_schedules(id)
);

-- Create indexes for flight domain
CREATE INDEX IX_flights_airline_id ON flights(airline_id);
CREATE INDEX IX_flights_origin_airport_id ON flights(origin_airport_id);
CREATE INDEX IX_flights_destination_airport_id ON flights(destination_airport_id);
CREATE INDEX IX_flight_schedules_flight_id ON flight_schedules(flight_id);
CREATE INDEX IX_flight_schedules_departure_date ON flight_schedules(departure_date);
CREATE INDEX IX_flight_schedules_status ON flight_schedules(status);
CREATE INDEX IX_flight_seats_schedule_id ON flight_seats(flight_schedule_id);
CREATE INDEX IX_flight_seats_status ON flight_seats(status);
CREATE INDEX IX_flight_fares_schedule_id ON flight_fares(flight_schedule_id);
CREATE INDEX IX_flight_fares_seat_class ON flight_fares(seat_class);
CREATE INDEX IX_airports_code ON airports(code);
CREATE INDEX IX_airlines_code ON airlines(code);

