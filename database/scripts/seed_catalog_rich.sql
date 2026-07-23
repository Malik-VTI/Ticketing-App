-- ============================================================================
-- seed_catalog_rich.sql  (PostgreSQL)
-- ----------------------------------------------------------------------------
-- Purpose : Populate the catalog (flight / train / hotel) with a broad, realistic
--           dataset AND a ROLLING window of future schedules/rates, so that a
--           search for any near-future date always returns priced, bookable
--           results. Replaces the tiny 4-airport / 4-hotel demo seed and the
--           old fixed-date (2025-01-01 ...) schedules that go stale.
--
-- Safe to re-run : YES. Reference rows use ON CONFLICT; schedules/seats/fares/
--           rates are guarded with NOT EXISTS keyed on (…, date). Re-running a
--           week later simply fills in the newly-uncovered future dates.
--           It never deletes; past schedules are left untouched (may hold bookings).
--
-- How to run :
--   psql "host=<h> dbname=<db> user=<u>" -v ON_ERROR_STOP=1 -f seed_catalog_rich.sql
--   (run AFTER migrations V000/V002/V003/V004 have created the schema.)
--
-- Tuning the horizon: change the single value inserted into _seed_cfg below
--   (HORIZON_DAYS). 30 ≈ ~120k seat rows total; raise to 60/90 for a longer
--   bookable window (cost scales linearly).
--
-- Conventions (must match the services):
--   * statuses/classes are LOWERCASE ('available', 'economy', 'business',
--     'executive', 'first'). Some JPQL queries compare status = 'available'
--     case-sensitively, so lowercase is the only value that works everywhere.
--   * currency 'IDR'; timestamps generated in Asia/Jakarta (WIB).
-- ============================================================================

BEGIN;

SET LOCAL TIME ZONE 'Asia/Jakarta';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Horizon config (single source of truth for the rolling window) -------------
CREATE TEMP TABLE _seed_cfg (horizon_days int) ON COMMIT DROP;
INSERT INTO _seed_cfg VALUES (30);            -- <== HORIZON_DAYS: edit here

-- ============================================================================
-- FLIGHT DOMAIN
-- ============================================================================

-- Airlines -------------------------------------------------------------------
INSERT INTO airlines (code, name) VALUES
  ('GA','Garuda Indonesia'),
  ('QG','Citilink'),
  ('JT','Lion Air'),
  ('ID','Batik Air'),
  ('IW','Wings Air'),
  ('QZ','Indonesia AirAsia'),
  ('SJ','Sriwijaya Air'),
  ('IU','Super Air Jet'),
  ('IN','Nam Air'),
  ('8B','TransNusa')
ON CONFLICT (code) DO NOTHING;

-- Airports (IATA) ------------------------------------------------------------
INSERT INTO airports (code, name, city, country) VALUES
  ('CGK','Soekarno-Hatta International Airport','Jakarta','Indonesia'),
  ('HLP','Halim Perdanakusuma Airport','Jakarta','Indonesia'),
  ('DPS','Ngurah Rai International Airport','Denpasar','Indonesia'),
  ('SUB','Juanda International Airport','Surabaya','Indonesia'),
  ('YIA','Yogyakarta International Airport','Yogyakarta','Indonesia'),
  ('SOC','Adi Soemarmo International Airport','Surakarta','Indonesia'),
  ('SRG','Jenderal Ahmad Yani International Airport','Semarang','Indonesia'),
  ('BDO','Husein Sastranegara International Airport','Bandung','Indonesia'),
  ('KNO','Kualanamu International Airport','Medan','Indonesia'),
  ('PDG','Minangkabau International Airport','Padang','Indonesia'),
  ('PLM','Sultan Mahmud Badaruddin II Airport','Palembang','Indonesia'),
  ('PKU','Sultan Syarif Kasim II Airport','Pekanbaru','Indonesia'),
  ('BTH','Hang Nadim International Airport','Batam','Indonesia'),
  ('UPG','Sultan Hasanuddin International Airport','Makassar','Indonesia'),
  ('BPN','Sultan Aji Muhammad Sulaiman Airport','Balikpapan','Indonesia'),
  ('BDJ','Syamsudin Noor International Airport','Banjarmasin','Indonesia'),
  ('PNK','Supadio International Airport','Pontianak','Indonesia'),
  ('LOP','Lombok International Airport','Praya','Indonesia'),
  ('MDC','Sam Ratulangi International Airport','Manado','Indonesia'),
  ('DJJ','Dortheys Hiyo Eluay International Airport','Jayapura','Indonesia'),
  ('KOE','El Tari International Airport','Kupang','Indonesia'),
  ('BTJ','Sultan Iskandar Muda International Airport','Banda Aceh','Indonesia')
