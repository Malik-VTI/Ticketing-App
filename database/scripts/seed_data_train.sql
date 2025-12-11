------------ Insert Data Stations ------------------
INSERT INTO stations (id, code, name, city)
VALUES
(NEWID(), 'BDG', 'Bandung Station', 'Bandung'),
(NEWID(), 'GMR', 'Gambir Station', 'Jakarta'),
(NEWID(), 'YK', 'Yogyakarta Station', 'Yogyakarta'),
(NEWID(), 'SB', 'Surabaya Gubeng', 'Surabaya'),
(NEWID(), 'SMT', 'Semarang Tawang', 'Semarang'),
(NEWID(), 'ML', 'Malang Kota Baru', 'Malang'),
(NEWID(), 'MN', 'Madiun', 'Madiun'),
(NEWID(), 'KTA', 'Kutoarjo', 'Purworejo'),
(NEWID(), 'CN', 'Cirebon', 'Cirebon'),
(NEWID(), 'BOO', 'Bogor', 'Bogor'),
(NEWID(), 'JR', 'Jember', 'Jember'),
(NEWID(), 'PSE', 'Pasar Senen', 'Jakarta'),
(NEWID(), 'PWT', 'Purwokerto', 'Purwokerto'),
(NEWID(), 'CLP', 'Cilacap', 'Cilacap'),
(NEWID(), 'TGL', 'Tegal', 'Tegal'),
(NEWID(), 'SRD', 'Serang', 'Serang'),
(NEWID(), 'PDL', 'Padalarang', 'Bandung Barat'),
(NEWID(), 'LPN', 'Lempuyangan', 'Yogyakarta'),
(NEWID(), 'SGU', 'Surabaya Pasarturi', 'Surabaya'),
-- Stasiun Tambahan (belum masuk pada query sebelumnya):
(NEWID(), 'SLO', 'Solo Balapan', 'Surakarta'),
(NEWID(), 'BKS', 'Bekasi', 'Bekasi'),
(NEWID(), 'KD', 'Kediri', 'Kediri'),
(NEWID(), 'PB', 'Probolinggo', 'Probolinggo'),
(NEWID(), 'BWI', 'Banyuwangi Kota', 'Banyuwangi'),
(NEWID(), 'CKP', 'Cikampek', 'Karawang');

------- Insert Data Trains ---------------------------
DECLARE @t1 UNIQUEIDENTIFIER = NEWID();
DECLARE @t2 UNIQUEIDENTIFIER = NEWID();
DECLARE @t3 UNIQUEIDENTIFIER = NEWID();
DECLARE @t4 UNIQUEIDENTIFIER = NEWID();
DECLARE @t5 UNIQUEIDENTIFIER = NEWID();
DECLARE @t6 UNIQUEIDENTIFIER = NEWID();
DECLARE @t7 UNIQUEIDENTIFIER = NEWID();
DECLARE @t8 UNIQUEIDENTIFIER = NEWID();
DECLARE @t9 UNIQUEIDENTIFIER = NEWID();
DECLARE @t10 UNIQUEIDENTIFIER = NEWID();
DECLARE @t11 UNIQUEIDENTIFIER = NEWID();
DECLARE @t12 UNIQUEIDENTIFIER = NEWID();
DECLARE @t13 UNIQUEIDENTIFIER = NEWID();
DECLARE @t14 UNIQUEIDENTIFIER = NEWID();
DECLARE @t15 UNIQUEIDENTIFIER = NEWID();
DECLARE @t16 UNIQUEIDENTIFIER = NEWID();
DECLARE @t17 UNIQUEIDENTIFIER = NEWID();
DECLARE @t18 UNIQUEIDENTIFIER = NEWID();
DECLARE @t19 UNIQUEIDENTIFIER = NEWID();
DECLARE @t20 UNIQUEIDENTIFIER = NEWID();
DECLARE @t21 UNIQUEIDENTIFIER = NEWID();
DECLARE @t22 UNIQUEIDENTIFIER = NEWID();
DECLARE @t23 UNIQUEIDENTIFIER = NEWID();
DECLARE @t24 UNIQUEIDENTIFIER = NEWID();
DECLARE @t25 UNIQUEIDENTIFIER = NEWID();
DECLARE @t26 UNIQUEIDENTIFIER = NEWID();
DECLARE @t27 UNIQUEIDENTIFIER = NEWID();
DECLARE @t28 UNIQUEIDENTIFIER = NEWID();
DECLARE @t29 UNIQUEIDENTIFIER = NEWID();
DECLARE @t30 UNIQUEIDENTIFIER = NEWID();

