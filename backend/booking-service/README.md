# Booking Service

Booking microservice built with Go and the Gin framework for the Ticketing Application. It creates and manages bookings (flight, train, hotel) atomically, reserves inventory in the catalog services, validates pricing, and emits booking notifications reliably via a transactional outbox.

## Features

- Create bookings with multiple items (flight / train / hotel) in a single DB transaction
- Distributed seat locking via Redis (`SET NX`) to prevent double-booking races
- Inventory reservation/release through the catalog services (flight, train, hotel)
- Price calculation/validation through the pricing service
- Transactional Outbox pattern for booking notifications (never lost, delivered by a background worker)
- Automatic expiration of stale pending bookings (background worker)
- JWT-based authentication with per-booking ownership checks
- Internal (service-to-service) confirm endpoint protected by an internal API key
- PostgreSQL database integration

## API Endpoints

### Health Checks

- `GET /health` - Liveness check (shallow, does not touch the DB)
- `GET /health/ready` - Readiness check (pings the database)

### Public Endpoints

- `GET /bookings/reference/:reference` - Get a booking by its reference code

  > Note: although grouped as "public", the handler still extracts the authenticated user and enforces an ownership check, so a valid `Authorization` bearer token is required in practice.

### Protected Endpoints

All require `Authorization: Bearer <access_token>`.

- `POST /bookings` - Create a new booking
  ```json
  {
    "booking_type": "flight",
    "items": [
      {
        "item_type": "flight",
        "item_ref_id": "123e4567-e89b-12d3-a456-426614174000",
        "price": 750000,
        "quantity": 1,
        "metadata": {
          "seat_numbers": ["12A"],
          "passenger_names": ["John Doe"]
        }
      }
    ]
  }
  ```
  - `booking_type` / `item_type` must be one of `flight`, `train`, `hotel`
  - Flight and train items require `seat_numbers` in metadata, one per passenger (`len(seat_numbers) == quantity`)
  - Hotel items use `check_in_date` / `check_out_date` (defaults to today / tomorrow); rooms are allocated automatically
- `GET /bookings/:id` - Get a booking by ID (owner only)
- `GET /bookings/user/:userId` - List the authenticated user's bookings (owner only; supports `?limit=` 1–100, default 20 and `?offset=` default 0)
- `POST /bookings/:id/cancel` - Cancel a booking (owner only); releases reserved seats/rooms

### Internal Endpoints

Require the `X-Internal-API-Key` header matching `INTERNAL_API_KEY`. Called by the payment service.

- `POST /bookings/:id/confirm` - Confirm a pending booking (transition `pending` → `confirmed`)

## Configuration

Configuration is read from environment variables (a shared `.env` is loaded from the project root if present, otherwise from the working directory).

```env
# Server
BOOKING_SERVICE_PORT=8081   # falls back to SERVER_PORT, default 8081
BOOKING_SERVICE_HOST=0.0.0.0 # falls back to SERVER_HOST, default 0.0.0.0

# Database (PostgreSQL)
DB_SERVER=localhost
DB_DATABASE=ticketing_app
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
DB_PORT=5432

# Auth
JWT_SECRET_KEY=your-secret-key-change-in-production   # required
INTERNAL_API_KEY=shared-internal-secret               # required (internal confirm endpoint)

# Redis seat locking (optional — degrades gracefully if unavailable)
REDIS_ENABLED=true        # locking is skipped unless this is "true"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Downstream services (used as base URLs; defaults shown are local fallbacks)
NOTIFICATION_SERVICE_URL=http://localhost:8087
TRAIN_SERVICE_URL=http://localhost:8084
FLIGHT_SERVICE_URL=http://localhost:8083
HOTEL_SERVICE_URL=http://localhost:8085
PRICING_SERVICE_URL=http://localhost:8086

# Logging & CORS
LOG_LEVEL=info                              # debug | info | warn | error
CORS_ALLOWED_ORIGIN=http://ticketing-app.local
```

> `JWT_SECRET_KEY` and `INTERNAL_API_KEY` are mandatory: the service logs `FATAL` and exits if they are missing when the corresponding middleware initialises.

> In `docker-compose.yml` the service is published on port **8082** (`BOOKING_SERVICE_PORT`/`SERVER_PORT` are set accordingly), which matches the `EXPOSE 8082` in the Dockerfile. The code default when unset is `8081`.

## Prerequisites

- Go 1.24 or later
- PostgreSQL (with the `bookings` and `booking_items` tables present; the service auto-creates its own `notification_outbox` table on startup)
- Redis (optional — only needed for seat locking)
- Environment variables configured

## Running the Service

### Locally

```bash
go mod download
go run main.go
```

### With Docker / docker-compose

```bash
# From the project root
docker compose up booking-service
```

## Database Migrations

On startup the service runs `database.RunMigrations()`, which is idempotent (`IF NOT EXISTS`) and provisions the `notification_outbox` table (plus its `claimed_at` column and a status index) used by the Transactional Outbox pattern. Startup fails hard if this migration cannot be applied, because the outbox worker depends on the table. The `bookings` / `booking_items` tables are expected to already exist (managed elsewhere).

## Project Structure

```
booking-service/
├── cache/           # Redis client + seat-lock helpers (AcquireSeatLock / ReleaseSeatLock)
├── clients/         # HTTP clients for catalog (flight/train/hotel) and pricing services
├── config/          # Configuration management
├── database/        # DB connection + service-owned migrations (notification_outbox)
├── errors/          # Domain error values
├── handlers/        # HTTP request handlers
├── middleware/      # JWT auth + internal API-key auth
├── models/          # Data models & DTOs
├── repository/      # Data access layer (booking, booking item, outbox)
├── service/         # Business logic + expiration worker + outbox worker
├── routes/          # Route definitions
├── main.go          # Application entry point
├── Dockerfile
├── go.mod
└── README.md        # This file
```

## Notes

### Transactional Outbox (ARCH-05)

When a booking is created, a `booking.created` notification event is written to the `notification_outbox` table **inside the same DB transaction** as the booking and its items. The event is therefore committed atomically and can never be lost. A background worker (`StartOutboxWorker`) polls every 5 seconds, claims a batch of up to 20 pending events, and `POST`s each payload to `NOTIFICATION_SERVICE_URL` + `/notifications/send`. Successful deliveries are marked `sent`; failures bump an attempt counter and are retried until they exhaust the max attempts, after which they are marked `failed`. Notifications are deliberately **not** sent inline to avoid duplicate delivery.

### Seat Locking

Before opening the booking transaction, the service acquires a per-item Redis lock (`lock:inventory:<itemType>:<scheduleID>`) using `SET NX` with a 10-minute TTL. If another booking already holds the lock, the request fails with a `seat_lock_conflict` error. Locks are always released after commit or on any failure. If Redis is disabled or unreachable, locking degrades gracefully and the booking is allowed to proceed.

### Booking Expiration

A background worker (`StartExpirationWorker`) runs every 5 minutes, finds bookings still `pending` after 30 minutes, releases their reserved seats/rooms via the catalog services, and marks them `expired`.

### Booking Lifecycle

`pending` → `confirmed` (via internal confirm, triggered by the payment service) / `cancelled` (user) / `expired` (worker). Cancelling or expiring a booking releases any reserved flight/train seats and hotel rooms.