ON CONFLICT (code) DO NOTHING;

-- Flight routes (kept in a temp table so we can reuse dep_time/duration when
-- generating schedules without adding columns to the flights table). ---------
CREATE TEMP TABLE _flt (
  flight_number varchar(20),
  airline_code  varchar(10),
  o_code        varchar(10),
  d_code        varchar(10),
  dur           int,        -- flight duration, minutes
  dep           time        -- daily departure time (WIB)
) ON COMMIT DROP;

INSERT INTO _flt (flight_number, airline_code, o_code, d_code, dur, dep) VALUES
  -- Jakarta <-> Bali
  ('GA-402','GA','CGK','DPS',110,'06:00'), ('GA-403','GA','DPS','CGK',110,'09:10'),
  ('QG-680','QG','CGK','DPS',110,'08:30'), ('QG-681','QG','DPS','CGK',110,'12:15'),
  ('JT-016','JT','CGK','DPS',110,'11:20'), ('JT-017','JT','DPS','CGK',110,'15:10'),
  ('ID-104','ID','CGK','DPS',110,'17:20'), ('ID-105','ID','DPS','CGK',110,'20:00'),
  -- Jakarta <-> Surabaya
  ('GA-312','GA','CGK','SUB',95,'05:30'), ('GA-313','GA','SUB','CGK',95,'08:00'),
  ('JT-560','JT','CGK','SUB',95,'09:10'), ('JT-561','JT','SUB','CGK',95,'12:15'),
  ('QG-620','QG','CGK','SUB',95,'16:00'), ('QG-621','QG','SUB','CGK',95,'19:15'),
  -- Jakarta <-> Medan
  ('GA-180','GA','CGK','KNO',135,'07:15'), ('GA-181','GA','KNO','CGK',135,'10:00'),
  ('JT-306','JT','CGK','KNO',135,'13:00'), ('JT-307','JT','KNO','CGK',135,'16:00'),
  -- Jakarta <-> Makassar
  ('GA-608','GA','CGK','UPG',160,'06:45'), ('GA-609','GA','UPG','CGK',160,'10:30'),
  ('JT-796','JT','CGK','UPG',160,'14:30'), ('JT-797','JT','UPG','CGK',160,'18:00'),
  -- Jakarta <-> Balikpapan
  ('GA-510','GA','CGK','BPN',130,'08:00'), ('SJ-260','SJ','BPN','CGK',130,'12:00'),
  -- Jakarta <-> Padang / Palembang / Pekanbaru / Batam
  ('GA-160','GA','CGK','PDG',110,'07:00'), ('ID-201','ID','PDG','CGK',110,'10:15'),
  ('QG-360','QG','CGK','PLM',70,'06:20'),  ('JT-330','JT','PLM','CGK',70,'09:00'),
  ('JT-292','JT','CGK','PKU',95,'11:00'),  ('JT-293','JT','PKU','CGK',95,'14:10'),
  ('QG-940','QG','CGK','BTH',95,'13:40'),  ('QG-941','QG','BTH','CGK',95,'17:00'),
  -- Jakarta <-> Central Java
  ('GA-232','GA','CGK','SRG',65,'06:10'),  ('GA-233','GA','SRG','CGK',65,'08:20'),
  ('QG-140','QG','CGK','YIA',70,'09:30'),  ('JT-522','JT','YIA','CGK',70,'12:40'),
  ('QG-130','QG','CGK','SOC',70,'15:00'),  ('QG-131','QG','SOC','CGK',70,'17:30'),
  -- Jakarta <-> Kalimantan
  ('QG-420','QG','CGK','PNK',90,'07:50'),  ('JT-680','JT','CGK','BDJ',110,'10:40'),
  -- Inter-region (non-Jakarta)
  ('QG-800','QG','SUB','DPS',55,'08:15'),  ('IU-870','IU','DPS','SUB',55,'11:30'),
  ('JT-900','JT','SUB','UPG',90,'13:20'),  ('GA-620','GA','UPG','DPS',85,'16:10'),
  ('IW-1810','IW','DPS','LOP',40,'07:40'), ('IW-1811','IW','LOP','DPS',40,'09:20'),
  ('SJ-580','SJ','UPG','MDC',95,'12:00'),  ('JT-210','JT','KNO','BTJ',55,'09:40')
