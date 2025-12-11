-- Seed Train Data Script
-- This script inserts sample train data for development and testing
-- Run this after the train schema migration (V003)

USE ticketing_app;
GO

PRINT 'Seeding train data...';
PRINT '';

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
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'SBY')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'SBY', 'Surabaya Gubeng', 'Surabaya');
IF NOT EXISTS (SELECT 1 FROM stations WHERE code = 'MLG')
    INSERT INTO stations (id, code, name, city) VALUES (NEWID(), 'MLG', 'Malang', 'Malang');
PRINT 'Stations seeded.';

-- Seed Trains
PRINT 'Inserting sample trains...';
DECLARE @train1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @train2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @train3_id UNIQUEIDENTIFIER = NEWID();

IF NOT EXISTS (SELECT 1 FROM trains WHERE train_number = 'ARGO-001')
    INSERT INTO trains (id, train_number, operator) VALUES (@train1_id, 'ARGO-001', 'PT Kereta Api Indonesia');
IF NOT EXISTS (SELECT 1 FROM trains WHERE train_number = 'ARGO-002')
    INSERT INTO trains (id, train_number, operator) VALUES (@train2_id, 'ARGO-002', 'PT Kereta Api Indonesia');
IF NOT EXISTS (SELECT 1 FROM trains WHERE train_number = 'TURANGA-101')
    INSERT INTO trains (id, train_number, operator) VALUES (@train3_id, 'TURANGA-101', 'PT Kereta Api Indonesia');
PRINT 'Trains seeded.';

-- Get station IDs
DECLARE @gmr_id UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'GMR');
DECLARE @bd_id UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'BD');
DECLARE @yk_id UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'YK');
DECLARE @slo_id UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SLO');
DECLARE @sby_id UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SBY');

-- Seed Train Schedules
PRINT 'Inserting sample train schedules...';
DECLARE @schedule1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @schedule2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @schedule3_id UNIQUEIDENTIFIER = NEWID();

-- Schedule 1: Jakarta to Bandung (Tomorrow)
IF NOT EXISTS (SELECT 1 FROM train_schedules WHERE train_id = @train1_id AND departure_date = DATEADD(day, 1, CAST(GETDATE() AS DATE)))
BEGIN
    INSERT INTO train_schedules (id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status)
    VALUES (
        @schedule1_id,
        @train1_id,
        @gmr_id,
        @bd_id,
        DATEADD(hour, 8, DATEADD(day, 1, CAST(GETDATE() AS DATE))), -- 08:00 tomorrow
        DATEADD(hour, 11, DATEADD(day, 1, CAST(GETDATE() AS DATE))), -- 11:00 tomorrow
        DATEADD(day, 1, CAST(GETDATE() AS DATE)),
        'scheduled'
    );
END

-- Schedule 2: Jakarta to Yogyakarta (Tomorrow)
IF NOT EXISTS (SELECT 1 FROM train_schedules WHERE train_id = @train2_id AND departure_date = DATEADD(day, 1, CAST(GETDATE() AS DATE)))
BEGIN
    INSERT INTO train_schedules (id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status)
    VALUES (
        @schedule2_id,
        @train2_id,
        @gmr_id,
        @yk_id,
        DATEADD(hour, 9, DATEADD(day, 1, CAST(GETDATE() AS DATE))), -- 09:00 tomorrow
        DATEADD(hour, 16, DATEADD(day, 1, CAST(GETDATE() AS DATE))), -- 16:00 tomorrow
        DATEADD(day, 1, CAST(GETDATE() AS DATE)),
        'scheduled'
    );
END

