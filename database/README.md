# Database Setup and Migrations

This directory contains all database migration scripts for the Ticketing Application microservices.

## Overview

The database uses Microsoft SQL Server (MSSQL) with a schema-per-service approach. All services share the same database instance but maintain separate logical schemas through table organization.

## Migration Files

All migration files follow the naming convention: `V{number}__{description}.sql`

### Migration Order

1. **V001** - Users Schema (Authentication Service)
2. **V002** - Flight Domain Schema (Flight Service)
3. **V003** - Train Domain Schema (Train Service)
4. **V004** - Hotel Domain Schema (Hotel Service)
5. **V005** - Booking Domain Schema (Booking Service)
6. **V006** - Payment Domain Schema (Payment Service)
7. **V007** - Coupon Schema (Admin/Pricing Service)
8. **V008** - Audit Log Schema (All Services)
9. **V009** - Additional Performance Indexes

## Prerequisites

- Microsoft SQL Server 2016 or later
- SQL Server Management Studio (SSMS) or sqlcmd
- Database created (or use existing database)
- Appropriate permissions (CREATE TABLE, CREATE INDEX, ALTER TABLE)

## Running Migrations

### Option 1: Using SQL Server Management Studio (SSMS)

1. Open SQL Server Management Studio
2. Connect to your SQL Server instance
3. Select your target database
4. Open each migration file in order (V001 through V009)
5. Execute each file sequentially

### Option 2: Using sqlcmd (Command Line)

```bash
# Navigate to the migrations directory
cd database/migrations

# Run all migrations using the master script
sqlcmd -S <server_name> -d <database_name> -i run_all_migrations.sql

# Or run individual migrations
sqlcmd -S <server_name> -d <database_name> -i V001__create_users_schema.sql
sqlcmd -S <server_name> -d <database_name> -i V002__create_flight_schema.sql
# ... and so on
```

### Option 3: Using PowerShell

```powershell
# Set connection parameters
$server = "localhost"
$database = "ticketing_db"
$migrationsPath = "database\migrations"

# Run all migrations
Get-ChildItem -Path $migrationsPath -Filter "V*.sql" | 
    Sort-Object Name | 
    ForEach-Object {
        Write-Host "Running $($_.Name)..."
        sqlcmd -S $server -d $database -i $_.FullName
    }
```

### Option 4: Using Docker (if using SQL Server in Docker)

```bash
# Copy migrations to container
docker cp database/migrations <container_name>:/migrations

# Execute migrations
docker exec -it <container_name> /opt/mssql-tools/bin/sqlcmd \
    -S localhost -U sa -P <password> -d <database> \
    -i /migrations/V001__create_users_schema.sql
```

## Database Connection String Format

```
Server=<server>;Database=<database>;User Id=<user>;Password=<password>;TrustServerCertificate=True;
```

For local development:
```
Server=localhost;Database=ticketing_db;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;
```

## Schema Organization

### By Service

- **Authentication Service**: `users`
- **Flight Service**: `airlines`, `airports`, `flights`, `flight_schedules`, `flight_seats`, `flight_fares`
- **Train Service**: `stations`, `trains`, `train_schedules`, `coaches`, `coach_seats`
- **Hotel Service**: `hotels`, `room_types`, `rooms`, `room_rates`
- **Booking Service**: `bookings`, `booking_items`
- **Payment Service**: `payments`
- **Admin/Pricing Service**: `coupons`, `booking_coupons`
- **All Services**: `audit_logs`

## Key Design Decisions

1. **UUID Primary Keys**: All tables use `UNIQUEIDENTIFIER` (GUID/UUID) as primary keys for distributed system compatibility
2. **Timestamps**: All tables include `created_at` and `updated_at` for audit purposes
3. **Indexes**: Comprehensive indexing on foreign keys, frequently queried columns, and composite indexes for common query patterns
4. **Status Fields**: String-based status fields for flexibility (can be extended with enums in application code)
5. **JSON Storage**: `NVARCHAR(MAX)` used for flexible JSON data storage (metadata, rules, provider responses)

## Verification

After running migrations, verify the setup:

```sql
-- Check all tables were created
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Check foreign key constraints
SELECT 
    fk.name AS ForeignKey,
    tp.name AS ParentTable,
    cp.name AS ParentColumn,
    tr.name AS ReferencedTable,
    cr.name AS ReferencedColumn
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
ORDER BY tp.name, fk.name;

-- Check indexes
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0
ORDER BY t.name, i.name;
```

## Rollback

To rollback migrations, you can create reverse migration scripts or manually drop tables in reverse order:

```sql
-- WARNING: This will delete all data!
-- Drop in reverse order of creation

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS booking_coupons;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS booking_items;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS room_rates;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS hotels;
DROP TABLE IF EXISTS coach_seats;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS train_schedules;
DROP TABLE IF EXISTS trains;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS flight_fares;
DROP TABLE IF EXISTS flight_seats;
DROP TABLE IF EXISTS flight_schedules;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS airports;
DROP TABLE IF EXISTS airlines;
DROP TABLE IF EXISTS users;
```

## Next Steps

After completing database setup:

1. Configure connection strings in each service's `application.yaml` or configuration files
2. Set up database connection pooling
3. Implement repository/data access layers in each service
4. Add seed data scripts if needed for development/testing

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the database user has `db_owner` or appropriate permissions
2. **Foreign Key Violations**: Ensure migrations run in order (dependencies must exist first)
3. **Duplicate Key Errors**: Check if tables already exist - you may need to drop them first
4. **Connection Timeout**: Verify SQL Server is running and accessible

### Getting Help

- Check SQL Server error logs
- Verify connection string format
- Ensure all prerequisites are met
- Review migration file syntax

