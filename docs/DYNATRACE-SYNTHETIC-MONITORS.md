# Synthetic Monitor Dynatrace — Aplikasi Ticketing

> **Tanggal disusun:** 2026-08-04
> **Tenant:** `pxo94309` (Dynatrace SaaS Gen3) — UI `https://pxo94309.apps.dynatrace.com`, API klasik `https://pxo94309.live.dynatrace.com`
> **Cluster:** `k8s-cluster-dev`, namespace `ticketing-app`
> **Branch saat disusun:** `feat/dynatrace-request-attributes`
> **Tujuan:** menghasilkan trafik bisnis yang terus-menerus dan realistis, supaya 22 request attribute (`docs/DYNATRACE-REQUEST-ATTRIBUTES.md`) dan dashboard `ticketing-ux-business` benar-benar terisi data — bukan hanya health probe Kubernetes.
> **Metodologi:** setiap endpoint, nama parameter, bentuk payload, aturan validasi, dan enum di dokumen ini dibaca **langsung dari kode di repo** dan dicantumkan `file:baris`-nya. Tidak ada yang diasumsikan. Yang belum bisa diverifikasi ditandai eksplisit di [Bagian 8](#8-hal-yang-belum-terverifikasi).

---

## Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Prasyarat & Batasan yang Menentukan](#1-prasyarat--batasan-yang-menentukan)
3. [Peta Endpoint](#2-peta-endpoint)
4. [Katalog Monitor](#3-katalog-monitor)
5. [Data Uji yang Valid](#4-data-uji-yang-valid-dari-seed)
6. [Jadwal & Anggaran Rate Limit](#5-jadwal--anggaran-rate-limit)
7. [Efek Samping & Housekeeping](#6-efek-samping--housekeeping)
8. [Urutan Pengerjaan](#7-urutan-pengerjaan)
9. [Hal yang Belum Terverifikasi](#8-hal-yang-belum-terverifikasi)
10. [Lampiran A — Snippet Script Dynatrace](#lampiran-a--snippet-script-dynatrace)
11. [Lampiran B — Referensi Kode](#lampiran-b--referensi-kode)

---

## Ringkasan Eksekutif

Seluruh rantai observability sudah lengkap: 22 request attribute aktif di tenant, `api-gateway` v1.1.1 memasang header `X-DT-*`, OneAgent hidup di semua service. **Yang belum ada hanya trafiknya.** Per catatan 2026-07-28, dari ±52.000 request/hari per service, **hampir 100% adalah health probe Kubernetes** — dan probe tidak melewati `res.json()` di gateway sehingga tidak membawa satu pun request attribute.

Synthetic monitor adalah cara paling murah untuk menutup celah ini: ia menghasilkan trafik terjadwal, deterministik, dan sekaligus jadi alat deteksi regresi.

**Usulan: 21 monitor dalam 6 kelompok.**

| Kelompok | Isi | Tipe | Yang dihasilkan |
|----------|-----|------|-----------------|
| **A** | 2 monitor availability | HTTP | Uptime; deteksi service mana yang mati |
| **B** | 5 monitor katalog read-only | HTTP | Mengisi **12 RA Batch A** (rute, tanggal, kota, pax, kupon, currency) |
| **C** | 3 journey bisnis penuh | HTTP multi-request | Mengisi **10 RA Batch B** (booking type/ref/status, payment method/status, nominal) |
| **D** | 4 halaman frontend | Browser | Page load, resource waterfall, JS error |
| **E** | 4 alur user penuh | Browser clickpath | Alur end-to-end seperti user asli |
| **F** | 3 jalur error | HTTP | Mengisi `ticketing.error.code`; deteksi regresi |

**Dua batasan yang menentukan bentuk seluruh rancangan ini** — dibahas di Bagian 1, wajib dibaca sebelum membuat monitor pertama:

1. Aplikasi hanya bisa dijangkau dari **private synthetic location**, bukan public location.
2. Gateway membatasi **100 request per 15 menit per IP**. Semua monitor dari satu ActiveGate berbagi satu IP — ini anggaran keras, bukan saran.

---

## 1. Prasyarat & Batasan yang Menentukan

### 1.1 Reachability — private location wajib

Ingress-nya memakai hostname privat:

```yaml
# deployments/13-ingress.yaml:17-34
rules:
- host: ticketing-app.local
  http:
    paths:
    - path: /api        -> service api-gateway:8080
    - path: /           -> service frontend:80
```

`ticketing-app.local` tidak ada di DNS publik. **Public synthetic location Dynatrace tidak akan pernah bisa menjangkaunya.** Yang dibutuhkan: **Private Synthetic Location** — ActiveGate dengan modul synthetic aktif, ditempatkan di dalam network yang bisa mencapai ingress controller.

Tiga opsi agar ActiveGate bisa resolve, urut dari yang paling disarankan:

| Opsi | Cara | Kelebihan | Kekurangan |
|------|------|-----------|------------|
| **A. hosts entry** | Tambahkan `<IP-ingress>  ticketing-app.local` ke `/etc/hosts` host ActiveGate | URL monitor sama persis dengan yang dipakai user; RUM tag konsisten | Perlu akses ke host ActiveGate |
| **B. Header `Host`** | Monitor menuju `http://<IP-node-ingress>/api/...` dengan header `Host: ticketing-app.local` | Tanpa mengubah host ActiveGate | URL di Dynatrace jadi berupa IP — kurang enak dibaca; browser monitor jadi rumit (CORS origin `http://ticketing-app.local`, lihat `api-gateway/config/config.js:75`) |
| **C. ActiveGate di dalam cluster** | Deploy ActiveGate sebagai pod di cluster | Bisa hit service DNS internal langsung → memungkinkan `SYN-02` | Menambah beban cluster |

> Opsi **A** dipakai sebagai asumsi default di seluruh dokumen ini. Opsi **C** adalah satu-satunya yang memungkinkan monitor health per-service (`SYN-02`).

### 1.2 Rate limit gateway — anggaran keras

```javascript
// api-gateway/config/config.js:67-71
rateLimit: {
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                 // 100 request per IP per window
}
```

Diterapkan ke **seluruh** `/api/` (`api-gateway/server.js:48`). Yang **dikecualikan**:

| Tidak kena limit | Alasan |
|------------------|--------|
| `GET /api/health` | Didaftarkan **sebelum** limiter (`api-gateway/server.js:31-33`), plus `skip` eksplisit (`server.js:45`) |
| Aset statis frontend (`/`, `/assets/*`) | Dilayani nginx frontend, tidak lewat gateway |

Karena `app.set('trust proxy', 1)` (`server.js:15`) dan nginx ingress mengisi `X-Forwarded-For`, limiter menghitung **IP klien asli** — yaitu IP ActiveGate. Jadi:

> **Semua monitor dari satu private location berbagi jatah 100 request / 15 menit.**

Kalau plafon ini terlampaui, gateway balas `429 too_many_requests` dan semua monitor tampak merah seolah aplikasi rusak. Anggarannya dihitung lengkap di [Bagian 5](#5-jadwal--anggaran-rate-limit).

> 💡 Kalau nanti butuh volume lebih besar, nilainya masih **hardcoded** — belum bisa diatur lewat env. Ubah `api-gateway/config/config.js:69-70` menjadi `parseInt(process.env.RATE_LIMIT_MAX) || 100` sebelum menaikkan frekuensi monitor.

### 1.3 Akun synthetic & credential vault

Semua monitor Kelompok C dan E butuh login. **Buat satu akun khusus, sekali saja:**

```http
POST http://ticketing-app.local/api/auth/register
Content-Type: application/json

{
  "email": "synthetic@ticketing.local",
  "password": "<password kuat, min 8 karakter>",
  "full_name": "Dynatrace Synthetic",
  "phone": "081200000000"
}
```

Aturan payload dari `backend/authentication-service/models/user.go:20-23`:

| Field | Wajib | Aturan |
|-------|-------|--------|
| `email` | ✅ | format email valid |
| `password` | ✅ | **minimal 8 karakter** |
| `full_name` | ✅ | — |
| `phone` | ❌ | opsional |

Ketentuan:

- ⛔ **Jangan** masukkan `POST /api/auth/register` ke monitor rutin — tabel `users` akan membengkak selamanya.
- 🔐 Simpan kredensial di **Dynatrace Credential Vault**, bukan plaintext di konfigurasi monitor.
- 👤 Akun ini **jangan** diberi hak admin. Kelompok monitor admin (`/api/admin/*`) sengaja tidak dimasukkan ke katalog — lihat [Bagian 6](#6-efek-samping--housekeeping).
- 🏷️ Karena semua trafik synthetic memakai satu `user_id`, kamu bisa **memfilternya keluar** dari tile bisnis lewat request attribute `ticketing.user.id`.

### 1.4 Tanggal wajib dinamis

Seed katalog bersifat **rolling 30 hari ke depan**:

```sql
-- database/scripts/seed_catalog_rich.sql:36-38
INSERT INTO _seed_cfg VALUES (30);   -- HORIZON_DAYS
```

Artinya tanggal hardcoded akan **basi dalam sebulan** dan seluruh monitor search akan mengembalikan hasil kosong tanpa error yang jelas. Semua monitor yang memakai `date` / `checkin` / `checkout` **harus** menghitungnya saat runtime — lihat [Lampiran A.1](#a1-menghitung-tanggal-dinamis).

Selain itu, gateway memvalidasi format tanggal secara ketat:

```javascript
// api-gateway/routes/flights.js:79-84 (pola sama di trains.js & hotels.js)
if (!isValidDate(date)) return res.status(400).json({ error: 'invalid_date',
  message: 'date must be YYYY-MM-DD' });
```

Format wajib **`YYYY-MM-DD`**.

### 1.5 Seat lock Redis — jangan saling menabrak

`booking-service` mengambil lock per item sebelum membuat booking:

```go
// backend/booking-service/service/booking_service.go:64-75
acquired, err := cache.AcquireSeatLock(ctx, item.ItemType, item.ItemRefID.String())
if !acquired {
    return nil, fmt.Errorf("seat_lock_conflict: this %s is currently being booked
                            by another user — please try again in a moment")
}
```

Kalau dua monitor booking berjalan bersamaan pada **jadwal yang sama**, salah satunya gagal dengan `seat_lock_conflict`. Penanganannya:

- Beri **rute berbeda** untuk tiap monitor journey (`SYN-11` Jakarta–Bali, `SYN-13` Jakarta–Surabaya, dst.).
- **Stagger** frekuensinya (30 / 45 / 60 menit), jangan semuanya kelipatan 30.
- Ini juga bisa dijadikan nilai plus: `seat_lock_conflict` akan tertangkap sebagai `ticketing.error.code`, jadi kamu bisa memantau seberapa sering kontensi terjadi.

---

## 2. Peta Endpoint

### 2.1 Endpoint publik lewat ingress (`http://ticketing-app.local`)

Hanya prefix `/api` yang menuju gateway; sisanya ke frontend. Kolom **RA** menunjukkan request attribute yang akan terisi oleh endpoint tersebut.

#### Auth — `api-gateway/routes/auth.js`

| Method | Path | Auth | Body / Query | Respons | RA terisi |
|--------|------|:----:|--------------|---------|-----------|
| `POST` | `/api/auth/register` | — | `{email, password, full_name, phone?}` | `AuthResponse` | `api.operation` |
| `POST` | `/api/auth/login` | — | `{email, password}` | `{access_token, refresh_token, token_type, expires_in, user:{id,email,full_name,phone}}` | `api.operation` |
| `POST` | `/api/auth/refresh` | cookie | — | `AuthResponse` | `api.operation` |
| `POST` | `/api/auth/logout` | cookie | — | `{message}` | `api.operation` |
| `GET` | `/api/auth/profile` | Bearer | — | profil user | `api.operation`, `user.id` |

#### Search (pricing-service) — `api-gateway/routes/search.js`

| Method | Path | Auth | Query | RA terisi |
|--------|------|:----:|-------|-----------|
| `GET` | `/api/search/flights` | opsional | `from`, `to`, `date`, `adults`, `children` | `route.origin`, `route.destination`, `travel.date`, `pax.adults`, `pax.children` |
| `GET` | `/api/search/trains` | opsional | idem | idem |
| `GET` | `/api/search/hotels` | opsional | `city`, `checkin`, `checkout`, `guests` | `hotel.city`, `hotel.checkin`, `hotel.checkout`, `pax.adults` |

> ✅ **Sudah diperbaiki 2026-08-04.** Sebelumnya `GET /api/search/flights` membalas **HTTP 500** karena gateway memanggil `/search/flights` sementara `SearchController` pricing-service dipetakan ke `/api/search`. Diperbaiki di `api-gateway/routes/search.js` (menunggu rollout image). Ketiga endpoint search terbukti `200` + data saat diuji langsung ke pricing-service. Lihat [Bagian 8](#8-hal-yang-belum-terverifikasi).
>
> Parameter wajib per endpoint (`SearchController.java:16-56`) — kalau ada yang kurang, responsnya `500`, bukan `400`:
> `flights` → `from`, `to`, `date` · `trains` → `from`, `to`, `date` · `hotels` → `city`, `checkin`, `checkout`

#### Flight — `api-gateway/routes/flights.js`

| Method | Path | Auth | Query | Respons | RA terisi |
|--------|------|:----:|-------|---------|-----------|
| `GET` | `/api/flights/schedules` | — | `origin`+`destination`+`date` **atau** `page`,`size`,`sortBy`,`direction` | `FlightSchedule[]` / paginated | `route.*`, `travel.date`, `page.size` |
| `GET` | `/api/flights/search` | — | `originName`, `destinationName`, `date` — **ketiganya wajib** | `FlightSchedule[]` | `route.origin`, `route.destination`, `travel.date` |
| `GET` | `/api/flights/airports` | — | — | paginated `Airport[]` (`id,code,name,city,country`) | `api.operation` |
| `GET` | `/api/flights/airlines` | — | — | paginated `Airline[]` | `api.operation` |
| `GET` | `/api/flights/schedules/:id` | — | — | `FlightSchedule` | `api.operation` |
| `GET` | `/api/flights/schedules/:id/seats` | — | — | `FlightSeatDTO[]` | `api.operation` |
| `GET` | `/api/flights/schedules/:id/seats/available` | — | — | `FlightSeatDTO[]` | `api.operation` |

`FlightSchedule` memuat `id`, `flightNumber`, `originAirportCode`, `destinationAirportCode`, `departureTime`, `availableSeats[{seatClass, availableCount, totalCount}]`, `fares[{seatClass, basePrice, currency}]` (`frontend/src/services/api.ts:183-204`). **`fares[].basePrice` inilah sumber harga untuk langkah booking.**

`/api/flights/search` menerjemahkan nama → id bandara di gateway (`flights.js:86-118`); `originName` boleh berupa **kode IATA, nama bandara, atau nama kota**. Kalau tidak cocok → `404 airport_not_found`.

#### Train — `api-gateway/routes/trains.js`

| Method | Path | Auth | Query | Catatan |
|--------|------|:----:|-------|---------|
| `GET` | `/api/trains/schedules` | — | `origin`, `destination`, `date`, `page`, `size`, `sortBy`, `direction` | — |
| `GET` | `/api/trains/search` | — | `originName`, `destinationName`, `date` — wajib | Match ke `name` / `code` / `city` stasiun (`trains.js:73-84`) |
| `GET` | `/api/trains/stations` | — | — | `size=100` di-hardcode (`trains.js:11-13`) |
| `GET` | `/api/trains/schedules/:id` | — | — | — |
| `GET` | `/api/trains/schedules/:id/seats` | — | — | — |
| `GET` | `/api/trains/schedules/:id/seats/available` | — | — | — |

> ⚠️ `TrainSchedule` **tidak punya field `fares`** (`frontend/src/services/api.ts:299-317`) — berbeda dari flight. Harga untuk booking kereta harus datang dari `/api/pricing/calculate`, persis seperti yang dilakukan UI (`frontend/src/pages/Trains.tsx:292`).

#### Hotel — `api-gateway/routes/hotels.js`

| Method | Path | Auth | Query | Respons |
|--------|------|:----:|-------|---------|
| `GET` | `/api/hotels` | — | diteruskan apa adanya (`page`, `size`, …) | paginated `Hotel[]` |
| `GET` | `/api/hotels/search` | — | `city` **wajib**, `checkin`, `checkout`, `guests`, `page`, `size` | paginated `Hotel[]` |
| `GET` | `/api/hotels/:id` | — | — | `Hotel` |
| `GET` | `/api/hotels/:id/rooms` | — | `checkin`, `checkout`, `guests` | `AvailableRoomInfo[]` — `{roomTypeId, roomTypeName, capacity, availableCount, totalCount, minPrice, currency}` |
| `GET` | `/api/hotels/:id/rates` | — | — | `RoomRate[]` |

`roomTypeId` dari `/rooms` adalah nilai yang dikirim UI sebagai `item_ref_id` saat booking hotel (`frontend/src/pages/HotelDetail.tsx:138`).

#### Booking — `api-gateway/routes/booking.js` (**seluruhnya butuh Bearer**)

| Method | Path | Body | Respons | RA terisi |
|--------|------|------|---------|-----------|
| `POST` | `/api/bookings` | `CreateBookingRequest` | `201` + `BookingDTO` | `booking.type`, `booking.reference`, `booking.status`, `booking.item_count`, `transaction.amount`, `user.id`, `api.operation` |
| `GET` | `/api/bookings/:id` | — | `BookingDTO` | sama seperti di atas |
| `GET` | `/api/bookings/reference/:reference` | — | `BookingDTO` | sama seperti di atas |
| `GET` | `/api/bookings/user/:userId` | query `limit`, `offset` | `BookingDTO[]` | ⚠️ hanya `api.operation`, `user.id`, `page.size` — **bukan** atribut booking (respons berupa array, lihat catatan di bawah) |
| `POST` | `/api/bookings/:id/cancel` | — | `{message, booking_id}` | `api.operation`, `user.id` |

`CreateBookingRequest` — aturan validasi dari `backend/booking-service/models/booking.go:46-57`:

```json
{
  "booking_type": "flight",              // wajib, oneof: flight | train | hotel
  "items": [                             // wajib, minimal 1 item
    {
      "item_type": "flight",             // wajib, oneof: flight | train | hotel
      "item_ref_id": "<UUID>",           // wajib, harus UUID valid
      "price": 1240000,                  // wajib, min 0
      "quantity": 2,                     // wajib, min 1
      "metadata": {
        "passenger_names": ["Synthetic User", "Synthetic User 2"],
        "seat_numbers": ["1A", "1B"],
        "check_in_date": "2026-08-07",   // hotel saja
        "check_out_date": "2026-08-09",  // hotel saja
        "hotel_name": "...", "hotel_city": "...", "room_type_name": "..."
      }
    }
  ]
}
```

`BookingDTO` yang dikembalikan (`booking.go:62-71`): `id`, `user_id`, `booking_reference`, `booking_type`, `total_amount`, `currency`, `status`, `items[]`, `created_at`.

- **Format referensi: `BK-XXXXXXXX`** (8 karakter A–Z 0–9) — `booking_service.go:440-450`. Pakai ini sebagai assertion konten.
- Status awal selalu **`pending`** (`booking_service.go:113`); berubah jadi `confirmed` setelah pembayaran sukses.
- `total_amount` **dihitung ulang di backend** lewat pricing service (`booking_service.go:95-102`) — nilai `price` yang dikirim monitor hanya jadi base price, jadi tidak perlu presisi.

> 📌 **Kenapa `/api/bookings/user/:userId` tidak mengisi atribut booking:** middleware hanya memasang header `X-DT-Booking-*` kalau body punya field `booking_reference` di level teratas (`api-gateway/middleware/dtAttributes.js:65`). Respons daftar berupa **array**, jadi kondisinya tidak terpenuhi. Untuk mengisi atribut booking, monitor **wajib** memanggil `GET /api/bookings/:id` (objek tunggal).

#### Payment — `api-gateway/routes/payment.js` (**seluruhnya butuh Bearer**)

| Method | Path | Body | Respons | RA terisi |
|--------|------|------|---------|-----------|
| `POST` | `/api/payments` | `{booking_id, amount, currency?, payment_method}` | `PaymentDTO` | `payment.method`, `payment.status`, `transaction.amount`, `user.id`, `api.operation` |
| `GET` | `/api/payments/:id` | — | `PaymentDTO` | sama |
| `POST` | `/api/payments/:id/refund` | — | `PaymentDTO` | sama |

Perilaku yang **deterministik** dan penting untuk synthetic (`backend/payment-service/service/payment_service.go:109-127`):

| Kondisi | Hasil |
|---------|-------|
| `amount > 0` | **Selalu `succeeded`** — lalu booking otomatis dikonfirmasi via goroutine `confirmBooking` |
| `amount <= 0` | **Selalu `failed`**, alasan `invalid_amount` |
| Refund saat status ≠ `succeeded` | Error `only succeeded payments can be refunded` |

> 💡 Karena `amount <= 0` gagal secara deterministik, ini jalan yang **terkendali** untuk mengisi `ticketing.payment.status = failed` di dashboard tanpa merusak apa pun. Dipakai oleh `SYN-21`.

Enum (`frontend/src/services/api.ts:558-559`):

- `payment_method`: `bank_transfer` · `ewallet` · `credit_card`
- `PaymentStatus`: `initiated` · `succeeded` · `failed` · `refunded`
- Booking `status`: `pending` · `confirmed` · `cancelled` · `expired` · `initiated`

#### Pricing — `api-gateway/routes/pricing.js`

| Method | Path | Auth | Input | RA terisi |
|--------|------|:----:|-------|-----------|
| `GET` | `/api/pricing/calculate` | opsional | query `basePrice`, `couponCode`, `currency` | `coupon.code`, `currency` |
| `POST` | `/api/pricing/calculate` | opsional | body `{basePrice, couponCode, currency, quantity}` | ⚠️ **tidak** mengisi `coupon.code`/`currency` — RA-09/RA-10 bersumber dari **query parameter**, dan OneAgent tidak membaca body JSON |

> 📌 Konsekuensi praktis: **pakai varian `GET`** di monitor kalau tujuanmu mengisi `ticketing.coupon.code` dan `ticketing.currency`. UI memakai varian `POST` (`frontend/src/services/api.ts:623`), jadi clickpath browser **tidak akan** mengisi kedua RA itu — hanya monitor HTTP yang bisa.

Respons: `{basePrice, tax, discount, totalPrice, currency}`.

#### Profile — `api-gateway/routes/profile.js` (**Bearer**)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/profile` | — |
| `PUT` | `/api/profile` | `{fullName?, phone?}` |
| `PUT` | `/api/profile/password` | payload ganti password |

> ✅ **Sudah diperbaiki 2026-08-04.** Sebelumnya ketiga endpoint ini **tidak pernah berfungsi**: ConfigMap mengarahkan gateway ke `profile-service:8090` sementara Service-nya hanya mengekspos 8085. Deployment disetel ulang ke 8090 dan sudah di-apply. Detail bukti di [Bagian 8](#8-hal-yang-belum-terverifikasi).
>
> Catatan: `GET /api/auth/**profile**` berbeda — itu menuju `authentication-service:8081` dan tidak pernah terpengaruh.

#### Admin — `api-gateway/routes/admin.js` (**Bearer**)

| Method | Path | Catatan |
|--------|------|---------|
| `GET` | `/api/admin/metrics` | Read-only, aman untuk monitor |
| `POST` | `/api/admin/flights` | ⛔ **menulis katalog** — jangan dimonitor |
| `POST` | `/api/admin/trains` | ⛔ idem |
| `POST` | `/api/admin/hotels` | ⛔ idem |

#### Utilitas

| Method | Path | Catatan |
|--------|------|---------|
| `GET` | `/api/health` | **Bebas rate limit**, tapi **tidak membawa RA** (didaftarkan sebelum middleware `dtAttributes`, `server.js:31` vs `:84`) |
| `GET` | `/api/docs` | Swagger UI |
| `GET` | `/api/docs.json` | Spesifikasi OpenAPI mentah |

### 2.2 Endpoint internal per service

Hanya bisa dijangkau kalau ActiveGate berada **di dalam cluster** (opsi C di [1.1](#11-reachability--private-location-wajib)). Sumber: `deployments/02-configmap.yaml` + probe di tiap deployment.

| Service | URL internal | Health path |
|---------|--------------|-------------|
| authentication-service | `http://authentication-service:8081` | `/health`, `/health/ready` |
| booking-service | `http://booking-service:8082` | `/health`, `/health/ready` |
| flight-service | `http://flight-service:8083` | `/flights/health` |
| train-service | `http://train-service:8084` | `/trains/health` |
| hotel-service | `http://hotel-service:8085` | `/health/ready` |
| pricing-service | `http://pricing-service:8086` | `/pricing/health` |
| notification-service | `http://notification-service:8087` | `/health`, `/health/ready` |
| admin-service | `http://admin-service:8088` | `/api/admin/health` |
| payment-service | `http://payment-service:8089` | `/health`, `/health/ready` |
| profile-service | `http://profile-service:8090` | `/profile/health` ✅ diperbaiki 2026-08-04 |
| api-gateway | `http://api-gateway:8080` | `/api/health` |
| frontend | `http://frontend:80` | `/` |

### 2.3 Rute frontend

Sumber: `frontend/src/App.tsx:28-97`. Kolom **API saat load** menentukan biaya rate limit tiap browser monitor.

| Rute | Proteksi | API saat load |
|------|:--------:|---------------|
| `/` | publik | **0** — landing page statis |
| `/login` | publik | 0 |
| `/register` | publik | 0 |
| `/flights` | publik | 2 — `flights/airports`, `flights/schedules` |
| `/trains` | publik | 2 — `trains/stations`, `trains/schedules` |
| `/hotels` | publik | 1 — `hotels` |
| `/hotels/:id` | publik | 2 — `hotels/:id`, `hotels/:id/rooms` |
| `/ships`, `/buses` | publik | 0 — halaman *Coming Soon* |
| `/dashboard` | 🔒 | 0 |
| `/bookings` | 🔒 | 1 — `bookings/user/:id` |
| `/bookings/:id` | 🔒 | 1 — `bookings/:id` |
| `/payment/:bookingId` | 🔒 | 1 saat load + 1 saat bayar |
| `/profile` | 🔒 | 1 — `profile` |
| `/admin/dashboard` | 🔒 | 1 — `admin/metrics` |
| `/admin/add-data` | 🔒 | dropdown katalog |

Selector form login (`frontend/src/pages/Login.tsx:41-64`): `#email`, `#password`, `button[type="submit"]`.

---

## 3. Katalog Monitor

Konvensi penamaan monitor di Dynatrace: **`ticketing — <ID> <nama>`**, semuanya diberi tag `ticketing-app` supaya konsisten dengan auto-tag yang sudah ada dan mudah difilter.

### 3.1 Kelompok A — Availability

#### `SYN-01` · Gateway & frontend alive

| | |
|---|---|
| **Tipe** | HTTP monitor, 2 request |
| **Frekuensi** | 5 menit |
| **Biaya rate limit** | **0** (kedua request dikecualikan) |
| **Tujuan** | Sinyal uptime paling dasar dan paling murah |

| # | Method | URL | Assert |
|---|--------|-----|--------|
| 1 | `GET` | `http://ticketing-app.local/api/health` | `200` · body memuat `"status":"healthy"` |
| 2 | `GET` | `http://ticketing-app.local/` | `200` · body memuat `<div id="root"` |

> Tidak mengisi request attribute apa pun. Ini murni lapisan uptime.

#### `SYN-02` · Health per-service *(hanya bila ActiveGate di dalam cluster)*

| | |
|---|---|
| **Tipe** | HTTP monitor, 11 request |
| **Frekuensi** | 5 menit |
| **Biaya rate limit** | **0** (tidak lewat gateway) |
| **Tujuan** | Menjawab "service mana yang mati", bukan sekadar "gateway 503" |

Satu request per baris di [tabel 2.2](#22-endpoint-internal-per-service), semuanya assert `200`. Nilai terbesarnya: mendeteksi lebih dini kelas masalah seperti `OBS-B` (rollout macet) yang di RCA sebelumnya baru ketahuan setelah 3 hari 19 jam.

---

### 3.2 Kelompok B — Katalog read-only → mengisi RA Batch A

Semuanya `GET`, tanpa auth, **tanpa efek samping ke database**. Ini kelompok yang paling murah sekaligus paling cepat memberi hasil terlihat di dashboard.

#### `SYN-03` · Data referensi katalog

| | |
|---|---|
| **Tipe** | HTTP, 4 request · **Frekuensi** 15 menit · **Biaya** 4 req |
| **RA terisi** | `page.size`, `api.operation` |

| # | Method | URL | Assert |
|---|--------|-----|--------|
| 1 | `GET` | `/api/flights/airports` | `200` · `content` array tidak kosong |
| 2 | `GET` | `/api/flights/airlines` | `200` |
| 3 | `GET` | `/api/trains/stations` | `200` |
| 4 | `GET` | `/api/hotels?page=0&size=20` | `200` |

#### `SYN-04` · Search penerbangan

| | |
|---|---|
| **Tipe** | HTTP, 2 request · **Frekuensi** 15 menit · **Biaya** 2 req |
| **RA terisi** | `route.origin`, `route.destination`, `travel.date`, `page.size` |

Pre-execution script menghitung `{travelDate}` dan memilih pasangan rute acak (lihat [Lampiran A.1](#a1-menghitung-tanggal-dinamis) & [A.2](#a2-rotasi-nilai-parameter)).

| # | Method | URL | Assert |
|---|--------|-----|--------|
| 1 | `GET` | `/api/flights/search?originName={origin}&destinationName={destination}&date={travelDate}` | `200` · respons berupa array |
| 2 | `GET` | `/api/flights/schedules?page=0&size=20&sortBy=departureTime&direction=ASC` | `200` |

#### `SYN-05` · Search kereta

| | |
|---|---|
| **Tipe** | HTTP, 2 request · **Frekuensi** 15 menit · **Biaya** 2 req |
| **RA terisi** | `route.origin`, `route.destination`, `travel.date`, `page.size` |

| # | Method | URL |
|---|--------|-----|
| 1 | `GET` | `/api/trains/search?originName={kodeAsal}&destinationName={kodeTujuan}&date={travelDate}` |
| 2 | `GET` | `/api/trains/schedules?page=0&size=20&sortBy=departureTime&direction=ASC` |

⚠️ **Pakai kode stasiun** (`GMR`, `YK`), bukan nama. Nama di data live berbeda dari file seed — stasiun `GMR` bernama "Gambir **Station**", jadi `originName=Gambir` gagal resolve. Lihat [Bagian 4](#4-data-uji-yang-valid-terverifikasi). Pasangan yang terverifikasi mengembalikan data: `GMR` → `YK`.

#### `SYN-06` · Search hotel

| | |
|---|---|
| **Tipe** | HTTP, 2 request · **Frekuensi** 15 menit · **Biaya** 2 req |
| **RA terisi** | `hotel.city`, `hotel.checkin`, `hotel.checkout`, `pax.adults`, `page.size` |

| # | Method | URL |
|---|--------|-----|
| 1 | `GET` | `/api/hotels/search?city={kota}&checkin={checkin}&checkout={checkout}&guests=2&page=0&size=20` |
| 2 | `GET` | `/api/hotels/{hotelId}/rooms?checkin={checkin}&checkout={checkout}&guests=2` — `hotelId` diekstrak dari request 1 |

#### `SYN-07` · Kalkulasi harga & kupon

| | |
|---|---|
| **Tipe** | HTTP, 2 request · **Frekuensi** 15 menit · **Biaya** 2 req |
| **RA terisi** | `coupon.code`, `currency` |

| # | Method | URL | Catatan |
|---|--------|-----|---------|
| 1 | `GET` | `/api/pricing/calculate?basePrice=1240000&couponCode=SYNTHETIC10&currency=IDR` | Wajib varian **GET** — lihat catatan di [2.1 Pricing](#pricing--api-gatewayroutespricingjs) |
| 2 | `GET` | `/api/pricing/calculate?basePrice=650000&currency=IDR` | Tanpa kupon, sebagai pembanding |

> Belum ada kupon yang di-seed (tabel `coupons` ada di `V007` tapi tidak ada `INSERT` di mana pun). `SYNTHETIC10` akan diperlakukan sebagai kupon tidak dikenal — itu tidak masalah: **RA-09 menangkap nilai dari query parameter, terlepas dari apakah kuponnya valid.**

---

### 3.3 Kelompok C — Journey bisnis penuh → mengisi RA Batch B

**Ini kelompok paling penting.** Bagian 1 & 2 dashboard `ticketing-ux-business` kosong justru karena tidak ada yang menjalankan alur booking→payment. Hanya rangkaian ini yang mengisi `booking.type`, `booking.reference`, `booking.status`, `booking.item_count`, `payment.method`, `payment.status`, `transaction.amount`.

Pola umum yang dipakai ketiganya:

```
login → cari → ambil harga → buat booking → baca booking → bayar → baca payment → cancel
```

Langkah **cancel di akhir wajib** — lihat [Bagian 6](#6-efek-samping--housekeeping).

#### `SYN-08` · Journey pesawat (Jakarta → Bali)

| | |
|---|---|
| **Tipe** | HTTP multi-request, 9 request · **Frekuensi** 30 menit · **Biaya** ~5 req/15 mnt |
| **RA terisi** | `api.operation`, `user.id`, `booking.type=flight`, `booking.reference`, `booking.status`, `booking.item_count`, `payment.method=ewallet`, `payment.status=succeeded`, `transaction.amount`, `route.*`, `travel.date` |

| # | Method | URL | Body / Header | Ekstraksi | Assert |
|---|--------|-----|---------------|-----------|--------|
| 1 | `POST` | `/api/auth/login` | `{"email":"{vault:user}","password":"{vault:pass}"}` | `access_token` → `{token}`<br>`user.id` → `{userId}` | `200` |
| 2 | `GET` | `/api/flights/search?originName=CGK&destinationName=DPS&date={travelDate}` | — | `[0].id` → `{scheduleId}`<br>`[0].fares[0].basePrice` → `{basePrice}` | `200` · array **tidak kosong** |
| 3 | `GET` | `/api/flights/schedules/{scheduleId}/seats/available` | — | `[0].seatNumber` → `{seat1}`<br>`[1].seatNumber` → `{seat2}` | `200` |
| 4 | `GET` | `/api/pricing/calculate?basePrice={basePrice}&currency=IDR` | — | `totalPrice` → `{unitPrice}` | `200` |
| 5 | `POST` | `/api/bookings` | `Authorization: Bearer {token}`<br>payload di bawah | `id` → `{bookingId}`<br>`total_amount` → `{amount}`<br>`booking_reference` → `{bookingRef}` | `201` · body cocok `BK-[A-Z0-9]{8}` |
| 6 | `GET` | `/api/bookings/{bookingId}` | Bearer | — | `200` · `status` = `pending` |
| 7 | `POST` | `/api/payments` | Bearer · `{"booking_id":"{bookingId}","amount":{amount},"currency":"IDR","payment_method":"ewallet"}` | `id` → `{paymentId}` | `200` · `status` = `succeeded` |
| 8 | `GET` | `/api/payments/{paymentId}` | Bearer | — | `200` |
| 9 | `POST` | `/api/bookings/{bookingId}/cancel` | Bearer | — | `200` |

Payload request 5:

```json
{
  "booking_type": "flight",
  "items": [{
    "item_type": "flight",
    "item_ref_id": "{scheduleId}",
    "price": {unitPrice},
    "quantity": 2,
    "metadata": {
      "passenger_names": ["Synthetic User A", "Synthetic User B"],
      "seat_numbers": ["{seat1}", "{seat2}"]
    }
  }]
}
```

> ⚠️ Request 2 **wajib** assert "array tidak kosong". Kalau seed katalog kedaluwarsa, endpoint tetap balas `200` dengan `[]`, lalu request 3 dan seterusnya gagal dengan pesan membingungkan. Assertion ini yang mengubahnya jadi kegagalan yang jelas.

#### `SYN-09` · Journey hotel (Denpasar)

| | |
|---|---|
| **Tipe** | HTTP multi-request, 7 request · **Frekuensi** 60 menit · **Biaya** ~2 req/15 mnt |
| **RA terisi** | `booking.type=hotel`, `payment.method=bank_transfer`, `hotel.city`, `hotel.checkin`, `hotel.checkout`, `pax.adults`, + seluruh RA booking/payment |

| # | Method | URL | Ekstraksi | Assert |
|---|--------|-----|-----------|--------|
| 1 | `POST` | `/api/auth/login` | `{token}`, `{userId}` | `200` |
| 2 | `GET` | `/api/hotels/search?city=Denpasar&checkin={checkin}&checkout={checkout}&guests=2&size=20` | `content[0].id` → `{hotelId}`<br>`content[0].name` → `{hotelName}` | `200` · tidak kosong |
| 3 | `GET` | `/api/hotels/{hotelId}/rooms?checkin={checkin}&checkout={checkout}&guests=2` | `[0].roomTypeId` → `{roomTypeId}`<br>`[0].minPrice` → `{roomPrice}`<br>`[0].roomTypeName` → `{roomTypeName}` | `200` · tidak kosong |
| 4 | `POST` | `/api/bookings` | `{bookingId}`, `{amount}` | `201` |
| 5 | `GET` | `/api/bookings/{bookingId}` | — | `200` |
| 6 | `POST` | `/api/payments` — `payment_method: "bank_transfer"` | `{paymentId}` | `200` · `succeeded` |
| 7 | `POST` | `/api/bookings/{bookingId}/cancel` | — | `200` |

Payload request 4:

```json
{
  "booking_type": "hotel",
  "items": [{
    "item_type": "hotel",
    "item_ref_id": "{roomTypeId}",
    "price": {roomPrice},
    "quantity": 1,
    "metadata": {
      "room_numbers": [],
      "passenger_names": ["Synthetic User A"],
      "check_in_date": "{checkin}",
      "check_out_date": "{checkout}",
      "hotel_name": "{hotelName}",
      "hotel_city": "Denpasar",
      "room_type_name": "{roomTypeName}"
    }
  }]
}
```

#### `SYN-10` · Journey kereta (Gambir → Yogyakarta)

| | |
|---|---|
| **Tipe** | HTTP multi-request, 8 request · **Frekuensi** 60 menit · **Biaya** ~2 req/15 mnt |
| **RA terisi** | `booking.type=train`, `payment.method=credit_card`, + seluruh RA booking/payment |

Struktur sama seperti `SYN-08`, dengan dua perbedaan:

1. Endpoint `/api/trains/search` dan `/api/trains/schedules/{id}/seats/available`.
2. **Harga tidak tersedia di respons search** — `TrainSchedule` tidak punya `fares`. Jadi `basePrice` harus di-hardcode wajar (mis. `350000`) lalu dilewatkan ke `/api/pricing/calculate`, persis seperti yang dilakukan UI.

> **Sebarkan `payment_method` antar ketiga journey** (`ewallet` / `bank_transfer` / `credit_card`). Tile "performa per metode pembayaran" butuh lebih dari satu nilai untuk berguna.

---

### 3.4 Kelompok D — Browser monitor single-URL

| ID | URL | Frekuensi | API req | Assert konten |
|----|-----|-----------|---------|---------------|
| `SYN-11` | `http://ticketing-app.local/` | 15 mnt | 0 | Elemen navigasi utama tampil |
| `SYN-12` | `/flights` | 15 mnt | 2 | Ada baris jadwal, bukan skeleton kosong |
| `SYN-13` | `/trains` | 15 mnt | 2 | idem |
| `SYN-14` | `/hotels` | 15 mnt | 1 | Ada kartu hotel |

⚠️ **Selalu tambahkan validasi konten, bukan sekadar HTTP 200.** Aplikasi ini SPA — halaman yang gagal memuat data tetap membalas `200` dengan shell kosong, dan monitor akan hijau padahal user melihat halaman rusak.

⚠️ **Jangan andalkan browser monitor sebagai pengganti data user asli.** Dynatrace menandai trafik synthetic secara terpisah, dan pada banyak konfigurasi RUM ia **dikecualikan** dari user session. Cek dulu di *Web application settings → bot/synthetic exclusion*. Yang **pasti** dihasilkan browser monitor adalah trafik server-side lengkap (service, trace, request attribute) — itu tetap bernilai penuh untuk tujuan dokumen ini.

---

### 3.5 Kelompok E — Browser clickpath

#### `SYN-15` · Booking pesawat end-to-end

| | |
|---|---|
| **Frekuensi** 30 menit · **API req** ~12 · **Biaya** ~6 req/15 mnt |

| # | Langkah | Selector / aksi | Validasi |
|---|---------|-----------------|----------|
| 1 | Buka `/login` | — | Form tampil |
| 2 | Isi email | `#email` ← credential vault | — |
| 3 | Isi password | `#password` ← credential vault | — |
| 4 | Submit | `button[type="submit"]` | Redirect keluar dari `/login` |
| 5 | Ke `/flights` | navigasi | Form search tampil |
| 6 | Isi asal/tujuan/tanggal | field search | — |
| 7 | Submit search | tombol search | **Ada minimal 1 hasil** |
| 8 | Pilih jadwal → buka modal booking | klik kartu | Modal terbuka |
| 9 | Isi nama penumpang, pilih kelas | field modal | — |
| 10 | Submit booking | tombol konfirmasi | Redirect ke `/bookings` |
| 11 | Buka booking teratas | klik baris | Terlihat pola `BK-` |
| 12 | Lanjut ke pembayaran | tombol bayar | Halaman `/payment/:id` |
| 13 | Pilih metode, bayar | pilih + tombol | Teks sukses tampil |

#### `SYN-16` · Booking hotel end-to-end

`/hotels` → search kota → klik hotel → `/hotels/:id` → pilih tipe kamar → isi tamu → booking → bayar. Frekuensi 60 menit.

#### `SYN-17` · Riwayat & pembatalan

login → `/bookings` → buka satu booking → cancel. Frekuensi 60 menit. **Sekaligus berfungsi sebagai pembersih** untuk booking yang tertinggal dari monitor lain.

#### `SYN-18` · Halaman dashboard & coming-soon

login → `/dashboard` → `/ships` → `/buses`. Frekuensi 60 menit, sangat murah (0 panggilan API), memastikan rute-rute sepi tidak diam-diam rusak.

---

### 3.6 Kelompok F — Jalur error → mengisi `ticketing.error.code`

Ketiganya memakai **expected status code** di konfigurasi monitor, supaya "merah" berarti perilaku aplikasi berubah — bukan monitor yang salah rancang.

#### `SYN-19` · Penjaga regresi `/api/search/*`

| | |
|---|---|
| **Tipe** HTTP, 1 request · **Frekuensi** 30 menit · **Biaya** 1 req |

```
GET /api/search/flights?from=CGK&to=DPS&date={travelDate}&adults=2&children=1
```

Endpoint ini sempat membalas **500** selama berbulan-bulan karena salah path di gateway (lihat [Bagian 8](#8-hal-yang-belum-terverifikasi)). Sudah diperbaiki, jadi **set expected `200`** dan assert `results` tidak kosong — monitor ini kini berfungsi sebagai penjaga agar regresi yang sama tidak lolos lagi tanpa terdeteksi.

Nilainya ganda: RA `route.origin`, `route.destination`, `travel.date`, `pax.adults`, `pax.children` tertangkap dari query parameter **terlepas dari status responsnya** — OneAgent membacanya di request masuk. Jadi meski endpoint ini kembali gagal, datanya tetap mengalir dan `ticketing.error.code` ikut terisi.

Prasyarat sudah terpenuhi: gateway `v1.1.2` aktif sejak 2026-08-04.

#### `SYN-20` · Kredensial & resource tidak valid

| | |
|---|---|
| **Tipe** HTTP, 3 request · **Frekuensi** 30 menit · **Biaya** 3 req |

| # | Request | Expected |
|---|---------|----------|
| 1 | `POST /api/auth/login` dengan password salah | `401` |
| 2 | `GET /api/flights/search?originName=ZZZ&destinationName=YYY&date={travelDate}` | `404` `airport_not_found` |
| 3 | `GET /api/flights/search?originName=CGK&destinationName=DPS&date=13-08-2026` | `400` `invalid_date` |

Ketiganya memvalidasi bahwa **penanganan error masih berfungsi** — kelas bug yang tidak akan pernah terdeteksi monitor happy-path.

#### `SYN-21` · Pembayaran gagal terkendali

| | |
|---|---|
| **Tipe** HTTP multi-request, 4 request · **Frekuensi** 60 menit · **Biaya** ~1 req/15 mnt |

login → buat booking → `POST /api/payments` dengan **`amount: 0`** → cancel booking.

Karena `processPayment` menolak `amount <= 0` secara deterministik (`payment_service.go:109-117`), ini menghasilkan `ticketing.payment.status = failed` yang **terkendali dan berulang**, sehingga tile "rasio pembayaran gagal" punya baseline nyata dan bisa diberi alert threshold. Expected status: `200` dengan body `status = failed`.

---

## 4. Data Uji yang Valid (terverifikasi live)

> ⚠️ **Jangan memakai `seed_catalog_rich.sql` sebagai sumber kebenaran.** Diverifikasi ke cluster pada 2026-08-04: data live adalah **superset** dari file seed, dan sebagian **namanya berbeda**. Penyebabnya seed lama (`seed_train_data.sql` / `seed_data_hotels.sql`) sudah lebih dulu mengisi tabel, lalu `seed_catalog_rich.sql` memakai `ON CONFLICT (code) DO NOTHING` sehingga nama yang sudah ada dipertahankan.
>
> | Entitas | File seed | **Live** | Selisih |
> |---------|-----------|----------|---------|
> | Bandara | 22 | **22** | ✅ sama persis |
> | Stasiun | 14 | **26** | ⚠️ nama berbeda — `GMR` = "Gambir **Station**", bukan "Gambir" |
> | Hotel | 15 | **31** | ⚠️ ada kota tambahan: Bali, Bogor, Jakarta Selatan |
>
> Ini persis kelas kesalahan yang membuat monitor **hijau tapi kosong**: nama yang tidak cocok mengembalikan `[]` atau `400`, bukan error yang jelas. Karena itu setiap monitor search **wajib** meng-assert "hasil tidak kosong".

**Rotasi nilai-nilai ini** supaya tile "rute terpopuler" / "kota terlaris" tidak berisi satu baris saja.

**Bandara (22, kode IATA)** — sama antara seed dan live (`seed_catalog_rich.sql:59-81`):

```
CGK HLP DPS SUB YIA SOC SRG BDO KNO PDG PLM PKU BTH UPG BPN BDJ PNK LOP MDC DJJ KOE BTJ
```

**Rute penerbangan yang benar-benar punya jadwal** — pakai pasangan ini, jangan kombinasi acak:

| Asal → Tujuan | Contoh nomor penerbangan |
|---------------|--------------------------|
| CGK ↔ DPS | GA-402, QG-680, JT-016, ID-104 |
| CGK ↔ SUB | GA-312, JT-560, QG-620 |
| CGK ↔ KNO | GA-180, JT-306 |
| CGK ↔ UPG | GA-608, JT-796 |
| CGK ↔ BPN | GA-510, SJ-260 |
| CGK ↔ PDG / PLM / PKU / BTH | GA-160, QG-360, JT-292, QG-940 |
| CGK ↔ SRG / YIA | GA-232, QG-140 |

**Stasiun (26, live 2026-08-04)** — ⚠️ **pakai `code`, bukan `name`.** Nama di live berbeda dari file seed dan mudah salah tulis; kode selalu cocok.

| Kode | Nama (live) | Kota |
|------|-------------|------|
| BD | Bandung | Bandung |
| BDG | Bandung Station | Bandung |
| BKS | Bekasi | Bekasi |
| BOO | Bogor | Bogor |
| BWI | Banyuwangi Kota | Banyuwangi |
| CKP | Cikampek | Karawang |
| CLP | Cilacap | Cilacap |
| CN | Cirebon | Cirebon |
| **GMR** | **Gambir Station** ⚠️ | Jakarta |
| JR | Jember | Jember |
| KD | Kediri | Kediri |
| KTA | Kutoarjo | Purworejo |
| LPN | Lempuyangan | Yogyakarta |
| ML | Malang Kota Baru ⚠️ | Malang |
| MN | Madiun | Madiun |
| PB | Probolinggo | Probolinggo |
| PDL | Padalarang | Bandung Barat |
| PSE | Pasar Senen | Jakarta |
| PWT | Purwokerto | Purwokerto |
| SB | Surabaya Gubeng | Surabaya |
| SGU | Surabaya Pasarturi | Surabaya |
| SLO | Solo Balapan | Surakarta |
| SMT | Semarang Tawang | Semarang |
| SRD | Serang | Serang |
| TGL | Tegal | Tegal |
| **YK** | **Yogyakarta Station** ⚠️ | Yogyakarta |

Resolusi nama menerima `name`, `city`, **atau** `code` (`TrainServiceClient.resolveStationNameToId`), tapi memakai `findFirst()` pada daftar yang diurutkan — jadi **nama kota yang dimiliki lebih dari satu stasiun bisa resolve ke stasiun yang tidak kamu maksud** (mis. `Jakarta` → GMR, `Yogyakarta` → LPN). Pakai kode untuk hasil deterministik.

Rute kereta yang **terverifikasi mengembalikan data**: `GMR` → `YK`.

**Kota hotel (31 hotel, live 2026-08-04)**:

| Kota | Jumlah hotel |
|------|:------------:|
| Jakarta | 7 |
| Yogyakarta | 5 |
| Surabaya | 4 |
| Bandung | 3 |
| Bali ⚠️ *(tidak ada di file seed)* | 3 |
| Denpasar | 2 |
| Semarang | 2 |
| Bogor ⚠️ | 1 |
| Jakarta Selatan ⚠️ | 1 |
| Makassar | 1 |
| Malang | 1 |
| Surakarta | 1 |

> Perhatikan `Bali` dan `Denpasar` adalah dua kota terpisah di data ini, dan `Jakarta Selatan` terpisah dari `Jakarta`. Pencarian `city=Jakarta` **tidak** akan mengembalikan hotel di `Jakarta Selatan`.

**Tipe kamar** (semua hotel punya ketiganya) — `seed_catalog_rich.sql:350-353`:

| Nama | Kapasitas | Harga dasar |
|------|-----------|-------------|
| Standard | 2 | 650.000 |
| Deluxe | 2 | 1.050.000 |
| Suite | 4 | 2.200.000 |

**Konvensi nilai** (penting — beberapa query JPQL membandingkan case-sensitive):

- Status & kelas selalu **huruf kecil**: `available`, `economy`, `business`, `executive`, `first`
- Mata uang: `IDR`
- Horizon jadwal: **30 hari ke depan**, rolling

---

## 5. Jadwal & Anggaran Rate Limit

Asumsi: **satu private location, satu ActiveGate, satu IP** → plafon 100 request / 15 menit.

| Monitor | Tipe | Frekuensi | req/run | req per 15 mnt |
|---------|------|-----------|---------|----------------|
| SYN-01 gateway & frontend | HTTP | 5 mnt | 0 (exempt) | **0** |
| SYN-02 health per-service | HTTP | 5 mnt | 0 (internal) | **0** |
| SYN-03 katalog referensi | HTTP | 15 mnt | 4 | 4 |
| SYN-04 search pesawat | HTTP | 15 mnt | 2 | 2 |
| SYN-05 search kereta | HTTP | 15 mnt | 2 | 2 |
| SYN-06 search hotel | HTTP | 15 mnt | 2 | 2 |
| SYN-07 pricing & kupon | HTTP | 15 mnt | 2 | 2 |
| SYN-08 journey pesawat | HTTP | 30 mnt | 9 | 5 |
| SYN-09 journey hotel | HTTP | 60 mnt | 7 | 2 |
| SYN-10 journey kereta | HTTP | 60 mnt | 8 | 2 |
| SYN-11…14 browser single-URL | Browser | 15 mnt | 5 total | 5 |
| SYN-15 clickpath pesawat | Browser | 30 mnt | 12 | 6 |
| SYN-16 clickpath hotel | Browser | 60 mnt | 10 | 3 |
| SYN-17 clickpath cancel | Browser | 60 mnt | 4 | 1 |
| SYN-18 clickpath dashboard | Browser | 60 mnt | 1 | 1 |
| SYN-19 regresi search | HTTP | 30 mnt | 1 | 1 |
| SYN-20 jalur error | HTTP | 30 mnt | 3 | 2 |
| SYN-21 pembayaran gagal | HTTP | 60 mnt | 4 | 1 |
| **Total** | | | | **≈ 41 / 100** |

Menyisakan ~59% headroom untuk pemakaian manual, demo, dan retry. Kalau nanti kamu menambah private location kedua, anggarannya **tidak** berlipat otomatis — tiap location punya IP sendiri, jadi tiap location punya jatah 100 sendiri, tapi pembagian mana monitor jalan di mana tidak selalu bisa dipastikan.

Volume yang dihasilkan per hari:

| Metrik | Perkiraan |
|--------|-----------|
| Request bisnis (bawa RA) ke gateway | ~3.900/hari |
| Booking dibuat & dibatalkan | ~110/hari |
| Payment (succeeded) | ~86/hari |
| Payment (failed, terkendali) | ~24/hari |
| Browser session | ~200/hari |

Bandingkan dengan kondisi sekarang: **±90 panggilan API bisnis dalam 7 hari.** Ini lompatan sekitar 300×.

---

## 6. Efek Samping & Housekeeping

| Risiko | Kenapa penting | Penanganan |
|--------|----------------|------------|
| **Booking & payment menumpuk** | `SYN-08/09/10/21` membuat baris baru tiap run — ~3.300 booking/bulan | Setiap journey **wajib** diakhiri `POST /api/bookings/{id}/cancel`. Tambahkan cron pembersih baris milik `user_id` synthetic yang lebih tua dari 7 hari |
| **Kursi terkunci permanen** | Booking pesawat/kereta mengalokasikan kursi; tanpa cancel, inventori jadwal habis dan search jadi kosong | Langkah cancel bersifat wajib, bukan opsional. `CancelBooking` melepas kembali kursi (`booking_service.go:289-332`) |
| **Kontensi seat lock** | Dua journey pada jadwal sama → `seat_lock_conflict` | Beri rute berbeda per monitor + stagger frekuensi (30/45/60), lihat [1.5](#15-seat-lock-redis--jangan-saling-menabrak) |
| **Metrik bisnis tercemar** | Revenue, jumlah booking, dan Apdex di dashboard akan bercampur angka palsu | Semua trafik synthetic memakai satu akun → filter/kecualikan lewat RA `ticketing.user.id` pada tile bisnis. Dokumentasikan `user_id`-nya di dashboard |
| **`ticketing.client.ip` didominasi IP ActiveGate** | Analisis abuse jadi bias | Wajar dan tidak perlu diperbaiki — cukup diingat saat investigasi |
| **Kredensial bocor** | Password tersimpan di konfigurasi monitor | Wajib pakai Credential Vault. Akun synthetic **jangan** diberi hak admin |
| **Endpoint tulis admin** | `POST /api/admin/{flights,trains,hotels}` mengubah katalog | ⛔ Sengaja **tidak** dimasukkan ke katalog monitor mana pun |
| **`POST /api/auth/register`** | Menambah baris `users` selamanya | Tidak ada di monitor rutin. Kalau ingin tetap menguji alur register, jalankan **1×/hari** dengan email ber-timestamp dan siapkan pembersihnya |
| **Notifikasi ikut terpicu** | `notification-service` mungkin mengirim pesan tiap booking | Verifikasi channel-nya tidak mengarah ke tujuan nyata sebelum menyalakan Kelompok C |

---

## 7. Urutan Pengerjaan

Kerjakan bertahap — buktikan tiap lapisan sebelum menambah yang berikutnya.

| # | Langkah | Tujuan | Berhenti kalau |
|---|---------|--------|----------------|
| 1 | Siapkan private location + hosts entry | — | — |
| 2 | Buat `SYN-01`, tunggu 2 siklus | Membuktikan ActiveGate benar-benar bisa menjangkau aplikasi | Gagal → masalah jaringan/DNS, jangan lanjut |
| 3 | Buat akun synthetic + simpan di Credential Vault | — | — |
| 4 | Buat `SYN-03` … `SYN-07` | 5 monitor, ~15 menit kerja, langsung mengisi 12 RA Batch A | — |
| 5 | Cek UI: service `api-gateway` → **Analyze requests** → filter `ticketing.route.origin` | **Gerbang validasi.** Nilai `CGK`/`DPS` harus muncul dalam ~5 menit | Tidak muncul → periksa scope RA sebelum membuat monitor lain |
| 6 | Buat `SYN-08` | Journey penuh pertama; ini yang menghidupkan bagian bisnis dashboard | — |
| 7 | Cek `ticketing.booking.reference` & `ticketing.payment.method` di UI | Membuktikan RA Batch B (jalur `RESPONSE_HEADER`) bekerja | — |
| 8 | Tambahkan `SYN-09`, `SYN-10`, lalu Kelompok D, E, F | Melengkapi cakupan | — |
| 9 | Buat SLO & alert di atas monitor yang sudah stabil | Ubah trafik jadi sinyal | — |

Setelah semua stabil, dashboard `deployments/dynatrace/dashboards/ticketing-ux-business.yaml` bagian 1 & 2 akan terisi tanpa perlu diubah — tile-nya sudah menunjuk ke request attribute yang tepat.

---

## 8. Hal yang Belum Terverifikasi

Bagian ini sengaja dipisah supaya tidak ada klaim yang terlihat lebih pasti dari kenyataannya.

### Sudah diselesaikan (verifikasi cluster 2026-08-04)

| # | Hal | Hasil |
|---|-----|-------|
| 1 | **Port `profile-service`** | ✅ **Terkonfirmasi rusak, sudah diperbaiki.** Dari pod gateway: `profile-service:8090` → *timeout*, `profile-service:8085` → `{"status":"UP"}`. Karena default aplikasi (`application.yaml:18`), ConfigMap, `config.js:54`, dan `docker-compose.yml` semuanya menyebut **8090**, yang salah adalah deployment-nya. `deployments/07-profile-service.yaml` disetel ulang ke 8090 (env, containerPort, kedua probe, port Service) lalu di-apply — endpoint kini `10.244.126.7:8090`, health `{"status":"UP"}` dari gateway |
| 2 | **`GET /api/search/flights` 500** | ✅ **Selesai & ter-rollout.** Bukan bug pricing-service: `SearchController` dipetakan ke `@RequestMapping("/api/search")`, sedangkan gateway memanggil `/search/flights` → Spring jatuh ke static resource handler → `NoResourceFoundException` yang di-render sebagai **500**. Diperbaiki di `api-gateway/routes/search.js` (3 path), dirilis sebagai **`malikvti/api-gateway:v1.1.2`** (2 pod Running). Terverifikasi lewat gateway: `flights`, `trains` (`GMR`→`YK`), dan `hotels` semuanya `200` + data, dan header `X-DT-Operation` masih terpasang (middleware request attribute tidak regresi) |

### Masih terbuka

| # | Hal | Status | Cara membuktikan |
|---|-----|--------|------------------|
| 3 | Apakah RUM mengecualikan trafik synthetic di tenant ini | Belum dicek | Web application settings → bot/synthetic exclusion, lalu bandingkan jumlah session sebelum/sesudah `SYN-11` menyala |
| 4 | Apakah `notification-service` mengirim ke tujuan nyata saat booking dibuat | Belum ditelusuri | Baca konfigurasi channel-nya sebelum Kelompok C dinyalakan |
| 5 | Ketersediaan Redis untuk seat lock | Kode menangani kegagalan Redis secara *graceful degrade* (`booking_service.go:66-68`) | Kalau Redis mati, lock dilewati diam-diam — tidak menggagalkan monitor, tapi kontensi jadi tidak terdeteksi |
| 6 | **Parameter wajib yang hilang dibalas `500`, bukan `400`** — mis. `/api/search/hotels` tanpa `checkin` menghasilkan `Unexpected error: Required request parameter 'checkin' ... is not present` | Ditemukan 2026-08-04, belum diperbaiki | `GlobalExceptionHandler` di pricing-service perlu memetakan `MissingServletRequestParameterException` ke `400`. Tidak memblokir synthetic, tapi membuat alert salah klasifikasi |
| 7 | **Kelima HPA tidak berfungsi** — `metrics-server` tidak terpasang di cluster, sehingga `api-gateway`, `booking`, `flight`, `payment`, `train` semuanya menampilkan `cpu: <unknown>/70%` dan tidak pernah menskala | Ditemukan 2026-08-04, kondisi lama (bukan akibat perubahan hari ini) | Jangan berharap trafik synthetic memicu autoscaling — tidak akan. Kalau ingin menguji perilaku scale-out, pasang `metrics-server` lebih dulu |

`SYN-22` (opsional, 1 request, 60 menit): `GET /api/profile` dengan Bearer, expected `200` — sekarang berfungsi sebagai penjaga regresi agar port profile tidak kembali melenceng.

---

## Lampiran A — Snippet Script Dynatrace

### A.1 Menghitung tanggal dinamis

Pre-execution script (level monitor, jalan sekali sebelum request pertama):

```javascript
// Tanggal keberangkatan: 3 hari dari sekarang (aman di dalam horizon 30 hari)
var depart = new Date(Date.now() + 3 * 86400000);
api.setValue('travelDate', depart.toISOString().slice(0, 10));

// Hotel: check-in 3 hari lagi, check-out 5 hari lagi
var checkout = new Date(Date.now() + 5 * 86400000);
api.setValue('checkin',  depart.toISOString().slice(0, 10));
api.setValue('checkout', checkout.toISOString().slice(0, 10));
```

Rujuk di URL sebagai `{travelDate}`, `{checkin}`, `{checkout}`.

### A.2 Rotasi nilai parameter

```javascript
// Rute penerbangan yang dijamin punya jadwal di seed
var routes = [
  ['CGK','DPS'], ['CGK','SUB'], ['CGK','KNO'], ['CGK','UPG'],
  ['CGK','BPN'], ['CGK','PDG'], ['CGK','SRG'], ['DPS','CGK']
];
var r = routes[Math.floor(Math.random() * routes.length)];
api.setValue('origin', r[0]);
api.setValue('destination', r[1]);

// Kota hotel yang benar-benar ter-seed
var cities = ['Jakarta','Bandung','Yogyakarta','Denpasar','Surabaya',
              'Semarang','Surakarta','Malang','Makassar'];
api.setValue('hotelCity', cities[Math.floor(Math.random() * cities.length)]);
```

### A.3 Ekstraksi nilai dari respons

Post-execution script, dipasang **per request**:

```javascript
var body = JSON.parse(api.getResponseBody());

// Setelah login
api.setValue('token',  body.access_token);
api.setValue('userId', body.user.id);

// Setelah search penerbangan — sekaligus jaga-jaga kalau seed kedaluwarsa
if (!Array.isArray(body) || body.length === 0) {
  api.fail('Search penerbangan mengembalikan 0 hasil — seed katalog kemungkinan kedaluwarsa');
}
api.setValue('scheduleId', body[0].id);
api.setValue('basePrice',  body[0].fares[0].basePrice);

// Setelah membuat booking
api.setValue('bookingId',  body.id);
api.setValue('bookingRef', body.booking_reference);
api.setValue('amount',     body.total_amount);
```

### A.4 Header untuk request terproteksi

```
Authorization: Bearer {token}
Content-Type: application/json
```

Kalau memakai opsi B di [1.1](#11-reachability--private-location-wajib), tambahkan:

```
Host: ticketing-app.local
```

---

## Lampiran B — Referensi Kode

| Fakta di dokumen ini | Sumber |
|----------------------|--------|
| Host & routing ingress | `deployments/13-ingress.yaml:17-34` |
| Rate limit 100/15 mnt | `api-gateway/config/config.js:67-71`, `api-gateway/server.js:36-48` |
| `/api/health` bebas limit | `api-gateway/server.js:29-33,45` |
| Middleware RA dipasang setelah health | `api-gateway/server.js:81-87` |
| Aturan pemasangan header `X-DT-*` | `api-gateway/middleware/dtAttributes.js:55-82` (fungsi `enrich`) — cabang booking di `:65`, cabang payment di `:76` |
| Daftar rute gateway | `api-gateway/routes/index.js:23-33` + berkas per-domain |
| Validasi tanggal & nama | `api-gateway/utils/validators.js`, dipakai di `flights.js:79-96` |
| Bentuk respons & enum | `frontend/src/services/api.ts:104-663` |
| Rute & proteksi frontend | `frontend/src/App.tsx:28-97` |
| Selector form login | `frontend/src/pages/Login.tsx:41-64` |
| Payload booking pesawat | `frontend/src/pages/Flights.tsx:283-296` |
| Payload booking hotel | `frontend/src/pages/HotelDetail.tsx:133-152` |
| Payload payment | `frontend/src/pages/Payment.tsx:60-65` |
| Validasi `CreateBookingRequest` | `backend/booking-service/models/booking.go:46-57` |
| Seat lock & `seat_lock_conflict` | `backend/booking-service/service/booking_service.go:61-84` |
| Format `BK-XXXXXXXX` | `backend/booking-service/service/booking_service.go:440-450` |
| Aturan cancel booking | `backend/booking-service/service/booking_service.go:289-332` |
| Payment selalu sukses bila amount > 0 | `backend/payment-service/service/payment_service.go:109-127` |
| Aturan refund | `backend/payment-service/service/payment_service.go:87-107` |
| Field register/login | `backend/authentication-service/models/user.go:20-48` |
| URL & port service internal | `deployments/02-configmap.yaml:7-16` + Service di tiap deployment |
| Data katalog & horizon 30 hari | `database/scripts/seed_catalog_rich.sql` |
| Definisi 22 request attribute | `deployments/dynatrace/request-attributes/ra-01..ra-22*.json` |
| Latar belakang & kendala RA | `docs/DYNATRACE-REQUEST-ATTRIBUTES.md` |
| Riwayat masalah observability | `docs/OBSERVABILITY-RCA-2026-07-27.md` |
