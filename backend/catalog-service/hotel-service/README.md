# Hotel Service

Hotel catalog microservice built with Go and the Gin framework for the Ticketing Application. Manages hotels, room types, individual rooms, and date-based room rates, and exposes public search/availability endpoints plus admin CRUD endpoints. It also supports reserving and releasing rooms transactionally for the booking flow.

## Tech Stack

- Go 1.24
- [Gin](https://github.com/gin-gonic/gin) web framework
- PostgreSQL (via `github.com/lib/pq`, using the standard `database/sql`)
- `github.com/google/uuid` for IDs
- `github.com/joho/godotenv` for `.env` loading
- Structured JSON logging via `log/slog`

## Domain Model

- **Hotel** - `id`, `name`, `address`, `city`, `rating`
- **RoomType** - belongs to a hotel; `name`, `capacity`, `amenities`
- **Room** - belongs to a room type; `room_number`, `floor`, `status` (`available` / `occupied` / `maintenance`)
- **RoomRate** - per-date price for a room type; `date`, `price`, `currency`

## API Endpoints

### Health

- `GET /health` - Liveness check (returns `{"status": "ok", "service": "hotel-service"}`)
- `GET /health/ready` - Readiness check; pings the database (returns `ready` / `unavailable`)

### Public (`/hotels`)

- `GET /hotels` - List hotels (paginated). Query params: `city`, `page`, `size` (default 20, max 100). Returns a paginated envelope: `content`, `totalPages`, `totalElements`, `number`, `size`.
- `GET /hotels/:id` - Get a hotel by id, including its room types.
- `GET /hotels/:id/rooms` - Get room-type availability for a hotel. Query params: `checkin`, `checkout` (YYYY-MM-DD), `guests`. Returns per room type: available count, total count, min price, and currency. When dates are given, the min price is computed from rates within the date range.
- `GET /hotels/:id/rates` - Get all room rates for the hotel's room types.
- `POST /hotels/:id/reserve` - Reserve rooms transactionally (marks rooms `occupied`).
  ```json
  {
    "room_type_id": "uuid",
    "check_in": "2026-06-20",
    "check_out": "2026-06-22",
    "quantity": 2
  }
  ```
  Returns `{ "room_numbers": [...] }`. Responds `409 Conflict` if not enough rooms are available.
- `POST /hotels/:id/release` - Release previously reserved rooms (marks them `available`).
  ```json
  {
    "room_type_id": "uuid",
    "room_numbers": ["101", "102"]
  }
  ```

### Admin (`/admin/hotels`)

Hotel CRUD:

- `POST /admin/hotels` - Create a hotel
- `PUT /admin/hotels/:id` - Update a hotel
- `DELETE /admin/hotels/:id` - Delete a hotel

Room type CRUD:

- `POST /admin/hotels/room-types` - Create a room type
- `PUT /admin/hotels/room-types/:id` - Update a room type
- `DELETE /admin/hotels/room-types/:id` - Delete a room type

Room CRUD:

- `POST /admin/hotels/rooms` - Create a room
- `PUT /admin/hotels/rooms/:id` - Update a room
- `DELETE /admin/hotels/rooms/:id` - Delete a room

Room rate CRUD:

- `POST /admin/hotels/rates` - Create a room rate
- `PUT /admin/hotels/rates/:id` - Update a room rate
- `DELETE /admin/hotels/rates/:id` - Delete a room rate

> Note: the admin routes are not authenticated within this service; authentication/authorization is expected to be enforced upstream (e.g. by the API Gateway).

## Configuration

Configuration is loaded from environment variables (a `.env` file at the project root is loaded automatically if present). Defaults shown:

```env
# Server
HOTEL_SERVICE_HOST=0.0.0.0      # falls back to SERVER_HOST
HOTEL_SERVICE_PORT=8085         # falls back to SERVER_PORT

# Database (PostgreSQL)
DB_SERVER=10.100.33.184
DB_DATABASE=ticketing_app
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
DB_PORT=5432

# CORS — allowed origin for browser requests
CORS_ALLOWED_ORIGIN=http://ticketing-app.local   # default if unset

# Logging level: debug | info | warn | error
LOG_LEVEL=info
```

- `CORS_ALLOWED_ORIGIN` sets the `Access-Control-Allow-Origin` header (with credentials allowed). If unset, it defaults to `http://ticketing-app.local`.
- `LOG_LEVEL` controls the `slog` JSON logger level (defaults to `info`).
- The database connection uses `sslmode=disable` with a pool of up to 25 open / 5 idle connections.

## Running

### Locally

```bash
go mod download
go run main.go
```

Service listens on `0.0.0.0:8085` by default.

### Build a binary

```bash
go build -o bin/hotel-service .
./bin/hotel-service
```

### Docker

```bash
docker build -t hotel-service .
docker run -p 8085:8085 hotel-service
```

Or via the root `docker-compose.yml`:

```bash
docker-compose up hotel-service
```

## Project Structure

```
hotel-service/
├── config/          # Env-based configuration (config.go)
├── database/        # PostgreSQL connection (db.go)
├── handlers/        # HTTP handlers (hotel_handler.go, admin_handler.go)
├── models/          # Entities, DTOs, request/response types (hotel.go)
├── repository/      # Data access layer (hotel_repository.go, room_repository.go)
├── routes/          # Route + CORS setup (routes.go)
├── main.go          # Entry point, logging, graceful shutdown
├── go.mod
├── Dockerfile
└── README.md
```

## Notes

- Room reservation/release run inside database transactions; reservation locks available rows with `SELECT ... FOR UPDATE` and fails with `409` if fewer than the requested quantity are free.
- Availability for `GET /hotels/:id/rooms` is filtered by room `status = 'available'` and, when `guests` is supplied, by room-type capacity.
- Rates are stored per date per room type; date inputs use the `YYYY-MM-DD` format.
- The service performs a graceful shutdown (5s timeout) on `SIGINT`/`SIGTERM`.
