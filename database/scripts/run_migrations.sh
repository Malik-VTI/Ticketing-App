#!/bin/bash
# Bash Script to Run All Migrations
# Usage: ./run_migrations.sh -s localhost -d ticketing_db -u sa -p YourPassword

# Default values
SERVER="localhost"
DATABASE="ticketing_db"
USER="sa"
PASSWORD=""
TRUST_CERT="true"

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

# Check if sqlcmd is available
if ! command -v sqlcmd &> /dev/null; then
    echo "ERROR: sqlcmd is not available. Please install SQL Server Command Line Utilities."
    echo "For Linux: https://docs.microsoft.com/en-us/sql/linux/sql-server-linux-setup-tools"
    exit 1
fi

# Build connection string
CONNECTION_STRING="-S $SERVER -d $DATABASE"
if [ -n "$USER" ]; then
    CONNECTION_STRING="$CONNECTION_STRING -U $USER"
    if [ -n "$PASSWORD" ]; then
        CONNECTION_STRING="$CONNECTION_STRING -P $PASSWORD"
    fi
else
    CONNECTION_STRING="$CONNECTION_STRING -E" # Use Windows Authentication
fi

if [ "$TRUST_CERT" = "true" ]; then
    CONNECTION_STRING="$CONNECTION_STRING -C"
fi

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
    
    if sqlcmd $CONNECTION_STRING -i "$file"; then
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
    echo "You can now verify the setup by running: sqlcmd $CONNECTION_STRING -i verify_setup.sql"
    exit 0
else
    echo "Some migrations failed. Please check the errors above."
    exit 1
fi



