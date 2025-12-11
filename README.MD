# Dokumentasi Arsitektur Microservices — Aplikasi Tiketing (Kereta, Pesawat, Hotel)

> Teknologi: Frontend — Node.js + React.js
> Backend — Go (gin) & Java (Spring Boot)
> Database — Microsoft SQL Server (MSSQL)
> Integrasi cache / state — Redis

---

## Ringkasan arsitektur

Aplikasi dibangun dengan pendekatan microservices, dipisah per-domain fungsional. Komponen utama:

1. **API Gateway / BFF** (Node.js)

   * Entry point untuk frontend React.
   * Melakukan routing ke microservices, aggregasi response, authentication (JWT), throttling.

2. **Auth Service** (Go + gin)

   * Mengelola login, registrasi, refresh token, manajemen user credentials.
   * Menyimpan user minimal di MSSQL, token/session di Redis (opsional).

3. **User/Profile Service** (Java Spring Boot)

   * Profil pengguna, preferensi, loyalty points.

4. **Catalog / Inventory Services**

   * **Flight Service** (Java) — data penerbangan, rute, seat map, inventory.
   * **Train Service** (Java) — jadwal kereta, seat map, classes.
   * **Hotel Service** (Go) — kamar, room types, availability.
   * Masing-masing service bertanggung jawab atas consistency domainnya dan menyimpan master data di MSSQL (schema terpisah / schema per service).

5. **Search & Pricing Service** (Java)

   * Mengindeks data inventory untuk pencarian cepat (menggunakan DB + caching Redis).
   * Menghitung harga final (fare rules, taxes, promos).

6. **Booking Service** (Go)

   * Membuat reservasi/booking, mengunci inventory, mengkoordinasikan seat assignment.
   * Berinteraksi dengan Payment Service.

7. **Payment Service** (Go)

   * Menangani pembayaran, integrasi payment gateway eksternal, membuat records transaksi.

8. **Notification Service** (Go/Java)

   * Mengirim email / SMS / push mengenai konfirmasi booking, boarding pass, invoice.

9. **Admin Service** (Java)

   * Untuk pengelolaan inventory, pricing, promos.

10. **Event Bus / Message Broker**

    * Gunakan message broker (RabbitMQ / Kafka) untuk komunikasi asynchronous antar service (mis. `booking.created`, `payment.succeeded`, `inventory.updated`).

11. **MSSQL**

    * Database relasional utama. Tiap service memiliki schema / database tabelnya sendiri (bounded context), namun bisa tetap berada pada instance MSSQL yang sama.

12. **Redis**

    * Cache search results, session store (opsional), distributed lock (pembelian seat), rate limiting, queue for short-lived data.

---

## Service-to-Technology mapping (saran)

* API Gateway / BFF: Node.js (Express / Fastify) — integrasi mudah ke React
* Frontend: React.js (SPA) + Node.js untuk SSR atau BFF
* High-throughput services (Booking, Payment): Go + gin
* Complex business logic, third-party integrations, admin: Java Spring Boot
* DB: MSSQL, schema per service
* Cache, locks, sessions: Redis
* Messaging: RabbitMQ atau Kafka (direkomendasikan RabbitMQ untuk model queue/ack sederhana; Kafka jika butuh event streaming skala besar)

---

## Bounded contexts & Data Ownership

* **Flight Service**: owner dari entities flight, schedule, seat, fare
* **Train Service**: owner dari train, schedule, coach, seat
* **Hotel Service**: owner dari hotel, room, room_type, inventory
* **Booking Service**: owner dari booking + booking_status + seat_assignment (reference ke inventory dengan FK/UUID)
* **Payment Service**: owner dari payment_transaction
* **User/Profile**: owner dari user profile

Setiap service hanya meng-update tabel yang dimilikinya; service lain membaca lewat API atau event-driven sync.

---

## Entitas utama & Relasi (ER-level)

> Catatan: gunakan GUID/UUID sebagai primary key (atau bigint identity jika prefer). Tabel-tabel diorganisasi per domain.

### ENTITAS: User

* **User** (users)

  * id (UUID, PK)
  * email (varchar, unique)
  * password_hash (varchar)
  * full_name
  * phone
  * created_at, updated_at

Relasi:

* User 1 — N Booking
* User 1 — N PaymentTransaction

