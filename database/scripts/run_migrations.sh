#!/bin/bash
# Bash Script to Run All Migrations (PostgreSQL)
# Usage: ./run_migrations.sh -s localhost -d ticketing_app -u postgres -p YourPassword

# Default values
SERVER="localhost"
DATABASE="ticketing_app"
USER="postgres"
PASSWORD=""
PORT="5432"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--server)
            SERVER="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE="$2"
            shift 2
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        -p|--password)
            PASSWORD="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_PATH="$SCRIPT_DIR/../migrations"

echo "========================================"
echo "Running Database Migrations"
echo "========================================"
echo "Server: $SERVER"
echo "Database: $DATABASE"
echo "Migrations Path: $MIGRATIONS_PATH"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql is not available. Please install PostgreSQL client tools."
    exit 1
fi

# Build connection args
CONNECTION_ARGS=(-h "$SERVER" -p "$PORT" -U "$USER" -d "$DATABASE" -v ON_ERROR_STOP=1)

# Get all migration files in order
MIGRATION_FILES=$(ls -1 "$MIGRATIONS_PATH"/V*.sql 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo "ERROR: No migration files found in $MIGRATIONS_PATH"
    exit 1
fi

echo "Found migration files:"
echo "$MIGRATION_FILES" | while read -r file; do
    echo "  - $(basename "$file")"
done
echo ""

# Run each migration
SUCCESS_COUNT=0
FAIL_COUNT=0

for file in $MIGRATION_FILES; do
    echo "Running: $(basename "$file")..."
    
    if PGPASSWORD="$PASSWORD" psql "${CONNECTION_ARGS[@]}" -f "$file"; then
        echo "  ✓ Success"
        ((SUCCESS_COUNT++))
    else
        echo "  ✗ Failed"
        ((FAIL_COUNT++))
    fi
    
    echo ""
done

# Summary
echo "========================================"
echo "Migration Summary"
echo "========================================"
TOTAL=$(echo "$MIGRATION_FILES" | wc -l)
echo "Total: $TOTAL"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "All migrations completed successfully!"
    echo "You can now verify the setup by running: PGPASSWORD=... psql -h $SERVER -p $PORT -U $USER -d $DATABASE -f verify_setup.sql"
    exit 0
else
    echo "Some migrations failed. Please check the errors above."
    exit 1
fi