;

-- Insert flights (resolve codes -> ids; guard on unique flight_number) --------
INSERT INTO flights (airline_id, flight_number, origin_airport_id, destination_airport_id, duration_minutes)
SELECT al.id, fl.flight_number, o.id, d.id, fl.dur
FROM _flt fl
JOIN airlines al ON al.code = fl.airline_code
JOIN airports o  ON o.code  = fl.o_code
JOIN airports d  ON d.code  = fl.d_code
WHERE NOT EXISTS (SELECT 1 FROM flights f WHERE f.flight_number = fl.flight_number);

-- Rolling flight schedules (one departure per flight per day, +1 .. +horizon) -
INSERT INTO flight_schedules (flight_id, departure_time, arrival_time, departure_date, status)
SELECT f.id,
       ((CURRENT_DATE + g.n) + fl.dep)::timestamptz,
       ((CURRENT_DATE + g.n) + fl.dep + make_interval(mins => fl.dur))::timestamptz,
       (CURRENT_DATE + g.n),
       'scheduled'
FROM _flt fl
JOIN flights f ON f.flight_number = fl.flight_number
CROSS JOIN generate_series(1, (SELECT horizon_days FROM _seed_cfg)) AS g(n)
WHERE NOT EXISTS (
  SELECT 1 FROM flight_schedules s
  WHERE s.flight_id = f.id AND s.departure_date = (CURRENT_DATE + g.n)
);

-- Fares per schedule (economy + business), price derived from duration --------
INSERT INTO flight_fares (flight_schedule_id, seat_class, base_price, currency, rules)
SELECT fs.id, c.seat_class,
       round((c.base + f.duration_minutes * c.per_min)::numeric, -3),
       'IDR',
       c.rules::jsonb
FROM flight_schedules fs
JOIN flights f  ON f.id = fs.flight_id
JOIN _flt   fl  ON fl.flight_number = f.flight_number      -- only our seeded flights
CROSS JOIN (VALUES
  ('economy',  300000.0, 2500.0, '{"refundable":false,"changeable":true,"baggage_kg":20}'),
  ('business', 900000.0, 5200.0, '{"refundable":true,"changeable":true,"baggage_kg":30,"lounge":true}')
) AS c(seat_class, base, per_min, rules)
WHERE NOT EXISTS (
  SELECT 1 FROM flight_fares ff
  WHERE ff.flight_schedule_id = fs.id AND ff.seat_class = c.seat_class
);

-- Seat map per schedule: business rows 1-2 (A-D) + economy rows 10-15 (A-F) ---
INSERT INTO flight_seats (flight_schedule_id, seat_number, seat_class, status)
SELECT fs.id, s.seat_number, s.seat_class, 'available'
FROM flight_schedules fs
JOIN flights f ON f.id = fs.flight_id
JOIN _flt   fl ON fl.flight_number = f.flight_number
CROSS JOIN LATERAL (
  SELECT (r::text || l.letter) AS seat_number, 'business' AS seat_class
    FROM generate_series(1,2) AS r
    CROSS JOIN unnest(ARRAY['A','B','C','D']) AS l(letter)
  UNION ALL
  SELECT (r::text || l.letter), 'economy'
    FROM generate_series(10,15) AS r
    CROSS JOIN unnest(ARRAY['A','B','C','D','E','F']) AS l(letter)
) s
WHERE NOT EXISTS (
  SELECT 1 FROM flight_seats fx
  WHERE fx.flight_schedule_id = fs.id AND fx.seat_number = s.seat_number
);

-- ============================================================================
-- TRAIN DOMAIN  (no fare table by design; price comes from pricing-service)
-- ============================================================================

-- Stations (self-contained set referenced by the routes below) ---------------
INSERT INTO stations (code, name, city) VALUES
  ('GMR','Gambir','Jakarta'),
  ('PSE','Pasar Senen','Jakarta'),
  ('BD','Bandung','Bandung'),
  ('CN','Cirebon','Cirebon'),
  ('PWT','Purwokerto','Purwokerto'),
  ('YK','Yogyakarta','Yogyakarta'),
  ('LPN','Lempuyangan','Yogyakarta'),
  ('SLO','Solo Balapan','Surakarta'),
  ('SMT','Semarang Tawang','Semarang'),
  ('MN','Madiun','Madiun'),
  ('SGU','Surabaya Pasarturi','Surabaya'),
  ('SB','Surabaya Gubeng','Surabaya'),
  ('ML','Malang','Malang'),
  ('KTA','Kutoarjo','Purworejo')