### ENTITAS: Flight domain

* **Airline** (airlines)

  * id (UUID), code, name
* **Airport** (airports)

  * id (UUID), code (IATA), name, city, country
* **Flight** (flights)

  * id (UUID)
  * airline_id (FK airlines.id)
  * flight_number
  * origin_airport_id (FK airports.id)
  * destination_airport_id (FK airports.id)
  * duration_minutes
* **FlightSchedule** (flight_schedules)

  * id (UUID)
  * flight_id (FK flights.id)
  * departure_time (datetime)
  * arrival_time (datetime)
  * departure_date (date)
  * status
* **Seat** (flight_seats)

  * id (UUID)
  * flight_schedule_id (FK flight_schedules.id)
  * seat_number
  * seat_class (econ/business/first)
  * status (available/held/booked)
* **Fare** (flight_fares)

  * id, flight_schedule_id, base_price, currency, rules

Relasi:

* Flight 1 — N FlightSchedule
* FlightSchedule 1 — N Seat
* FlightSchedule 1 — N Fare

### ENTITAS: Train domain

* **Station** (stations)

  * id, code, name, city
* **Train** (trains)

  * id, train_number, operator
* **TrainSchedule** (train_schedules)

  * id, train_id, departure_station_id, arrival_station_id, departure_time, arrival_time
* **Coach** (coaches)

  * id, train_schedule_id, coach_number, coach_type
* **CoachSeat** (coach_seats)

  * id, coach_id, seat_number, class, status

Relasi:

* Train 1 — N TrainSchedule
* TrainSchedule 1 — N Coach
* Coach 1 — N CoachSeat

### ENTITAS: Hotel domain

* **Hotel** (hotels)

  * id, name, address, city, rating
* **RoomType** (room_types)

  * id, hotel_id, name, capacity, amenities
* **Room** (rooms)

  * id, room_type_id, room_number, floor, status
* **Rate** (room_rates)

  * id, room_type_id, date, price, currency

Relasi:

* Hotel 1 — N RoomType
* RoomType 1 — N Room
* RoomType 1 — N Rate

### ENTITAS: Booking domain (central)

* **Booking** (bookings)

  * id (UUID)
  * user_id (FK users.id)
  * booking_reference (string, unique)
  * booking_type (enum: flight/train/hotel)
  * total_amount
  * currency
  * status (pending/confirmed/cancelled/expired)
  * created_at, updated_at
* **BookingItem** (booking_items)

  * id
  * booking_id (FK bookings.id)
  * item_type (flight/train/hotel)
  * item_ref_id (references flight_schedule.id / train_schedule.id / room_rate.id)
  * price
  * quantity (e.g., seats, rooms)
  * metadata (json) — seat numbers, room numbers

Relasi:

* Booking 1 — N BookingItem
* Booking 1 — 1..N PaymentTransaction (one booking may have multiple payment attempts)

### ENTITAS: Payment

* **PaymentTransaction** (payments)

  * id
  * booking_id (FK bookings.id)
  * user_id (FK users.id)
  * amount
  * currency
  * status (initiated, succeeded, failed, refunded)
  * payment_method (card, bank_transfer, ewallet)
  * provider_response (json)
  * created_at

Relasi:

* Booking 1 — N PaymentTransaction
* User 1 — N PaymentTransaction

### ENTITAS: Audit / Logs

* **AuditLog** (audit_logs)

  * id, entity_type, entity_id, action, performed_by, timestamp, details (json)

### Tambahan: Promo / Coupon

* **Coupon** (coupons)

  * id, code, discount_type, value, start_date, end_date, usage_limit
* **BookingCoupon** (booking_coupons)

  * id, booking_id, coupon_id

---

## Skema Relasional (contoh tabel SQL sederhana)

Berikut contoh DDL singkat — ringkasan (bukan full DDL). Gunakan migration tool (Flyway, Liquibase) untuk produksi.

