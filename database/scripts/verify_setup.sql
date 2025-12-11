-- Verification Script
-- Run this after migrations to verify all tables and indexes were created correctly

USE ticketing_db;
GO

PRINT '========================================';
PRINT 'Database Setup Verification';
PRINT '========================================';
PRINT '';

-- Check all tables
PRINT '1. Checking Tables...';
PRINT '----------------------------------------';
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS ColumnCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

PRINT '';
PRINT 'Expected Tables:';
PRINT '  - users';
PRINT '  - airlines, airports, flights, flight_schedules, flight_seats, flight_fares';
PRINT '  - stations, trains, train_schedules, coaches, coach_seats';
PRINT '  - hotels, room_types, rooms, room_rates';
PRINT '  - bookings, booking_items';
PRINT '  - payments';
PRINT '  - coupons, booking_coupons';
PRINT '  - audit_logs';
PRINT '';

-- Check foreign keys
PRINT '2. Checking Foreign Key Constraints...';
PRINT '----------------------------------------';
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

PRINT '';

-- Check indexes
PRINT '3. Checking Indexes...';
PRINT '----------------------------------------';
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    CASE 
        WHEN i.is_unique = 1 THEN 'Yes'
        ELSE 'No'
    END AS IsUnique
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0 AND i.name IS NOT NULL
ORDER BY t.name, i.name;

PRINT '';

-- Check primary keys
PRINT '4. Checking Primary Keys...';
PRINT '----------------------------------------';
SELECT 
    t.name AS TableName,
    pk.name AS PrimaryKeyName,
    c.name AS ColumnName
FROM sys.tables t
INNER JOIN sys.key_constraints pk ON t.object_id = pk.parent_object_id AND pk.type = 'PK'
INNER JOIN sys.index_columns ic ON pk.parent_object_id = ic.object_id AND pk.unique_index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
ORDER BY t.name;

PRINT '';
PRINT '========================================';
PRINT 'Verification Complete!';
PRINT '========================================';
GO



