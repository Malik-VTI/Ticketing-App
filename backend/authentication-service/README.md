# Authentication Service

Authentication microservice built with Go and Gin framework for the Ticketing Application.

## Features

- User registration with email and password
- User login with JWT token generation
- Refresh token mechanism
- Password hashing using bcrypt
- JWT-based authentication
- User profile retrieval
- MSSQL database integration

## API Endpoints

### Public Endpoints

- `POST /auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
  ```

- `POST /auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /auth/refresh` - Refresh access token
  ```json
  {
    "refresh_token": "your-refresh-token"
  }
  ```

### Protected Endpoints

- `GET /auth/profile` - Get current user profile
  - Requires: `Authorization: Bearer <access_token>`

### Health Check

- `GET /health` - Service health check

## Configuration

Copy `.env.example` to `.env` and configure the following:

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

DB_SERVER=localhost
DB_DATABASE=ticketing_db
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_PORT=1433

JWT_SECRET_KEY=your-secret-key-change-in-production-min-32-characters
JWT_ACCESS_EXPIRY=15
JWT_REFRESH_EXPIRY=7
```

## Prerequisites

- Go 1.24 or later
- Microsoft SQL Server (with database and users table created)
- Environment variables configured

## Installation

1. Install dependencies:
   ```bash
   go mod download
   ```

2. Set up environment variables (copy `.env.example` to `.env` and configure)

3. Ensure database migrations are run (see `database/migrations/V001__create_users_schema.sql`)

4. Run the service:
   ```bash
   go run main.go
   ```

## Project Structure

```
authentication-service/
├── config/          # Configuration management
├── database/        # Database connection
├── handlers/        # HTTP request handlers
├── middleware/      # Authentication middleware
├── models/          # Data models
├── repository/      # Data access layer
├── routes/          # Route definitions
├── utils/           # Utility functions (JWT, password hashing)
├── main.go          # Application entry point
├── go.mod           # Go module file
└── README.md        # This file
```

## Response Format

### Success Response (Register/Login/Refresh)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

### Error Response
```json
{
  "error": "error_code",
  "message": "Error description"
}
```

## Security Features

- Password hashing with bcrypt (cost factor 12)
- JWT tokens with expiration
- Separate access and refresh tokens
- Token validation middleware
- Input validation

## Development

### Running in Development Mode

```bash
go run main.go
```

### Building

```bash
go build -o bin/authentication-service main.go
```

### Running Tests

```bash
go test ./...
```

## Notes

- Access tokens expire in 15 minutes (configurable)
- Refresh tokens expire in 7 days (configurable)
- Passwords must be at least 8 characters
- Email validation is performed
- Redis integration is optional (currently not implemented but config structure is ready)

