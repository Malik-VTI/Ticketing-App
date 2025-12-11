# Ticketing App - Quick Deployment Reference

## 🚀 Quick Start

### Using Docker Compose (Local Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f flight-service

# Stop all services
docker-compose down
```

### Using Kubernetes

```bash
# 1. Build all images (Windows)
scripts\build-all.bat

# 2. Import to containerd (Linux/WSL)
./scripts/import-to-containerd.sh

# 3. Update secrets
# Edit k8s/01-secrets.yaml with your database credentials

# 4. Deploy to Kubernetes
./scripts/deploy-k8s.sh

# 5. Check status
kubectl get pods -n ticketing-app
kubectl get svc -n ticketing-app
```

## 📋 Service Ports

| Service | Port | Type |
|---------|------|------|
| Frontend | 80 | React/Nginx |
| API Gateway | 8080 | Node.js |
| Authentication | 8081 | Go |
| Booking | 8082 | Go |
| Flight | 8083 | Spring Boot |
| Train | 8084 | Spring Boot |
| Profile | 8085 | Spring Boot |
| Pricing | 8086 | Spring Boot |
| Notification | 8087 | Spring Boot |
| Admin | 8088 | Spring Boot |

## 🔧 Common Commands

### Docker

```bash
# Build single service
docker build -t ticketing-app/flight-service:latest ./backend/catalog-service/flight-service

# Run single service
docker run -p 8083:8083 --env-file .env ticketing-app/flight-service:latest

# View logs
docker logs -f <container-name>

# Remove all containers
docker-compose down -v
```

### Kubernetes

```bash
# View all resources
kubectl get all -n ticketing-app

# View logs
kubectl logs -n ticketing-app -l app=flight-service --tail=100 -f

# Restart deployment
kubectl rollout restart deployment flight-service -n ticketing-app

# Scale deployment
kubectl scale deployment flight-service -n ticketing-app --replicas=3

# Port forward for testing
kubectl port-forward -n ticketing-app svc/flight-service 8083:8083

# Delete everything
kubectl delete namespace ticketing-app
```

### Containerd

```bash
# List images
sudo ctr -n k8s.io images ls | grep ticketing-app

# Remove image
sudo ctr -n k8s.io images rm ticketing-app/flight-service:latest

# Import image
docker save ticketing-app/flight-service:latest | sudo ctr -n k8s.io images import -
```

## 🐛 Troubleshooting

### Pod not starting

```bash
# Check pod details
kubectl describe pod <pod-name> -n ticketing-app

# Check logs
kubectl logs <pod-name> -n ticketing-app

# Check events
kubectl get events -n ticketing-app --sort-by='.lastTimestamp'
```

### Service not accessible

```bash
# Test DNS
kubectl run -it --rm debug --image=busybox --restart=Never -n ticketing-app -- nslookup flight-service

# Test connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n ticketing-app -- curl http://flight-service:8083/flights/health
```

### Database connection issues

```bash
# Check secrets
kubectl get secret ticketing-secrets -n ticketing-app -o jsonpath='{.data.DB_SERVER}' | base64 -d

# Test database connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n ticketing-app -- telnet 10.100.33.68 1433
```

## 📁 File Structure

```
ticketing-app/
├── frontend/                 # React frontend
│   ├── Dockerfile
│   └── nginx.conf
├── api-gateaway/            # API Gateway
│   └── Dockerfile
├── backend/
│   ├── authentication-service/  # Go service
│   │   └── Dockerfile
│   ├── booking-service/         # Go service
│   │   └── Dockerfile
│   ├── catalog-service/
│   │   ├── flight-service/      # Spring Boot
│   │   │   └── Dockerfile
│   │   └── train-service/       # Spring Boot
│   │       └── Dockerfile
│   ├── profile-service/         # Spring Boot
│   │   └── Dockerfile
│   ├── pricing-service/         # Spring Boot
│   │   └── Dockerfile
│   ├── notification-service/    # Spring Boot
│   │   └── Dockerfile
│   └── admin-service/           # Spring Boot
│       └── Dockerfile
├── k8s/                     # Kubernetes manifests
│   ├── 00-namespace.yaml
│   ├── 01-secrets.yaml
│   ├── 02-configmap.yaml
│   └── 03-12-*.yaml         # Service deployments
├── scripts/                 # Deployment scripts
│   ├── build-all.bat        # Windows build script
│   ├── build-all.sh         # Linux build script
│   ├── import-to-containerd.sh
│   └── deploy-k8s.sh
├── docker-compose.yml       # Docker Compose config
└── DEPLOYMENT.md           # Full deployment guide
```

## ⚠️ Important Notes

1. **Update Secrets**: Always update `k8s/01-secrets.yaml` before deploying
2. **Spring Boot Version**: The pom.xml files currently use Spring Boot 4.0.0 which doesn't exist. This will cause errors. Change to 3.2.0 or 3.3.0
3. **Image Pull Policy**: Set to `IfNotPresent` for local images
4. **Health Checks**: Ensure all services have `/health` endpoints
5. **Database Access**: Ensure Kubernetes cluster can access your SQL Server

## 🔐 Security Checklist

- [ ] Update JWT_SECRET_KEY in secrets
- [ ] Update database credentials
- [ ] Use HTTPS in production
- [ ] Enable network policies
- [ ] Use private container registry
- [ ] Enable RBAC
- [ ] Scan images for vulnerabilities

## 📞 Support

For issues or questions, refer to:
- Full guide: `DEPLOYMENT.md`
- Configuration: `CONFIGURATION.md`
- Setup: `SETUP_ENV.md`
