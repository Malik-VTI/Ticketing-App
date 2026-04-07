-- Seed Train Data (PostgreSQL)
-- Idempotent inserts where possible (stations/trains rely on unique constraints).

-- Seeding train master data (PostgreSQL)...

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stations
INSERT INTO stations (id, code, name, city)
VALUES
  (uuid_generate_v4(), 'BDG', 'Bandung Station', 'Bandung'),
  (uuid_generate_v4(), 'GMR', 'Gambir Station', 'Jakarta'),
  (uuid_generate_v4(), 'YK',  'Yogyakarta Station', 'Yogyakarta'),
  (uuid_generate_v4(), 'SB',  'Surabaya Gubeng', 'Surabaya'),
  (uuid_generate_v4(), 'SMT', 'Semarang Tawang', 'Semarang'),
  (uuid_generate_v4(), 'ML',  'Malang Kota Baru', 'Malang'),
  (uuid_generate_v4(), 'MN',  'Madiun', 'Madiun'),
  (uuid_generate_v4(), 'KTA', 'Kutoarjo', 'Purworejo'),
  (uuid_generate_v4(), 'CN',  'Cirebon', 'Cirebon'),
  (uuid_generate_v4(), 'BOO', 'Bogor', 'Bogor'),
  (uuid_generate_v4(), 'JR',  'Jember', 'Jember'),
  (uuid_generate_v4(), 'PSE', 'Pasar Senen', 'Jakarta'),
  (uuid_generate_v4(), 'PWT', 'Purwokerto', 'Purwokerto'),
  (uuid_generate_v4(), 'CLP', 'Cilacap', 'Cilacap'),
  (uuid_generate_v4(), 'TGL', 'Tegal', 'Tegal'),
  (uuid_generate_v4(), 'SRD', 'Serang', 'Serang'),
  (uuid_generate_v4(), 'PDL', 'Padalarang', 'Bandung Barat'),
  (uuid_generate_v4(), 'LPN', 'Lempuyangan', 'Yogyakarta'),
  (uuid_generate_v4(), 'SGU', 'Surabaya Pasarturi', 'Surabaya'),
  (uuid_generate_v4(), 'SLO', 'Solo Balapan', 'Surakarta'),
  (uuid_generate_v4(), 'BKS', 'Bekasi', 'Bekasi'),
  (uuid_generate_v4(), 'KD',  'Kediri', 'Kediri'),
  (uuid_generate_v4(), 'PB',  'Probolinggo', 'Probolinggo'),
  (uuid_generate_v4(), 'BWI', 'Banyuwangi Kota', 'Banyuwangi'),
  (uuid_generate_v4(), 'CKP', 'Cikampek', 'Karawang')
ON CONFLICT (code) DO NOTHING;

