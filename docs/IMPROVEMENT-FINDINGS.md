# Dokumen Temuan Perbaikan — Ticketing App

> **Tanggal analisa:** 2026-06-17
> **Branch saat analisa:** `fix-p2-p3-bugs`
> **Metodologi:** Eksplorasi seluruh codebase (Go, Java, Node.js, K8s, CI/CD) + verifikasi manual terhadap temuan kritis.
> **Catatan:** Setiap temuan punya ID stabil (mis. `SEC-01`) untuk pelacakan. Checkbox `[ ]` = belum dikerjakan, `[x]` = selesai.

---

## Ringkasan & Status Verifikasi

Beberapa klaim awal **diluruskan** setelah verifikasi langsung:

- ✅ **`.env`, `id_rsa`, `target/`, `.idea/`, `*.tar` TIDAK ter-commit** ke git — `.gitignore` sudah bekerja. (Klaim "semua secret ada di git history" tidak akurat.)
- ⚠️ **Namun secret tetap bocor** lewat 2 jalur lain yang benar-benar ter-commit:
  1. `deployments/01-secrets.yaml` (plaintext, **tracked di git** — terverifikasi).
  2. Hardcoded fallback di source code Go (`config.go`, `auth_middleware.go`, `internal_auth.go`).

### Scoreboard

| Area | Skor | Status |
|------|------|--------|
| Keamanan (secret handling) | 3/10 | 🔴 Lemah |
| Arsitektur & resilience | 4/10 | 🟠 Belum production-ready |
| Testing | 1/10 | 🔴 Praktis tidak ada |
| Observability | 3/10 | 🟠 Lemah |
| DevOps / K8s | 5/10 | 🟡 Cukup, banyak gap |
| Struktur kode | 7/10 | 🟢 Baik |
| Dokumentasi | 5/10 | 🟡 Parsial (~40% service) |

---

## 🔴 P0 — Kritis (bug nyata & kebocoran secret)

### `BUG-01` — `adminClient` tidak terdefinisi → endpoint crash
- **Severity:** Critical (bug runtime, terverifikasi)
- **Lokasi:** `api-gateway/routes/admin.js:17`
- **Masalah:** Variabel `adminClient` dipakai di handler `GET /api/admin/metrics`, tapi hanya `flightClient`, `trainClient`, `hotelClient` yang dideklarasi (baris 7–9). Setiap kali endpoint dipanggil → `ReferenceError: adminClient is not defined` → HTTP 500.
- **Rekomendasi:** Tambahkan deklarasi `const adminClient = createServiceClient(config.services.admin.baseUrl, config.services.admin.timeout);` (config `services.admin` sudah ada).
- **Status:** `[x]` SELESAI (2026-06-17) — `adminClient` dideklarasi di `admin.js:10`; `config.services.admin` terkonfirmasi ada (`config.js:60-63`); `node --check` lulus.

### `SEC-01` — JWT secret di-hardcode sebagai fallback di source code
- **Severity:** Critical (terverifikasi)
- **Lokasi:**
  - `backend/authentication-service/config/config.go:56`
  - `backend/booking-service/middleware/auth_middleware.go:20`
  - `backend/payment-service/middleware/auth_middleware.go:18`
- **Masalah:** Pola `getEnv("JWT_SECRET_KEY", "bGZiXRX7b3FPCzLWkfRLiUtrQ+lknCeKMtSF9+oJKNI=")`. Nilai secret asli tertanam di kode yang ter-commit; siapa pun yang baca repo bisa forge JWT.
- **Rekomendasi:** Hapus fallback. Bila env kosong → **gagal-keras** (`log.Fatal("JWT_SECRET_KEY not set")`) saat startup, jangan diisi nilai default.
- **Status:** `[x]` SELESAI (2026-06-17) — literal JWT dihapus di 3 file; auth-service pakai helper `mustGetEnv` (sekalian `DB_PASSWORD` di config.go), booking & payment fail-hard di startup. `go build` ketiga service bersih. Catatan: K8s sudah meng-inject `JWT_SECRET_KEY` ke booking/payment via `envFrom.secretRef`, jadi tidak crash-loop.