ON CONFLICT (code) DO NOTHING;

-- Trains ---------------------------------------------------------------------
INSERT INTO trains (train_number, operator) VALUES
  ('KA-ARGO-01','Argo Parahyangan'),
  ('KA-TAKS-01','Taksaka'),
  ('KA-ARGO-11','Argo Dwipangga'),
  ('KA-ARGO-21','Argo Bromo Anggrek'),
  ('KA-BIMA-01','Bima'),
  ('KA-GAJA-01','Gajayana'),
  ('KA-SANC-01','Sancaka'),
  ('KA-PURW-01','Purwojaya'),
  ('KA-HARI-01','Harina'),
  ('KA-MENO-01','Menoreh'),
  ('KA-BROM-01','Brantas'),
  ('KA-LODA-01','Lodaya')
ON CONFLICT (train_number) DO NOTHING;

-- Train routes (temp; carries dep_time + duration for schedule generation) ----
CREATE TEMP TABLE _trn (
  train_number varchar(20),
  dep_code     varchar(10),
  arr_code     varchar(10),
  dur          int,        -- minutes
  dep          time
) ON COMMIT DROP;

INSERT INTO _trn (train_number, dep_code, arr_code, dur, dep) VALUES
  ('KA-ARGO-01','GMR','BD',190,'07:00'),  ('KA-ARGO-01','BD','GMR',190,'14:00'),
  ('KA-TAKS-01','GMR','YK',430,'08:00'),  ('KA-TAKS-01','YK','GMR',430,'20:00'),
  ('KA-ARGO-11','GMR','SLO',480,'10:00'), ('KA-ARGO-11','SLO','GMR',480,'20:30'),
  ('KA-ARGO-21','GMR','SGU',540,'20:30'), ('KA-ARGO-21','SGU','GMR',540,'09:00'),
  ('KA-BIMA-01','GMR','SB',725,'17:00'),  ('KA-GAJA-01','GMR','ML',895,'18:30'),
  ('KA-SANC-01','SB','YK',300,'07:15'),   ('KA-SANC-01','YK','SB',300,'15:30'),
  ('KA-PURW-01','GMR','PWT',300,'07:30'), ('KA-HARI-01','SMT','BD',360,'06:00'),
  ('KA-MENO-01','SMT','GMR',360,'09:00'), ('KA-BROM-01','PSE','ML',900,'14:30'),
  ('KA-LODA-01','BD','SLO',480,'07:20'),  ('KA-LODA-01','SLO','BD',480,'19:00')
;

-- Rolling train schedules -----------------------------------------------------
INSERT INTO train_schedules (train_id, departure_station_id, arrival_station_id, departure_time, arrival_time, departure_date, status)
SELECT t.id, ds.id, asn.id,
       ((CURRENT_DATE + g.n) + tr.dep)::timestamptz,
       ((CURRENT_DATE + g.n) + tr.dep + make_interval(mins => tr.dur))::timestamptz,
       (CURRENT_DATE + g.n),
       'scheduled'
FROM _trn tr
JOIN trains   t   ON t.train_number = tr.train_number
JOIN stations ds  ON ds.code = tr.dep_code
JOIN stations asn ON asn.code = tr.arr_code
CROSS JOIN generate_series(1, (SELECT horizon_days FROM _seed_cfg)) AS g(n)
WHERE NOT EXISTS (
  SELECT 1 FROM train_schedules s
  WHERE s.train_id = t.id
    AND s.departure_station_id = ds.id
    AND s.departure_date = (CURRENT_DATE + g.n)
    AND s.departure_time = ((CURRENT_DATE + g.n) + tr.dep)::timestamptz
);

-- Coaches: 1 executive + 1 business + 2 economy per schedule ------------------
INSERT INTO coaches (train_schedule_id, coach_number, coach_type)
SELECT ts.id, v.coach_number, v.coach_type
FROM train_schedules ts
JOIN trains t   ON t.id = ts.train_id
CROSS JOIN (VALUES
  ('EKS-1','executive'),
  ('BIS-1','business'),
  ('EKO-1','economy'),
  ('EKO-2','economy')
) AS v(coach_number, coach_type)
-- restrict to our seeded trains WITHOUT fanning out on trains that run several
-- routes (a plain JOIN _trn ON train_number would duplicate coaches for them).
WHERE EXISTS (SELECT 1 FROM _trn tr WHERE tr.train_number = t.train_number)
  AND NOT EXISTS (
    SELECT 1 FROM coaches c
    WHERE c.train_schedule_id = ts.id AND c.coach_number = v.coach_number
  );

