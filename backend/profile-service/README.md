# Profile Service

User profile microservice built with Java and Spring Boot for the Ticketing Application. Lets an authenticated user view and update their profile and change their password. Authentication itself is handled by the API Gateway, which forwards the authenticated user's id via the `X-User-Id` header.

## Tech Stack

- Java 17
- Spring Boot 3.2.0 (Web, Data JPA, Security)
- PostgreSQL (via `org.postgresql` driver)
- Hibernate / Spring Data JPA
- Lombok
- BCrypt password hashing
- Logback with logstash JSON encoder

## API Endpoints

All profile endpoints expect the API Gateway to supply the authenticated user's id in the `X-User-Id` header (a UUID). Requests without it receive `401 Unauthorized`.

### Profile

- `GET /profile` - Get the current user's profile
  - Header: `X-User-Id: <uuid>`
  - Returns `id`, `email`, `fullName`, `phone`, `createdAt`

- `PUT /profile` - Update the current user's profile
  - Header: `X-User-Id: <uuid>`
  ```json
  {
    "fullName": "John Doe",
    "phone": "+1234567890"
  }
  ```
  - Only non-empty fields are applied; returns the updated profile.

- `PUT /profile/password` - Change the current user's password
  - Header: `X-User-Id: <uuid>`
  ```json
  {
    "currentPassword": "oldPassword",
    "newPassword": "newPassword123"
  }
  ```
  - `newPassword` must be at least 8 characters. The current password is verified with BCrypt before the change.

### Health Check

- `GET /profile/health` - Service health check (returns `{"status": "UP"}`)

## Configuration

Configuration is read from `src/main/resources/application.yaml`, with the following environment variables (defaults shown):

```env
DB_SERVER=10.100.33.184
DB_PORT=5432
DB_DATABASE=ticketing_app
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
PROFILE_SERVICE_PORT=8090
```

The service connects to a PostgreSQL `users` table. JPA `ddl-auto` is set to `none`, so the schema is expected to already exist.

CORS is configured in `SecurityConfig` to allow all origins/methods/headers; all requests are permitted at the service level because the API Gateway performs authentication.

## Running

### Locally

```bash
./mvnw spring-boot:run
```

Service runs on port 8090 by default.

### Build a jar

```bash
./mvnw clean package
java -jar target/profile-service-0.0.1-SNAPSHOT.jar
```

### Docker

```bash
docker build -t profile-service .
docker run -p 8090:8090 profile-service
```

Or via the root `docker-compose.yml`:

```bash
docker-compose up profile-service
```

## Project Structure

```
profile-service/
├── src/main/java/com/profile_service/
│   ├── ProfileServiceApplication.java   # Application entry point
│   ├── controller/ProfileController.java
│   ├── service/                         # (business logic, if added)
│   ├── repository/UserRepository.java   # Spring Data JPA repository
│   ├── model/User.java                  # JPA entity (users table)
│   ├── dto/                             # ProfileResponse, ProfileUpdateRequest, PasswordUpdateRequest
│   └── config/SecurityConfig.java       # Security, CORS, PasswordEncoder
├── src/main/resources/
│   ├── application.yaml
│   └── logback-spring.xml
├── Dockerfile
├── pom.xml
└── README.md
```

## Notes

- Authentication is delegated to the API Gateway; this service trusts the `X-User-Id` header.
- Passwords are hashed with BCrypt; `passwordHash` is never returned in responses.
- The `User` entity maps to the shared `users` table (same table used by the authentication service).
