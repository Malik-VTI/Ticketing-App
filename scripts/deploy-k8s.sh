#!/bin/bash

# Deploy all Kubernetes manifests
# This script applies all k8s YAML files in the correct order

set -e

echo "========================================="
echo "Deploying Ticketing App to Kubernetes"
echo "========================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Apply manifests in order
echo "[1/13] Creating namespace..."
kubectl apply -f k8s/00-namespace.yaml

echo "[2/13] Creating secrets..."
kubectl apply -f k8s/01-secrets.yaml

echo "[3/13] Creating configmap..."
kubectl apply -f k8s/02-configmap.yaml

echo "[4/13] Deploying authentication service..."
kubectl apply -f k8s/03-authentication-service.yaml

echo "[5/13] Deploying booking service..."
kubectl apply -f k8s/04-booking-service.yaml

echo "[6/13] Deploying flight service..."
kubectl apply -f k8s/05-flight-service.yaml

echo "[7/13] Deploying train service..."
kubectl apply -f k8s/06-train-service.yaml

echo "[8/13] Deploying profile service..."
kubectl apply -f k8s/07-profile-service.yaml

echo "[9/13] Deploying pricing service..."
kubectl apply -f k8s/08-pricing-service.yaml

echo "[10/13] Deploying notification service..."
kubectl apply -f k8s/09-notification-service.yaml

echo "[11/13] Deploying admin service..."
kubectl apply -f k8s/10-admin-service.yaml

echo "[12/13] Deploying API gateway..."
kubectl apply -f k8s/11-api-gateway.yaml

echo "[13/13] Deploying frontend..."
kubectl apply -f k8s/12-frontend.yaml

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Checking deployment status..."
kubectl get pods -n ticketing-app
echo ""
echo "Checking services..."
kubectl get svc -n ticketing-app
echo ""
echo "To watch pod status:"
echo "  kubectl get pods -n ticketing-app -w"
echo ""
echo "To get external IPs:"
echo "  kubectl get svc -n ticketing-app"