-- Coach seats: rows depend on class, columns A-D ------------------------------
INSERT INTO coach_seats (coach_id, seat_number, class, status)
SELECT c.id, (r::text || l.letter), c.coach_type, 'available'
FROM coaches c
JOIN train_schedules ts ON ts.id = c.train_schedule_id
JOIN trains t  ON t.id = ts.train_id
JOIN LATERAL generate_series(1,
       CASE c.coach_type WHEN 'executive' THEN 5
                         WHEN 'business'  THEN 6
                         ELSE 8 END) AS r ON true
CROSS JOIN unnest(ARRAY['A','B','C','D']) AS l(letter)
WHERE EXISTS (SELECT 1 FROM _trn tr WHERE tr.train_number = t.train_number)
  AND NOT EXISTS (
    SELECT 1 FROM coach_seats cs
    WHERE cs.coach_id = c.id AND cs.seat_number = (r::text || l.letter)
  );

-- ============================================================================
-- HOTEL DOMAIN
-- ============================================================================

-- Hotels (temp so downstream inserts touch only our seeded hotels) -----------
CREATE TEMP TABLE _hotel (
  name    varchar(255),
  address varchar(500),
  city    varchar(100),
  rating  numeric(2,1)
) ON COMMIT DROP;

INSERT INTO _hotel (name, address, city, rating) VALUES
  ('Grand Hyatt Jakarta','Jl. M.H. Thamrin Kav. 28-30','Jakarta',4.7),
  ('Hotel Indonesia Kempinski','Jl. M.H. Thamrin No. 1','Jakarta',4.6),
  ('The Dharmawangsa','Jl. Brawijaya Raya No. 26','Jakarta',4.8),
  ('Padma Hotel Bandung','Jl. Ranca Bentang No. 56-58','Bandung',4.7),
  ('The Trans Luxury Hotel','Jl. Gatot Subroto No. 289','Bandung',4.6),
  ('Hyatt Regency Yogyakarta','Jl. Palagan Tentara Pelajar','Yogyakarta',4.6),
  ('The Phoenix Hotel Yogyakarta','Jl. Jenderal Sudirman No. 9','Yogyakarta',4.5),
  ('The Mulia Nusa Dua','Jl. Raya Nusa Dua Selatan','Denpasar',4.9),
  ('Padma Resort Legian','Jl. Padma No. 1, Legian','Denpasar',4.7),
  ('Hotel Majapahit Surabaya','Jl. Tunjungan No. 65','Surabaya',4.6),
  ('JW Marriott Hotel Surabaya','Jl. Embong Malang No. 85-89','Surabaya',4.6),
  ('PO Hotel Semarang','Jl. Pemuda No. 118','Semarang',4.5),
  ('Alila Solo','Jl. Slamet Riyadi No. 562','Surakarta',4.7),
  ('Tugu Hotel Malang','Jl. Tugu No. 3','Malang',4.6),
  ('The Rinra Makassar','Jl. Metro Tanjung Bunga No. 3','Makassar',4.5);

INSERT INTO hotels (name, address, city, rating)
SELECT h.name, h.address, h.city, h.rating
FROM _hotel h
WHERE NOT EXISTS (SELECT 1 FROM hotels x WHERE x.name = h.name AND x.city = h.city);

-- Room type template (name + capacity + amenities + nightly base price) -------
CREATE TEMP TABLE _room_tmpl (
  name       varchar(255),
  capacity   int,
  base_price numeric(18,2),
  amenities  text
) ON COMMIT DROP;

INSERT INTO _room_tmpl (name, capacity, base_price, amenities) VALUES
  ('Standard', 2,  650000, '{"wifi":true,"ac":true,"breakfast":false}'),
  ('Deluxe',   2, 1050000, '{"wifi":true,"ac":true,"breakfast":true}'),
  ('Suite',    4, 2200000, '{"wifi":true,"ac":true,"breakfast":true,"bathtub":true,"living_room":true}');

