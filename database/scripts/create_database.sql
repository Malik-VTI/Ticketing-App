-- Script to create the database
-- Run this script first before running migrations
-- Usage: sqlcmd -S <server> -i create_database.sql

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ticketing_db')
BEGIN
    CREATE DATABASE ticketing_db;
    PRINT 'Database ticketing_db created successfully.';
END
ELSE
BEGIN
    PRINT 'Database ticketing_db already exists.';
END
GO

-- Use the database
USE ticketing_db;
GO

PRINT 'Database setup complete. You can now run migrations.';
GO