```sql
-- Users
CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(512) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2
);

-- Bookings
CREATE TABLE bookings (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  user_id UNIQUEIDENTIFIER NOT NULL,
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  booking_type VARCHAR(20) NOT NULL,
  total_amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  CONSTRAINT FK_booking_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Booking items
CREATE TABLE booking_items (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  booking_id UNIQUEIDENTIFIER NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  item_ref_id UNIQUEIDENTIFIER NOT NULL,
  price DECIMAL(18,2) NOT NULL,
  quantity INT DEFAULT 1,
  metadata NVARCHAR(MAX),
  CONSTRAINT FK_bookingitem_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Payments
CREATE TABLE payments (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  booking_id UNIQUEIDENTIFIER NOT NULL,
  user_id UNIQUEIDENTIFIER NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  payment_method VARCHAR(50),
  provider_response NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT FK_payment_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

> Catatan: Buat indeks pada kolom pencarian: `booking_reference`, `user_id`, `status`, dan kolom waktu untuk query historical.

---

## Mekanisme lock & concurrency (penting untuk seat inventory)

* Saat user memulai proses booking, Booking Service meminta distributed lock via Redis (mis. `SET lock:flight:{scheduleId} value NX PX 300000`) untuk menahan seat allocation selama X menit.
* Alternatif: gunakan optimistic locking di DB (row version) — tiap update inventory butuh check version.
* Jika booking tidak selesai (timeout), release lock dan kembalikan seat ke available.

---

## Redis — pola penggunaan

1. **Cache Search Results**

   * Key: `search:flights:{from}:{to}:{date}` TTL 60–300s.
2. **Session / short-lived auth state**

   * Key: `sess:{sessionId}` dengan TTL 1h.
3. **Distributed Locks**

   * Key: `lock:inventory:{type}:{id}` untuk menahan seat/room.
4. **Rate limiting**

   * Sliding window counter per IP / per user.
5. **Pub/Sub / Stream**

   * Ringan untuk notifikasi internal.

---

## API Contracts (ringkasan endpoint tiap service)

### Auth Service

* POST `/auth/register` — body: {email,password,name}
* POST `/auth/login` — body: {email,password} -> returns JWT
* POST `/auth/refresh` — refresh token

### Search Service

* GET `/search/flights?from=&to=&date=&adults=&children=`
* GET `/search/trains?from=&to=&date=`
* GET `/search/hotels?city=&checkin=&checkout=&guests=`

### Booking Service

* POST `/bookings` — body: {user_id, items: [{type, ref_id, passengers}], payment_method}
* GET `/bookings/{id}`
* POST `/bookings/{id}/cancel`

### Payment Service

* POST `/payments` — body: {booking_id, amount, method, payment_details}
* GET `/payments/{id}`

### Notification Service

* POST `/notifications/send` — body: {type, to, payload}

---

## Sequence flow (contoh: booking flight)

1. User mencari flight via BFF -> Search Service (cached)
2. User pilih flight, tekan `book` -> BFF panggil Booking Service
3. Booking Service: validasi inventory -> ambil lock Redis untuk seat
4. Booking Service buat `booking` dengan status `pending` dan `booking_items`
5. Booking Service publish event `booking.created`
6. Frontend redirect ke payment flow -> Payment Service create transaction
7. Payment gateway -> callback ke Payment Service -> update `payments` status
8. Payment Service publish `payment.succeeded`
9. Booking Service menerima event dan update booking status -> `confirmed`, assign seat(s) -> release lock
10. Notification Service kirim email & boarding pass

---

## Konsistensi data & integrasi antar service

* Gunakan Event-Driven approach untuk eventual consistency.
* Publish domain events untuk state changes (booking created, payment succeeded, inventory reserved).
* Gunakan Sagas / Orchestration pattern untuk long-running transactions (mis. booking+payment+inventory). Sagas bisa diimplementasikan dalam Booking Service atau Orchestrator microservice.

---

## Security

* JWT untuk authentication; short-lived access token + refresh token.
* HTTPS/TLS di semua komunikasi.
* Role-based access control (RBAC) untuk Admin endpoints.
* Sanitasi input, limit size payload, prepared statements to prevent SQL injection.
* Enkripsi field sensitif (e.g., payment details not stored raw), log masking.

---

## Contoh ER relationships (ringkasan)

* `users.id` -> `bookings.user_id`
* `bookings.id` -> `booking_items.booking_id`
* `bookings.id` -> `payments.booking_id`
* `flight_schedules.id` -> `flight_seats.flight_schedule_id`
* `train_schedules.id` -> `coaches.train_schedule_id`
* `hotel.room_types.id` -> `rooms.room_type_id`

---