### `SEC-02` — Internal service key di-hardcode
- **Severity:** Critical (terverifikasi)
- **Lokasi:**
  - `backend/booking-service/middleware/internal_auth.go:15` (`expectedKey = "default-internal-secret"`)
  - `backend/payment-service/service/payment_service.go:145` (`internalKey = "default-internal-secret"`)
- **Masalah:** Autentikasi antar-service mengandalkan key default yang sama & dapat ditebak. Endpoint internal (mis. `confirm booking`) bisa dipanggil pihak luar.
- **Rekomendasi:** Wajibkan dari env, gagal-keras bila kosong. Generate key unik per environment.
- **Status:** `[x]` SELESAI (2026-06-17) — literal `"default-internal-secret"` dihapus. booking fail-hard di startup; payment log+return (goroutine, tidak boleh fatal). **Wiring dilengkapi**: `INTERNAL_API_KEY` ditambahkan ke `deployments/01-secrets.yaml`, `docker-compose.yml` (booking+payment), dan `.env` — sebelumnya env var ini tidak ada di mana pun, jadi tanpa wiring booking akan crash-loop.

### `SEC-03` — Secret plaintext ter-commit di K8s manifest
- **Severity:** Critical (terverifikasi — file **tracked** di git)
- **Lokasi:** `deployments/01-secrets.yaml` (`DB_PASSWORD: "P@ssw0rd"`, `JWT_SECRET_KEY: ...`)
- **Masalah:** Secret asli ada di git. Password DB juga lemah (`P@ssw0rd`).
- **Rekomendasi:** Keluarkan dari git (template `01-secrets.example.yaml`), pakai Sealed Secrets / External Secrets Operator / Vault, dan **rotate** semua secret. Pertimbangkan `git filter-repo` untuk membersihkan history.
- **Status:** `[~]` PAKET SIAP — arah dipilih: **Sealed Secrets** (2026-06-17). Disiapkan: `deployments/01-secrets.example.yaml` (template placeholder, aman commit), `deployments/sealed-secrets/README.md` (panduan 6 langkah), `deployments/sealed-secrets/seal.sh` (helper, syntax tervalidasi), entry `.gitignore` untuk plaintext `deployments/01-secrets.yaml`. **Sisa langkah manual (perlu cluster + rotasi oleh Anda):** install controller sealed-secrets + kubeseal CLI, rotate semua nilai, jalankan `seal.sh`, commit `01-sealed-secrets.yaml`, lalu `git rm --cached 01-secrets.yaml`. ⚠️ `INTERNAL_API_KEY` baru (dari fix SEC-02) & hardcoded `DB_PASSWORD`/IP default di `config.go` service lain (booking/payment/hotel) ikut tercakup saat rotasi.

