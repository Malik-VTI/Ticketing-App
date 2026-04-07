-- Verification Script
-- Run this after migrations to verify all tables and indexes were created correctly

\echo '========================================'
\echo 'Database Setup Verification (PostgreSQL)'
\echo '========================================'
\echo ''

-- Check all tables
\echo '1. Checking Tables...'
\echo '----------------------------------------'
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY table_name;

\echo ''
\echo 'Expected Tables:'
\echo '  - users'
\echo '  - airlines, airports, flights, flight_schedules, flight_seats, flight_fares'
\echo '  - stations, trains, train_schedules, coaches, coach_seats'
\echo '  - hotels, room_types, rooms, room_rates'
\echo '  - bookings, booking_items'
\echo '  - payments'
\echo '  - coupons, booking_coupons'
\echo '  - audit_logs'
\echo ''

-- Check foreign keys
\echo '2. Checking Foreign Key Constraints...'
\echo '----------------------------------------'
SELECT
  tc.constraint_name AS foreign_key,
  tc.table_name AS parent_table,
  kcu.column_name AS parent_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY parent_table, foreign_key;

\echo ''

-- Check indexes
\echo '3. Checking Indexes...'
\echo '----------------------------------------'
SELECT
  tablename AS table_name,
  indexname AS index_name,
  CASE WHEN indexdef ILIKE '% unique %' THEN 'Yes' ELSE 'No' END AS is_unique,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''

-- Check primary keys
\echo '4. Checking Primary Keys...'
\echo '----------------------------------------'
SELECT
  tc.table_name,
  tc.constraint_name AS primary_key_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

\echo ''
\echo '========================================'
\echo 'Verification Complete!'
\echo '========================================'



