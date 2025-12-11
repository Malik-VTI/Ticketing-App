# Environment Setup Instructions

## Quick Start

1. **Create the `.env` file** in the project root (`ticketing-app/.env`):
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your actual values:
   ```env
   DB_SERVER=10.100.33.68
   DB_DATABASE=ticketing_app
   DB_USER=lek
   DB_PASSWORD=P@ssw0rd
   DB_PORT=1433
   
   JWT_SECRET_KEY=your-strong-secret-key-here-min-32-chars
   ```

3. **Install dependencies** for authentication service:
   ```bash
   cd backend/authentication-service
   go get github.com/joho/godotenv
   go mod tidy
   ```

4. **Run the service**:
   ```bash
   go run main.go
   ```

## File Locations

- **Root `.env` file**: `ticketing-app/.env` (shared by all services)
- **Example file**: `ticketing-app/.env.example` (template)
- **Configuration guide**: `ticketing-app/CONFIGURATION.md` (detailed documentation)

## Important Notes

- The `.env` file is automatically ignored by git (see `.gitignore`)
- All services read from the root `.env` file
- JWT_SECRET_KEY must be the same across all services that validate tokens
- Database credentials are shared across all services

## Next Steps

After setting up `.env`, you can:
1. Run database migrations (see `database/README.md`)
2. Start the authentication service
3. Test the API endpoints

For detailed configuration options, see `CONFIGURATION.md`.

