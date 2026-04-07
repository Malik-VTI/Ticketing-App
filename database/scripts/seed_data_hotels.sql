-- Seed Data for Hotels, Room Types, Rooms, and Room Rates (PostgreSQL)
-- This script inserts test data. Use only in development environments!

-- NOTE: This script is plain SQL (DBeaver compatible).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Insert Hotels (idempotent by name)
-- ============================================
-- STEP 1: Inserting hotels...
INSERT INTO hotels (id, name, address, city, rating, created_at, updated_at)
SELECT uuid_generate_v4(), v.name, v.address, v.city, v.rating, NOW(), NOW()
FROM (
  VALUES
    ('Grand Nusantara Hotel', 'Jl. Sudirman No.10', 'Jakarta', 4.5::numeric),
    ('Plaza Indonesia Hotel', 'Jl. MH Thamrin No.28-30', 'Jakarta', 4.7::numeric),
    ('Ocean View Resort', 'Jl. Pantai Kuta No.5', 'Bali', 4.8::numeric),
    ('Emerald Coast Resort', 'Jl. Pantai Sanur No.33', 'Bali', 4.7::numeric),
    ('Mountain Lodge', 'Jl. Raya Lembang No.12', 'Bandung', 4.2::numeric),
    ('City Light Hotel', 'Jl. Ahmad Yani No.20', 'Surabaya', 4.0::numeric),
    ('Harborfront Inn', 'Jl. Pelabuhan Tanjung Perak No.5', 'Surabaya', 3.9::numeric),
    ('Royal Heritage Hotel', 'Jl. Malioboro No.15', 'Yogyakarta', 4.6::numeric),
    ('Golden Palm Resort', 'Jl. Pantai Parangtritis No.8', 'Yogyakarta', 4.4::numeric),
    ('Blue Lagoon Hotel', 'Jl. Puncak Cipanas No.88', 'Bogor', 4.1::numeric),
    ('Sunrise Boutique Hotel', 'Jl. Gajah Mada No.7', 'Semarang', 4.3::numeric)
) AS v(name, address, city, rating)
WHERE NOT EXISTS (SELECT 1 FROM hotels h WHERE h.name = v.name);
-- Hotels done.

-- ============================================
-- STEP 2: Insert Room Types (idempotent by hotel+name)
-- ============================================
-- STEP 2: Inserting room types...
WITH rt AS (
  SELECT
    h.id AS hotel_id,
    h.name AS hotel_name,
    v.name AS room_type_name,
    v.capacity,
    v.amenities::jsonb AS amenities
  FROM hotels h
  JOIN (
    VALUES
      ('Grand Nusantara Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"breakfast":false}'),
      ('Grand Nusantara Hotel','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"breakfast":true}'),
      ('Grand Nusantara Hotel','Suite Room',4,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"bathtub":true,"breakfast":true,"balcony":true}'),

      ('Plaza Indonesia Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"breakfast":false}'),
      ('Plaza Indonesia Hotel','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"breakfast":true}'),
      ('Plaza Indonesia Hotel','Executive Suite',4,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"bathtub":true,"breakfast":true,"workspace":true}'),

      ('Ocean View Resort','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"ocean_view":false}'),
      ('Ocean View Resort','Villa Room',5,'{"wifi":true,"tv":true,"ac":true,"private_pool":true,"kitchen":true,"ocean_view":true}'),
      ('Ocean View Resort','Beachfront Suite',4,'{"wifi":true,"tv":true,"ac":true,"ocean_view":true,"balcony":true,"breakfast":true}'),

      ('Emerald Coast Resort','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"garden_view":true}'),
      ('Emerald Coast Resort','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"ocean_view":true,"breakfast":true}'),
      ('Emerald Coast Resort','Villa Room',6,'{"wifi":true,"tv":true,"ac":true,"private_pool":true,"kitchen":true,"ocean_view":true,"breakfast":true}'),

      ('Mountain Lodge','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"mountain_view":false}'),
      ('Mountain Lodge','Superior Room',3,'{"wifi":true,"tv":true,"ac":true,"water_heater":true,"mountain_view":true,"breakfast":true}'),

      ('City Light Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true}'),
      ('City Light Hotel','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"breakfast":true}'),

      ('Harborfront Inn','Standard Room',2,'{"wifi":true,"tv":true,"ac":true}'),
      ('Harborfront Inn','Family Room',5,'{"wifi":true,"tv":true,"ac":true,"kitchen":true,"breakfast":true}'),

      ('Royal Heritage Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"heritage_view":false}'),
      ('Royal Heritage Hotel','Cottage Room',4,'{"wifi":true,"tv":true,"ac":true,"terrace_view":true,"breakfast":true}'),

      ('Golden Palm Resort','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"beach_view":false}'),
      ('Golden Palm Resort','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"beach_view":true,"breakfast":true}'),

      ('Blue Lagoon Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true,"nature_view":true}'),
      ('Blue Lagoon Hotel','Deluxe Room',3,'{"wifi":true,"tv":true,"ac":true,"minibar":true,"nature_view":true,"breakfast":true}'),

      ('Sunrise Boutique Hotel','Standard Room',2,'{"wifi":true,"tv":true,"ac":true}'),
      ('Sunrise Boutique Hotel','Superior Room',3,'{"wifi":true,"tv":true,"ac":true,"city_view":true,"breakfast":true}')
  ) AS v(hotel_name, name, capacity, amenities)
    ON v.hotel_name = h.name
)
INSERT INTO room_types (id, hotel_id, name, capacity, amenities, created_at, updated_at)
SELECT uuid_generate_v4(), rt.hotel_id, rt.room_type_name, rt.capacity, rt.amenities, NOW(), NOW()
FROM rt
WHERE NOT EXISTS (
  SELECT 1 FROM room_types existing
  WHERE existing.hotel_id = rt.hotel_id AND existing.name = rt.room_type_name
);
-- Room types done.

