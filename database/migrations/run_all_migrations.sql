-- Master Migration Script
-- Description: Runs all database migrations in order
-- Usage: Execute this script against your PostgreSQL database to set up all schemas
-- 
-- Prerequisites:
-- 1. PostgreSQL instance running
-- 2. Database created (or use existing database)
-- 3. Appropriate permissions to create tables, indexes, and foreign keys
--
-- To run this script:
-- psql -h <server> -U <user> -d <database> -f run_all_migrations.sql

\echo 'Starting database migrations...'
\echo '================================'

-- V000: Extensions
\echo 'Running V000: Enable Extensions...'
\i V000__enable_extensions.sql
\echo 'V000 completed.'

-- V001: Users Schema
\echo 'Running V001: Create Users Schema...'
\i V001__create_users_schema.sql
\echo 'V001 completed.'

-- V002: Flight Domain Schema
\echo 'Running V002: Create Flight Domain Schema...'
\i V002__create_flight_schema.sql
\echo 'V002 completed.'

-- V003: Train Domain Schema
\echo 'Running V003: Create Train Domain Schema...'
\i V003__create_train_schema.sql
\echo 'V003 completed.'

-- V004: Hotel Domain Schema
\echo 'Running V004: Create Hotel Domain Schema...'
\i V004__create_hotel_schema.sql
\echo 'V004 completed.'

-- V005: Booking Domain Schema
\echo 'Running V005: Create Booking Domain Schema...'
\i V005__create_booking_schema.sql
\echo 'V005 completed.'

-- V006: Payment Domain Schema
\echo 'Running V006: Create Payment Domain Schema...'
\i V006__create_payment_schema.sql
\echo 'V006 completed.'

-- V007: Coupon Schema
\echo 'Running V007: Create Coupon Schema...'
\i V007__create_coupon_schema.sql
\echo 'V007 completed.'

-- V008: Audit Log Schema
\echo 'Running V008: Create Audit Log Schema...'
\i V008__create_audit_log_schema.sql
\echo 'V008 completed.'

-- V009: Additional Indexes
\echo 'Running V009: Create Additional Indexes...'
\i V009__create_additional_indexes.sql
\echo 'V009 completed.'

\echo '================================'
\echo 'All migrations completed successfully!'



