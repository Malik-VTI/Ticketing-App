-- Seed Data for Hotels, Room Types, Rooms, and Room Rates
-- This script creates comprehensive test data for the hotel service
-- WARNING: This will insert test data. Use only in development environments!

PRINT 'Starting hotel data seeding...';
PRINT '';

-- ============================================
-- STEP 1: Insert Hotels
-- ============================================
PRINT 'Inserting hotels...';

DECLARE @hotel_jakarta1 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_jakarta2 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_bali1 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_bali2 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_bandung UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_surabaya1 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_surabaya2 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_yogyakarta1 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_yogyakarta2 UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_bogor UNIQUEIDENTIFIER = NEWID();
DECLARE @hotel_semarang UNIQUEIDENTIFIER = NEWID();

INSERT INTO hotels (id, name, address, city, rating, created_at, updated_at) VALUES
(@hotel_jakarta1, 'Grand Nusantara Hotel', 'Jl. Sudirman No.10', 'Jakarta', 4.5, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_jakarta2, 'Plaza Indonesia Hotel', 'Jl. MH Thamrin No.28-30', 'Jakarta', 4.7, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_bali1, 'Ocean View Resort', 'Jl. Pantai Kuta No.5', 'Bali', 4.8, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_bali2, 'Emerald Coast Resort', 'Jl. Pantai Sanur No.33', 'Bali', 4.7, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_bandung, 'Mountain Lodge', 'Jl. Raya Lembang No.12', 'Bandung', 4.2, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_surabaya1, 'City Light Hotel', 'Jl. Ahmad Yani No.20', 'Surabaya', 4.0, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_surabaya2, 'Harborfront Inn', 'Jl. Pelabuhan Tanjung Perak No.5', 'Surabaya', 3.9, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_yogyakarta1, 'Royal Heritage Hotel', 'Jl. Malioboro No.15', 'Yogyakarta', 4.6, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_yogyakarta2, 'Golden Palm Resort', 'Jl. Pantai Parangtritis No.8', 'Yogyakarta', 4.4, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_bogor, 'Blue Lagoon Hotel', 'Jl. Puncak Cipanas No.88', 'Bogor', 4.1, SYSUTCDATETIME(), SYSUTCDATETIME()),
(@hotel_semarang, 'Sunrise Boutique Hotel', 'Jl. Gajah Mada No.7', 'Semarang', 4.3, SYSUTCDATETIME(), SYSUTCDATETIME());

PRINT 'Hotels inserted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
PRINT '';

-- ============================================
-- STEP 2: Insert Room Types
-- ============================================
PRINT 'Inserting room types...';

-- Jakarta Hotel 1
DECLARE @rt_jkt1_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_jkt1_dlx UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_jkt1_suite UNIQUEIDENTIFIER = NEWID();

-- Jakarta Hotel 2
DECLARE @rt_jkt2_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_jkt2_dlx UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_jkt2_exec UNIQUEIDENTIFIER = NEWID();

-- Bali Hotel 1
DECLARE @rt_bali1_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bali1_villa UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bali1_beach UNIQUEIDENTIFIER = NEWID();

-- Bali Hotel 2
DECLARE @rt_bali2_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bali2_dlx UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bali2_villa UNIQUEIDENTIFIER = NEWID();

-- Bandung
DECLARE @rt_bdg_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bdg_sup UNIQUEIDENTIFIER = NEWID();

-- Surabaya Hotel 1
DECLARE @rt_sby1_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_sby1_dlx UNIQUEIDENTIFIER = NEWID();

-- Surabaya Hotel 2
DECLARE @rt_sby2_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_sby2_family UNIQUEIDENTIFIER = NEWID();

-- Yogyakarta Hotel 1
DECLARE @rt_yk1_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_yk1_cottage UNIQUEIDENTIFIER = NEWID();

-- Yogyakarta Hotel 2
DECLARE @rt_yk2_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_yk2_dlx UNIQUEIDENTIFIER = NEWID();

-- Bogor
DECLARE @rt_bgr_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_bgr_dlx UNIQUEIDENTIFIER = NEWID();