### `SEC-04` — `id_rsa` (private key) ada di working directory
- **Severity:** High (tidak ter-commit, tapi key asli nongkrong di folder project)
- **Lokasi:** `id_rsa`, `id_rsa.pub` (root)
- **Rekomendasi:** Pindahkan keluar repo & rotate key. Jangan simpan private key di dalam project.
- **Status:** `[~]` SEBAGIAN (2026-06-17) — `id_rsa` & `id_rsa.pub` sudah dipindah keluar repo ke `C:\Users\malik\.ssh\` (tujuan tidak punya `id_rsa` lain, tidak ada yang ketimpa). `.gitignore` tetap mengabaikannya. **Sisa:** rotate key (generate pasangan baru, update `authorized_keys` di server, cabut yang lama) karena key sempat berada di folder project.

---

## 🟠 P1 — Arsitektur & Ketahanan (Resilience)

### `ARCH-01` — Dokumentasi tidak sinkron dengan implementasi
- **Severity:** High (terverifikasi)
- **Lokasi:** `README.md` (baris 5, 22, 33, 61, 77, 79) vs `backend/*/database/db.go:25`
- **Masalah:** README menyatakan **MSSQL** + **RabbitMQ/Kafka**, tapi implementasi nyata pakai `sql.Open("postgres", ...)` (PostgreSQL) dan **tidak ada message broker sama sekali**.
- **Rekomendasi:** Selaraskan — update README ke "PostgreSQL, komunikasi HTTP sinkron", ATAU implementasikan broker bila memang target arsitekturnya.
- **Status:** `[x]` SELESAI (2026-06-17) — `README.md` diperbaiki: header DB → PostgreSQL, ditambah banner "Status Implementasi Aktual" yang membedakan desain target vs realita (broker/saga/event = belum ada). Dokumen desain dipertahankan sebagai roadmap.

### `ARCH-02` — Tidak ada saga / kompensasi pada alur booking→payment→inventory
- **Severity:** High
- **Lokasi:** `backend/booking-service/service/booking_service.go`, `backend/payment-service/service/payment_service.go`
- **Masalah:** Transaksi DB hanya lokal per-service. Reservasi inventory dilakukan via HTTP di luar transaksi booking. Bila payment sukses tapi `confirmBooking()` gagal → booking nyangkut `pending` permanen; inventory bisa stuck di status `held` tanpa kompensasi.
- **Rekomendasi:** Terapkan saga (orchestration di booking-service) dengan state machine `pending → locked → processing → confirmed/failed` + compensating action (release inventory) saat gagal. Tambah idempotency key untuk payment.
- **Status:** `[ ]` FLAGGED — sengaja TIDAK dikebut (risiko tinggi merusak alur booking; butuh perubahan terkoordinasi + testing). **Rencana konkret bertahap:**
  1. **Idempotency key** di tabel `payments` (kolom unik `idempotency_key`) + cek-sebelum-insert → cegah double-charge saat retry.
  2. **Status terminal + reconciliation worker**: booking yang stuck di `processing`/`pending` melewati batas waktu → job berkala yang (a) cek status payment, (b) confirm bila sudah dibayar, atau (c) `expired` + release inventory bila tidak.
  3. **Compensating action eksplisit**: bila commit booking gagal SETELAH inventory ter-reserve, panggil release inventory (kompensasi) — saat ini ada lubang di jalur kegagalan tertentu.
  4. (Opsional jangka panjang) pindah ke event-driven (broker) untuk saga choreography — selaras dengan ARCH-01/ARCH-04/ARCH-05.
  Prasyarat aman: idempotency (poin 1) harus ada SEBELUM menambahkan retry pada operasi non-idempoten (ARCH-04).

### `ARCH-03` — `confirmBooking()` tanpa timeout
- **Severity:** High (terverifikasi)
- **Lokasi:** `backend/payment-service/service/payment_service.go:150` (`client := &http.Client{}`), dipanggil sebagai goroutine di baris 73.
- **Masalah:** HTTP client default tidak punya timeout → bila booking-service lambat/hang, goroutine menggantung tak terbatas.
- **Rekomendasi:** `&http.Client{Timeout: 10 * time.Second}` + retry dengan exponential backoff.
- **Status:** `[x]` SELESAI (2026-06-17) — timeout 10s + retry idempoten (3x, backoff 0/500ms/1s, hanya pada gagal koneksi atau 5xx/408/429) di `confirmBooking`. Confirm bersifat idempoten jadi retry aman.

### `ARCH-04` — Tidak ada retry / circuit breaker antar-service
- **Severity:** Medium-High
- **Lokasi:** `backend/booking-service/clients/catalog_client.go`, `backend/booking-service/clients/pricing_client.go`, Java `*ServiceClient.java`, `api-gateway/utils/httpClient.js`
- **Masalah:** Error transient (5xx/timeout) langsung dipropagasi tanpa retry; tidak ada circuit breaker → risiko cascading failure.
- **Rekomendasi:** Go — backoff library + `context.WithTimeout`. Java — Resilience4j (`@Retry`, `@CircuitBreaker`, `@TimeLimiter`).
- **Status:** `[~]` SEBAGIAN (2026-06-17) — bagian aman selesai: semua HTTP client antar-service Go sudah punya timeout eksplisit (catalog 10s, pricing 5s, payment confirm 10s); retry idempoten ditambahkan di `confirmBooking` (ARCH-03). **Sengaja BELUM:** retry pada operasi non-idempoten (reserve/release seat — risiko double-booking) & circuit breaker + Resilience4j di service Java. Itu butuh desain idempotency-key dulu (lihat ARCH-02).

### `SEC-05` — CORS `Access-Control-Allow-Origin: *` di backend services
- **Severity:** High (terverifikasi)
- **Lokasi:**
  - `backend/booking-service/routes/routes.go:20`
  - `backend/catalog-service/hotel-service/routes/routes.go:19`
  - `backend/payment-service/routes/routes.go:17`
  - `backend/notification-service/cmd/api/main.go:48`
- **Rekomendasi:** Batasi origin ke whitelist domain frontend; backend idealnya hanya diakses via API Gateway (CORS cukup di gateway).
- **Status:** `[x]` SELESAI (2026-06-17) — wildcard `*` diganti origin dari env `CORS_ALLOWED_ORIGIN` (default `http://ticketing-app.local`) di booking, payment, hotel, notification. Verifikasi: tidak ada lagi `Allow-Origin: "*"` di backend.

### `ARCH-05` — Notifikasi fire-and-forget tanpa retry
- **Severity:** Medium
- **Lokasi:** `booking_service.go` (`go s.sendBookingNotification()`), `payment_service.go`
- **Masalah:** Bila notification-service down, notifikasi hilang tanpa jejak/retry.
- **Rekomendasi:** Outbox pattern atau message queue untuk delivery yang andal; minimal log kegagalan.
- **Status:** `[x]` SELESAI (2026-06-17) — **Transactional Outbox** di booking-service: tabel `notification_outbox` (auto-create `IF NOT EXISTS` saat startup); baris outbox ditulis dalam transaksi yang SAMA dengan booking (atomik — notifikasi tak hilang walau crash); worker latar belakang (poll 5s, batch 20) men-deliver ke notification-service, retry s/d 5x lalu `failed`. **Aman untuk `replicas: 2`**: klaim baris atomik via `FOR UPDATE SKIP LOCKED` + reclaim baris `processing` yang nyangkut >2m (cegah notifikasi dobel & orphan). `go build`+`go vet` bersih. Catatan: delivery at-least-once → konsumen notifikasi idealnya idempotent.

### `ARCH-06` — Health check terlalu dangkal
- **Severity:** Medium
- **Lokasi:** `routes/routes.go` semua Go service (`{status: ok}`)
- **Masalah:** Tidak cek koneksi DB/Redis/dependency → pod bisa "Ready" padahal DB putus.
- **Rekomendasi:** Pisahkan `/health/live` (liveness) vs `/health/ready` (cek ping DB & Redis).
- **Status:** `[x]` SELESAI (2026-06-17) — endpoint `/health/ready` (ping DB, timeout 2s, 503 bila gagal) ditambahkan di booking, payment, hotel, auth; notification (tanpa DB) readiness sederhana. `/health` tetap dangkal sebagai liveness. `readinessProbe.path` di 5 deployment diarahkan ke `/health/ready`.

### `SEC-06` — Security headers & input validation di gateway
- **Severity:** Medium
- **Lokasi:** `api-gateway/server.js` (tanpa `helmet`), `api-gateway/routes/{flights,trains,hotels,admin}.js` (validasi hanya cek keberadaan, bukan format)
- **Rekomendasi:** Tambah `helmet`; validasi format dengan `express-validator`/`joi` (tanggal ISO, panjang/karakter input).
- **Status:** `[x]` SELESAI (2026-06-17) — security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS, Permissions-Policy) ditambahkan di `server.js` (middleware manual, tanpa dependency baru). Validasi format (tanggal `YYYY-MM-DD`, panjang nama 1..100) di route search flights/trains/hotels. `node --check` lulus semua.

### `SEC-07` — Token di `localStorage` (risiko XSS) + global window pollution
- **Severity:** Medium
- **Lokasi:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/services/api.ts`
- **Masalah:** `access_token`/`refresh_token` di `localStorage` (terbaca JS → rawan XSS). Refresh function di-expose ke `window.__refreshAccessToken` (anti-pattern).
- **Rekomendasi:** Idealnya httpOnly cookie untuk refresh token; refactor pola global window ke module singleton; tambah CSP header (lihat `DEVOPS-08`).
- **Status:** `[x]` SELESAI (2026-06-17) — dua tahap: (1) anti-pattern `window.__refreshAccessToken` → modul singleton `src/services/tokenRefresh.ts`; (2) **refresh token kini di httpOnly cookie** (`refresh_token`): auth-service set/clear cookie (login/register/refresh + endpoint `/auth/logout` baru), refresh baca dari cookie (fallback body), `refresh_token` tak lagi dikirim di body (`omitempty`); gateway `proxyAuthRequest` meneruskan Cookie ↔ Set-Cookie; frontend `withCredentials:true`, stop simpan refresh_token. Build: go/node/tsc semua lulus. ⚠️ `COOKIE_SECURE` default `false` (deployment belum TLS — lihat `DEVOPS-07`); set `true` setelah HTTPS aktif. Access token masih Bearer di localStorage (short-lived). CSP nginx tetap di `DEVOPS-08` (P3).

---

## 🟡 P2 — Testing & Observability (titik terlemah)

### `TEST-01` — Praktis tidak ada test bermakna
- **Severity:** High
- **Fakta (terverifikasi):**
  - Java: 97 file, hanya 5 file test — semuanya cuma `contextLoads()` kosong.
  - Go: 48 file, **0 test**.
  - Frontend & API Gateway: **0 test** (`package.json` gateway: `"test": "echo Error ... && exit 1"`).
- **Risiko:** Alur paling kritis (booking + payment) sama sekali tidak ter-cover.
- **Rekomendasi:** Mulai dari unit test untuk service layer booking & payment; tambah integration test untuk alur end-to-end booking→payment→confirm. Target awal realistis ~50–60% di service kritis.
- **Status:** `[ ]`

### `OBS-01` — Logging tidak terstruktur & tanpa correlation/trace ID
- **Severity:** Medium-High
- **Lokasi:** Go (`log.Printf`), Node (`console.log`, hanya saat `NODE_ENV=development`), Java (slf4j parsial)
- **Masalah:** Mustahil melacak 1 request lintas service.
- **Rekomendasi:** Structured logging JSON (Go: `zerolog`/`slog`; Node: `pino`), inject `X-Request-ID`/correlation ID di gateway dan teruskan ke semua service.
- **Status:** `[ ]`

### `OBS-02` — Tidak ada metrics & distributed tracing
- **Severity:** Medium
- **Masalah:** Tidak ada Prometheus/ServiceMonitor, tidak ada OpenTelemetry/Jaeger. (Ada `external-monitoring.yaml` Dynatrace tapi belum di-commit/aktif.)
- **Rekomendasi:** Expose `/metrics` (Prometheus) + OpenTelemetry tracing; finalize setup Dynatrace bila itu pilihannya.
- **Status:** `[ ]`

### `DOC-01` — Tidak ada API documentation (Swagger/OpenAPI)
- **Severity:** Medium
- **Masalah:** Hanya README manual di ~40% service.
- **Rekomendasi:** `springdoc-openapi` (Java), `swaggo` (Go); satukan via gateway.
- **Status:** `[ ]`

### `DOC-02` — Linting/formatting tidak dipaksakan
- **Severity:** Low-Medium
- **Masalah:** Tidak ada `golangci-lint`, checkstyle, atau eslint config di root (hanya TS strict di frontend).
- **Rekomendasi:** Tambah `golangci-lint`, eslint+prettier gateway, checkstyle/spotless Java; jalankan di CI.
- **Status:** `[ ]`

### `DOC-03` — README per-service tidak konsisten
- **Severity:** Low
- **Fakta:** Hanya 4 dari 10 service punya README (auth, pricing, flight, train). Belum ada: booking, payment, profile, admin, hotel, notification, frontend.
- **Status:** `[ ]`

---

## 🟢 P3 — DevOps & Kebersihan Repo

### `DEVOPS-01` — Image `:latest` + `imagePullPolicy: IfNotPresent`
- **Severity:** Medium (terverifikasi)
- **Lokasi:** `03-authentication`, `05-flight`, `06-train`, `09-notification`, `14-hotel` (semua `:latest` + `IfNotPresent`)
- **Masalah:** Kombinasi ini → node tidak akan pull image baru meski sudah di-push ulang.
- **Rekomendasi:** Konsisten pakai versioned tag + `imagePullPolicy: Always` (seperti booking/api-gateway/frontend/payment yang sudah benar).
- **Status:** `[ ]`

### `DEVOPS-02` — Tidak ada `securityContext` / `runAsNonRoot`
- **Severity:** High (terverifikasi — tidak ada satupun di `deployments/`)
- **Rekomendasi:** Tambah `runAsNonRoot: true`, `runAsUser: 1000`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`.
- **Status:** `[ ]`

### `DEVOPS-03` — `payment-service` replicas: 1 (SPOF)
- **Severity:** High (terverifikasi)
- **Lokasi:** `deployments/15-payment-service.yaml:9`
- **Rekomendasi:** Minimal 2 replica untuk service pembayaran.
- **Status:** `[ ]`

### `DEVOPS-04` — Tidak ada HPA (autoscaling)
- **Severity:** Medium (terverifikasi — tidak ada `HorizontalPodAutoscaler`)
- **Rekomendasi:** HPA untuk gateway & service kritis (target CPU ~70%, min 2 / max 5).
- **Status:** `[ ]`

### `DEVOPS-05` — Base image Go `alpine:latest` & tanpa `.dockerignore`
- **Severity:** Medium
- **Rekomendasi:** Pin versi (`alpine:3.20`); tambah `.dockerignore` (`.git`, `node_modules`, `.env`, `target/`, dll) di tiap service; jalankan container Go sebagai non-root user.
- **Status:** `[ ]`

### `DEVOPS-06` — Jenkinsfile tanpa stage test & security scan, push `:latest`
- **Severity:** Medium
- **Lokasi:** `Jenkinsfile`
- **Rekomendasi:** Tambah stage unit test + image scan (Trivy); tag image pakai `BUILD_NUMBER`/git sha, bukan `:latest`.
- **Status:** `[ ]`

### `DEVOPS-07` — Ingress: tanpa TLS, annotation deprecated
- **Severity:** Medium
- **Lokasi:** `deployments/13-ingress.yaml`
- **Rekomendasi:** Tambah TLS (cert-manager), gunakan `ingressClassName` (bukan annotation lama), tambah rate-limit annotation.
- **Status:** `[ ]`

### `DEVOPS-08` — nginx frontend kurang security header
- **Severity:** Low-Medium
- **Lokasi:** `frontend/nginx.conf`
- **Masalah:** Belum ada CSP, HSTS, Referrer-Policy, Permissions-Policy (X-XSS-Protection sudah deprecated).
- **Rekomendasi:** Tambah header tsb (sesuaikan CSP dengan script Dynatrace RUM).
- **Status:** `[ ]`

### `HYGIENE-01` — Clutter di working directory
- **Severity:** Low
- **Item:** `frontend.tar` (62MB), `images.tar` (466MB), `patch.json`/`patch2.json`/`patch3.json`, `scratch/`, plus `external-monitoring.yaml` & `clusterrole-fix.yaml` (Dynatrace) yang belum di-commit.
- **Rekomendasi:** Hapus artifact besar; pindahkan manifest monitoring ke `deployments/monitoring/` lalu commit; tambah `patch*.json` & `scratch/` ke `.gitignore`.
- **Status:** `[ ]`

---

## ✅ Yang Sudah Baik (jangan diubah tanpa alasan)

- Struktur layered rapi (handler → service → repository) di semua service.
- Multi-stage Docker build (Go, Java, frontend).
- Graceful shutdown di semua Go service.
- Connection pooling DB (`SetMaxOpenConns`/`SetMaxIdleConns`).
- JWT auto-refresh + protected routes di frontend (React + Vite + TS strict).
- Rate limiting + CORS terkontrol di API Gateway.
- `.gitignore` memadai (`.env`, `target/`, `.idea/`, `*.tar`, `id_rsa` semua sudah di-ignore).
- Lockfile lengkap (`go.sum`, `package-lock.json`, `pom.xml`), versi dependency relatif baru.

---

## Urutan Eksekusi yang Disarankan

1. **Quick wins P0** (risiko rendah, dampak tinggi): `BUG-01`, `SEC-01`, `SEC-02`, `SEC-04`.
2. **Secret management** (perlu rotate + koordinasi): `SEC-03`.
3. **Resilience cepat**: `ARCH-03` (timeout), `DEVOPS-02` (securityContext), `DEVOPS-03` (replica).
4. **Selaraskan dokumentasi**: `ARCH-01`.
5. **Fondasi jangka menengah**: `TEST-01`, `OBS-01`, lalu sisanya sesuai prioritas.

---

*Dokumen ini hasil analisa otomatis + verifikasi manual. Temuan ber-tag "terverifikasi" sudah dicek langsung ke file:line; sisanya berdasarkan pola yang teramati dan sebaiknya dikonfirmasi ulang saat eksekusi.*