-- Trains
INSERT INTO trains (id, train_number, operator)
VALUES
  (uuid_generate_v4(), 'ARGO-001', 'Argo Parahyangan'),
  (uuid_generate_v4(), 'ARGO-002', 'Argo Parahyangan'),
  (uuid_generate_v4(), 'BIMA-001', 'Bima'),
  (uuid_generate_v4(), 'GMG-001', 'Gumarang'),
  (uuid_generate_v4(), 'ARGO-DWP', 'Argo Dwipangga'),
  (uuid_generate_v4(), 'ARGO-WLJ', 'Argo Wilis'),
  (uuid_generate_v4(), 'ARGO-SBR', 'Argo Bromo Anggrek'),
  (uuid_generate_v4(), 'ARGO-JKT', 'Argo Jati'),
  (uuid_generate_v4(), 'GAJ-YKT', 'Gajayana'),
  (uuid_generate_v4(), 'TSN-BDG', 'Taksaka'),
  (uuid_generate_v4(), 'TSN-MLG', 'Turangga'),
  (uuid_generate_v4(), 'DWP-YKT', 'Dwipangga Tambahan'),
  (uuid_generate_v4(), 'PWT-SMR', 'Purwojaya'),
  (uuid_generate_v4(), 'HRN-JKT', 'Harina'),
  (uuid_generate_v4(), 'KJA-MLG', 'Kertajaya'),
  (uuid_generate_v4(), 'MRB-MLG', 'Malabar'),
  (uuid_generate_v4(), 'PLS-MLG', 'Mutiara Selatan'),
  (uuid_generate_v4(), 'SNA-SMT', 'Sembrani'),
  (uuid_generate_v4(), 'SKT-SRB', 'Sancaka'),
  (uuid_generate_v4(), 'FJR-BDG', 'Fajar Utama Solo'),
  (uuid_generate_v4(), 'SRJ-SMG', 'Senja Utama Solo'),
  (uuid_generate_v4(), 'PSN-YKT', 'Progo'),
  (uuid_generate_v4(), 'PWT-LPN', 'Logawa'),
  (uuid_generate_v4(), 'JT-PSN', 'Jaka Tingkir'),
  (uuid_generate_v4(), 'PDL-SBY', 'Pasundan'),
  (uuid_generate_v4(), 'KRN-SRB', 'Kutojaya Utara'),
  (uuid_generate_v4(), 'PJB-SMG', 'Jayabaya'),
  (uuid_generate_v4(), 'WJK-BWI', 'Wijayakusuma'),
  (uuid_generate_v4(), 'SRI-001', 'Sriwijaya'),
  (uuid_generate_v4(), 'SKT-001', 'Sakalayannang')
ON CONFLICT (train_number) DO NOTHING;

-- Train schedules (fixed timestamps from original script)
WITH raw AS (
  SELECT * FROM (VALUES
    ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','2025-01-01 12:00:00+00','2025-01-01'::date,'Scheduled'),
    ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','2025-01-01 18:00:00+00','2025-01-01'::date,'Scheduled'),
    ('ARGO-002','GMR','YK', '2025-01-02 06:00:00+00','2025-01-02 13:00:00+00','2025-01-02'::date,'Scheduled'),
    ('BIMA-001','YK', 'SB', '2025-01-03 10:00:00+00','2025-01-03 18:00:00+00','2025-01-03'::date,'Scheduled'),
    ('GMG-001','SB', 'BDG','2025-01-04 09:00:00+00','2025-01-04 17:00:00+00','2025-01-04'::date,'Scheduled'),
    ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','2025-12-11 05:30:00+00','2025-12-10'::date,'Scheduled'),
    ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','2025-12-10 17:00:00+00','2025-12-10'::date,'Scheduled'),
    ('GAJ-YKT','PSE','ML', '2025-12-10 18:00:00+00','2025-12-11 09:00:00+00','2025-12-10'::date,'Scheduled'),
    ('GAJ-YKT','ML', 'PSE','2025-12-10 14:00:00+00','2025-12-11 05:00:00+00','2025-12-10'::date,'Scheduled'),
    ('ARGO-DWP','GMR','SLO','2025-12-10 10:00:00+00','2025-12-10 18:00:00+00','2025-12-10'::date,'Scheduled'),
    ('ARGO-DWP','SLO','GMR','2025-12-10 20:45:00+00','2025-12-11 05:45:00+00','2025-12-10'::date,'Scheduled'),
    ('TSN-MLG','BDG','SB', '2025-12-10 18:30:00+00','2025-12-11 05:00:00+00','2025-12-10'::date,'Scheduled'),
    ('PLS-MLG','SB', 'BDG','2025-12-10 08:30:00+00','2025-12-10 19:00:00+00','2025-12-10'::date,'Scheduled'),
    ('TSN-BDG','YK', 'GMR','2025-12-10 21:00:00+00','2025-12-11 04:00:00+00','2025-12-10'::date,'Scheduled'),
    ('PWT-SMR','PWT','SMT','2025-12-10 07:30:00+00','2025-12-10 11:30:00+00','2025-12-10'::date,'Scheduled'),
    ('PDL-SBY','BDG','SGU','2025-12-10 07:00:00+00','2025-12-10 21:00:00+00','2025-12-10'::date,'Scheduled'),
    ('KJA-MLG','PSE','SGU','2025-12-10 14:00:00+00','2025-12-11 01:00:00+00','2025-12-10'::date,'Scheduled'),
    ('WJK-BWI','CLP','BWI','2025-12-10 13:00:00+00','2025-12-11 03:00:00+00','2025-12-10'::date,'Scheduled'),
    ('MRB-MLG','ML', 'PSE','2025-12-10 17:00:00+00','2025-12-11 09:00:00+00','2025-12-10'::date,'Scheduled'),
    ('KRN-SRB','KTA','PSE','2025-12-10 05:00:00+00','2025-12-10 12:00:00+00','2025-12-10'::date,'Scheduled')
  ) AS v(train_number, dep_code, arr_code, departure_time, arrival_time, departure_date, status)
),
resolved AS (
  SELECT
    t.id AS train_id,
    ds.id AS dep_station_id,
    asn.id AS arr_station_id,
    v.departure_time::timestamptz AS departure_time,
    v.arrival_time::timestamptz AS arrival_time,
    v.departure_date,
    lower(v.status) AS status
  FROM raw v
  JOIN trains t ON t.train_number = v.train_number
  JOIN stations ds ON ds.code = v.dep_code
  JOIN stations asn ON asn.code = v.arr_code
)
INSERT INTO train_schedules (id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status, created_at)
SELECT uuid_generate_v4(), r.train_id, r.dep_station_id, r.arr_station_id, r.departure_time, r.arrival_time, r.departure_date, r.status, NOW()
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1 FROM train_schedules ts
  WHERE ts.train_id = r.train_id
    AND ts.departure_time = r.departure_time
    AND ts.departure_station_id = r.dep_station_id
    AND ts.arrival_station_id = r.arr_station_id
);

