-- Rollback Script
-- WARNING: This will delete ALL tables and data!
-- Use only in development or when you need to completely reset the database
-- Run this script to remove all database objects created by migrations

\echo '========================================'
\echo 'WARNING: This will delete all tables!'
\echo '========================================'
\echo ''
\echo 'Dropping tables...'

-- Drop in reverse order; CASCADE removes dependent objects safely.
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS booking_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS room_rates CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS coach_seats CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;
DROP TABLE IF EXISTS train_schedules CASCADE;
DROP TABLE IF EXISTS trains CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS flight_fares CASCADE;
DROP TABLE IF EXISTS flight_seats CASCADE;
DROP TABLE IF EXISTS flight_schedules CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS airports CASCADE;
DROP TABLE IF EXISTS airlines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

\echo ''
\echo '========================================'
\echo 'All tables dropped successfully!'
\echo 'You can now re-run migrations if needed.'
\echo '========================================'