-- ============================================
-- STEP 3: Insert Rooms (idempotent by room_type_id+room_number)
-- ============================================
-- STEP 3: Inserting rooms...
WITH targets AS (
  SELECT
    rt.id AS room_type_id,
    h.name AS hotel_name,
    rt.name AS room_type_name,
    CASE
      WHEN h.name IN ('Grand Nusantara Hotel') AND rt.name = 'Standard Room' THEN 10
      WHEN h.name IN ('Grand Nusantara Hotel') AND rt.name = 'Deluxe Room' THEN 8
      WHEN h.name IN ('Grand Nusantara Hotel') AND rt.name = 'Suite Room' THEN 5
      WHEN h.name IN ('Plaza Indonesia Hotel') AND rt.name = 'Standard Room' THEN 12
      WHEN h.name IN ('Plaza Indonesia Hotel') AND rt.name = 'Deluxe Room' THEN 10
      WHEN h.name IN ('Plaza Indonesia Hotel') AND rt.name = 'Executive Suite' THEN 6
      WHEN h.name IN ('Ocean View Resort') AND rt.name = 'Standard Room' THEN 15
      WHEN h.name IN ('Ocean View Resort') AND rt.name = 'Villa Room' THEN 8
      WHEN h.name IN ('Ocean View Resort') AND rt.name = 'Beachfront Suite' THEN 6
      WHEN h.name IN ('Emerald Coast Resort') AND rt.name = 'Standard Room' THEN 12
      WHEN h.name IN ('Emerald Coast Resort') AND rt.name = 'Deluxe Room' THEN 10
      WHEN h.name IN ('Emerald Coast Resort') AND rt.name = 'Villa Room' THEN 5
      WHEN h.name IN ('Mountain Lodge') AND rt.name = 'Standard Room' THEN 8
      WHEN h.name IN ('Mountain Lodge') AND rt.name = 'Superior Room' THEN 6
      WHEN h.name IN ('City Light Hotel') AND rt.name = 'Standard Room' THEN 10
      WHEN h.name IN ('City Light Hotel') AND rt.name = 'Deluxe Room' THEN 8
      WHEN h.name IN ('Harborfront Inn') AND rt.name = 'Standard Room' THEN 8
      WHEN h.name IN ('Harborfront Inn') AND rt.name = 'Family Room' THEN 5
      WHEN h.name IN ('Royal Heritage Hotel') AND rt.name = 'Standard Room' THEN 10
      WHEN h.name IN ('Royal Heritage Hotel') AND rt.name = 'Cottage Room' THEN 6
      WHEN h.name IN ('Golden Palm Resort') AND rt.name = 'Standard Room' THEN 8
      WHEN h.name IN ('Golden Palm Resort') AND rt.name = 'Deluxe Room' THEN 6
      WHEN h.name IN ('Blue Lagoon Hotel') AND rt.name = 'Standard Room' THEN 8
      WHEN h.name IN ('Blue Lagoon Hotel') AND rt.name = 'Deluxe Room' THEN 5
      WHEN h.name IN ('Sunrise Boutique Hotel') AND rt.name = 'Standard Room' THEN 8
      WHEN h.name IN ('Sunrise Boutique Hotel') AND rt.name = 'Superior Room' THEN 6
      ELSE 0
    END AS room_count,
    CASE
      WHEN rt.name IN ('Standard Room') THEN 1
      WHEN rt.name IN ('Deluxe Room','Superior Room') THEN 2
      WHEN rt.name IN ('Suite Room','Executive Suite') THEN 3
      WHEN rt.name IN ('Villa Room','Cottage Room') THEN 0
      WHEN rt.name IN ('Beachfront Suite') THEN 1
      WHEN rt.name IN ('Family Room') THEN 1
      ELSE 1
    END AS floor,
    CASE
      WHEN rt.name = 'Villa Room' THEN 'V'
      WHEN rt.name = 'Beachfront Suite' THEN 'B'
      WHEN rt.name = 'Family Room' THEN 'F'
      WHEN rt.name = 'Cottage Room' THEN 'C'
      WHEN rt.name IN ('Standard Room') THEN '10'
      WHEN rt.name IN ('Deluxe Room','Superior Room') THEN '20'
      ELSE '30'
    END AS prefix
  FROM room_types rt
  JOIN hotels h ON h.id = rt.hotel_id
),
gen AS (
  SELECT
    t.room_type_id,
    t.floor,
    t.room_type_name,
    t.prefix,
    gs AS n
  FROM targets t
  JOIN LATERAL generate_series(1, t.room_count) gs ON true
  WHERE t.room_count > 0
),
rows_to_insert AS (
  SELECT
    uuid_generate_v4() AS id,
    g.room_type_id,
    CASE
      WHEN g.prefix ~ '^[0-9]+$' THEN g.prefix || lpad(g.n::text, 2, '0')
      ELSE g.prefix || lpad(g.n::text, 2, '0')
    END AS room_number,
    g.floor,
    CASE
      WHEN g.room_type_name = 'Standard Room' AND g.n > 8 AND g.prefix = '10' THEN 'maintenance'
      WHEN g.room_type_name = 'Deluxe Room' AND g.n > 6 AND g.prefix = '20' THEN 'occupied'
      ELSE 'available'
    END AS status
  FROM gen g
)
INSERT INTO rooms (id, room_type_id, room_number, floor, status, created_at, updated_at)
SELECT r.id, r.room_type_id, r.room_number, r.floor, r.status, NOW(), NOW()
FROM rows_to_insert r
WHERE NOT EXISTS (
  SELECT 1 FROM rooms existing
  WHERE existing.room_type_id = r.room_type_id AND existing.room_number = r.room_number
);
-- Rooms done.

