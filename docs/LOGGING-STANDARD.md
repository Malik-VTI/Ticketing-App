# Standar Logging ticketing-app

> Berlaku untuk semua komponen: 5 service Go, 5 service Java, api-gateway (Node.js), frontend (nginx).
> Latar belakang & analisis pipeline: [LOGGING-BINDPLANE-CORRELATION.md](LOGGING-BINDPLANE-CORRELATION.md).

## 1. Prinsip

1. **Satu baris = satu objek JSON** di stdout. Tidak ada teks bebas, banner, atau format campuran.
2. **Nama field sama di semua bahasa** (gaya OpenTelemetry semantic conventions, key bertitik & flat).
3. **`log.type` membedakan jenis log**, sehingga BindPlane bisa me-route / memfilter tanpa parsing pesan.
4. **Event bisnis punya `event.name` yang stabil**, bisa dihitung/diagregasi di BindPlane & Dynatrace.
5. **Korelasi**: `request_id` (dibawa header `X-Request-ID` dari gateway ke service lain) dan `trace_id` (dari header W3C `traceparent` yang dipropagasi OneAgent).
6. **Health probe tidak dicatat di level INFO** (hanya DEBUG / di-skip di nginx), karena sebelumnya >95 % volume log adalah probe.
7. **Tidak ada credential/secret di log** (password, token, API key). Email/nomor telepon juga tidak ditambahkan; identitas user memakai `user.id`. Lihat §6.

## 2. Skema field

### 2.1 Field umum (selalu ada)

| Field | Contoh | Keterangan |
|---|---|---|
| `timestamp` | `2026-10-07T07:22:04.0392458Z` | ISO-8601 UTC |
| `level` | `INFO` / `WARN` / `ERROR` / `DEBUG` | huruf besar di semua komponen |
| `message` | `booking created` | ringkas, bahasa Inggris, tanpa data variabel |
| `service.name` | `booking-service` | |
| `service.version` | `v1.2.0` | dari env `SERVICE_VERSION` (default `unknown`) |
| `deployment.environment` | `dev` | dari env `DEPLOYMENT_ENV` (ConfigMap `service-urls`) |
| `log.type` | `access` / `app` / `business` / `security` / `audit` | lihat §2.2 |

### 2.2 Nilai `log.type`

| Nilai | Isi | Contoh |
|---|---|---|
| `access` | satu baris per HTTP request | `http request` |
| `app` | lifecycle & teknis (startup, DB, retry, error tak tertangani) | `Database connection established successfully` |
| `business` | event domain | `booking.created`, `payment.succeeded` |
| `security` | autentikasi / otorisasi | `user.login.failed`, `booking.access.denied` |
| `audit` | perubahan data master oleh admin | `catalog.rooms.updated` |

### 2.3 Field korelasi (bila tersedia)

| Field | Sumber |
|---|---|
| `request_id` | header `X-Request-ID` (dibuat gateway bila kosong, diteruskan ke semua service) |
| `trace_id`, `parent_span_id` | header `traceparent` (W3C) |
| `user.id` | JWT (Go & gateway) / header `X-User-Id` (Java) |
| `dt.trace_id`, `dt.span_id` | di-inject OneAgent ke MDC (Java) bila code module aktif |

### 2.4 Field access log (`log.type=access`)

`http.request.method`, `url.path`, `http.route` (pola route, mis. `/bookings/:id`), `http.response.status_code`, `http.response.body.size`, `duration_ms`, `client.address`, `user_agent.original`, `user.id`.
Level: `ERROR` untuk 5xx, `WARN` untuk 4xx, `INFO` selain itu, `DEBUG` untuk health probe.

### 2.5 Field event (`business` / `security` / `audit`)

`event.name` + atribut domain berprefiks: `booking.*`, `payment.*`, `hotel.*`, `flight.*`, `train.*`, `seat.*`, `search.*`, `pricing.*`, `notification.*`, `profile.*`, `audit.*`, `auth.failure_reason`, `error.message`.

### 2.6 Contoh nyata (hasil smoke test lokal)

