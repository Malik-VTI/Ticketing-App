#!/bin/bash

# Import Docker images to containerd
# This script saves Docker images and imports them to containerd (k8s.io namespace)

set -e

TAG="${1:-latest}"
REGISTRY="${2:-ticketing-app}"

echo "Importing images to containerd..."
echo "Tag: $TAG"
echo "Registry: $REGISTRY"
echo ""

services=(
    "frontend"
    "api-gateway"
    "authentication-service"
    "booking-service"
    "flight-service"
    "train-service"
    "profile-service"
    "pricing-service"
    "notification-service"
    "admin-service"
)

for service in "${services[@]}"; do
    echo "Importing $service..."
    docker save $REGISTRY/$service:$TAG | sudo ctr -n k8s.io images import -
    echo "✓ $service imported"
done

echo ""
echo "All images imported to containerd!"
echo ""
echo "Verify with:"
echo "  sudo ctr -n k8s.io images ls | grep $REGISTRY"