INSERT INTO trains (id, train_number, operator)
VALUES
-- Kereta yang sudah ada (Menggunakan @t1 sampai @t4)
(@t1, 'ARGO-001', 'Argo Parahyangan'),
(@t2, 'ARGO-002', 'Argo Parahyangan'),
(@t3, 'BIMA-001', 'Bima'),
(@t4, 'GMG-001', 'Gumarang'),
-- Kereta Tambahan (Melanjutkan penomoran @t5 dan seterusnya)
(@t5, 'ARGO-DWP', 'Argo Dwipangga'),
(@t6, 'ARGO-WLJ', 'Argo Wilis'),
(@t7, 'ARGO-SBR', 'Argo Bromo Anggrek'),
(@t8, 'ARGO-JKT', 'Argo Jati'),
(@t9, 'GAJ-YKT', 'Gajayana'),
(@t10, 'TSN-BDG', 'Taksaka'),
(@t11, 'TSN-MLG', 'Turangga'),
(@t12, 'DWP-YKT', 'Dwipangga Tambahan'),
(@t13, 'PWT-SMR', 'Purwojaya'),
(@t14, 'HRN-JKT', 'Harina'),
(@t15, 'KJA-MLG', 'Kertajaya'),
(@t16, 'MRB-MLG', 'Malabar'),
(@t17, 'PLS-MLG', 'Mutiara Selatan'),
(@t18, 'SNA-SMT', 'Sembrani'),
(@t19, 'SKT-SRB', 'Sancaka'),
(@t20, 'FJR-BDG', 'Fajar Utama Solo'),
(@t21, 'SRJ-SMG', 'Senja Utama Solo'),
(@t22, 'PSN-YKT', 'Progo'),
(@t23, 'PWT-LPN', 'Logawa'),
(@t24, 'JT-PSN', 'Jaka Tingkir'),
(@t25, 'PDL-SBY', 'Pasundan'),
(@t26, 'KRN-SRB', 'Kutojaya Utara'),
(@t27, 'PJB-SMG', 'Jayabaya'),
(@t28, 'WJK-BWI', 'Wijayakusuma'),
(@t29, 'SRI-001', 'Sriwijaya'),
(@t30, 'SKT-001', 'Sakalayannang');

---------- Retrieve Stations ID ----------------------------------
DECLARE @bdg UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'BDG');
DECLARE @gmr UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'GMR');
DECLARE @yk UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'YK');
DECLARE @sb UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SB');
DECLARE @smt UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SMT');
DECLARE @ml UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'ML');
DECLARE @mn UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'MN');
DECLARE @kta UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'KTA');
DECLARE @cn UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'CN');
DECLARE @boo UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'BOO');
DECLARE @jr UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'JR');
DECLARE @pse UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'PSE');
DECLARE @pwt UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'PWT');
DECLARE @clp UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'CLP');
DECLARE @tgl UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'TGL');
DECLARE @srd UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SRD');
DECLARE @pdl UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'PDL');
DECLARE @lpn UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'LPN');
DECLARE @sgu UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SGU');
DECLARE @slo UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'SLO');
DECLARE @bks UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'BKS');
DECLARE @kd UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'KD');
DECLARE @pb UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'PB');
DECLARE @bwi UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'BWI');
DECLARE @ckp UNIQUEIDENTIFIER = (SELECT id FROM stations WHERE code = 'CKP');


--------------- Insert Train Schedules -----------------------
DECLARE @s1 UNIQUEIDENTIFIER = NEWID();
DECLARE @s2 UNIQUEIDENTIFIER = NEWID();
DECLARE @s3 UNIQUEIDENTIFIER = NEWID();
DECLARE @s4 UNIQUEIDENTIFIER = NEWID();
DECLARE @s5 UNIQUEIDENTIFIER = NEWID();
DECLARE @s6 UNIQUEIDENTIFIER = NEWID();
DECLARE @s7 UNIQUEIDENTIFIER = NEWID();
DECLARE @s8 UNIQUEIDENTIFIER = NEWID();
DECLARE @s9 UNIQUEIDENTIFIER = NEWID();
DECLARE @s10 UNIQUEIDENTIFIER = NEWID();
DECLARE @s11 UNIQUEIDENTIFIER = NEWID();
DECLARE @s12 UNIQUEIDENTIFIER = NEWID();
DECLARE @s13 UNIQUEIDENTIFIER = NEWID();
DECLARE @s14 UNIQUEIDENTIFIER = NEWID();
DECLARE @s15 UNIQUEIDENTIFIER = NEWID();
DECLARE @s16 UNIQUEIDENTIFIER = NEWID();
DECLARE @s17 UNIQUEIDENTIFIER = NEWID();
DECLARE @s18 UNIQUEIDENTIFIER = NEWID();
DECLARE @s19 UNIQUEIDENTIFIER = NEWID();
DECLARE @s20 UNIQUEIDENTIFIER = NEWID();