```json
{"level":"INFO","timestamp":"2026-10-07T07:20:07.202Z","service.name":"api-gateway","service.version":"unknown","deployment.environment":"dev","log.type":"access","request_id":"smoke-123","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736","parent_span_id":"00f067aa0ba902b7","http.request.method":"GET","url.path":"/","http.route":"/","http.response.status_code":200,"http.response.body.size":266,"duration_ms":1.5193,"client.address":"127.0.0.1","user_agent.original":"curl/8.12.1","message":"http request"}
{"timestamp":"2026-10-07T07:22:04.0392458Z","message":"price calculated","logger":"com.pricing_service.controller.PricingController","thread":"http-nio-38086-exec-3","level":"INFO","event.name":"pricing.calculated","user.id":"u-42","request_id":"smoke-java-2","pricing.base_price":1500000,"pricing.tax":150000.00,"pricing.discount":0,"pricing.total_price":1650000.00,"pricing.currency":"IDR","pricing.quantity":1,"pricing.coupon_applied":false,"service.name":"pricing-service","service.version":"unknown","deployment.environment":"dev","log.type":"business"}
```

## 3. Katalog event

| `event.name` | `log.type` | Service | Atribut utama |
|---|---|---|---|
| `user.registered` / `user.register.failed` | security | authentication | `user.id`, `auth.failure_reason` |
| `user.login.succeeded` / `user.login.failed` | security | authentication | `user.id`, `auth.failure_reason` (`user_not_found`, `invalid_password`) |
| `token.refreshed` / `token.refresh.failed` | security | authentication | `user.id`, `auth.failure_reason` |
| `user.logout` | security | authentication | |
| `user.password.changed` / `user.password.change.failed` | security | profile | `user.id`, `auth.failure_reason` |
| `booking.access.denied` | security | booking | `booking.id` |
| `booking.created` / `booking.create.failed` | business | booking | `booking.id`, `booking.reference`, `booking.type`, `booking.amount`, `booking.currency`, `booking.item_count`, `booking.quantity`, `user.id` |
| `booking.cancelled`, `booking.confirmed`, `booking.confirm.rejected`, `booking.confirm.failed` | business | booking | idem |
| `booking.expired` | business | booking (worker) | idem |
| `notification.dispatch.failed` | business | booking (outbox) | `outbox.event_id`, `booking.id`, `outbox.attempt` |
| `payment.succeeded` / `payment.failed` / `payment.create.failed` | business | payment | `payment.id`, `payment.status`, `payment.method`, `payment.amount`, `payment.currency`, `booking.id`, `user.id` |
| `payment.refunded` / `payment.refund.rejected` | business | payment | idem |
| `notification.sent` / `notification.failed` | business | notification | `notification.type`, `notification.channel`, `booking.id`, `booking.reference`, `booking.amount` |
| `hotel.searched` | business | hotel | `search.city`, `search.checkin`, `search.checkout`, `search.guests`, `search.result_count` |
| `hotel.availability.checked` | business | hotel | `hotel.id`, `hotel.available_rooms` |
| `hotel.rooms.reserved` / `hotel.rooms.reserve.failed` / `hotel.rooms.released` | business | hotel | `hotel.id`, `hotel.room_type_id`, `booking.quantity` |
| `flight.searched`, `train.searched` | business | flight / train | `search.origin(_id)`, `search.destination(_id)`, `search.date`, `search.result_count` |
| `flight.seats.reserved` / `.reserve.failed` / `.released` / `.release.failed` (+ `train.*`) | business | flight / train | `<kind>.schedule_id`, `seat.class`, `seat.count`, `seat.numbers` |
| `search.executed` | business | pricing | `search.product`, kriteria pencarian, `search.result_count`, `search.cached` |
| `pricing.calculated` | business | pricing | `pricing.base_price`, `pricing.tax`, `pricing.discount`, `pricing.total_price`, `pricing.coupon_code`, `pricing.coupon_applied` |
| `profile.updated` | business | profile | `profile.changed_fields` (nama field saja, bukan nilainya) |
| `catalog.<resource>.<created\|updated\|deleted>` | audit | hotel, flight, train (`/admin/**`) | `audit.resource`, `audit.action`, `audit.resource_id`, `user.id` |

## 4. Implementasi per komponen