-- Schedule 3: Bandung to Yogyakarta (Day after tomorrow)
IF NOT EXISTS (SELECT 1 FROM train_schedules WHERE train_id = @train3_id AND departure_date = DATEADD(day, 2, CAST(GETDATE() AS DATE)))
BEGIN
    INSERT INTO train_schedules (id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status)
    VALUES (
        @schedule3_id,
        @train3_id,
        @bd_id,
        @yk_id,
        DATEADD(hour, 10, DATEADD(day, 2, CAST(GETDATE() AS DATE))), -- 10:00 day after tomorrow
        DATEADD(hour, 17, DATEADD(day, 2, CAST(GETDATE() AS DATE))), -- 17:00 day after tomorrow
        DATEADD(day, 2, CAST(GETDATE() AS DATE)),
        'scheduled'
    );
END
PRINT 'Train schedules seeded.';

-- Seed Coaches for Schedule 1
PRINT 'Inserting coaches and seats for schedule 1...';
DECLARE @coach1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @coach2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @coach3_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type)
VALUES 
    (@coach1_id, @schedule1_id, 'A1', 'economy'),
    (@coach2_id, @schedule1_id, 'B1', 'business'),
    (@coach3_id, @schedule1_id, 'C1', 'executive');

-- Insert seats for coach 1 (economy - 40 seats)
DECLARE @seat_num INT = 1;
WHILE @seat_num <= 40
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach1_id, CAST(@seat_num AS VARCHAR), 'economy', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Insert seats for coach 2 (business - 30 seats)
SET @seat_num = 1;
WHILE @seat_num <= 30
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach2_id, CAST(@seat_num AS VARCHAR), 'business', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Insert seats for coach 3 (executive - 20 seats)
SET @seat_num = 1;
WHILE @seat_num <= 20
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach3_id, CAST(@seat_num AS VARCHAR), 'executive', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Seed Coaches for Schedule 2
PRINT 'Inserting coaches and seats for schedule 2...';
DECLARE @coach4_id UNIQUEIDENTIFIER = NEWID();
DECLARE @coach5_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type)
VALUES 
    (@coach4_id, @schedule2_id, 'A1', 'economy'),
    (@coach5_id, @schedule2_id, 'B1', 'business');

-- Insert seats for coach 4 (economy - 40 seats)
SET @seat_num = 1;
WHILE @seat_num <= 40
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach4_id, CAST(@seat_num AS VARCHAR), 'economy', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Insert seats for coach 5 (business - 30 seats)
SET @seat_num = 1;
WHILE @seat_num <= 30
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach5_id, CAST(@seat_num AS VARCHAR), 'business', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Seed Coaches for Schedule 3
PRINT 'Inserting coaches and seats for schedule 3...';
DECLARE @coach6_id UNIQUEIDENTIFIER = NEWID();
DECLARE @coach7_id UNIQUEIDENTIFIER = NEWID();
DECLARE @coach8_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type)
VALUES 
    (@coach6_id, @schedule3_id, 'A1', 'economy'),
    (@coach7_id, @schedule3_id, 'B1', 'business'),
    (@coach8_id, @schedule3_id, 'C1', 'executive');

-- Insert seats for coach 6 (economy - 40 seats)
SET @seat_num = 1;
WHILE @seat_num <= 40
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach6_id, CAST(@seat_num AS VARCHAR), 'economy', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Insert seats for coach 7 (business - 30 seats)
SET @seat_num = 1;
WHILE @seat_num <= 30
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach7_id, CAST(@seat_num AS VARCHAR), 'business', 'available');
    SET @seat_num = @seat_num + 1;
END

-- Insert seats for coach 8 (executive - 20 seats)
SET @seat_num = 1;
WHILE @seat_num <= 20
BEGIN
    INSERT INTO coach_seats (id, coach_id, seat_number, class, status)
    VALUES (NEWID(), @coach8_id, CAST(@seat_num AS VARCHAR), 'executive', 'available');
    SET @seat_num = @seat_num + 1;
END

PRINT '';
PRINT 'Train data seeding complete!';
PRINT 'Summary:';
PRINT '  - 6 stations created';
PRINT '  - 3 trains created';
PRINT '  - 3 train schedules created';
PRINT '  - 8 coaches created';
PRINT '  - 270 seats created (90 economy, 90 business, 90 executive)';
GO

x