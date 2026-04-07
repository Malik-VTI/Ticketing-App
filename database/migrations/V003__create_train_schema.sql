-- Migration: V003 - Create Train Domain Schema
-- Description: Creates all tables for train domain (stations, trains, schedules, coaches, seats)
-- Service: Train Service

-- Create stations table
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create trains table
CREATE TABLE trains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_number VARCHAR(20) UNIQUE NOT NULL,
    operator VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create train_schedules table
CREATE TABLE train_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_id UUID NOT NULL,
    departure_station_id UUID NOT NULL,
    arrival_station_id UUID NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    departure_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, delayed, cancelled, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT FK_train_schedule_train FOREIGN KEY (train_id) REFERENCES trains(id),
    CONSTRAINT FK_train_schedule_departure_station FOREIGN KEY (departure_station_id) REFERENCES stations(id),
    CONSTRAINT FK_train_schedule_arrival_station FOREIGN KEY (arrival_station_id) REFERENCES stations(id)
);

-- Create coaches table
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    train_schedule_id UUID NOT NULL,
    coach_number VARCHAR(10) NOT NULL,
    coach_type VARCHAR(20) NOT NULL, -- economy, business, executive
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT FK_coach_train_schedule FOREIGN KEY (train_schedule_id) REFERENCES train_schedules(id)
);

-- Create coach_seats table
CREATE TABLE coach_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    class VARCHAR(20) NOT NULL, -- economy, business, executive
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, held, booked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT FK_coach_seat_coach FOREIGN KEY (coach_id) REFERENCES coaches(id)
);

-- Create indexes for train domain
CREATE INDEX IX_trains_train_number ON trains(train_number);
CREATE INDEX IX_train_schedules_train_id ON train_schedules(train_id);
CREATE INDEX IX_train_schedules_departure_station_id ON train_schedules(departure_station_id);
CREATE INDEX IX_train_schedules_arrival_station_id ON train_schedules(arrival_station_id);
CREATE INDEX IX_train_schedules_departure_date ON train_schedules(departure_date);
CREATE INDEX IX_train_schedules_status ON train_schedules(status);
CREATE INDEX IX_coaches_train_schedule_id ON coaches(train_schedule_id);
CREATE INDEX IX_coach_seats_coach_id ON coach_seats(coach_id);
CREATE INDEX IX_coach_seats_status ON coach_seats(status);
CREATE INDEX IX_stations_code ON stations(code);