INSERT INTO train_schedules 
(id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status)
VALUES
(@s1, @t1, @bdg, @gmr, '2025-01-01 08:00:00', '2025-01-01 12:00:00', '2025-01-01', 'Scheduled'),
(@s2, @t1, @gmr, @bdg, '2025-01-01 14:00:00', '2025-01-01 18:00:00', '2025-01-01', 'Scheduled'),
(@s3, @t2, @gmr, @yk, '2025-01-02 06:00:00', '2025-01-02 13:00:00', '2025-01-02', 'Scheduled'),
(@s4, @t3, @yk, @sb, '2025-01-03 10:00:00', '2025-01-03 18:00:00', '2025-01-03', 'Scheduled'),
(@s5, @t4, @sb, @bdg, '2025-01-04 09:00:00', '2025-01-04 17:00:00', '2025-01-04', 'Scheduled'),

-- Jadwal Tambahan
(@s6, @t7, @gmr, @sgu, '2025-12-10 20:30:00', '2025-12-11 05:30:00', '2025-12-10', 'Scheduled'),
(@s7, @t18, @sgu, @gmr, '2025-12-10 09:00:00', '2025-12-10 17:00:00', '2025-12-10', 'Scheduled'),

-- Rute Jakarta - Malang (Gajayana)
(@s8, @t9, @pse, @ml, '2025-12-10 18:00:00', '2025-12-11 09:00:00', '2025-12-10', 'Scheduled'),
(@s9, @t9, @ml, @pse, '2025-12-10 14:00:00', '2025-12-11 05:00:00', '2025-12-10', 'Scheduled'),

-- Rute Jakarta - Solo
(@s10, @t5, @gmr, @slo, '2025-12-10 10:00:00', '2025-12-10 18:00:00', '2025-12-10', 'Scheduled'),
(@s11, @t5, @slo, @gmr, '2025-12-10 20:45:00', '2025-12-11 05:45:00', '2025-12-10', 'Scheduled'),

-- Rute Bandung - Surabaya
(@s12, @t11, @bdg, @sb, '2025-12-10 18:30:00', '2025-12-11 05:00:00', '2025-12-10', 'Scheduled'),
(@s13, @t17, @sb, @bdg, '2025-12-10 08:30:00', '2025-12-10 19:00:00', '2025-12-10', 'Scheduled'),

-- Lintas Tengah
(@s14, @t10, @yk, @gmr, '2025-12-10 21:00:00', '2025-12-11 04:00:00', '2025-12-10', 'Scheduled'),
(@s15, @t13, @pwt, @smt, '2025-12-10 07:30:00', '2025-12-10 11:30:00', '2025-12-10', 'Scheduled'),

-- Ekonomi Jarak Jauh
(@s16, @t25, @bdg, @sgu, '2025-12-10 07:00:00', '2025-12-10 21:00:00', '2025-12-10', 'Scheduled'),
(@s17, @t15, @pse, @sgu, '2025-12-10 14:00:00', '2025-12-11 01:00:00', '2025-12-10', 'Scheduled'),

-- Khusus
(@s18, @t28, @clp, @bwi, '2025-12-10 13:00:00', '2025-12-11 03:00:00', '2025-12-10', 'Scheduled'),
(@s19, @t16, @ml, @pse, '2025-12-10 17:00:00', '2025-12-11 09:00:00', '2025-12-10', 'Scheduled'),
(@s20, @t26, @kta, @pse, '2025-12-10 05:00:00', '2025-12-10 12:00:00', '2025-12-10', 'Scheduled');


------------ Insert Couches -------------
INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type, created_at, updated_at)
VALUES
-- =====================================================
-- PREMIUM TRAINS (8 Coaches) -> S1, S2
-- =====================================================
(NEWID(), @s1, 'C1', 'EXECUTIVE', GETDATE(), GETDATE()),
(NEWID(), @s1, 'C2', 'EXECUTIVE', GETDATE(), GETDATE()),
(NEWID(), @s1, 'C3', 'BUSINESS',  GETDATE(), GETDATE()),
(NEWID(), @s1, 'C4', 'BUSINESS',  GETDATE(), GETDATE()),
(NEWID(), @s1, 'C5', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s1, 'C6', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s1, 'C7', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s1, 'C8', 'ECONOMY',   GETDATE(), GETDATE()),

