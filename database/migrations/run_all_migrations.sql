-- Master Migration Script
-- Description: Runs all database migrations in order
-- Usage: Execute this script against your MSSQL database to set up all schemas
-- 
-- Prerequisites:
-- 1. MSSQL Server instance running
-- 2. Database created (or use existing database)
-- 3. Appropriate permissions to create tables, indexes, and foreign keys
--
-- To run this script:
-- sqlcmd -S <server> -d <database> -i run_all_migrations.sql
-- Or use SQL Server Management Studio (SSMS)

PRINT 'Starting database migrations...';
PRINT '================================';

-- V001: Users Schema
PRINT 'Running V001: Create Users Schema...';
:r V001__create_users_schema.sql
PRINT 'V001 completed.';

-- V002: Flight Domain Schema
PRINT 'Running V002: Create Flight Domain Schema...';
:r V002__create_flight_schema.sql
PRINT 'V002 completed.';

-- V003: Train Domain Schema
PRINT 'Running V003: Create Train Domain Schema...';
:r V003__create_train_schema.sql
PRINT 'V003 completed.';

-- V004: Hotel Domain Schema
PRINT 'Running V004: Create Hotel Domain Schema...';
:r V004__create_hotel_schema.sql
PRINT 'V004 completed.';

-- V005: Booking Domain Schema
PRINT 'Running V005: Create Booking Domain Schema...';
:r V005__create_booking_schema.sql
PRINT 'V005 completed.';

-- V006: Payment Domain Schema
PRINT 'Running V006: Create Payment Domain Schema...';
:r V006__create_payment_schema.sql
PRINT 'V006 completed.';

-- V007: Coupon Schema
PRINT 'Running V007: Create Coupon Schema...';
:r V007__create_coupon_schema.sql
PRINT 'V007 completed.';

-- V008: Audit Log Schema
PRINT 'Running V008: Create Audit Log Schema...';
:r V008__create_audit_log_schema.sql
PRINT 'V008 completed.';

-- V009: Additional Indexes
PRINT 'Running V009: Create Additional Indexes...';
:r V009__create_additional_indexes.sql
PRINT 'V009 completed.';

PRINT '================================';
PRINT 'All migrations completed successfully!';



