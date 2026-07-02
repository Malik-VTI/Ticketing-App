# ─────────────────────────────────────────────────────────────
# Stage 1: Builder
# Build a DYNAMICALLY linked binary so the Dynatrace OneAgent can
# auto-inject and capture traces. A statically linked Go binary
# (CGO_ENABLED=0) is detected as "opaque" by Dynatrace and produces
# no traces.
# Reference: https://docs.dynatrace.com/docs/shortlink/go-known-limitations
# ─────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

# gcc + musl-dev are required for CGO + the external linker
# (Alpine uses musl libc, not glibc).
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Cache dependencies first (avoids re-downloading on every build)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a dynamically linked binary:
#   CGO_ENABLED=1      → enables cgo (required for external linking)
#   -linkmode=external → force the system (musl) linker so libc is
#                        initialized at runtime, which Dynatrace OneAgent needs.
RUN CGO_ENABLED=1 GOOS=linux go build \
      -ldflags="-linkmode=external" \
      -o main \
      .

# ─────────────────────────────────────────────────────────────
# Stage 2: Final image
# Alpine provides musl libc — required by Dynatrace OneAgent.
# ─────────────────────────────────────────────────────────────
FROM alpine:3.20

# ca-certificates → HTTPS calls
# libc6-compat    → compatibility shim for dynamically linked Go binaries on musl
# tzdata          → timezone support
RUN apk add --no-cache ca-certificates libc6-compat tzdata \
    && adduser -D -u 1000 appuser

WORKDIR /app

# Copy the dynamically linked binary from builder
COPY --from=builder /app/main .

USER appuser

EXPOSE 8085

# Run via /bin/sh so Dynatrace OneAgent's parent-process injection is
# satisfied (the parent process is the dynamically linked /bin/sh).
CMD ["/bin/sh", "-c", "./main"]