(NEWID(), @s2, 'C1', 'EXECUTIVE', GETDATE(), GETDATE()),
(NEWID(), @s2, 'C2', 'EXECUTIVE', GETDATE(), GETDATE()),
(NEWID(), @s2, 'C3', 'BUSINESS',  GETDATE(), GETDATE()),
(NEWID(), @s2, 'C4', 'BUSINESS',  GETDATE(), GETDATE()),
(NEWID(), @s2, 'C5', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s2, 'C6', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s2, 'C7', 'ECONOMY',   GETDATE(), GETDATE()),
(NEWID(), @s2, 'C8', 'ECONOMY',   GETDATE(), GETDATE()),

-- =====================================================
-- MIXED TRAINS (5 Coaches) -> S3, S4, S5
-- =====================================================
(NEWID(), @s3, 'C1', 'BUSINESS', GETDATE(), GETDATE()),
(NEWID(), @s3, 'C2', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s3, 'C3', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s3, 'C4', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s3, 'C5', 'ECONOMY',  GETDATE(), GETDATE()),

(NEWID(), @s4, 'C1', 'BUSINESS', GETDATE(), GETDATE()),
(NEWID(), @s4, 'C2', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s4, 'C3', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s4, 'C4', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s4, 'C5', 'ECONOMY',  GETDATE(), GETDATE()),

(NEWID(), @s5, 'C1', 'BUSINESS', GETDATE(), GETDATE()),
(NEWID(), @s5, 'C2', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s5, 'C3', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s5, 'C4', 'ECONOMY',  GETDATE(), GETDATE()),
(NEWID(), @s5, 'C5', 'ECONOMY',  GETDATE(), GETDATE()),

-- =====================================================
-- FULL ECONOMY TRAINS (6 Coaches) -> S6 - S20
-- =====================================================
(NEWID(), @s6, 'C1', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s6, 'C2', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s6, 'C3', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s6, 'C4', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s6, 'C5', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s6, 'C6', 'ECONOMY', GETDATE(), GETDATE()),

(NEWID(), @s7, 'C1', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s7, 'C2', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s7, 'C3', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s7, 'C4', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s7, 'C5', 'ECONOMY', GETDATE(), GETDATE()),
(NEWID(), @s7, 'C6', 'ECONOMY', GETDATE(), GETDATE());

-- Copy block S6 untuk @s8 - @s20 jika ingin generate semua


-- =================================================================
-- BLOK SCRIPT OTOMATIS INSERT COACH_SEATS (T-SQL / SQL SERVER)
-- =================================================================

DECLARE @CoachId UNIQUEIDENTIFIER;
DECLARE @CoachType VARCHAR(50);
DECLARE @Row INT;
DECLARE @SeatLetter CHAR(1);
DECLARE @RowCount INT;
DECLARE @SeatClass VARCHAR(20);

DECLARE CoachCursor CURSOR FOR
SELECT id, coach_type
FROM coaches;

OPEN CoachCursor;
FETCH NEXT FROM CoachCursor INTO @CoachId, @CoachType;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Tentukan jumlah row berdasarkan tipe coach
    SET @RowCount = CASE 
                        WHEN @CoachType = 'EXECUTIVE' THEN 15
                        WHEN @CoachType = 'BUSINESS' THEN 18
                        WHEN @CoachType = 'ECONOMY' THEN 23
                        ELSE 0
                    END;

    -- Tentukan class seat
    SET @SeatClass = CASE
                        WHEN @CoachType = 'EXECUTIVE' THEN 'Executive'
                        WHEN @CoachType = 'BUSINESS' THEN 'Business'
                        WHEN @CoachType = 'ECONOMY' THEN 'Economy'
                        ELSE 'Unknown'
                     END;

    SET @Row = 1;

    WHILE @Row <= @RowCount
    BEGIN
        SET @SeatLetter = 'A';

        WHILE @SeatLetter <= 'D'
        BEGIN
            INSERT INTO coach_seats (id, coach_id, seat_number, class, status, created_at, updated_at)
            VALUES (
                NEWID(),
                @CoachId,
                CONCAT(@Row, @SeatLetter),
                @SeatClass,
                'Available',
                GETDATE(),
                GETDATE()
            );

            SET @SeatLetter = CHAR(ASCII(@SeatLetter) + 1);
        END;

        SET @Row = @Row + 1;
    END;

    FETCH NEXT FROM CoachCursor INTO @CoachId, @CoachType;
END;

CLOSE CoachCursor;
DEALLOCATE CoachCursor;

-- Validasi Seat Count
SELECT COUNT(*) AS TotalSeats FROM coach_seats;

-- Seats Per Coach
SELECT coach_id, COUNT(*) AS TotalPerCoach
FROM coach_seats
GROUP BY coach_id;

-- Sample Check
SELECT TOP 30 * FROM coach_seats ORDER BY created_at;
