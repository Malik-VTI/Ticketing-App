-- Sample Data Seeding Script
-- This script inserts sample data for development and testing
-- WARNING: This will insert test data. Use only in development environments!

USE ticketing_db;
GO

PRINT 'Seeding sample data...';
PRINT '';

-- Seed Airlines
PRINT 'Inserting sample airlines...';
IF NOT EXISTS (SELECT 1 FROM airlines WHERE code = 'GA')
    INSERT INTO airlines (id, code, name) VALUES (NEWID(), 'GA', 'Garuda Indonesia');
IF NOT EXISTS (SELECT 1 FROM airlines WHERE code = 'SJ')
    INSERT INTO airlines (id, code, name) VALUES (NEWID(), 'SJ', 'Sriwijaya Air');
IF NOT EXISTS (SELECT 1 FROM airlines WHERE code = 'ID')
    INSERT INTO airlines (id, code, name) VALUES (NEWID(), 'ID', 'Batik Air');
IF NOT EXISTS (SELECT 1 FROM airlines WHERE code = 'QG')
    INSERT INTO airlines (id, code, name) VALUES (NEWID(), 'QG', 'Citilink');
PRINT 'Airlines seeded.';

-- Seed Airports
PRINT 'Inserting sample airports...';
IF NOT EXISTS (SELECT 1 FROM airports WHERE code = 'CGK')
    INSERT INTO airports (id, code, name, city, country) VALUES (NEWID(), 'CGK', 'Soekarno-Hatta International Airport', 'Jakarta', 'Indonesia');
IF NOT EXISTS (SELECT 1 FROM airports WHERE code = 'DPS')
    INSERT INTO airports (id, code, name, city, country) VALUES (NEWID(), 'DPS', 'Ngurah Rai International Airport', 'Denpasar', 'Indonesia');
IF NOT EXISTS (SELECT 1 FROM airports WHERE code = 'SUB')
    INSERT INTO airports (id, code, name, city, country) VALUES (NEWID(), 'SUB', 'Juanda International Airport', 'Surabaya', 'Indonesia');
IF NOT EXISTS (SELECT 1 FROM airports WHERE code = 'YIA')
    INSERT INTO airports (id, code, name, city, country) VALUES (NEWID(), 'YIA', 'Yogyakarta International Airport', 'Yogyakarta', 'Indonesia');
PRINT 'Airports seeded.';

-- Seed Stations
PRINT 'Inserting sample train stations...';
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'GMR')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'GMR', 'Gambir', 'Jakarta');
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'BD')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'BD', 'Bandung', 'Bandung');
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'YK')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'YK', 'Yogyakarta', 'Yogyakarta');
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'SLO')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'SLO', 'Solo Balapan', 'Surakarta');
PRINT 'Stations seeded.';

-- Seed Hotels
PRINT 'Inserting sample hotels...';
IF NOT EXISTS (SELECT 1 FROM hotels WHERE name = 'Grand Indonesia Hotel')
    INSERT INTO hotels (id, name, address, city, rating) VALUES (NEWID(), 'Grand Indonesia Hotel', 'Jl. MH Thamrin No.1', 'Jakarta', 4.5);
IF NOT EXISTS (SELECT 1 FROM hotels WHERE name = 'The Ritz-Carlton Jakarta')
    INSERT INTO hotels (id, name, address, city, rating) VALUES (NEWID(), 'The Ritz-Carlton Jakarta', 'Jl. Lingkar Mega Kuningan', 'Jakarta', 5.0);
IF NOT EXISTS (SELECT 1 FROM hotels WHERE name = 'Amanjiwo Resort')
    INSERT INTO hotels (id, name, address, city, rating) VALUES (NEWID(), 'Amanjiwo Resort', 'Jl. Magelang-Yogyakarta', 'Yogyakarta', 4.8);
IF NOT EXISTS (SELECT 1 FROM hotels WHERE name = 'The Westin Resort Nusa Dua')
    INSERT INTO hotels (id, name, address, city, rating) VALUES (NEWID(), 'The Westin Resort Nusa Dua', 'Nusa Dua', 'Bali', 4.7);
PRINT 'Hotels seeded.';

-- Note: This is a basic seed script. You may want to add more comprehensive data
-- including flights, trains, schedules, rooms, etc. based on your testing needs.

PRINT '';
PRINT 'Sample data seeding complete!';
PRINT 'Note: This is minimal seed data. Add more data as needed for testing.';
GO