-- ============================================
-- STEP 4: Insert Room Rates (next 90 days)
-- ============================================
-- STEP 4: Inserting room rates...
WITH days AS (
  SELECT (CURRENT_DATE + gs)::date AS rate_date
  FROM generate_series(0, 89) gs
),
rt AS (
  SELECT rt.id AS room_type_id, h.name AS hotel_name, rt.name AS room_type_name
  FROM room_types rt
  JOIN hotels h ON h.id = rt.hotel_id
),
priced AS (
  SELECT
    uuid_generate_v4() AS id,
    rt.room_type_id,
    d.rate_date,
    CASE
      WHEN rt.hotel_name IN ('Ocean View Resort','Emerald Coast Resort') AND rt.room_type_name = 'Villa Room'
        THEN (1100000 + (random() * 400000))::numeric(18,2)
      WHEN rt.hotel_name IN ('Ocean View Resort','Emerald Coast Resort') AND rt.room_type_name IN ('Beachfront Suite')
        THEN (800000 + (random() * 300000))::numeric(18,2)
      WHEN rt.room_type_name IN ('Suite Room','Executive Suite')
        THEN (850000 + (random() * 200000))::numeric(18,2)
      WHEN rt.room_type_name IN ('Deluxe Room')
        THEN (550000 + (random() * 150000))::numeric(18,2)
      WHEN rt.room_type_name IN ('Superior Room','Cottage Room','Family Room')
        THEN (450000 + (random() * 150000))::numeric(18,2)
      ELSE (300000 + (random() * 120000))::numeric(18,2)
    END AS price
  FROM rt
  CROSS JOIN days d
)
INSERT INTO room_rates (id, room_type_id, date, price, currency, created_at, updated_at)
SELECT p.id, p.room_type_id, p.rate_date, p.price, 'IDR', NOW(), NOW()
FROM priced p
WHERE NOT EXISTS (
  SELECT 1 FROM room_rates existing
  WHERE existing.room_type_id = p.room_type_id AND existing.date = p.rate_date
);
-- Room rates done.

-- ========================================
-- Hotel data seeding completed successfully
-- ========================================
