# Ticketing App - Kubernetes Deployment Guide

This guide explains how to deploy the Ticketing Application to a Kubernetes cluster using containerd runtime.

## Prerequisites

- Kubernetes cluster with containerd runtime
- `kubectl` configured to access your cluster
- Docker installed for building images
- Access to push images to a container registry (or use local images)

## Architecture

The application consists of:
- **Frontend**: React application (Vite + TypeScript)
- **API Gateway**: Node.js/Express gateway
- **Backend Services**:
  - Authentication Service (Go) - Port 8081
  - Booking Service (Go) - Port 8082
  - Flight Service (Spring Boot) - Port 8083
  - Train Service (Spring Boot) - Port 8084
  - Profile Service (Spring Boot) - Port 8085
  - Pricing Service (Spring Boot) - Port 8086
  - Notification Service (Spring Boot) - Port 8087
  - Admin Service (Spring Boot) - Port 8088

## Deployment Steps

### 1. Build Docker Images

Since you're using containerd, you can build images with Docker and import them to containerd, or use `nerdctl` directly.

#### Option A: Using Docker + ctr (containerd CLI)

```bash
# Build all images
cd ticketing-app

# Frontend
docker build -t ticketing-app/frontend:latest ./frontend

# API Gateway
docker build -t ticketing-app/api-gateway:latest ./api-gateaway

# Authentication Service
docker build -t ticketing-app/authentication-service:latest ./backend/authentication-service

# Booking Service
docker build -t ticketing-app/booking-service:latest ./backend/booking-service

# Flight Service
docker build -t ticketing-app/flight-service:latest ./backend/catalog-service/flight-service

# Train Service
docker build -t ticketing-app/train-service:latest ./backend/catalog-service/train-service

# Profile Service
docker build -t ticketing-app/profile-service:latest ./backend/profile-service

# Pricing Service
docker build -t ticketing-app/pricing-service:latest ./backend/pricing-service

# Notification Service
docker build -t ticketing-app/notification-service:latest ./backend/notification-service

# Admin Service
docker build -t ticketing-app/admin-service:latest ./backend/admin-service

# Save and import to containerd (on each node)
docker save ticketing-app/frontend:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/api-gateway:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/authentication-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/booking-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/flight-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/train-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/profile-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/pricing-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/notification-service:latest | sudo ctr -n k8s.io images import -
docker save ticketing-app/admin-service:latest | sudo ctr -n k8s.io images import -
```

#### Option B: Using nerdctl (containerd native)

```bash
# Build all images with nerdctl
nerdctl build -t ticketing-app/frontend:latest ./frontend
nerdctl build -t ticketing-app/api-gateway:latest ./api-gateaway
nerdctl build -t ticketing-app/authentication-service:latest ./backend/authentication-service
nerdctl build -t ticketing-app/booking-service:latest ./backend/booking-service
nerdctl build -t ticketing-app/flight-service:latest ./backend/catalog-service/flight-service
nerdctl build -t ticketing-app/train-service:latest ./backend/catalog-service/train-service
nerdctl build -t ticketing-app/profile-service:latest ./backend/profile-service
nerdctl build -t ticketing-app/pricing-service:latest ./backend/pricing-service
nerdctl build -t ticketing-app/notification-service:latest ./backend/notification-service
nerdctl build -t ticketing-app/admin-service:latest ./backend/admin-service
```

### 2. Update Secrets

**IMPORTANT**: Before deploying, update the secrets in `k8s/01-secrets.yaml` with your actual values:

```bash
# Edit the secrets file
nano k8s/01-secrets.yaml

# Update these values:
# - DB_SERVER: Your SQL Server IP
# - DB_DATABASE: Your database name
# - DB_USER: Your database username
# - DB_PASSWORD: Your database password
# - JWT_SECRET_KEY: A strong secret key (minimum 32 characters)
```

### 3. Deploy to Kubernetes

```bash
# Apply all Kubernetes manifests in order
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-authentication-service.yaml
kubectl apply -f k8s/04-booking-service.yaml
kubectl apply -f k8s/05-flight-service.yaml
kubectl apply -f k8s/06-train-service.yaml
kubectl apply -f k8s/07-profile-service.yaml
kubectl apply -f k8s/08-pricing-service.yaml
kubectl apply -f k8s/09-notification-service.yaml
kubectl apply -f k8s/10-admin-service.yaml
kubectl apply -f k8s/11-api-gateway.yaml
kubectl apply -f k8s/12-frontend.yaml

# Or apply all at once
kubectl apply -f k8s/
```

### 4. Verify Deployment

```bash
# Check namespace
kubectl get namespaces

# Check all pods
kubectl get pods -n ticketing-app

# Check services
kubectl get svc -n ticketing-app

# Check deployments
kubectl get deployments -n ticketing-app

# View logs of a specific service
kubectl logs -n ticketing-app -l app=flight-service --tail=100

# Describe a pod for troubleshooting
kubectl describe pod -n ticketing-app <pod-name>
```

### 5. Access the Application

```bash
# Get the external IP of the frontend
kubectl get svc frontend -n ticketing-app

# Get the external IP of the API gateway
kubectl get svc api-gateway -n ticketing-app
```

Access the application:
- **Frontend**: `http://<FRONTEND_EXTERNAL_IP>`
- **API Gateway**: `http://<API_GATEWAY_EXTERNAL_IP>:8080`

## Docker Compose (Local Development)

For local development, use Docker Compose:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## Scaling

```bash
# Scale a specific service
kubectl scale deployment flight-service -n ticketing-app --replicas=3

# Auto-scale based on CPU
kubectl autoscale deployment flight-service -n ticketing-app --min=2 --max=10 --cpu-percent=80
```

## Updating Services

```bash
# Rebuild image
docker build -t ticketing-app/flight-service:latest ./backend/catalog-service/flight-service

# Import to containerd
docker save ticketing-app/flight-service:latest | sudo ctr -n k8s.io images import -

# Restart deployment
kubectl rollout restart deployment flight-service -n ticketing-app

# Check rollout status
kubectl rollout status deployment flight-service -n ticketing-app
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n ticketing-app

# Check logs
kubectl logs <pod-name> -n ticketing-app

# Check if image is available
sudo ctr -n k8s.io images ls | grep ticketing-app
```

### Service connectivity issues

```bash
# Test service DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n ticketing-app -- nslookup flight-service

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n ticketing-app -- curl http://flight-service:8083/flights/health
```

### Database connection issues

```bash
# Verify secrets
kubectl get secret ticketing-secrets -n ticketing-app -o yaml

# Check if database is accessible from cluster
kubectl run -it --rm debug --image=busybox --restart=Never -n ticketing-app -- telnet <DB_SERVER> 1433
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace ticketing-app

# Or delete individual resources
kubectl delete -f k8s/
```

## Notes

- All backend services use health check endpoints for liveness and readiness probes
- Services are configured with resource limits to prevent resource exhaustion
- The API Gateway and Frontend use LoadBalancer type services for external access
- All sensitive data is stored in Kubernetes Secrets
- Service URLs are configured via ConfigMap for easy updates
