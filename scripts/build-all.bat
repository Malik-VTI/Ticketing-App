@echo off
REM Ticketing App - Build All Docker Images Script (Windows)
REM This script builds all Docker images for the ticketing application

setlocal enabledelayedexpansion

echo =========================================
echo Building Ticketing App Docker Images
echo =========================================

set TAG=%1
if "%TAG%"=="" set TAG=latest

set REGISTRY=%2
if "%REGISTRY%"=="" set REGISTRY=ticketing-app

echo Using tag: %TAG%
echo Using registry: %REGISTRY%
echo.

REM Frontend
echo [1/10] Building Frontend...
docker build -t %REGISTRY%/frontend:%TAG% ./frontend
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Frontend built successfully
echo.

REM API Gateway
echo [2/10] Building API Gateway...
docker build -t %REGISTRY%/api-gateway:%TAG% ./api-gateaway
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ API Gateway built successfully
echo.

REM Authentication Service
echo [3/10] Building Authentication Service...
docker build -t %REGISTRY%/authentication-service:%TAG% ./backend/authentication-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Authentication Service built successfully
echo.

REM Booking Service
echo [4/10] Building Booking Service...
docker build -t %REGISTRY%/booking-service:%TAG% ./backend/booking-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Booking Service built successfully
echo.

REM Flight Service
echo [5/10] Building Flight Service...
docker build -t %REGISTRY%/flight-service:%TAG% ./backend/catalog-service/flight-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Flight Service built successfully
echo.

REM Train Service
echo [6/10] Building Train Service...
docker build -t %REGISTRY%/train-service:%TAG% ./backend/catalog-service/train-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Train Service built successfully
echo.

REM Profile Service
echo [7/10] Building Profile Service...
docker build -t %REGISTRY%/profile-service:%TAG% ./backend/profile-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Profile Service built successfully
echo.

REM Pricing Service
echo [8/10] Building Pricing Service...
docker build -t %REGISTRY%/pricing-service:%TAG% ./backend/pricing-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Pricing Service built successfully
echo.

REM Notification Service
echo [9/10] Building Notification Service...
docker build -t %REGISTRY%/notification-service:%TAG% ./backend/notification-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Notification Service built successfully
echo.

REM Admin Service
echo [10/10] Building Admin Service...
docker build -t %REGISTRY%/admin-service:%TAG% ./backend/admin-service
if %errorlevel% neq 0 exit /b %errorlevel%
echo √ Admin Service built successfully
echo.

echo =========================================
echo All images built successfully!
echo =========================================
echo.
echo Built images:
docker images | findstr %REGISTRY%
echo.
echo To import to containerd, run:
echo   scripts\import-to-containerd.bat

endlocal
