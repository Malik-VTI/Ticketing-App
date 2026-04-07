-- Sample Data Seeding Script
-- This script inserts sample data for development and testing
-- WARNING: This will insert test data. Use only in development environments!
-- Seeding sample data...

-- Seed Airlines
-- Inserting sample airlines...
INSERT INTO airlines (id, code, name)
VALUES
  (uuid_generate_v4(), 'GA', 'Garuda Indonesia'),
  (uuid_generate_v4(), 'SJ', 'Sriwijaya Air'),
  (uuid_generate_v4(), 'ID', 'Batik Air'),
  (uuid_generate_v4(), 'QG', 'Citilink')
ON CONFLICT (code) DO NOTHING;
-- Airlines seeded.

-- Seed Airports
-- Inserting sample airports...
INSERT INTO airports (id, code, name, city, country)
VALUES
  (uuid_generate_v4(), 'CGK', 'Soekarno-Hatta International Airport', 'Jakarta', 'Indonesia'),
  (uuid_generate_v4(), 'DPS', 'Ngurah Rai International Airport', 'Denpasar', 'Indonesia'),
  (uuid_generate_v4(), 'SUB', 'Juanda International Airport', 'Surabaya', 'Indonesia'),
  (uuid_generate_v4(), 'YIA', 'Yogyakarta International Airport', 'Yogyakarta', 'Indonesia')
ON CONFLICT (code) DO NOTHING;
-- Airports seeded.

-- Seed Stations
-- Inserting sample train stations...
INSERT INTO stations (id, code, name, city)
VALUES
  (uuid_generate_v4(), 'GMR', 'Gambir', 'Jakarta'),
  (uuid_generate_v4(), 'BD', 'Bandung', 'Bandung'),
  (uuid_generate_v4(), 'YK', 'Yogyakarta', 'Yogyakarta'),
  (uuid_generate_v4(), 'SLO', 'Solo Balapan', 'Surakarta')
ON CONFLICT (code) DO NOTHING;
-- Stations seeded.

-- Seed Hotels
-- Inserting sample hotels...
INSERT INTO hotels (id, name, address, city, rating)
SELECT uuid_generate_v4(), v.name, v.address, v.city, v.rating
FROM (
  VALUES
    ('Grand Indonesia Hotel', 'Jl. MH Thamrin No.1', 'Jakarta', 4.5::numeric),
    ('The Ritz-Carlton Jakarta', 'Jl. Lingkar Mega Kuningan', 'Jakarta', 5.0::numeric),
    ('Amanjiwo Resort', 'Jl. Magelang-Yogyakarta', 'Yogyakarta', 4.8::numeric),
    ('The Westin Resort Nusa Dua', 'Nusa Dua', 'Bali', 4.7::numeric)
) AS v(name, address, city, rating)
WHERE NOT EXISTS (
  SELECT 1 FROM hotels h WHERE h.name = v.name
);
-- Hotels seeded.

-- Note: This is a basic seed script. You may want to add more comprehensive data
-- including flights, trains, schedules, rooms, etc. based on your testing needs.

-- Sample data seeding complete!
-- Note: This is minimal seed data. Add more data as needed for testing.

