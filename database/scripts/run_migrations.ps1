# PowerShell Script to Run All Migrations
# Usage: .\run_migrations.ps1 -Server "localhost" -Database "ticketing_db" -User "sa" -Password "YourPassword"

param(
    [Parameter(Mandatory=$true)]
    [string]$Server,
    
    [Parameter(Mandatory=$true)]
    [string]$Database,
    
    [Parameter(Mandatory=$false)]
    [string]$User = "sa",
    
    [Parameter(Mandatory=$false)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [switch]$TrustServerCertificate = $true
)

$ErrorActionPreference = "Stop"

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrationsPath = Join-Path $scriptPath "..\migrations"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Database Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server: $Server" -ForegroundColor Yellow
Write-Host "Database: $Database" -ForegroundColor Yellow
Write-Host "Migrations Path: $migrationsPath" -ForegroundColor Yellow
Write-Host ""

# Check if sqlcmd is available
try {
    $sqlcmdVersion = sqlcmd -? 2>&1 | Select-String "Version"
    if (-not $sqlcmdVersion) {
        throw "sqlcmd not found"
    }
} catch {
    Write-Host "ERROR: sqlcmd is not available. Please install SQL Server Command Line Utilities." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/sql/tools/sqlcmd-utility" -ForegroundColor Yellow
    exit 1
}

# Build connection string
$connectionString = "-S `"$Server`" -d `"$Database`""
if ($User) {
    $connectionString += " -U `"$User`""
    if ($Password) {
        $connectionString += " -P `"$Password`""
    } else {
        Write-Host "Password not provided. You will be prompted for password." -ForegroundColor Yellow
    }
} else {
    $connectionString += " -E" # Use Windows Authentication
}

if ($TrustServerCertificate) {
    $connectionString += " -C"
}

# Get all migration files in order
$migrationFiles = Get-ChildItem -Path $migrationsPath -Filter "V*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "ERROR: No migration files found in $migrationsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($migrationFiles.Count) migration file(s):" -ForegroundColor Green
foreach ($file in $migrationFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor Gray
}
Write-Host ""

# Run each migration
$successCount = 0
$failCount = 0

foreach ($file in $migrationFiles) {
    Write-Host "Running: $($file.Name)..." -ForegroundColor Cyan
    
    try {
        $command = "sqlcmd $connectionString -i `"$($file.FullName)`""
        Invoke-Expression $command
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Success" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ Failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total: $($migrationFiles.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "All migrations completed successfully!" -ForegroundColor Green
    Write-Host "You can now verify the setup by running: .\verify_setup.sql" -ForegroundColor Yellow
} else {
    Write-Host "Some migrations failed. Please check the errors above." -ForegroundColor Red
    exit 1
}