| Komponen | File | Catatan |
|---|---|---|
| Go (auth, booking, payment, notification, hotel) | `logging/logging.go` (+ test) di tiap service, **disalin identik** | `logging.Init()` di `main.go`; `gin.New()` + `logging.Middleware()` menggantikan `gin.Default()`; `log.Printf` lama otomatis jadi JSON dan levelnya dinaikkan bila pesan diawali `ERROR`/`WARN`/`FATAL`; `logging.Audit()` di route admin hotel. |
| Java (admin, flight, train, pricing, profile) | `logging/RequestLoggingFilter.java`, `logging/LogEvents.java`, `resources/logback-spring.xml` (identik) | Filter = access log + MDC korelasi + audit otomatis `/admin/**`; banner Spring dimatikan (`spring.main.banner-mode: off`). Field tambahan khas Java: `logger`, `thread`, `error.stack_trace`. |
| api-gateway | `utils/logger.js`, `utils/requestContext.js`, `utils/httpClient.js`, `server.js` | `AsyncLocalStorage` membawa `request_id`/`trace_id` ke setiap log; interceptor axios meneruskan `X-Request-ID` ke semua service; `logger.event()` untuk event. |
| frontend (nginx) | `frontend/nginx.conf` | `log_format json_standard`; `kube-probe` tidak dicatat. Pengecualian: `duration_s` (detik, bukan ms), timestamp `+00:00` alih-alih `Z`, tanpa `service.version`; `error_log` nginx tetap teks. |

Saat menyalin ulang file bersama: ubah di satu tempat (`backend/authentication-service/logging/` untuk Go, template Java), lalu salin ke service lain dan jalankan test.

## 5. Use case BindPlane

| Use case | Cara di BindPlane (processor) | Field |
|---|---|---|
| Parse log aplikasi | `Parse JSON` pada body (setelah container parser) | semua |
| Routing per jenis log | `Route`/conditional pipeline: `business` & `security` → Dynatrace, `access` → sampling / storage murah, `audit` → tujuan retensi panjang | `log.type` |
| Buang noise | `Filter` `log.type == "access" and level == "DEBUG"` (probe) | `level`, `url.path` |
| Severity mapping | `Severity parser` dari `level` | `level` |
| Metrik dari log | `Count`/`Extract metric`: jumlah `booking.created`, nilai `payment.amount` per `payment.method`, rasio `user.login.failed` | `event.name`, `*.amount` |
| Deteksi keamanan | alert bila `user.login.failed` per `client.address` melonjak | `event.name`, `client.address` |
| Korelasi | angkat `trace_id`/`request_id` jadi atribut log; join lintas service | `request_id`, `trace_id` |
| Enrichment | `k8sattributes` → `k8s.pod.name`, `k8s.deployment.name` | — |

## 6. Data sensitif

- Credential **asli** (password, JWT/refresh token, `INTERNAL_API_KEY`) tidak pernah ditulis ke log: log saat ini dikirim via syslog UDP tanpa enkripsi, dan OneAgent `logMonitoring` bisa meng-ingest log yang sama langsung ke Dynatrace tanpa melewati masking BindPlane.
- **Credential DUMMY untuk demo masking** — bila env `LOG_DEMO_SENSITIVE=true` (aktif di ConfigMap `service-urls`), event berikut mendapat field palsu yang selalu bernilai konstan dan ditandai `sensitive.dummy: true`:

  | Event | Field dummy |
  |---|---|
  | `user.registered`, `user.login.succeeded`, `user.login.failed` (auth), `user.password.changed`, `user.password.change.failed` (profile) | `user.email`, `auth.password`, `auth.access_token` |
  | `payment.succeeded`, `payment.failed`, `payment.refunded` | `payment.card.number` (`4111111111111111`, kartu tes standar), `payment.card.cvv`, `payment.card.expiry`, `payment.card.holder` |

  Contoh rule BindPlane: *Mask Sensitive Data* / *Delete Fields* pada `auth.password`, `auth.access_token`, `payment.card.*`, `user.email`; verifikasi berhasil bila field tersebut sudah ter-mask sebelum sampai di Dynatrace. Matikan flag (`LOG_DEMO_SENSITIVE: "false"`) setelah demo.
- Log lama yang memuat email diganti ke `user.id` (register di authentication-service). **Masih ada** log lama di `notification-service/internal/service/email_service.go` (mode SMTP tidak dikonfigurasi) yang menulis alamat email + potongan isi email — kandidat use case masking PII di BindPlane, atau dihapus.
- `seat.numbers` dan `pricing.coupon_code` adalah data bisnis, bukan credential.

## 7. Verifikasi

- Go: `go test ./logging/` di tiap service (skema, korelasi, probe DEBUG, audit, level dari `log.Printf`).
- api-gateway: `node --test` (`test/logger.test.js`).
- Java: smoke test pricing-service lokal — 0 baris non-JSON, event `pricing.calculated` & access log sesuai skema.
- nginx: **belum** divalidasi dengan `nginx -t` (Docker tidak berjalan saat implementasi) — jalankan sebelum deploy.
