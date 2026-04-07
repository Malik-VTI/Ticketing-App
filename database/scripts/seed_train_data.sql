-- Seed Train Data Script (PostgreSQL)
-- Inserts sample train data for development and testing
-- Run this after migrations (V003 at minimum)

-- Seeding train data...

-- Ensure required extension exists (migrations should already do this)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seed Stations (idempotent)
-- Inserting sample train stations...
INSERT INTO stations (id, code, name, city)
VALUES
  (uuid_generate_v4(), 'GMR', 'Gambir', 'Jakarta'),
  (uuid_generate_v4(), 'BD',  'Bandung', 'Bandung'),
  (uuid_generate_v4(), 'YK',  'Yogyakarta', 'Yogyakarta'),
  (uuid_generate_v4(), 'SLO', 'Solo Balapan', 'Surakarta'),
  (uuid_generate_v4(), 'SBY', 'Surabaya Gubeng', 'Surabaya'),
  (uuid_generate_v4(), 'MLG', 'Malang', 'Malang')
ON CONFLICT (code) DO NOTHING;
-- Stations seeded.

-- Seed Trains (idempotent)
-- Inserting sample trains...
INSERT INTO trains (id, train_number, operator)
VALUES
  (uuid_generate_v4(), 'ARGO-001', 'PT Kereta Api Indonesia'),
  (uuid_generate_v4(), 'ARGO-002', 'PT Kereta Api Indonesia'),
  (uuid_generate_v4(), 'TURANGA-101', 'PT Kereta Api Indonesia')
ON CONFLICT (train_number) DO NOTHING;
-- Trains seeded.

-- Seed Train Schedules (tomorrow/day-after, idempotent)
-- Inserting sample train schedules...
WITH data AS (
  SELECT *
  FROM (VALUES
    ('ARGO-001', 'GMR', 'BD',  1,  8, 11),
    ('ARGO-002', 'GMR', 'YK',  1,  9, 16),
    ('TURANGA-101', 'BD', 'YK', 2, 10, 17)
  ) AS v(train_number, dep_station_code, arr_station_code, day_add, dep_hour, arr_hour)
),
resolved AS (
  SELECT
    t.id AS train_id,
    ds.id AS departure_station_id,
    asn.id AS arrival_station_id,
    (CURRENT_DATE + (d.day_add || ' day')::interval)::date AS departure_date,
    (CURRENT_DATE + (d.day_add || ' day')::interval + (d.dep_hour || ' hour')::interval) AS departure_time,
    (CURRENT_DATE + (d.day_add || ' day')::interval + (d.arr_hour || ' hour')::interval) AS arrival_time
  FROM data d
  JOIN trains t ON t.train_number = d.train_number
  JOIN stations ds ON ds.code = d.dep_station_code
  JOIN stations asn ON asn.code = d.arr_station_code
)
INSERT INTO train_schedules (id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status, created_at)
SELECT
  uuid_generate_v4(),
  r.train_id,
  r.departure_station_id,
  r.arrival_station_id,
  r.departure_time,
  r.arrival_time,
  r.departure_date,
  'scheduled',
  NOW()
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1
  FROM train_schedules ts
  WHERE ts.train_id = r.train_id
    AND ts.departure_date = r.departure_date
);
-- Train schedules seeded.

