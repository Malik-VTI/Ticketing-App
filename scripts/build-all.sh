#!/bin/bash

# Ticketing App - Build All Docker Images Script
# This script builds all Docker images for the ticketing application

set -e  # Exit on error

echo "========================================="
echo "Building Ticketing App Docker Images"
echo "========================================="

# Define image tag
TAG="${1:-latest}"
REGISTRY="${2:-ticketing-app}"

echo "Using tag: $TAG"
echo "Using registry: $REGISTRY"
echo ""

# Frontend
echo "[1/10] Building Frontend..."
docker build -t $REGISTRY/frontend:$TAG ./frontend
echo "✓ Frontend built successfully"
echo ""

# API Gateway
echo "[2/10] Building API Gateway..."
docker build -t $REGISTRY/api-gateway:$TAG ./api-gateaway
echo "✓ API Gateway built successfully"
echo ""

# Authentication Service
echo "[3/10] Building Authentication Service..."
docker build -t $REGISTRY/authentication-service:$TAG ./backend/authentication-service
echo "✓ Authentication Service built successfully"
echo ""

# Booking Service
echo "[4/10] Building Booking Service..."
docker build -t $REGISTRY/booking-service:$TAG ./backend/booking-service
echo "✓ Booking Service built successfully"
echo ""

# Flight Service
echo "[5/10] Building Flight Service..."
docker build -t $REGISTRY/flight-service:$TAG ./backend/catalog-service/flight-service
echo "✓ Flight Service built successfully"
echo ""

# Train Service
echo "[6/10] Building Train Service..."
docker build -t $REGISTRY/train-service:$TAG ./backend/catalog-service/train-service
echo "✓ Train Service built successfully"
echo ""

# Profile Service
echo "[7/10] Building Profile Service..."
docker build -t $REGISTRY/profile-service:$TAG ./backend/profile-service
echo "✓ Profile Service built successfully"
echo ""

# Pricing Service
echo "[8/10] Building Pricing Service..."
docker build -t $REGISTRY/pricing-service:$TAG ./backend/pricing-service
echo "✓ Pricing Service built successfully"
echo ""

# Notification Service
echo "[9/10] Building Notification Service..."
docker build -t $REGISTRY/notification-service:$TAG ./backend/notification-service
echo "✓ Notification Service built successfully"
echo ""

# Admin Service
echo "[10/10] Building Admin Service..."
docker build -t $REGISTRY/admin-service:$TAG ./backend/admin-service
echo "✓ Admin Service built successfully"
echo ""

echo "========================================="
echo "All images built successfully!"
echo "========================================="
echo ""
echo "Built images:"
docker images | grep $REGISTRY
echo ""
echo "To import to containerd, run:"
echo "  ./scripts/import-to-containerd.sh"