-- Room types: every seeded hotel gets all three types ------------------------
INSERT INTO room_types (hotel_id, name, capacity, amenities)
SELECT h.id, rt.name, rt.capacity, rt.amenities::jsonb
FROM hotels h
JOIN _hotel hs ON hs.name = h.name AND hs.city = h.city   -- restrict to ours
CROSS JOIN _room_tmpl rt
WHERE NOT EXISTS (
  SELECT 1 FROM room_types x WHERE x.hotel_id = h.id AND x.name = rt.name
);

-- Rooms: 5 physical rooms per room type --------------------------------------
INSERT INTO rooms (room_type_id, room_number, floor, status)
SELECT rt.id,
       (upper(left(rt.name,3)) || '-' || lpad(r::text, 2, '0')),
       ((r - 1) / 5) + 1,
       'available'
FROM room_types rt
JOIN hotels h  ON h.id = rt.hotel_id
JOIN _hotel hs ON hs.name = h.name AND hs.city = h.city
CROSS JOIN generate_series(1,5) AS r
WHERE NOT EXISTS (
  SELECT 1 FROM rooms x
  WHERE x.room_type_id = rt.id
    AND x.room_number = (upper(left(rt.name,3)) || '-' || lpad(r::text, 2, '0'))
);

-- Rolling nightly rates (today .. +horizon), +25% on Fri/Sat ------------------
INSERT INTO room_rates (room_type_id, date, price, currency)
SELECT rt.id,
       (CURRENT_DATE + g.n),
       round((tp.base_price *
              CASE WHEN EXTRACT(DOW FROM (CURRENT_DATE + g.n)) IN (5,6) THEN 1.25 ELSE 1.0 END
             )::numeric, -3),
       'IDR'
FROM room_types rt
JOIN hotels h   ON h.id = rt.hotel_id
JOIN _hotel hs  ON hs.name = h.name AND hs.city = h.city
JOIN _room_tmpl tp ON tp.name = rt.name
CROSS JOIN generate_series(0, (SELECT horizon_days FROM _seed_cfg)) AS g(n)
WHERE NOT EXISTS (
  SELECT 1 FROM room_rates x
  WHERE x.room_type_id = rt.id AND x.date = (CURRENT_DATE + g.n)
);

COMMIT;

-- ============================================================================
-- Verification (read-only; safe to keep)
-- ============================================================================
\echo '--- Catalog seed summary ---'
SELECT 'airlines'         AS entity, COUNT(*) FROM airlines
UNION ALL SELECT 'airports',            COUNT(*) FROM airports
UNION ALL SELECT 'flights',             COUNT(*) FROM flights
UNION ALL SELECT 'flight_schedules',    COUNT(*) FROM flight_schedules
UNION ALL SELECT 'flight_fares',        COUNT(*) FROM flight_fares
UNION ALL SELECT 'flight_seats',        COUNT(*) FROM flight_seats
UNION ALL SELECT 'stations',            COUNT(*) FROM stations
UNION ALL SELECT 'trains',              COUNT(*) FROM trains
UNION ALL SELECT 'train_schedules',     COUNT(*) FROM train_schedules
UNION ALL SELECT 'coaches',             COUNT(*) FROM coaches
UNION ALL SELECT 'coach_seats',         COUNT(*) FROM coach_seats
UNION ALL SELECT 'hotels',              COUNT(*) FROM hotels
UNION ALL SELECT 'room_types',          COUNT(*) FROM room_types
UNION ALL SELECT 'rooms',               COUNT(*) FROM rooms
UNION ALL SELECT 'room_rates',          COUNT(*) FROM room_rates
ORDER BY entity;

-- Sanity: a CGK->DPS search for tomorrow should return priced flights with seats
\echo '--- Sample: CGK -> DPS flights tomorrow (should be non-empty, with fares & seats) ---'
SELECT f.flight_number,
       al.name AS airline,
       fsch.departure_time,
       (SELECT ff.base_price FROM flight_fares ff
         WHERE ff.flight_schedule_id = fsch.id AND ff.seat_class = 'economy') AS economy_fare,
       (SELECT COUNT(*) FROM flight_seats fs
         WHERE fs.flight_schedule_id = fsch.id AND fs.status = 'available') AS seats_available
FROM flight_schedules fsch
JOIN flights  f  ON f.id = fsch.flight_id
JOIN airlines al ON al.id = f.airline_id
JOIN airports o  ON o.id = f.origin_airport_id
JOIN airports d  ON d.id = f.destination_airport_id
WHERE o.code = 'CGK' AND d.code = 'DPS'
  AND fsch.departure_date = CURRENT_DATE + 1
ORDER BY fsch.departure_time;