-- Seed Coaches (idempotent-ish; checks by schedule+coach_number)
-- Inserting coaches...
WITH s1 AS (
  SELECT ts.id AS schedule_id
  FROM train_schedules ts
  JOIN trains t ON t.id = ts.train_id
  JOIN stations ds ON ds.id = ts.departure_station_id
  JOIN stations asn ON asn.id = ts.arrival_station_id
  WHERE t.train_number = 'ARGO-001'
    AND ds.code = 'GMR'
    AND asn.code = 'BD'
    AND ts.departure_date = (CURRENT_DATE + INTERVAL '1 day')::date
  LIMIT 1
),
s2 AS (
  SELECT ts.id AS schedule_id
  FROM train_schedules ts
  JOIN trains t ON t.id = ts.train_id
  JOIN stations ds ON ds.id = ts.departure_station_id
  JOIN stations asn ON asn.id = ts.arrival_station_id
  WHERE t.train_number = 'ARGO-002'
    AND ds.code = 'GMR'
    AND asn.code = 'YK'
    AND ts.departure_date = (CURRENT_DATE + INTERVAL '1 day')::date
  LIMIT 1
),
s3 AS (
  SELECT ts.id AS schedule_id
  FROM train_schedules ts
  JOIN trains t ON t.id = ts.train_id
  JOIN stations ds ON ds.id = ts.departure_station_id
  JOIN stations asn ON asn.id = ts.arrival_station_id
  WHERE t.train_number = 'TURANGA-101'
    AND ds.code = 'BD'
    AND asn.code = 'YK'
    AND ts.departure_date = (CURRENT_DATE + INTERVAL '2 day')::date
  LIMIT 1
),
coach_data AS (
  SELECT schedule_id, coach_number, coach_type
  FROM (
    SELECT (SELECT schedule_id FROM s1) AS schedule_id, 'A1'::text, 'economy'::text
    UNION ALL SELECT (SELECT schedule_id FROM s1), 'B1', 'business'
    UNION ALL SELECT (SELECT schedule_id FROM s1), 'C1', 'executive'
    UNION ALL SELECT (SELECT schedule_id FROM s2), 'A1', 'economy'
    UNION ALL SELECT (SELECT schedule_id FROM s2), 'B1', 'business'
    UNION ALL SELECT (SELECT schedule_id FROM s3), 'A1', 'economy'
    UNION ALL SELECT (SELECT schedule_id FROM s3), 'B1', 'business'
    UNION ALL SELECT (SELECT schedule_id FROM s3), 'C1', 'executive'
  ) x(schedule_id, coach_number, coach_type)
  WHERE schedule_id IS NOT NULL
)
INSERT INTO coaches (id, train_schedule_id, coach_number, coach_type, created_at)
SELECT uuid_generate_v4(), cd.schedule_id, cd.coach_number, cd.coach_type, NOW()
FROM coach_data cd
WHERE NOT EXISTS (
  SELECT 1 FROM coaches c
  WHERE c.train_schedule_id = cd.schedule_id
    AND c.coach_number = cd.coach_number
);
-- Coaches seeded.

-- Seed Seats (idempotent-ish; checks by coach+seat_number)
-- Inserting coach seats...
WITH coach_limits AS (
  SELECT
    c.id AS coach_id,
    c.coach_type,
    CASE
      WHEN c.coach_type = 'economy' THEN 40
      WHEN c.coach_type = 'business' THEN 30
      WHEN c.coach_type = 'executive' THEN 20
      ELSE 0
    END AS seat_count
  FROM coaches c
  JOIN train_schedules ts ON ts.id = c.train_schedule_id
  WHERE ts.departure_date IN ((CURRENT_DATE + INTERVAL '1 day')::date, (CURRENT_DATE + INTERVAL '2 day')::date)
),
seats AS (
  SELECT
    cl.coach_id,
    cl.coach_type AS class,
    gs::text AS seat_number
  FROM coach_limits cl
  JOIN LATERAL generate_series(1, cl.seat_count) gs ON true
  WHERE cl.seat_count > 0
)
INSERT INTO coach_seats (id, coach_id, seat_number, class, status, created_at)
SELECT uuid_generate_v4(), s.coach_id, s.seat_number, s.class, 'available', NOW()
FROM seats s
WHERE NOT EXISTS (
  SELECT 1 FROM coach_seats cs
  WHERE cs.coach_id = s.coach_id
    AND cs.seat_number = s.seat_number
);
-- Coach seats seeded.

-- Train data seeding complete!