-- Coaches (subset from original for s1-s7)
WITH schedule_map AS (
  SELECT
    ts.id AS schedule_id,
    t.train_number,
    ds.code AS dep_code,
    asn.code AS arr_code,
    ts.departure_time
  FROM train_schedules ts
  JOIN trains t ON t.id = ts.train_id
  JOIN stations ds ON ds.id = ts.departure_station_id
  JOIN stations asn ON asn.id = ts.arrival_station_id
),
coach_rows AS (
  SELECT schedule_id, coach_number, coach_type
  FROM (
    -- Premium (S1/S2)
    SELECT schedule_id, coach_number, coach_type FROM (
      VALUES
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C1','EXECUTIVE'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C2','EXECUTIVE'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C3','BUSINESS'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C4','BUSINESS'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C5','ECONOMY'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C6','ECONOMY'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C7','ECONOMY'),
        ('ARGO-001','BDG','GMR','2025-01-01 08:00:00+00','C8','ECONOMY'),

        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C1','EXECUTIVE'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C2','EXECUTIVE'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C3','BUSINESS'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C4','BUSINESS'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C5','ECONOMY'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C6','ECONOMY'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C7','ECONOMY'),
        ('ARGO-001','GMR','BDG','2025-01-01 14:00:00+00','C8','ECONOMY'),

        -- Mixed (S3-S5)
        ('ARGO-002','GMR','YK','2025-01-02 06:00:00+00','C1','BUSINESS'),
        ('ARGO-002','GMR','YK','2025-01-02 06:00:00+00','C2','ECONOMY'),
        ('ARGO-002','GMR','YK','2025-01-02 06:00:00+00','C3','ECONOMY'),
        ('ARGO-002','GMR','YK','2025-01-02 06:00:00+00','C4','ECONOMY'),
        ('ARGO-002','GMR','YK','2025-01-02 06:00:00+00','C5','ECONOMY'),

        ('BIMA-001','YK','SB','2025-01-03 10:00:00+00','C1','BUSINESS'),
        ('BIMA-001','YK','SB','2025-01-03 10:00:00+00','C2','ECONOMY'),
        ('BIMA-001','YK','SB','2025-01-03 10:00:00+00','C3','ECONOMY'),
        ('BIMA-001','YK','SB','2025-01-03 10:00:00+00','C4','ECONOMY'),
        ('BIMA-001','YK','SB','2025-01-03 10:00:00+00','C5','ECONOMY'),

        ('GMG-001','SB','BDG','2025-01-04 09:00:00+00','C1','BUSINESS'),
        ('GMG-001','SB','BDG','2025-01-04 09:00:00+00','C2','ECONOMY'),
        ('GMG-001','SB','BDG','2025-01-04 09:00:00+00','C3','ECONOMY'),
        ('GMG-001','SB','BDG','2025-01-04 09:00:00+00','C4','ECONOMY'),
        ('GMG-001','SB','BDG','2025-01-04 09:00:00+00','C5','ECONOMY'),

        -- Full economy (S6/S7)
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C1','ECONOMY'),
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C2','ECONOMY'),
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C3','ECONOMY'),
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C4','ECONOMY'),
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C5','ECONOMY'),
        ('ARGO-SBR','GMR','SGU','2025-12-10 20:30:00+00','C6','ECONOMY'),

        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C1','ECONOMY'),
        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C2','ECONOMY'),
        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C3','ECONOMY'),
        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C4','ECONOMY'),
        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C5','ECONOMY'),
        ('SNA-SMT','SGU','GMR','2025-12-10 09:00:00+00','C6','ECONOMY')
    ) AS v(train_number, dep_code, arr_code, departure_time, coach_number, coach_type)
    JOIN schedule_map sm
      ON sm.train_number = v.train_number
     AND sm.dep_code = v.dep_code
     AND sm.arr_code = v.arr_code
     AND sm.departure_time = v.departure_time::timestamptz
  ) x(schedule_id, coach_number, coach_type)
)
INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type, created_at, updated_at)
SELECT uuid_generate_v4(), cr.schedule_id, cr.coach_number, cr.coach_type, NOW(), NOW()
FROM coach_rows cr
WHERE NOT EXISTS (
  SELECT 1 FROM coaches c
  WHERE c.train_schedule_id = cr.schedule_id AND c.coach_number = cr.coach_number
);

