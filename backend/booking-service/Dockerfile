# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:3.20

RUN apk --no-cache add ca-certificates && adduser -D -u 1000 appuser

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

USER appuser

EXPOSE 8082

CMD ["./main"]