-- Semarang
DECLARE @rt_smg_std UNIQUEIDENTIFIER = NEWID();
DECLARE @rt_smg_sup UNIQUEIDENTIFIER = NEWID();

INSERT INTO room_types (id, hotel_id, name, capacity, amenities, created_at, updated_at) VALUES
-- Jakarta Hotel 1
(@rt_jkt1_std, @hotel_jakarta1, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "breakfast": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_jkt1_dlx, @hotel_jakarta1, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_jkt1_suite, @hotel_jakarta1, 'Suite Room', 4, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "bathtub": true, "breakfast": true, "balcony": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Jakarta Hotel 2
(@rt_jkt2_std, @hotel_jakarta2, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "breakfast": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_jkt2_dlx, @hotel_jakarta2, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_jkt2_exec, @hotel_jakarta2, 'Executive Suite', 4, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "bathtub": true, "breakfast": true, "workspace": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Bali Hotel 1
(@rt_bali1_std, @hotel_bali1, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "ocean_view": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bali1_villa, @hotel_bali1, 'Villa Room', 5, '{"wifi": true, "tv": true, "ac": true, "private_pool": true, "kitchen": true, "ocean_view": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bali1_beach, @hotel_bali1, 'Beachfront Suite', 4, '{"wifi": true, "tv": true, "ac": true, "ocean_view": true, "balcony": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Bali Hotel 2
(@rt_bali2_std, @hotel_bali2, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "garden_view": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bali2_dlx, @hotel_bali2, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "ocean_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bali2_villa, @hotel_bali2, 'Villa Room', 6, '{"wifi": true, "tv": true, "ac": true, "private_pool": true, "kitchen": true, "ocean_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Bandung
(@rt_bdg_std, @hotel_bandung, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "mountain_view": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bdg_sup, @hotel_bandung, 'Superior Room', 3, '{"wifi": true, "tv": true, "ac": true, "water_heater": true, "mountain_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Surabaya Hotel 1
(@rt_sby1_std, @hotel_surabaya1, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_sby1_dlx, @hotel_surabaya1, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Surabaya Hotel 2
(@rt_sby2_std, @hotel_surabaya2, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_sby2_family, @hotel_surabaya2, 'Family Room', 5, '{"wifi": true, "tv": true, "ac": true, "kitchen": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Yogyakarta Hotel 1
(@rt_yk1_std, @hotel_yogyakarta1, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "heritage_view": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_yk1_cottage, @hotel_yogyakarta1, 'Cottage Room', 4, '{"wifi": true, "tv": true, "ac": true, "terrace_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Yogyakarta Hotel 2
(@rt_yk2_std, @hotel_yogyakarta2, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "beach_view": false}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_yk2_dlx, @hotel_yogyakarta2, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "beach_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Bogor
(@rt_bgr_std, @hotel_bogor, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true, "nature_view": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_bgr_dlx, @hotel_bogor, 'Deluxe Room', 3, '{"wifi": true, "tv": true, "ac": true, "minibar": true, "nature_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),

-- Semarang
(@rt_smg_std, @hotel_semarang, 'Standard Room', 2, '{"wifi": true, "tv": true, "ac": true}', SYSUTCDATETIME(), SYSUTCDATETIME()),
(@rt_smg_sup, @hotel_semarang, 'Superior Room', 3, '{"wifi": true, "tv": true, "ac": true, "city_view": true, "breakfast": true}', SYSUTCDATETIME(), SYSUTCDATETIME());

PRINT 'Room types inserted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
PRINT '';

-- ============================================
-- STEP 3: Insert Rooms
-- ============================================
PRINT 'Inserting rooms...';

-- Helper function to insert multiple rooms
-- Jakarta Hotel 1 - Standard Rooms (10 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt1_std, 
    '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    1, 
    CASE WHEN num <= 8 THEN 'available' ELSE 'maintenance' END,
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Jakarta Hotel 1 - Deluxe Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt1_dlx, 
    '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    2,
    CASE WHEN num <= 6 THEN 'available' ELSE 'occupied' END,
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Jakarta Hotel 1 - Suite Rooms (5 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt1_suite, 
    '30' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    3, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 5 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Jakarta Hotel 2 - Standard Rooms (12 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt2_std, 
    '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    1, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 12 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Jakarta Hotel 2 - Deluxe Rooms (10 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt2_dlx, 
    '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    2, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Jakarta Hotel 2 - Executive Suites (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_jkt2_exec, 
    '30' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    3, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Bali Hotel 1 - Standard Rooms (15 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_bali1_std, 
    '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    1,
    CASE WHEN num <= 12 THEN 'available' ELSE 'occupied' END,
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 15 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Bali Hotel 1 - Villa Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_bali1_villa, 
    'V' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    0, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Bali Hotel 1 - Beachfront Suites (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT 
    NEWID(), 
    @rt_bali1_beach, 
    'B' + RIGHT('0' + CAST(num AS VARCHAR), 2), 
    1, 
    'available',
    SYSUTCDATETIME(), 
    SYSUTCDATETIME()
FROM (
    SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num
    FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b
) AS numbers;

-- Bali Hotel 2 - Standard Rooms (12 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bali2_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 12 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bali Hotel 2 - Deluxe Rooms (10 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bali2_dlx, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bali Hotel 2 - Villa Rooms (5 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bali2_villa, 'V' + RIGHT('0' + CAST(num AS VARCHAR), 2), 0, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 5 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bandung - Standard Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bdg_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bandung - Superior Rooms (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bdg_sup, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Surabaya Hotel 1 - Standard Rooms (10 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_sby1_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Surabaya Hotel 1 - Deluxe Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_sby1_dlx, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Surabaya Hotel 2 - Standard Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_sby2_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Surabaya Hotel 2 - Family Rooms (5 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_sby2_family, 'F' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 5 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Yogyakarta Hotel 1 - Standard Rooms (10 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_yk1_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 10 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Yogyakarta Hotel 1 - Cottage Rooms (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_yk1_cottage, 'C' + RIGHT('0' + CAST(num AS VARCHAR), 2), 0, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Yogyakarta Hotel 2 - Standard Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_yk2_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Yogyakarta Hotel 2 - Deluxe Rooms (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_yk2_dlx, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bogor - Standard Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bgr_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Bogor - Deluxe Rooms (5 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_bgr_dlx, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 5 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Semarang - Standard Rooms (8 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_smg_std, '10' + RIGHT('0' + CAST(num AS VARCHAR), 2), 1, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 8 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

-- Semarang - Superior Rooms (6 rooms)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT NEWID(), @rt_smg_sup, '20' + RIGHT('0' + CAST(num AS VARCHAR), 2), 2, 'available', SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (SELECT TOP 6 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS num FROM sys.all_objects AS a CROSS JOIN sys.all_objects AS b) AS numbers;

PRINT 'Rooms inserted: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
PRINT '';

-- ============================================
-- STEP 4: Insert Room Rates
-- ============================================
PRINT 'Inserting room rates...';

-- Generate rates for the next 90 days for all room types
-- Standard Room rates (lower price range)
DECLARE @base_date DATE = CAST(GETDATE() AS DATE);
DECLARE @day_offset INT = 0;

-- Jakarta Hotel 1 - Standard Room rates
WHILE @day_offset < 90
BEGIN
    DECLARE @rate_date DATE = DATEADD(DAY, @day_offset, @base_date);
    DECLARE @base_price DECIMAL(18,2) = 350000.00 + (ABS(CHECKSUM(NEWID())) % 100000); -- Random between 350k-450k
    
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
    VALUES (NEWID(), @rt_jkt1_std, @rate_date, @base_price, 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    
    SET @day_offset = @day_offset + 1;
END;

SET @day_offset = 0;
-- Jakarta Hotel 1 - Deluxe Room rates
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    SET @base_price = 550000.00 + (ABS(CHECKSUM(NEWID())) % 150000); -- Random between 550k-700k
    
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
    VALUES (NEWID(), @rt_jkt1_dlx, @rate_date, @base_price, 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    
    SET @day_offset = @day_offset + 1;
END;

SET @day_offset = 0;
-- Jakarta Hotel 1 - Suite Room rates
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    SET @base_price = 850000.00 + (ABS(CHECKSUM(NEWID())) % 200000); -- Random between 850k-1050k
    
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
    VALUES (NEWID(), @rt_jkt1_suite, @rate_date, @base_price, 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    
    SET @day_offset = @day_offset + 1;
END;

-- Jakarta Hotel 2 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_jkt2_std, @rate_date, 380000.00 + (ABS(CHECKSUM(NEWID())) % 100000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_jkt2_dlx, @rate_date, 600000.00 + (ABS(CHECKSUM(NEWID())) % 150000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_jkt2_exec, @rate_date, 950000.00 + (ABS(CHECKSUM(NEWID())) % 200000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Bali Hotel 1 rates (higher prices for resort)
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_bali1_std, @rate_date, 450000.00 + (ABS(CHECKSUM(NEWID())) % 150000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bali1_villa, @rate_date, 1200000.00 + (ABS(CHECKSUM(NEWID())) % 500000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bali1_beach, @rate_date, 800000.00 + (ABS(CHECKSUM(NEWID())) % 300000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Bali Hotel 2 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_bali2_std, @rate_date, 420000.00 + (ABS(CHECKSUM(NEWID())) % 130000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bali2_dlx, @rate_date, 650000.00 + (ABS(CHECKSUM(NEWID())) % 200000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bali2_villa, @rate_date, 1100000.00 + (ABS(CHECKSUM(NEWID())) % 400000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Bandung rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_bdg_std, @rate_date, 280000.00 + (ABS(CHECKSUM(NEWID())) % 80000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bdg_sup, @rate_date, 400000.00 + (ABS(CHECKSUM(NEWID())) % 100000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Surabaya Hotel 1 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_sby1_std, @rate_date, 320000.00 + (ABS(CHECKSUM(NEWID())) % 90000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_sby1_dlx, @rate_date, 500000.00 + (ABS(CHECKSUM(NEWID())) % 120000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Surabaya Hotel 2 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_sby2_std, @rate_date, 300000.00 + (ABS(CHECKSUM(NEWID())) % 80000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_sby2_family, @rate_date, 600000.00 + (ABS(CHECKSUM(NEWID())) % 150000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Yogyakarta Hotel 1 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_yk1_std, @rate_date, 350000.00 + (ABS(CHECKSUM(NEWID())) % 100000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_yk1_cottage, @rate_date, 550000.00 + (ABS(CHECKSUM(NEWID())) % 150000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Yogyakarta Hotel 2 rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_yk2_std, @rate_date, 330000.00 + (ABS(CHECKSUM(NEWID())) % 90000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_yk2_dlx, @rate_date, 520000.00 + (ABS(CHECKSUM(NEWID())) % 130000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Bogor rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
    INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_bgr_std, @rate_date, 290000.00 + (ABS(CHECKSUM(NEWID())) % 80000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_bgr_dlx, @rate_date, 450000.00 + (ABS(CHECKSUM(NEWID())) % 110000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

-- Semarang rates
SET @day_offset = 0;
WHILE @day_offset < 90
BEGIN
    SET @rate_date = DATEADD(DAY, @day_offset, @base_date);
INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at) VALUES
    (NEWID(), @rt_smg_std, @rate_date, 310000.00 + (ABS(CHECKSUM(NEWID())) % 85000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME()),
    (NEWID(), @rt_smg_sup, @rate_date, 470000.00 + (ABS(CHECKSUM(NEWID())) % 120000), 'IDR', SYSUTCDATETIME(), SYSUTCDATETIME());
    SET @day_offset = @day_offset + 1;
END;

PRINT 'Room rates inserted for next 90 days';
PRINT '';

PRINT '========================================';
PRINT 'Hotel data seeding completed successfully!';
PRINT '========================================';
PRINT 'Summary:';
PRINT '  - Hotels: 11';
PRINT '  - Room Types: 22';
PRINT '  - Rooms: ~200+';
PRINT '  - Room Rates: 90 days x 22 room types = ~1980 rates';
PRINT '';