-- Coach seats (generate by coach_type)
WITH coach_limits AS (
  SELECT
    c.id AS coach_id,
    c.coach_type,
    CASE
      WHEN upper(c.coach_type) = 'EXECUTIVE' THEN 15
      WHEN upper(c.coach_type) = 'BUSINESS' THEN 18
      WHEN upper(c.coach_type) = 'ECONOMY' THEN 23
      ELSE 0
    END AS row_count,
    CASE
      WHEN upper(c.coach_type) = 'EXECUTIVE' THEN 'Executive'
      WHEN upper(c.coach_type) = 'BUSINESS' THEN 'Business'
      WHEN upper(c.coach_type) = 'ECONOMY' THEN 'Economy'
      ELSE 'Unknown'
    END AS seat_class
  FROM coaches c
),
rows AS (
  SELECT
    cl.coach_id,
    cl.seat_class,
    r AS row_num
  FROM coach_limits cl
  JOIN LATERAL generate_series(1, cl.row_count) r ON true
  WHERE cl.row_count > 0
),
letters AS (
  SELECT unnest(ARRAY['A','B','C','D']) AS letter
),
seats AS (
  SELECT
    r.coach_id,
    (r.row_num::text || l.letter) AS seat_number,
    r.seat_class
  FROM rows r
  CROSS JOIN letters l
)
INSERT INTO coach_seats (id, coach_id, seat_number, class, status, created_at, updated_at)
SELECT uuid_generate_v4(), s.coach_id, s.seat_number, s.seat_class, 'Available', NOW(), NOW()
FROM seats s
WHERE NOT EXISTS (
  SELECT 1 FROM coach_seats cs
  WHERE cs.coach_id = s.coach_id AND cs.seat_number = s.seat_number
);

-- Quick checks
SELECT COUNT(*) AS total_seats FROM coach_seats;
SELECT coach_id, COUNT(*) AS total_per_coach FROM coach_seats GROUP BY coach_id ORDER BY total_per_coach DESC;
SELECT * FROM coach_seats ORDER BY created_at DESC LIMIT 30;
