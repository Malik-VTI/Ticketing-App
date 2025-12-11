-- Rollback Script
-- WARNING: This will delete ALL tables and data!
-- Use only in development or when you need to completely reset the database
-- Run this script to remove all database objects created by migrations

USE ticketing_db;
GO

PRINT '========================================';
PRINT 'WARNING: This will delete all tables!';
PRINT '========================================';
PRINT '';

-- Disable foreign key constraints temporarily
EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";
GO

-- Drop tables in reverse order of creation (to respect foreign key dependencies)
PRINT 'Dropping tables...';

IF OBJECT_ID('audit_logs', 'U') IS NOT NULL DROP TABLE audit_logs;
PRINT '  - audit_logs dropped';

IF OBJECT_ID('booking_coupons', 'U') IS NOT NULL DROP TABLE booking_coupons;
PRINT '  - booking_coupons dropped';

IF OBJECT_ID('coupons', 'U') IS NOT NULL DROP TABLE coupons;
PRINT '  - coupons dropped';

IF OBJECT_ID('payments', 'U') IS NOT NULL DROP TABLE payments;
PRINT '  - payments dropped';

IF OBJECT_ID('booking_items', 'U') IS NOT NULL DROP TABLE booking_items;
PRINT '  - booking_items dropped';

IF OBJECT_ID('bookings', 'U') IS NOT NULL DROP TABLE bookings;
PRINT '  - bookings dropped';

IF OBJECT_ID('room_rates', 'U') IS NOT NULL DROP TABLE room_rates;
PRINT '  - room_rates dropped';

IF OBJECT_ID('rooms', 'U') IS NOT NULL DROP TABLE rooms;
PRINT '  - rooms dropped';

IF OBJECT_ID('room_types', 'U') IS NOT NULL DROP TABLE room_types;
PRINT '  - room_types dropped';

IF OBJECT_ID('hotels', 'U') IS NOT NULL DROP TABLE hotels;
PRINT '  - hotels dropped';

IF OBJECT_ID('coach_seats', 'U') IS NOT NULL DROP TABLE coach_seats;
PRINT '  - coach_seats dropped';

IF OBJECT_ID('coaches', 'U') IS NOT NULL DROP TABLE coaches;
PRINT '  - coaches dropped';

IF OBJECT_ID('train_schedules', 'U') IS NOT NULL DROP TABLE train_schedules;
PRINT '  - train_schedules dropped';

IF OBJECT_ID('trains', 'U') IS NOT NULL DROP TABLE trains;
PRINT '  - trains dropped';

IF OBJECT_ID('stations', 'U') IS NOT NULL DROP TABLE stations;
PRINT '  - stations dropped';

IF OBJECT_ID('flight_fares', 'U') IS NOT NULL DROP TABLE flight_fares;
PRINT '  - flight_fares dropped';

IF OBJECT_ID('flight_seats', 'U') IS NOT NULL DROP TABLE flight_seats;
PRINT '  - flight_seats dropped';

IF OBJECT_ID('flight_schedules', 'U') IS NOT NULL DROP TABLE flight_schedules;
PRINT '  - flight_schedules dropped';

IF OBJECT_ID('flights', 'U') IS NOT NULL DROP TABLE flights;
PRINT '  - flights dropped';

IF OBJECT_ID('airports', 'U') IS NOT NULL DROP TABLE airports;
PRINT '  - airports dropped';

IF OBJECT_ID('airlines', 'U') IS NOT NULL DROP TABLE airlines;
PRINT '  - airlines dropped';

IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
PRINT '  - users dropped';

PRINT '';
PRINT '========================================';
PRINT 'All tables dropped successfully!';
PRINT 'You can now re-run migrations if needed.';
PRINT '========================================';
GO



