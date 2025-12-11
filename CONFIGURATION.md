# Configuration Guide

This document explains how to configure the microservices application using environment variables.

## Environment Variables Setup

### Root-Level .env File

All services share a common `.env` file located at the project root (`ticketing-app/.env`). This file contains:

1. **Shared Configuration** - Used by all services:
   - Database connection details
   - JWT secret key (must be the same across all services)
   - Redis configuration

2. **Service-Specific Configuration** - Each service can have its own port/host settings

### Creating .env File

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your actual configuration:
   ```env
   DB_SERVER=10.100.33.68
   DB_DATABASE=ticketing_app
   DB_USER=lek
   DB_PASSWORD=P@ssw0rd
   DB_PORT=1433
   
   JWT_SECRET_KEY=your-strong-secret-key-here
   ```

### Important Notes

- **JWT_SECRET_KEY**: Must be the same across all services that validate JWT tokens (Authentication Service, API Gateway, etc.)
- **Database Configuration**: All services use the same database instance but may use different schemas/tables
- **Never commit `.env` to version control** - it's already in `.gitignore`

## How Services Load Configuration

### Go Services (Authentication, Booking, Payment, Hotel)

Go services use the `godotenv` library to load the `.env` file from the project root:

```go
// In main.go, before loading config
envPath := filepath.Join(workDir, "..", "..", ".env")
godotenv.Load(envPath)

// Then load config
cfg := config.LoadConfig()
```

The config loader reads environment variables using `os.Getenv()` which will use:
1. Environment variables set in the system
2. Variables loaded from `.env` file
3. Default values (if provided)

### Java Services (Flight, Train, Profile, etc.)

Java services using Spring Boot can load the root `.env` file using Spring's configuration:

1. Add to `application.yaml`:
   ```yaml
   spring:
     config:
       import: optional:file:../../.env
   ```

2. Or use environment variables directly:
   ```yaml
   spring:
     datasource:
       url: jdbc:sqlserver://${DB_SERVER}:${DB_PORT};databaseName=${DB_DATABASE}
       username: ${DB_USER}
       password: ${DB_PASSWORD}
   ```

3. Or use a library like `dotenv-java`:
   ```java
   Dotenv dotenv = Dotenv.configure()
       .directory("../..")
       .filename(".env")
       .load();
   ```

### Node.js Services (API Gateway)

Node.js services can use the `dotenv` package:

```javascript
require('dotenv').config({ path: '../../.env' });
```

## Shared Configuration Variables

### Database (All Services)
```env
DB_SERVER=10.100.33.68
DB_DATABASE=ticketing_app
DB_USER=lek
DB_PASSWORD=P@ssw0rd
DB_PORT=1433
```

### JWT (Services that validate tokens)
```env
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15
JWT_REFRESH_EXPIRY=7
```

### Redis (Services that use caching)
```env
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Service-Specific Ports

Each service has its own port configuration:

- Authentication Service: `AUTH_SERVICE_PORT=8080`
- API Gateway: `API_GATEWAY_PORT=3000`
- Booking Service: `BOOKING_SERVICE_PORT=8081`
- Payment Service: `PAYMENT_SERVICE_PORT=8082`
- Flight Service: `FLIGHT_SERVICE_PORT=8083`
- Train Service: `TRAIN_SERVICE_PORT=8084`
- Hotel Service: `HOTEL_SERVICE_PORT=8085`
- Pricing Service: `PRICING_SERVICE_PORT=8086`
- Profile Service: `PROFILE_SERVICE_PORT=8087`
- Notification Service: `NOTIFICATION_SERVICE_PORT=8088`
- Admin Service: `ADMIN_SERVICE_PORT=8089`

## Generating JWT Secret Key

For production, generate a strong secret key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Overriding Configuration

### Option 1: Environment Variables (Highest Priority)

Set environment variables in your system/shell:
```bash
export DB_PASSWORD=MyNewPassword
export JWT_SECRET_KEY=my-new-secret
```

### Option 2: Service-Specific .env (Medium Priority)

Create a `.env` file in the service directory to override root values:
```
backend/authentication-service/.env
```

### Option 3: Root .env File (Lowest Priority)

Default values from root `.env` file.

## Docker/Container Configuration

When running in containers, you can:

1. Mount the `.env` file as a volume
2. Use environment variables in `docker-compose.yml`
3. Use secrets management (Docker secrets, Kubernetes secrets, etc.)

Example `docker-compose.yml`:
```yaml
services:
  auth-service:
    environment:
      - DB_SERVER=${DB_SERVER}
      - DB_DATABASE=${DB_DATABASE}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    env_file:
      - ../.env
```

## Security Best Practices

1. **Never commit `.env` to version control**
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Use different secrets for different environments** (dev, staging, prod)
4. **Restrict database user permissions** (don't use `sa` in production)
5. **Use secrets management tools** in production (AWS Secrets Manager, HashiCorp Vault, etc.)
6. **Rotate secrets regularly**

## Troubleshooting

### Service can't find .env file

- Check that `.env` exists in project root
- Verify the path resolution in the service's main file
- Check file permissions

### Configuration not loading

- Verify environment variable names match exactly (case-sensitive)
- Check for typos in variable names
- Ensure `.env` file format is correct (no spaces around `=`)
- Restart the service after changing `.env`

### JWT validation fails across services

- Ensure `JWT_SECRET_KEY` is identical in all services
- Check that services are loading from the same `.env` file
- Verify token expiration settings match

