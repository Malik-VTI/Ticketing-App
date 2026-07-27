# Request Attributes Dynatrace — Aplikasi Ticketing

> **Tanggal disusun:** 2026-07-27
> **Tenant:** `pxo94309` (Dynatrace SaaS Gen3) — UI `https://pxo94309.apps.dynatrace.com`, API klasik `https://pxo94309.live.dynatrace.com`
> **Cluster:** `k8s-cluster-dev`, namespace `ticketing-app`
> **Branch saat disusun:** `deploy/release-v1.1.0`
> **Metodologi:** semua fakta lingkungan (teknologi per service, Process Group ID, ketersediaan endpoint API) diverifikasi langsung ke tenant lewat `dtctl` + probe HTTP, bukan diasumsikan. Perintah verifikasinya ditulis apa adanya di [Lampiran A](#lampiran-a--perintah-verifikasi-yang-dipakai).

---

## Status Implementasi

Terakhir diperbarui **2026-07-27**.

| Langkah | Status | Bukti / lokasi |
|---------|--------|----------------|
| 4.0 Prasyarat — API token | ✅ **selesai** | Token `ticketing-request-attributes`, scope `CaptureRequestData` + `ReadConfig` + `WriteConfig` |
| 4.1 Auto-tag `ticketing-app` untuk scoping | ✅ **selesai** | Aktif di tenant; tag terverifikasi menempel pada 9/10 process group `ticketing-app` |
| 4.2 RA-01 uji coba lewat UI | ✅ **selesai** | `ticketing.route.origin` dibuat lewat UI, lalu ditimpa definisi repo |
| 4.3 Definisi Batch A (12 RA) | ✅ **selesai** | `deployments/dynatrace/request-attributes/ra-01..ra-12*.json` |
| 4.4 Patch `api-gateway` | ✅ **selesai (belum ter-deploy)** | `api-gateway/middleware/dtAttributes.js` + `api-gateway/server.js`. Lolos 19/19 smoke test, `npm run lint` & `npm test` bersih |
| 4.5 Definisi Batch B (10 RA) | ✅ **selesai** | `deployments/dynatrace/request-attributes/ra-13..ra-22*.json` |
| — Script penerap & pengekspor | ✅ **selesai** | `scripts/dt-apply-request-attributes.ps1`, `scripts/dt-export-request-attributes.ps1` |
| **Menerapkan 22 RA ke tenant** | ✅ **selesai** | 21 dibuat + 1 diperbarui, 0 gagal. Tenant kini punya 22 RA berawalan `ticketing.` |
| **Build & deploy `api-gateway` v1.1.1** | ⏳ **belum** | Satu-satunya penghalang tersisa untuk Batch B |
| 4.6 Batch C (method parameter Java) | ⏳ **manual** | Lewat wizard UI, lalu `dt-export-request-attributes.ps1` |

### Hasil verifikasi (2026-07-27)

```
22/22 definisi lolos validator Dynatrace
22    request attribute `ticketing.*` ada di tenant, definisi round-trip cocok
5     entri oneagent di /proc/1/maps proses api-gateway   -> instrumentasi hidup
9/10  process group ticketing-app ter-tag `ticketing-app` -> scope ke-22 RA resolve
18    request uji terkirim ke gateway lewat ingress
```

> Satu PG yang tidak ter-tag (`pricing-service pricing-service-*`) adalah process group pembungkus/entrypoint, bukan JVM Spring Boot-nya — JVM-nya sudah ter-tag. Tidak berdampak.

### Batasan verifikasi yang jujur

Nilai request attribute yang **benar-benar tertangkap** belum bisa dibuktikan lewat API: token ini tidak punya scope `metrics.read`, dan token `dtctl` tidak punya `storage:spans:read` (`fetch spans` -> `NOT_AUTHORIZED_FOR_TABLE`). Yang sudah dibuktikan adalah seluruh prasyaratnya — definisi benar, scope resolve, OneAgent hidup, trafik masuk. **Pembuktian akhir ada di UI**, lihat [Bagian 5.1](#51-lapis-1--apakah-nilai-tertangkap-sama-sekali).

### Yang tersisa

```powershell
# Batch B baru terisi setelah gateway membawa middleware X-DT-*
docker build -t malikvti/api-gateway:v1.1.1 ./api-gateway
docker push malikvti/api-gateway:v1.1.1
kubectl -n ticketing-app set image deployment/api-gateway api-gateway=malikvti/api-gateway:v1.1.1
kubectl -n ticketing-app rollout status deployment/api-gateway
```

> Batch A (12 RA dari query parameter) **sudah aktif sekarang** — tidak menunggu rollout, karena tidak butuh perubahan kode apa pun.

---

## Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Fakta Lingkungan (Terverifikasi)](#1-fakta-lingkungan-terverifikasi)
3. [Cara Kerja & Matriks Sumber Data](#2-cara-kerja--matriks-sumber-data)
4. [Katalog Request Attribute yang Direkomendasikan](#3-katalog-request-attribute-yang-direkomendasikan)
5. [Langkah Implementasi](#4-langkah-implementasi)
6. [Verifikasi](#5-verifikasi)
7. [Pemanfaatan Setelah Terpasang](#6-pemanfaatan-setelah-terpasang)
8. [Privasi & Governance](#7-privasi--governance)
9. [Limit & Jebakan](#8-limit--jebakan)
10. [Rollback](#9-rollback)
11. [Checklist Eksekusi](#10-checklist-eksekusi)
12. [Lampiran](#lampiran-a--perintah-verifikasi-yang-dipakai)

---

## Ringkasan Eksekutif

**Request Attribute (RA)** adalah mekanisme Dynatrace untuk menempelkan **nilai bisnis** (mis. `booking_type=flight`, `payment_method=ewallet`, `origin=CGK`) ke setiap request yang di-trace. Setelah terpasang, satu request bukan lagi sekadar "POST /api/bookings 320 ms" tapi "POST /api/bookings, tipe *flight*, rute CGK→DPS, 2 dewasa, Rp 1.240.000, gagal karena `seat_locked`".

### Yang perlu diketahui sebelum mulai — 3 batasan penentu

| # | Batasan | Dampak untuk aplikasi ini |
|---|---------|---------------------------|
| **B-1** | Request attribute **hanya didukung di Java, .NET, Node.js, dan PHP**. **Go tidak didukung.** | 5 dari 12 service (`authentication`, `booking`, `payment`, `hotel`, `notification`) **tidak bisa** menangkap RA secara langsung. |
| **B-2** | Sumber `POST parameter` **hanya membaca body `application/x-www-form-urlencoded`**, bukan JSON. Ini keputusan desain Dynatrace agar OneAgent tidak perlu mem-parsing body yang berpotensi besar. | Seluruh aplikasi ini memakai body JSON (`express.json()` + `gin` `ShouldBindJSON`). Jadi field seperti `booking_type`, `payment_method`, `amount` **tidak bisa** diambil langsung dari body. |
| **B-3** | OneAgent SDK (jalur "custom attribute") tersedia untuk Java, Node.js, .NET, C/C++, Python — **tidak ada SDK untuk Go**. | Tidak ada jalan pintas SDK untuk 5 service Go tadi. |

### Konsekuensi arsitektural — dan kenapa ini justru bukan masalah besar

`api-gateway` adalah **Node.js** dan merupakan **satu-satunya pintu masuk** seluruh trafik frontend (`app.use('/api', routes)` di `api-gateway/server.js`). Artinya:

> **Semua** alur bisnis — search, booking, payment, admin — melewati satu proses yang **didukung penuh** request attribute.

Jadi strateginya: **jadikan `api-gateway` sebagai titik tangkap utama**, dan pakai 5 service Java (`pricing`, `flight`, `train`, `profile`, `admin`) sebagai pelengkap untuk data yang lebih dalam (parameter method). Service Go tetap terlihat penuh di distributed trace — hanya saja atribut bisnisnya melekat di span gateway, bukan di span Go. Untuk analisis end-to-end ini **cukup**, karena filter request attribute di tampilan *Distributed traces* menyaring **seluruh trace**, termasuk span service Go di hilirnya.

### Usulan: 26 request attribute dalam 3 batch

| Batch | Isi | Perubahan kode | Effort | Nilai |
|-------|-----|----------------|--------|-------|
| **A** | 12 RA dari query parameter, URI, dan client IP di `api-gateway` | ❌ Tidak ada | ~1 jam | Analitik pencarian: rute, kota, tanggal, jumlah penumpang, kupon |
| **B** | 10 RA dari response header `X-DT-*` di `api-gateway` | ✅ 1 file middleware baru + 1 baris di `server.js` | ~2 jam | **Inti bisnis**: tipe booking, referensi, status, metode & status pembayaran, nominal, kode error |
| **C** | 4 RA dari request header & method parameter di service Java | ❌ Tidak ada (pakai wizard UI) | ~1 jam | Detail pricing & search di dalam `pricing-service` |

Batch A bisa dikerjakan hari ini tanpa menyentuh kode. Batch B memberi nilai terbesar dan biayanya satu file middleware kecil. Batch C opsional.

---

## 1. Fakta Lingkungan (Terverifikasi)

### 1.1 Peta service, teknologi, dan dukungan request attribute

Diambil langsung dari tenant pada 2026-07-27 (lihat [Lampiran A](#lampiran-a--perintah-verifikasi-yang-dipakai)):

| Service | Bahasa | Process Group ID | Service Entity | Dukungan RA |
|---------|--------|------------------|----------------|-------------|
| **api-gateway** | Node.js 20.18.3 | `PROCESS_GROUP-9051E7B5BD369D9A` (`server.js (api-gateway)`)<br>`PROCESS_GROUP-1A6601D8112C01CD` (`bin/npm-cli.js (npm)`) | `SERVICE-85DECB1176CCF1BF` | ✅ **Penuh** (web request + OneAgent SDK) |
| **pricing-service** | Java 17 / Spring Boot 3.2.0 | `PROCESS_GROUP-DD2686746189F59D`<br>`PROCESS_GROUP-F868C64248DFC499` | `PricingController` | ✅ **Penuh** (+ method parameter) |
| **flight-service** | Java 17 / Spring Boot 3.2.0 | `PROCESS_GROUP-93E2C3723E86189D` | `FlightController` | ✅ Penuh |
| **train-service** | Java 17 / Spring Boot 3.2.0 | `PROCESS_GROUP-4AA0BB9CC88536E4` | `TrainController` | ✅ Penuh |
| **profile-service** | Java 17 / Spring Boot 3.2.0 | `PROCESS_GROUP-B8670D3CC625F871` | `ProfileController` | ✅ Penuh |
| **admin-service** | Java 17 / Spring Boot 3.2.0 | `PROCESS_GROUP-1466683B89B48C50` | `AdminController` | ✅ Penuh |
| **booking-service** | Go (gin) | `PROCESS_GROUP-E4D1601580F9C4FA` | `SERVICE-943E847CEA772875` | ❌ **Tidak didukung** |
| **payment-service** | Go (gin) | `PROCESS_GROUP-7595C21548B8D3ED` | `SERVICE-0F61CC1D27AC07CF` | ❌ Tidak didukung |
| **authentication-service** | Go (gin) | — | `SERVICE-3B16F5B67AF76C93` | ❌ Tidak didukung |
| **hotel-service** | Go (gin) | — | `SERVICE-5BAF7B53923BCF8A` | ❌ Tidak didukung |
| **notification-service** | Go | — | `notification-service-*` | ❌ Tidak didukung |
| **frontend** | React/Vite (statis) | — | `frontend-*` | ❌ (pakai **RUM session/action properties**, bukan RA) |

> ⚠️ **Tenant ini dipakai bersama aplikasi demo Dynatrace** (`easyTravel`, `easytrade`, `angular-loadgenerator`, dsb). Karena itu **setiap request attribute WAJIB diberi `scope`** — kalau tidak, ia akan menangkap data dari aplikasi demo juga dan mengotori analisis. Lihat [Langkah 4.1](#41-langkah-0--siapkan-scoping-yang-tahan-lama-disarankan).

### 1.2 API yang tersedia

Request attributes **bukan** bagian dari Settings 2.0 — ia tinggal di **Configuration API v1**. Ini sudah dikonfirmasi ke tenant:

```
dtctl describe settings-schema builtin:request-attributes
→ 404: No schema with topic identifier 'builtin:request-attributes'

curl -o /dev/null -w "%{http_code}" https://pxo94309.live.dynatrace.com/api/config/v1/service/requestAttributes
→ 401   (endpoint ADA, tinggal butuh token)
```

Endpoint terkait yang semuanya sudah dikonfirmasi hidup (`401`, bukan `404`) di tenant ini:

| Kebutuhan | Endpoint |
|-----------|----------|
| Request attributes | `/api/config/v1/service/requestAttributes` |
| Calculated service metrics | `/api/config/v1/calculatedMetrics/service` |
| Request naming rules | `/api/config/v1/service/requestNaming` |
| Custom services (Java) | `/api/config/v1/service/customServices/java` |

> 📌 **`dtctl` tidak bisa dipakai untuk langkah ini.** `dtctl` hanya berbicara ke Settings 2.0 / Platform API dan tidak punya verb passthrough HTTP mentah (sudah dicek lewat `dtctl commands --brief`). Untuk request attributes gunakan `curl` / `Invoke-RestMethod`, atau UI **Settings Classic**. `dtctl` tetap berguna untuk **verifikasi** setelahnya (lihat [Bagian 5](#5-verifikasi)).

---

## 2. Cara Kerja & Matriks Sumber Data

### 2.1 Alur singkat

```
Request masuk ──► OneAgent mengevaluasi semua RA yang scope-nya cocok
                        │
                        ├─ ambil nilai dari sumber (query param / header / method arg / …)
                        ├─ jalankan value processing (trim → split → regex → kondisi)
                        ├─ jalankan normalization (ORIGINAL / lower / upper)
                        └─ simpan pada request, teragregasi sesuai `aggregation`
                        │
                        ▼
        Bisa dipakai untuk: filter service & trace, calculated service metric,
        request naming, deteksi error bisnis, SLO, dashboard
```

### 2.2 Matriks sumber data → teknologi

| Sumber (`source`) | Java | .NET | Node.js | PHP | **Go** | Catatan untuk aplikasi ini |
|-------------------|:----:|:----:|:-------:|:---:|:------:|----------------------------|
| `QUERY_PARAMETER` | ✅ | ✅ | ✅ | ✅ | ❌ | **Jalur utama Batch A** — semua endpoint search/pricing memakai query string |
| `REQUEST_HEADER` | ✅ | ✅ | ✅ | ✅ | ❌ | Gateway sudah mengirim `X-User-Id` / `X-User-Email` ke service hilir (`api-gateway/utils/httpClient.js:31-33`) |
| `RESPONSE_HEADER` | ✅ | ✅ | ✅ | ✅ | ❌ | **Jalur utama Batch B** — cara termurah mengekspos field JSON tanpa dependency baru |
| `URI` / `URI_PATH` | ✅ | ✅ | ✅ | ✅ | ❌ | Pakai `URI_PATH`, **jangan** `URI` (query string bisa memuat data pribadi) |
| `CLIENT_IP` | ✅ | ✅ | ✅ | ✅ | ❌ | Tandai `confidential` |
| `POST_PARAMETER` | ✅ | ✅ | ✅ | ✅ | ❌ | ⛔ **Tidak berguna di sini** — hanya membaca `x-www-form-urlencoded`, aplikasi ini 100% JSON |
| `METHOD_PARAM` | ✅ | ✅ | ❌ | ✅ | ❌ | **Batch C** — hanya untuk 5 service Spring Boot |
| `SESSION_ATTRIBUTE` | ✅ | ✅ | ❌ | ❌ | ❌ | Tidak relevan (aplikasi stateless/JWT) |
| `CUSTOM_ATTRIBUTE` (OneAgent SDK) | ✅ | ✅ | ✅ | ❌ | ❌ | Alternatif Batch B yang lebih bersih — butuh paket `@dynatrace/oneagent-sdk` |

### 2.3 Opsi konfigurasi per request attribute

| Field | Nilai yang diizinkan | Rekomendasi di sini |
|-------|----------------------|---------------------|
| `dataType` | `STRING`, `INTEGER`, `DOUBLE` | ⚠️ **Tidak bisa diubah setelah RA dibuat** — pastikan benar sejak awal |
| `normalization` | `ORIGINAL`, `TO_LOWER_CASE`, `TO_UPPER_CASE` | `TO_UPPER_CASE` untuk kode bandara/stasiun/mata uang, `TO_LOWER_CASE` untuk enum status |
| `aggregation` | `ALL_DISTINCT_VALUES`, `COUNT_DISTINCT_VALUES`, `COUNT_VALUES`, `FIRST`, `LAST`, `SUM`, `AVERAGE`, `MINIMUM`, `MAXIMUM` | `ALL_DISTINCT_VALUES` untuk string, `SUM` untuk nominal/jumlah, `MAXIMUM` untuk page size |
| `capturingAndStorageLocation` | `CAPTURE_AND_STORE_ON_SERVER`, `CAPTURE_AND_STORE_ON_CLIENT`, `CAPTURE_ON_CLIENT_STORE_ON_SERVER`, `CAPTURE_AND_STORE_ON_BOTH` | `CAPTURE_AND_STORE_ON_SERVER` untuk semua RA di dokumen ini |
| `confidential` | `true` / `false` | `true` untuk user id & client IP — nilainya hanya terlihat oleh user dengan izin khusus |
| `skipPersonalDataMasking` | `true` / `false` | **Selalu `false`** di sini |
| `scope` | `{ processGroup }`, `{ tagOfProcessGroup }`, `{ hostGroup }`, `{ serviceTechnology }` | Wajib diisi (tenant dipakai bersama) |
| `valueProcessing` | `trim`, `splitAt`, `valueExtractorRegex`, `extractSubstring`, `valueCondition` | Minimal `{"trim": true}` |

---

## 3. Katalog Request Attribute yang Direkomendasikan

Konvensi penamaan: prefix **`ticketing.`** supaya mudah dibedakan dari RA milik aplikasi demo di tenant yang sama.

### Batch A — `api-gateway`, tanpa ubah kode (12 RA)

Semua diambil dari query string yang **sudah ada** di kode hari ini. Referensi rute: `api-gateway/routes/search.js`, `flights.js`, `trains.js`, `hotels.js`, `pricing.js`, `booking.js`.

| ID | Nama RA | Sumber | Parameter | Tipe | Normalisasi | Agregasi | Kegunaan |
|----|---------|--------|-----------|------|-------------|----------|----------|
| `RA-01` | `ticketing.route.origin` | Query param | `from`, `origin`, `originName` | STRING | UPPER | ALL_DISTINCT | Rute terpopuler; latency per rute |
| `RA-02` | `ticketing.route.destination` | Query param | `to`, `destination`, `destinationName` | STRING | UPPER | ALL_DISTINCT | Pasangan O-D; deteksi rute lambat |
| `RA-03` | `ticketing.travel.date` | Query param | `date` | STRING | ORIGINAL | ALL_DISTINCT | Pola pencarian (last-minute vs jauh hari) |
| `RA-04` | `ticketing.hotel.city` | Query param | `city` | STRING | UPPER | ALL_DISTINCT | Kota hotel terlaris |
| `RA-05` | `ticketing.hotel.checkin` | Query param | `checkin` | STRING | ORIGINAL | ALL_DISTINCT | Lama menginap, musim |
| `RA-06` | `ticketing.hotel.checkout` | Query param | `checkout` | STRING | ORIGINAL | ALL_DISTINCT | idem |
| `RA-07` | `ticketing.pax.adults` | Query param | `adults`, `guests` | **INTEGER** | — | SUM | Ukuran rombongan vs performa |
| `RA-08` | `ticketing.pax.children` | Query param | `children` | **INTEGER** | — | SUM | Segmen keluarga |
| `RA-09` | `ticketing.coupon.code` | Query param | `couponCode` | STRING | UPPER | ALL_DISTINCT | Efektivitas & penyalahgunaan promo |
| `RA-10` | `ticketing.currency` | Query param | `currency` | STRING | UPPER | ALL_DISTINCT | Segmentasi mata uang |
| `RA-11` | `ticketing.page.size` | Query param | `size`, `limit` | **INTEGER** | — | MAXIMUM | Deteksi query berat (`?size=10000`) |
| `RA-12` | `ticketing.client.ip` | Client IP | — | STRING | ORIGINAL | ALL_DISTINCT | Investigasi abuse / rate limit. ⚠️ `confidential: true` |

> 💡 Satu RA boleh punya **beberapa `dataSources`**. `RA-01` misalnya menangkap `from` (dari `/api/search/*`), `origin` (dari `/api/flights/schedules`), dan `originName` (dari `/api/flights/search`) sekaligus — ketiganya bermuara ke satu atribut.

### Batch B — `api-gateway` + patch kecil (10 RA)

Ini bagian **paling bernilai**: data bisnis inti (`booking_type`, `payment_method`, nominal, status) ada di **body JSON**, yang menurut [B-2](#yang-perlu-diketahui-sebelum-mulai--3-batasan-penentu) tidak bisa dibaca OneAgent. Solusinya: gateway menyalin field terpilih ke response header `X-DT-*`, lalu ditangkap sebagai `RESPONSE_HEADER`.

| ID | Nama RA | Response header | Tipe | Normalisasi | Agregasi | Kegunaan |
|----|---------|-----------------|------|-------------|----------|----------|
| `RA-13` | `ticketing.api.operation` | `X-DT-Operation` | STRING | ORIGINAL | ALL_DISTINCT | Nama operasi bisnis (`POST /api/bookings`) untuk request naming |
| `RA-14` | `ticketing.user.id` | `X-DT-User-Id` | STRING | ORIGINAL | ALL_DISTINCT | Telusuri seluruh perjalanan 1 user. ⚠️ `confidential: true` |
| `RA-15` | `ticketing.booking.type` | `X-DT-Booking-Type` | STRING | LOWER | ALL_DISTINCT | **Kunci**: pisahkan performa flight vs train vs hotel |
| `RA-16` | `ticketing.booking.reference` | `X-DT-Booking-Ref` | STRING | UPPER | ALL_DISTINCT | Dari keluhan user → langsung ke trace-nya |
| `RA-17` | `ticketing.booking.status` | `X-DT-Booking-Status` | STRING | LOWER | ALL_DISTINCT | Rasio `pending`/`confirmed`/`cancelled`/`expired` |
| `RA-18` | `ticketing.booking.item_count` | `X-DT-Item-Count` | **INTEGER** | — | SUM | Booking multi-item vs latency |
| `RA-19` | `ticketing.payment.method` | `X-DT-Payment-Method` | STRING | LOWER | ALL_DISTINCT | **Kunci**: `bank_transfer` / `ewallet` / `credit_card` |
| `RA-20` | `ticketing.payment.status` | `X-DT-Payment-Status` | STRING | LOWER | ALL_DISTINCT | Deteksi lonjakan `failed` per metode |
| `RA-21` | `ticketing.transaction.amount` | `X-DT-Amount` | **DOUBLE** | — | SUM | Nilai transaksi; "berapa rupiah terdampak insiden ini" |
| `RA-22` | `ticketing.error.code` | `X-DT-Error-Code` | STRING | LOWER | ALL_DISTINCT | Error bisnis (`seat_locked`, `invalid_token`) yang HTTP 200-nya menyembunyikan masalah |

Nilai-nilai di atas dipetakan dari DTO yang sudah ada:

| Header | Sumber di kode |
|--------|----------------|
| `X-DT-Booking-Type`, `X-DT-Booking-Ref`, `X-DT-Booking-Status`, `X-DT-Amount`, `X-DT-Item-Count` | `BookingDTO` — `backend/booking-service/models/booking.go:60-71` |
| `X-DT-Payment-Method`, `X-DT-Payment-Status`, `X-DT-Amount` | `PaymentDTO` — `backend/payment-service/models/payment.go:53-62` |
| `X-DT-User-Id` | `req.user.id` hasil verifikasi JWT — `api-gateway/middleware/auth.js:33-36` |
| `X-DT-Error-Code` | field `error` pada `ErrorResponse` di seluruh service |

### Batch C — Service Java (4 RA)

| ID | Nama RA | Sumber | Detail | Scope |
|----|---------|--------|--------|-------|
| `RA-23` | `ticketing.user.id` *(dataSource tambahan pada RA-14)* | Request header | `X-User-Id` | PG `pricing`, `profile`, `admin` |
| `RA-24` | `ticketing.pricing.base_price` | Method parameter | `com.pricing_service.service.PricingService#calculatePrice(BigDecimal, String, String)` → argumen **0** | PG `pricing-service` |
| `RA-25` | `ticketing.coupon.code` *(dataSource tambahan pada RA-09)* | Method parameter | method yang sama → argumen **1** | PG `pricing-service` |
| `RA-26` | `ticketing.search.pax` *(dataSource tambahan pada RA-07)* | Method parameter | `com.pricing_service.service.SearchService#searchFlights(FlightSearchRequest)` → argumen **0**, deep access `adults` | PG `pricing-service` |

Signature aslinya (`backend/pricing-service/src/main/java/com/pricing_service/service/`):

```java
// PricingService.java:14
public PricingResponse calculatePrice(BigDecimal basePrice, String couponCode, String currency)

// SearchService.java:18
public SearchResponse<Object> searchFlights(FlightSearchRequest request)
// FlightSearchRequest: from, to, date, adults, children
```

### ⛔ Yang JANGAN ditangkap

| Jangan | Alasan |
|--------|--------|
| Header `Authorization` | Berisi JWT utuh — token bocor ke UI Dynatrace dan tersimpan berhari-hari |
| Header `X-User-Email` | PII langsung. Kalau memang perlu, hash dulu di aplikasi lalu tangkap hash-nya |
| Header `X-Internal-API-Key` | Kredensial antar-service (`README.md` — auth antar service) |
| `source: URI` (URI penuh) | Ikut membawa query string mentah yang bisa memuat email/kupon. Pakai `URI_PATH` |
| Body password / `PasswordUpdateRequest` | Tidak pernah boleh masuk observability |
| RA **tanpa `scope`** | Akan menangkap trafik `easyTravel`/`easytrade` di tenant yang sama |

---

## 4. Langkah Implementasi

### 4.0 Prasyarat

1. **Buat API token** — UI Dynatrace → **Access tokens** → *Generate new token*.
   * Nama: `ticketing-request-attributes`
   * Scope wajib: **`CaptureRequestData`** (untuk request attributes)
   * Scope tambahan bila ingin sekalian membuat calculated metric & request naming: **`ReadConfig`**, **`WriteConfig`**
2. **Simpan token sebagai environment variable**, jangan di-commit:

   ```powershell
   # PowerShell (sesi ini saja)
   $env:DT_ENV  = "https://pxo94309.live.dynatrace.com"
   $env:DT_TOKEN = "dt0c01.XXXXXXXX.YYYYYYYY"
   ```

3. **Uji koneksi** — harus balik `200` dan sebuah array JSON:

   ```powershell
   Invoke-RestMethod -Method GET -Uri "$env:DT_ENV/api/config/v1/service/requestAttributes" `
     -Headers @{ Authorization = "Api-Token $env:DT_TOKEN" }
   ```

4. **Buat folder kerja** supaya konfigurasi ikut ter-version-control:

   ```
   deployments/dynatrace/request-attributes/
   ```

> ⚠️ Pastikan `deployments/dynatrace/**/*.token` atau berkas berisi token masuk `.gitignore`. Definisi RA-nya sendiri aman untuk di-commit — tidak ada rahasia di dalamnya.

---

### 4.1 Langkah 0 — Siapkan scoping yang tahan lama (disarankan)

Ada dua cara mengisi `scope`:

| Cara | Kelebihan | Kekurangan |
|------|-----------|------------|
| **`processGroup`** (pakai ID dari [tabel 1.1](#11-peta-service-teknologi-dan-dukungan-request-attribute)) | Presisi, langsung jalan | Process Group ID **berubah** kalau command line / image berubah signifikan → RA diam-diam berhenti menangkap |
| **`tagOfProcessGroup`** (pakai auto-tag) | Tahan terhadap redeploy & upgrade versi | Perlu satu langkah persiapan |

Untuk aplikasi yang di-redeploy tiap rilis seperti ini, **`tagOfProcessGroup` lebih aman**. Tenant saat ini **belum punya satu pun auto-tag rule** (`dtctl get settings --schema builtin:tags.auto-tagging` → `[]`), jadi ini benar-benar dibuat dari nol.

**Buat file `deployments/dynatrace/autotag-ticketing-app.json`:**

```json
{
  "name": "ticketing-app",
  "description": "Menandai seluruh entity di namespace ticketing-app agar bisa dipakai sebagai scope request attribute",
  "rules": [
    {
      "type": "ME",
      "enabled": true,
      "valueFormat": null,
      "valueNormalization": "Leave text as-is",
      "attributeRule": {
        "entityType": "PROCESS_GROUP",
        "pgToServicePropagation": true,
        "pgToHostPropagation": false,
        "hostToPGPropagation": false,
        "serviceToPGPropagation": false,
        "serviceToHostPropagation": false,
        "azureToPGPropagation": false,
        "azureToServicePropagation": false,
        "conditions": [
          {
            "key": "PROCESS_GROUP_PREDEFINED_METADATA",
            "dynamicKey": "KUBERNETES_NAMESPACE",
            "operator": "EQUALS",
            "stringValue": "ticketing-app",
            "caseSensitive": true
          }
        ]
      }
    }
  ]
}
```

**Terapkan lewat `dtctl`** (auto-tagging *ada* di Settings 2.0, jadi `dtctl` bisa — berbeda dengan request attributes):

```powershell
# pratinjau dulu
dtctl create settings -f deployments/dynatrace/autotag-ticketing-app.json --schema builtin:tags.auto-tagging --scope environment --dry-run --plain

# terapkan
dtctl create settings -f deployments/dynatrace/autotag-ticketing-app.json --schema builtin:tags.auto-tagging --scope environment --plain
```

**Verifikasi (tag butuh beberapa menit untuk menyebar):**

```powershell
dtctl get settings --schema builtin:tags.auto-tagging -o json --plain
```

Setelah tag `ticketing-app` menempel, semua contoh JSON di bawah bisa memakai:

```json
"scope": { "tagOfProcessGroup": "ticketing-app" }
```

> Kalau ingin langsung jalan tanpa menunggu tag menyebar, pakai dulu `"scope": { "processGroup": "PROCESS_GROUP-9051E7B5BD369D9A" }` dan ganti ke tag belakangan. Keduanya bisa hidup berdampingan (satu RA boleh punya beberapa `dataSources` dengan scope berbeda).

---

### 4.2 Langkah 1 — Batch A lewat UI (paling mudah untuk pertama kali)

Kerjakan **satu RA dulu** (`RA-01`) sampai terbukti ada datanya, baru sisanya lewat API.

1. Buka `https://pxo94309.apps.dynatrace.com` → cari app **Settings Classic**.
2. Masuk ke **Server-side service monitoring → Request attributes**.
3. Klik **Define a new request attribute**.
4. Isi:
   * **Request attribute name**: `ticketing.route.origin`
   * **Data type**: `Text` (STRING) — ⚠️ tidak bisa diubah lagi setelah disimpan
   * **Request attribute aggregation**: *Store all values*
   * **Normalization**: *Convert to upper case*
5. Klik **Add new data source**:
   * **Request attribute source**: `Query parameter`
   * **Parameter name**: `from`
   * **Capture and store**: *Capture and store on server side*
   * **Restrict to**: pilih *Process group* → `server.js (api-gateway) api-gateway-*`
     (atau *Tag of process group* → `ticketing-app` bila Langkah 0 sudah selesai)
   * Centang **Trim whitespaces**
6. Klik **Add new data source** dua kali lagi untuk `origin` dan `originName`, dengan scope yang sama.
7. **Save**.
8. Kirim trafik uji:

   ```powershell
   curl "http://ticketing-app.local/api/search/flights?from=CGK&to=DPS&date=2026-08-10&adults=2"
   ```

9. Tunggu ~2 menit, lalu buka service **api-gateway** di UI → tab **Analyze requests** → filter berdasarkan `ticketing.route.origin`. Nilai `CGK` harus muncul.

> Kalau nilainya belum muncul setelah 5 menit, langsung ke [Bagian 8 — Limit & Jebakan](#8-limit--jebakan) sebelum membuat 25 RA lainnya.

---

### 4.3 Langkah 2 — Sisa Batch A lewat API

Setelah pola-nya terbukti, sisanya jauh lebih cepat lewat API.

**Struktur berkas:**

```
deployments/dynatrace/request-attributes/
├── ra-01-route-origin.json          ticketing.route.origin        STRING   ALL_DISTINCT_VALUES
├── ra-02-route-destination.json     ticketing.route.destination   STRING   ALL_DISTINCT_VALUES
├── ra-03-travel-date.json           ticketing.travel.date         STRING   ALL_DISTINCT_VALUES
├── ra-04-hotel-city.json            ticketing.hotel.city          STRING   ALL_DISTINCT_VALUES
├── ra-05-hotel-checkin.json         ticketing.hotel.checkin       STRING   ALL_DISTINCT_VALUES
├── ra-06-hotel-checkout.json        ticketing.hotel.checkout      STRING   ALL_DISTINCT_VALUES
├── ra-07-pax-adults.json            ticketing.pax.adults          INTEGER  SUM
├── ra-08-pax-children.json          ticketing.pax.children        INTEGER  SUM
├── ra-09-coupon-code.json           ticketing.coupon.code         STRING   ALL_DISTINCT_VALUES
├── ra-10-currency.json              ticketing.currency            STRING   ALL_DISTINCT_VALUES
├── ra-11-page-size.json             ticketing.page.size           INTEGER  MAXIMUM
└── ra-12-client-ip.json             ticketing.client.ip           STRING   ALL_DISTINCT_VALUES  (confidential)
```

✅ **Ke-12 berkas ini sudah ada di repo.** Yang di bawah adalah penjelasan polanya; lompat ke [script penerap](#script-penerap) kalau hanya ingin menjalankannya.

**Contoh `ra-01-route-origin.json` (RA multi-source):**

```json
{
  "name": "ticketing.route.origin",
  "enabled": true,
  "dataType": "STRING",
  "normalization": "TO_UPPER_CASE",
  "aggregation": "ALL_DISTINCT_VALUES",
  "confidential": false,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "QUERY_PARAMETER",
      "parameterName": "from",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "QUERY_PARAMETER",
      "parameterName": "origin",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "QUERY_PARAMETER",
      "parameterName": "originName",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    }
  ]
}
```

**Contoh `ra-07-pax-adults.json` (tipe INTEGER + agregasi SUM):**

```json
{
  "name": "ticketing.pax.adults",
  "enabled": true,
  "dataType": "INTEGER",
  "normalization": "ORIGINAL",
  "aggregation": "SUM",
  "confidential": false,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "QUERY_PARAMETER",
      "parameterName": "adults",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "QUERY_PARAMETER",
      "parameterName": "guests",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    }
  ]
}
```

**Contoh `ra-12-client-ip.json` (rahasia):**

```json
{
  "name": "ticketing.client.ip",
  "enabled": true,
  "dataType": "STRING",
  "normalization": "ORIGINAL",
  "aggregation": "ALL_DISTINCT_VALUES",
  "confidential": true,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "CLIENT_IP",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" }
    }
  ]
}
```

### Script penerap

Script-nya sudah ada di repo: [`scripts/dt-apply-request-attributes.ps1`](../scripts/dt-apply-request-attributes.ps1). Sengaja tidak disalin utuh ke dokumen ini agar tidak melenceng dari kode saat script diubah. Ringkasan perilakunya:

| Perilaku | Keterangan |
|----------|------------|
| Idempoten | Nama RA yang sudah ada di tenant di-**PUT** (update), bukan dibuat ganda |
| Validasi lokal | Berkas kosong / JSON rusak dilewati dengan pesan jelas, tidak dikirim ke API |
| Validasi sisi server | Setiap definisi dilewatkan endpoint `/validator` Dynatrace lebih dulu |
| Pesan error utuh | Detail pelanggaran constraint dari body respons Dynatrace ikut ditampilkan — `Invoke-RestMethod` menyembunyikannya secara default |
| `-WhatIfOnly` | Hanya memvalidasi, tidak menulis apa pun |
| `-Filter` | Terapkan sebagian saja, mis. `-Filter 'ra-1*'` |
| TLS 1.2 + body UTF-8 | Agar aman di Windows PowerShell 5.1 |

Jalankan validasi dulu, baru terapkan:

```powershell
./scripts/dt-apply-request-attributes.ps1 -WhatIfOnly
./scripts/dt-apply-request-attributes.ps1
```

> Varian bash (kalau lebih nyaman): `curl -X POST "$DT_ENV/api/config/v1/service/requestAttributes" -H "Authorization: Api-Token $DT_TOKEN" -H "Content-Type: application/json" -d @ra-01-route-origin.json`

---

### 4.4 Langkah 3 — Patch `api-gateway` untuk Batch B

> ✅ **Sudah dikerjakan.** Kode nyatanya ada di [`api-gateway/middleware/dtAttributes.js`](../api-gateway/middleware/dtAttributes.js) dan sudah dipasang di [`api-gateway/server.js`](../api-gateway/server.js). Terverifikasi: 19/19 smoke test lolos (header benar per jenis respons, status & body tidak berubah, `res.send()` tidak crash, nama operasi memakai pola rute `:id` bukan nilai id), `npm run lint` bersih, `npm test` 12/12 lolos. Yang tersisa hanya build + rollout image `v1.1.1`.
>
> Listing di bawah dipertahankan sebagai penjelasan rancangan.

#### Cara A (disarankan) — response header `X-DT-*`, tanpa dependency baru

**File baru: `api-gateway/middleware/dtAttributes.js`**

```javascript
'use strict';

/**
 * Mengekspos sejumlah field bisnis sebagai response header `X-DT-*` agar bisa
 * ditangkap Dynatrace OneAgent sebagai Request Attribute (source: RESPONSE_HEADER).
 *
 * Kenapa lewat header, bukan langsung dari body JSON:
 * OneAgent tidak mem-parsing body JSON (hanya form-urlencoded), sehingga field
 * seperti booking_type / payment_method mustahil ditangkap tanpa bantuan aplikasi.
 *
 * Header ini TIDAK di-expose lewat Access-Control-Expose-Headers, jadi JS di
 * browser tidak bisa membacanya. OneAgent membacanya di sisi server.
 */

const HEADER = {
  operation: 'X-DT-Operation',
  userId: 'X-DT-User-Id',
  bookingType: 'X-DT-Booking-Type',
  bookingRef: 'X-DT-Booking-Ref',
  bookingStatus: 'X-DT-Booking-Status',
  itemCount: 'X-DT-Item-Count',
  paymentMethod: 'X-DT-Payment-Method',
  paymentStatus: 'X-DT-Payment-Status',
  amount: 'X-DT-Amount',
  errorCode: 'X-DT-Error-Code',
};

// Nilai header harus ASCII satu baris dan tidak boleh kepanjangan.
const clean = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s || s.length > 120) return null;
  return /^[\x20-\x7E]+$/.test(s) ? s : null;
};

const setAttr = (res, header, value) => {
  const v = clean(value);
  if (v !== null && !res.headersSent) res.setHeader(header, v);
};

const operationOf = (req) => {
  const routePath = (req.route && req.route.path) || '';
  const full = `${req.baseUrl || ''}${routePath}`.replace(/\/+$/, '');
  return full ? `${req.method} ${full}` : `${req.method} ${req.path}`;
};

const enrich = (req, res, body) => {
  setAttr(res, HEADER.operation, operationOf(req));
  setAttr(res, HEADER.userId, req.user && req.user.id);

  if (!body || typeof body !== 'object') return;

  // Respons error dari service manapun: { error, message }
  if (body.error) setAttr(res, HEADER.errorCode, body.error);

  // BookingDTO (backend/booking-service/models/booking.go)
  if (body.booking_reference) {
    setAttr(res, HEADER.bookingRef, body.booking_reference);
    setAttr(res, HEADER.bookingType, body.booking_type);
    setAttr(res, HEADER.bookingStatus, body.status);
    setAttr(res, HEADER.amount, body.total_amount);
    if (Array.isArray(body.items)) setAttr(res, HEADER.itemCount, body.items.length);
    return;
  }

  // PaymentDTO (backend/payment-service/models/payment.go)
  if (body.payment_method) {
    setAttr(res, HEADER.paymentMethod, body.payment_method);
    setAttr(res, HEADER.paymentStatus, body.status);
    setAttr(res, HEADER.amount, body.amount);
  }
};

/**
 * Membungkus res.json agar payload balikan service hilir bisa dibaca sebelum
 * dikirim. Kegagalan di sini tidak boleh menjatuhkan request.
 */
const dtAttributes = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      enrich(req, res, body);
    } catch {
      // observability tidak boleh mengganggu jalur bisnis
    }
    return originalJson(body);
  };
  next();
};

module.exports = { dtAttributes, HEADER };
```

**Ubah `api-gateway/server.js`** — pasang sebelum blok `// API routes`:

```javascript
const { dtAttributes } = require('./middleware/dtAttributes');

// ... setelah middleware logging, sebelum app.use('/api', routes)
app.use(dtAttributes);

// API routes
app.use('/api', routes);
```

**Build & deploy:**

```powershell
docker build -t malikvti/api-gateway:v1.1.1 ./api-gateway
docker push malikvti/api-gateway:v1.1.1
kubectl -n ticketing-app set image deployment/api-gateway api-gateway=malikvti/api-gateway:v1.1.1
kubectl -n ticketing-app rollout status deployment/api-gateway
```

**Uji header sudah keluar** (sebelum menyentuh Dynatrace sama sekali):

```powershell
curl -i -X POST http://ticketing-app.local/api/payments `
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" `
  -d '{"booking_id":"...","amount":1240000,"currency":"IDR","payment_method":"ewallet"}'
# Harus tampak:  X-DT-Payment-Method: ewallet
#                X-DT-Amount: 1240000
#                X-DT-Operation: POST /api/payments
```

#### Cara B (alternatif) — OneAgent SDK untuk Node.js

Lebih bersih karena nilainya **tidak pernah keluar ke jaringan**, tapi menambah satu dependency.

```powershell
cd api-gateway; npm install @dynatrace/oneagent-sdk
```

```javascript
// api-gateway/middleware/dtAttributes.js — varian SDK
const Sdk = require('@dynatrace/oneagent-sdk');
const api = Sdk.createInstance();
const active = api.getCurrentState() === Sdk.SDKState.ACTIVE;

const setAttr = (key, value) => {
  if (!active || value === undefined || value === null || value === '') return;
  api.addCustomRequestAttribute(key, typeof value === 'number' ? value : String(value));
};

// dipakai persis seperti enrich() di Cara A, tapi memanggil:
//   setAttr('ticketing.booking.type', body.booking_type)
//   setAttr('ticketing.transaction.amount', body.total_amount)
```

Jika memilih Cara B, ganti `source` di seluruh JSON Batch B dari `RESPONSE_HEADER` menjadi `CUSTOM_ATTRIBUTE`, dan `parameterName` menjadi kunci yang dipakai di `addCustomRequestAttribute`.

> **Pilih salah satu, jangan dua-duanya** — kalau keduanya aktif, nilainya akan tercatat ganda pada request yang sama.

---

### 4.5 Langkah 4 — Definisi request attribute Batch B

> ✅ **Sudah dikerjakan** — 10 berkas `ra-13..ra-22*.json` ada di `deployments/dynatrace/request-attributes/`:
>
> ```
> ra-13-api-operation.json        ticketing.api.operation       ← X-DT-Operation
> ra-14-user-id.json              ticketing.user.id             ← X-DT-User-Id + X-User-Id (3 PG Java)   confidential
> ra-15-booking-type.json         ticketing.booking.type        ← X-DT-Booking-Type
> ra-16-booking-reference.json    ticketing.booking.reference   ← X-DT-Booking-Ref
> ra-17-booking-status.json       ticketing.booking.status      ← X-DT-Booking-Status
> ra-18-booking-item-count.json   ticketing.booking.item_count  ← X-DT-Item-Count      INTEGER / SUM
> ra-19-payment-method.json       ticketing.payment.method      ← X-DT-Payment-Method
> ra-20-payment-status.json       ticketing.payment.status      ← X-DT-Payment-Status
> ra-21-transaction-amount.json   ticketing.transaction.amount  ← X-DT-Amount          DOUBLE / SUM
> ra-22-error-code.json           ticketing.error.code          ← X-DT-Error-Code
> ```
>
> Setiap header `X-DT-*` yang dirujuk berkas-berkas ini sudah dipastikan benar-benar dipasang oleh `dtAttributes.js` (dicek silang otomatis — tidak ada yang menggantung).

**Contoh `ra-19-payment-method.json`:**

```json
{
  "name": "ticketing.payment.method",
  "enabled": true,
  "dataType": "STRING",
  "normalization": "TO_LOWER_CASE",
  "aggregation": "ALL_DISTINCT_VALUES",
  "confidential": false,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "RESPONSE_HEADER",
      "parameterName": "X-DT-Payment-Method",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    }
  ]
}
```

**Contoh `ra-21-transaction-amount.json` (DOUBLE + SUM):**

```json
{
  "name": "ticketing.transaction.amount",
  "enabled": true,
  "dataType": "DOUBLE",
  "normalization": "ORIGINAL",
  "aggregation": "SUM",
  "confidential": false,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "RESPONSE_HEADER",
      "parameterName": "X-DT-Amount",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "tagOfProcessGroup": "ticketing-app" },
      "valueProcessing": { "trim": true }
    }
  ]
}
```

**Contoh `ra-14-user-id.json` (rahasia, sekaligus mencakup Batch C RA-23).**
Contoh ini sengaja memakai `processGroup` alih-alih tag, karena tiap data source berlaku di tempat berbeda: `RESPONSE_HEADER` hanya masuk akal di gateway (di sanalah header `X-DT-*` dipasang), sedangkan `REQUEST_HEADER X-User-Id` hanya ada di service Java hilir (dikirim oleh `api-gateway/utils/httpClient.js`). Satu RA, empat scope:

```json
{
  "name": "ticketing.user.id",
  "enabled": true,
  "dataType": "STRING",
  "normalization": "ORIGINAL",
  "aggregation": "ALL_DISTINCT_VALUES",
  "confidential": true,
  "skipPersonalDataMasking": false,
  "dataSources": [
    {
      "enabled": true,
      "source": "RESPONSE_HEADER",
      "parameterName": "X-DT-User-Id",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "processGroup": "PROCESS_GROUP-9051E7B5BD369D9A" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "REQUEST_HEADER",
      "parameterName": "X-User-Id",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "processGroup": "PROCESS_GROUP-DD2686746189F59D" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "REQUEST_HEADER",
      "parameterName": "X-User-Id",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "processGroup": "PROCESS_GROUP-B8670D3CC625F871" },
      "valueProcessing": { "trim": true }
    },
    {
      "enabled": true,
      "source": "REQUEST_HEADER",
      "parameterName": "X-User-Id",
      "capturingAndStorageLocation": "CAPTURE_AND_STORE_ON_SERVER",
      "scope": { "processGroup": "PROCESS_GROUP-1466683B89B48C50" },
      "valueProcessing": { "trim": true }
    }
  ]
}
```

Lalu jalankan lagi:

```powershell
./scripts/dt-apply-request-attributes.ps1
```

---

### 4.6 Langkah 5 — Batch C (method parameter Java)

Sumber `METHOD_PARAM` **jauh lebih mudah lewat UI** karena butuh signature persis (nama kelas, tipe argumen, visibility, modifier). Wizard di UI membacanya langsung dari proses yang sedang berjalan sehingga tidak ada risiko salah ketik.

1. Settings Classic → **Server-side service monitoring → Request attributes** → *Define a new request attribute*.
2. Nama: `ticketing.pricing.base_price`, **Data type**: `Number (floating point)` → DOUBLE, **Aggregation**: *Average*.
3. **Add new data source** → **Request attribute source**: `Java method parameter`.
4. Klik tombol pemilih kelas:
   * **Process group**: `SpringBoot com.pricing_service.PricingServiceApplication pricing-service-*`
   * **Class name**: ketik `com.pricing_service.service.PricingService` → **Search**
   * Pilih method `calculatePrice(java.math.BigDecimal, java.lang.String, java.lang.String)` → **Finish**
5. **Capture**: `Argument`, **Argument index**: `0` (yaitu `basePrice`).
6. **Save**.

Ulangi untuk `RA-25` (argumen `1` = `couponCode`, tambahkan sebagai data source baru pada RA `ticketing.coupon.code` yang sudah ada) dan `RA-26` (`SearchService#searchFlights`, argumen `0`, **deep object access** `adults`).

> ⚠️ **Prasyarat**: kelas hanya bisa ditemukan wizard kalau proses Java-nya sedang berjalan dan sudah pernah memuat kelas tersebut. Kalau `PricingService` tidak muncul, kirim dulu satu request ke `/api/pricing/calculate` lalu ulangi pencarian.

#### Setelah dibuat di UI — tarik balik ke repo

Supaya Batch C tidak jadi konfigurasi siluman yang cuma hidup di tenant, ekspor definisinya ke git:

```powershell
./scripts/dt-export-request-attributes.ps1
```

[`scripts/dt-export-request-attributes.ps1`](../scripts/dt-export-request-attributes.ps1) menarik semua RA berawalan `ticketing.`, membuang field `id` dan `metadata` (yang terikat tenant), lalu menyimpannya sebagai `exported-*.json`. Bandingkan hasilnya dengan berkas `ra-XX-*.json` yang sudah ada — untuk RA yang isinya identik, hapus versi `exported-*`-nya; untuk RA baru hasil wizard, rename jadi `ra-24-pricing-base-price.json` dan seterusnya.

Setelah itu seluruh 26 request attribute bisa dibangun ulang dari nol di tenant mana pun hanya dengan menjalankan `dt-apply-request-attributes.ps1`.

---

## 5. Verifikasi

### 5.1 Lapis 1 — apakah nilai tertangkap sama sekali

UI → service **api-gateway** → tab **Analyze requests** → kolom **Request attributes**. Semua RA yang aktif dan punya nilai akan tampil di sini beserta distribusi nilainya.

Kalau kosong, tekan tombol **Preview** di halaman definisi request attribute — Dynatrace akan menampilkan contoh nilai dari trafik yang baru lewat.

### 5.2 Lapis 2 — apakah bisa dipakai memfilter

UI → **Distributed traces** → *Add filter* → **Request attribute** → `ticketing.booking.type` = `flight`.
Trace yang tersaring harus tetap memperlihatkan **span `booking-service` (Go) di hilirnya** — inilah bukti bahwa penangkapan di gateway tetap memberi visibilitas end-to-end meski Go tidak mendukung RA.

### 5.3 Lapis 3 — verifikasi terprogram lewat `dtctl`

Request attribute mentah tidak bisa dibaca lewat DQL dengan token `dtctl` saat ini (`fetch spans` → `NOT_AUTHORIZED_FOR_TABLE`; butuh scope `storage:spans:read`). Tapi begitu RA dijadikan **calculated service metric** ([Bagian 6.1](#61-calculated-service-metric--metrik-bisnis-nyata)), metriknya bisa di-query.

⚠️ PowerShell memakan backtick dan tanda kutip di dalam DQL — **selalu simpan query ke file `.dql`** lalu jalankan dengan `-f`:

```dql
-- scratch/revenue-per-method.dql
timeseries revenue = sum(calc:service.<metric-key-anda>),
  by:{ dt.entity.service },
  from:now()-24h
```

```powershell
dtctl query -f scratch/revenue-per-method.dql -o json --plain
```

> `<metric-key-anda>` adalah *metric key* yang Anda tentukan sendiri saat membuat calculated service metric — kunci penuhnya berbentuk `calc:service.<key>`. Daftar lengkapnya bisa dilihat lewat `GET /api/config/v1/calculatedMetrics/service`.

Daftar RA yang sudah terpasang juga bisa dicek kapan saja:

```powershell
Invoke-RestMethod -Method GET -Uri "$env:DT_ENV/api/config/v1/service/requestAttributes" `
  -Headers @{ Authorization = "Api-Token $env:DT_TOKEN" } |
  Select-Object -ExpandProperty values | Format-Table name, id
```

---

## 6. Pemanfaatan Setelah Terpasang

Request attribute hanya berguna kalau dipakai. Lima pemanfaatan yang paling relevan untuk aplikasi ini:

### 6.1 Calculated service metric — metrik bisnis nyata

Ubah RA menjadi metrik yang bisa di-chart, di-alert, dan dipakai SLO.
Endpoint: `POST /api/config/v1/calculatedMetrics/service` (scope `WriteConfig`).

| Metrik yang layak dibuat | Basis | Dimensi |
|--------------------------|-------|---------|
| Nilai transaksi per menit | `RA-21` (`transaction.amount`, SUM) | `ticketing.payment.method`, `ticketing.booking.type` |
| Jumlah booking per tipe | count request | `ticketing.booking.type` |
| Rasio pembayaran gagal | count request | `ticketing.payment.status` |
| Latency pencarian per rute | response time | `ticketing.route.origin`, `ticketing.route.destination` |

Setelah dibuat, metriknya muncul sebagai `calc:service.<nama>` dan bisa dipakai di dashboard, notebook, maupun `dtctl query "timeseries ..."`.

### 6.2 Deteksi error bisnis

`RA-22` (`ticketing.error.code`) memungkinkan **failure detection** berbasis nilai bisnis, bukan hanya HTTP status. Ini penting karena banyak kegagalan di aplikasi ini balik dengan HTTP 200/201 tapi body-nya `{"error":"seat_locked"}`.

Settings Classic → **Failure detection → Service failure detection** → tambahkan rule: request dianggap gagal bila `ticketing.error.code` ada dan bukan string kosong.

### 6.3 Request naming

Endpoint gateway saat ini tergabung sebagai `POST /api/bookings`. Dengan `RA-13` (`ticketing.api.operation`) atau `RA-15` (`ticketing.booking.type`), request bisa dinamai:

```
POST /api/bookings — {ticketing.booking.type}
→  "POST /api/bookings — flight"
→  "POST /api/bookings — hotel"
```

Sehingga baseline & anomaly detection Dynatrace berjalan **terpisah** per tipe booking — booking hotel yang memang lebih lambat tidak lagi mengaburkan baseline booking pesawat.
Endpoint: `POST /api/config/v1/service/requestNaming`.

### 6.4 Key requests & SLO

Tandai `POST /api/bookings` dan `POST /api/payments` sebagai **key request**, lalu bangun SLO di atasnya dengan filter request attribute — mis. *"99% pembayaran `ewallet` selesai < 2 detik"*. Schema SLO (`builtin:monitoring.slo`) tersedia lewat `dtctl`, jadi bagian ini bisa ikut ter-version-control.

### 6.5 Investigasi dari keluhan pengguna

Alur yang menjadi mungkin setelah `RA-16` terpasang:

```
User lapor "booking TKT-8F21C9 gagal"
  → Distributed traces → filter ticketing.booking.reference = TKT-8F21C9
  → dapat 1 trace utuh: gateway → booking-service → catalog → pricing → payment
  → terlihat persis di span mana waktunya habis / errornya muncul
```

Tanpa RA, satu-satunya cara adalah menebak lewat rentang waktu dan menyisir log.

---

## 7. Privasi & Governance

| Aturan | Penerapan di sini |
|--------|-------------------|
| Jangan tangkap kredensial | Header `Authorization` dan `X-Internal-API-Key` **tidak ada** di katalog ini — disengaja |
| Tandai PII sebagai `confidential` | `RA-12` (client IP) dan `RA-14` (user id) → `"confidential": true`. Nilainya hanya terlihat oleh user dengan izin *View confidential request attributes* |
| Jangan pernah pakai `skipPersonalDataMasking: true` | Semua contoh di dokumen ini `false`. Flag itu mem-bypass masking data pribadi bawaan Dynatrace |
| Pakai ID, bukan email | Gateway punya `req.user.id` **dan** `req.user.email`; katalog ini sengaja hanya mengambil `id` |
| Wajib scoping | Tenant dipakai bersama aplikasi demo — RA tanpa `scope` mencemari data mereka dan sebaliknya |
| Versionkan definisinya | `deployments/dynatrace/request-attributes/*.json` masuk git; token **tidak** |

---

## 8. Limit & Jebakan

### Limit resmi

| Limit | Nilai |
|-------|-------|
| Atribut per request | **100** |
| Nilai per atribut per request | **10** |
| Atribut yang tertangkap sepanjang satu distributed trace | **1.000** |

26 RA yang diusulkan masih sangat jauh dari batas mana pun.

### Jebakan yang sudah pernah menggigit di lingkungan ini

| Gejala | Penyebab paling mungkin | Cara pastikan |
|--------|-------------------------|---------------|
| RA aktif tapi nilai selalu kosong di service Go | **Go tidak didukung** ([B-1](#yang-perlu-diketahui-sebelum-mulai--3-batasan-penentu)) — bukan salah konfigurasi | Cek kolom "Dukungan RA" di [tabel 1.1](#11-peta-service-teknologi-dan-dukungan-request-attribute) |
| `POST_PARAMETER` tidak menangkap apa pun | Body-nya JSON, bukan `x-www-form-urlencoded` ([B-2](#yang-perlu-diketahui-sebelum-mulai--3-batasan-penentu)) | `Content-Type` request yang bersangkutan |
| RA berhenti menangkap setelah rilis baru | Scope pakai `processGroup` dan PG ID berubah karena command line/image berubah | Bandingkan PG ID sekarang dengan [tabel 1.1](#11-peta-service-teknologi-dan-dukungan-request-attribute); pindah ke `tagOfProcessGroup` |
| Muncul nilai dari `easyTravel`/`easytrade` | `scope` kosong | Buka definisi RA, pastikan setiap `dataSources[].scope` terisi |
| Tipe data salah (angka masuk sebagai teks) | `dataType` **tidak bisa diubah** setelah RA dibuat | Hapus RA lalu buat ulang dengan tipe yang benar |
| Header `X-DT-*` tidak muncul di response | Middleware dipasang **setelah** `app.use('/api', routes)` | Urutan `app.use` di `api-gateway/server.js` |
| Sudah benar semua tapi tetap nihil | Pod berjalan dengan binary lama / OneAgent tidak ter-load — persis kasus `OBS-A` di [`docs/OBSERVABILITY-RCA-2026-07-27.md`](./OBSERVABILITY-RCA-2026-07-27.md) | `kubectl -n ticketing-app exec <pod> -- grep -c oneagent /proc/1/maps` — harus > 0 |
| API menolak: `dataSources[0].captureAndStore — Unexpected property` | **Sumber `CLIENT_IP` tidak menerima `capturingAndStorageLocation`** (client IP inheren server-side). Ditemukan saat menerapkan `ra-12`, 2026-07-27 | Hapus field `capturingAndStorageLocation` khusus untuk data source `CLIENT_IP` |
| Script `.ps1` gagal parse dengan `Array index expression is missing` | Windows PowerShell 5.1 membaca berkas UTF-8 **tanpa BOM** sebagai ANSI; em dash (`—`) di dalam string jadi byte rusak dan memutus string | Jaga berkas `.ps1` tetap murni ASCII (kedua script di repo ini sudah) |

---

## 9. Rollback

Semua langkah di dokumen ini reversibel dan tidak menyentuh alur bisnis.

| Yang mau dibatalkan | Cara |
|---------------------|------|
| Satu request attribute | UI → matikan toggle **Enabled** (data lama tetap tersimpan), atau `DELETE /api/config/v1/service/requestAttributes/{id}` |
| Seluruh Batch A/B/C | Loop `DELETE` atas semua id yang namanya berawalan `ticketing.` |
| Patch `api-gateway` | `kubectl -n ticketing-app rollout undo deployment/api-gateway` |
| Auto-tag `ticketing-app` | `dtctl delete settings <objectId>` |

Menonaktifkan RA **tidak** menghapus data historis, sehingga aman dicoba dan dibatalkan.

---

## 10. Checklist Eksekusi

```
Prasyarat
  [x] API token dibuat dengan scope CaptureRequestData + ReadConfig + WriteConfig
  [x] DT_ENV & DT_TOKEN diset sebagai env var, tidak di-commit
  [x] GET /api/config/v1/service/requestAttributes balik 200

Langkah 0 — Scoping
  [x] deployments/dynatrace/autotag-ticketing-app.json dibuat
  [x] Auto-tag diterapkan lewat dtctl
  [x] Tag `ticketing-app` terlihat menempel pada process group ticketing (9/10)

Batch A — tanpa ubah kode (12 RA)
  [x] RA-01 dibuat manual lewat UI sebagai uji coba
  [x] Trafik uji dikirim (18 request lewat ingress)
  [ ] Nilai CGK muncul di Analyze requests            <- cek di UI
  [x] RA-01 … RA-12 ditulis sebagai JSON              (12/12, semua ber-scope)
  [x] Script dijalankan dengan -WhatIfOnly (22/22 lolos)
  [x] Script dijalankan penuh, 12 RA terkonfirmasi ada

Batch B — patch gateway (10 RA)
  [x] api-gateway/middleware/dtAttributes.js dibuat
  [x] server.js memasang app.use(dtAttributes) SEBELUM app.use('/api', routes)
  [x] Middleware diuji: 19/19 smoke test, lint bersih, npm test 12/12
  [x] RA-13 … RA-22 ditulis sebagai JSON
  [x] Semua header X-DT-* yang dirujuk RA benar dipasang middleware (cek silang)
  [x] RA-13 … RA-22 diterapkan ke tenant
  [ ] Image v1.1.1 dibuild & dipush                   <- penghalang tersisa
  [ ] Rollout selesai, header X-DT-* terlihat di curl -i
  [ ] Nilai booking.type & payment.method terlihat di UI

Batch C — Java (4 RA, opsional)
  [ ] RA-24 dibuat lewat wizard UI (PricingService#calculatePrice arg 0)
  [ ] RA-25 & RA-26 ditambahkan sebagai data source pada RA yang sudah ada
  [x] RA-23 (X-User-Id) mencakup PG pricing/profile/admin   (di ra-14-user-id.json)
  [ ] dt-export-request-attributes.ps1 dijalankan, hasilnya dirapikan ke repo

Pemanfaatan
  [ ] Minimal 1 calculated service metric dibuat & bisa di-query lewat dtctl
  [ ] Failure detection berbasis ticketing.error.code diaktifkan
  [ ] Request naming per booking type diaktifkan
  [ ] POST /api/bookings & POST /api/payments ditandai sebagai key request
  [ ] Definisi JSON di-commit ke deployments/dynatrace/request-attributes/
```

---

## Lampiran A — Perintah verifikasi yang dipakai

Semua fakta lingkungan di dokumen ini berasal dari perintah berikut, dijalankan 2026-07-27:

```powershell
# Konteks & autentikasi
dtctl config current-context --plain
dtctl auth status --plain
# → my-env | https://pxo94309.apps.dynatrace.com/ | platform token

# Membuktikan request attributes BUKAN Settings 2.0
dtctl describe settings-schema builtin:request-attributes -o json --plain
# → 404 No schema with topic identifier 'builtin:request-attributes'

# Membuktikan endpoint Config API v1 hidup di tenant ini (401 = ada, butuh token)
curl -s -o /dev/null -w "%{http_code}" https://pxo94309.live.dynatrace.com/api/config/v1/service/requestAttributes
curl -s -o /dev/null -w "%{http_code}" https://pxo94309.live.dynatrace.com/api/config/v1/calculatedMetrics/service
curl -s -o /dev/null -w "%{http_code}" https://pxo94309.live.dynatrace.com/api/config/v1/service/requestNaming

# Teknologi & Process Group ID tiap service
dtctl query "fetch dt.entity.process_group | filter contains(entity.name, \"api-gateway\") or contains(entity.name, \"pricing-service\") | fields id, entity.name, softwareTechnologies" -o json --plain

# Service entity yang ada
dtctl query "fetch dt.entity.service | fields id, entity.name | limit 60" -o json --plain

# Membuktikan belum ada auto-tag sama sekali
dtctl get settings --schema builtin:tags.auto-tagging -o json --plain
# → []

# Host group
dtctl query "fetch dt.entity.host_group | fields id, entity.name" -o json --plain
# → k8s-cluster-dev, alfi-k3s
```

## Lampiran B — Referensi

* [Request attributes — Dynatrace Docs](https://docs.dynatrace.com/docs/observe/application-observability/services/request-attributes)
* [Capture request attributes based on web request data](https://docs.dynatrace.com/docs/observe/application-observability/services/request-attributes/capture-request-attributes-based-on-web-request-data)
* [Capture request attributes based on method arguments](https://docs.dynatrace.com/docs/observe/application-observability/services/request-attributes/capture-request-attributes-based-on-method-arguments)
* [Request attributes API — POST](https://docs.dynatrace.com/docs/discover-dynatrace/references/dynatrace-api/configuration-api/service-api/request-attributes-api/post-request-attribute) · [PUT](https://docs.dynatrace.com/docs/discover-dynatrace/references/dynatrace-api/configuration-api/service-api/request-attributes-api/put-request-attribute) · [GET](https://docs.dynatrace.com/docs/dynatrace-api/configuration-api/service-api/request-attributes-api/get-request-attribute)
* [Filter monitoring data via request attributes](https://docs.dynatrace.com/docs/platform-modules/applications-and-microservices/services/request-attributes/filter-monitoring-data-via-request-attributes)
* [Capture any request attributes using OneAgent SDK](https://www.dynatrace.com/news/blog/capture-any-request-attributes-using-oneagent-sdk/) · [OneAgent SDK for Node.js](https://www.npmjs.com/package/@dynatrace/oneagent-sdk)
* Diskusi komunitas yang mengonfirmasi batasan: [request attributes untuk Node.js](https://community.dynatrace.com/t5/Open-Q-A/request-attributes-for-Node-js/m-p/271660) · [Go + request attributes](https://community.dynatrace.com/t5/Open-Q-A/Golang-Request-Attributes-on-request-to-Public-Networks/m-p/194953) · [request attribute dari body JSON](https://community.dynatrace.com/t5/Open-Q-A/How-to-get-request-parameters-on-JSON-request/m-p/94091)
* Konteks internal: [`docs/OBSERVABILITY-RCA-2026-07-27.md`](./OBSERVABILITY-RCA-2026-07-27.md)
