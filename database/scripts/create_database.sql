-- Script to create the database (PostgreSQL)
-- Run this script first before running migrations
-- Usage:
--   psql -h <server> -U <user> -f create_database.sql
--
-- Notes:
-- - CREATE DATABASE cannot run inside a transaction block.
-- - This script uses psql variables; you can override with:
--   psql ... -v db_name=ticketing_app -f create_database.sql

\set db_name 'ticketing_app'

\echo 'Creating database (if missing):' :db_name

SELECT format('CREATE DATABASE %I', :'db_name')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')\gexec

\echo 'Database setup complete. You can now run migrations with:'
\echo '  psql -h <server> -U <user> -d' :db_name '-f ..\\migrations\\run_all_migrations.sql'



