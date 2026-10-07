# Logging ticketing-app → BindPlane → Dynatrace: Inventaris & Analisis Korelasi

> Tanggal pemeriksaan: **2026-10-07** · Cluster: `k8s-cluster-dev` (context `kubernetes-admin@kubernetes`) · Namespace: `ticketing-app`
> Tenant Dynatrace: `pxo94309.live.dynatrace.com` (SaaS)

## 1. Ringkasan

| Pertanyaan | Jawaban singkat |
|---|---|
| Apakah tiap service punya log sendiri? | **Ya.** Ke-12 komponen menulis log ke stdout/stderr container dan semuanya bisa diambil dari `/var/log/pods/...` di node. Tapi **format dan isinya belum seragam** (lihat §2). |
| Apakah log sudah di-forward? | **Sudah ada forwarder** di namespace `bindplane-logging` (umur ~7 hari): DaemonSet OTel Collector yang mengirim **semua** log container + log OS + event k8s via **syslog UDP RFC3164** ke `10.100.33.105:5140`. |
| Apakah bisa dikorelasikan di Dynatrace? | **Saat ini praktis belum bisa** untuk korelasi log↔trace. Penyebab utama: (1) **tidak ada satu pun pod yang benar-benar ter-instrumentasi OneAgent saat ini** (mount CSI kosong / pod tidak ter-inject), (2) **0 baris log berisi trace ID**, (3) jalur syslog RFC3164 menghilangkan atribut terstruktur. Korelasi **berbasis topologi** (namespace/pod/container) **bisa** asal atribut k8s di-parse di Dynatrace. Detail & perbaikan di §4–§6. |

---

## 2. Inventaris log per komponen

| Komponen | Bahasa / framework | Library log | Format yang benar-benar keluar di cluster | Log per-request? | Trace ID di log? |
|---|---|---|---|---|---|
| `frontend` | React + nginx | nginx access log default | **Teks** (combined) — `10.100.33.95 - - [..] "GET / HTTP/1.1" 200 ... "kube-probe/1.30"` | Ya (access log) | ❌ |
| `api-gateway` | Node.js / Express 5 | `pino` (`api-gateway/utils/logger.js`) | **JSON** — `{"level":30,"time":..,"method":"GET","path":"/search","status":200,"durationMs":10,"msg":"request"}` | Ya (`server.js:66`) | ❌ (komentar di kode mengandalkan OneAgent, tapi pod tidak ter-inject) |
| `authentication-service` | Go / Gin | `log/slog` JSON + `log.Printf` (di-route ke slog) **+ Gin access log teks** | **Campuran**: app log JSON (`{"time":..,"level":"INFO","msg":..}`), access log teks `[GIN] 2026/10/07 - 03:20:53 \| 200 \| ...` | Ya (Gin, teks) | ❌ |
| `booking-service` | Go / Gin | idem | idem | idem | ❌ |
| `payment-service` | Go / Gin | idem | idem | idem | ❌ |
| `notification-service` | Go / Gin | idem | idem | idem | ❌ |
| `hotel-service` | Go / Gin | idem | idem | idem | ❌ |
| `admin-service` | Java / Spring Boot | Logback + `logstash-logback-encoder` (`logback-spring.xml`) | **JSON** — `{"@timestamp":..,"message":..,"logger_name":..,"thread_name":..,"level":"INFO"}` | ❌ hampir tidak ada (hanya startup) | ❌ |
| `flight-service` | Java / Spring Boot | idem | idem | ❌ | ❌ |
| `train-service` | Java / Spring Boot | idem | idem | ❌ | ❌ |
| `pricing-service` | Java / Spring Boot | idem | idem | ❌ | ❌ |
| `profile-service` | Java / Spring Boot | idem | idem | ❌ | ❌ |

### Catatan per kelompok

**Go (5 service)**
- `slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, ...)))` di `main.go` → `log.Printf` ikut keluar sebagai JSON (Go ≥1.21). Bagus.
- Tapi router memakai `gin.Default()` (mis. `backend/booking-service/routes/routes.go:26`) → access log **teks Gin** + mode **debug** (`[GIN-debug] Running in "debug" mode`). Jadi satu container mengeluarkan 2 format.
- Pemanggilan slog tidak memakai context (`slog.InfoContext(ctx, ...)`), tidak ada field `request_id`/`trace_id`/`booking_id`.
- **Volume**: di container aktif, `booking-service` = 38.130 baris, **100 % health probe**; `hotel-service` 54.032 baris, 99,6 % health probe. Baris startup JSON sudah ter-rotate (hanya terlihat di `--previous`).

**Java (5 service)**
- `LogstashEncoder` otomatis menyertakan MDC → secara desain field `dt.trace_id`/`dt.span_id` dari OneAgent akan muncul **tanpa ubah kode** — *jika* OneAgent benar-benar termuat (saat ini tidak, lihat §3.3).
- Service ini hampir tidak menulis log aplikasi per-request (hanya ~24–42 baris sejak start). Walau enrichment jalan, tidak ada log bisnis yang bisa dikorelasikan.

**Node.js (api-gateway)**
- Satu-satunya komponen dengan log request terstruktur yang konsisten. Tidak ada `traceId`/`requestId` di field.

**Frontend (nginx)**
- `nginx.conf` tidak mendefinisikan `log_format` → format combined default; ~99,7 % baris adalah `kube-probe`.

---

## 3. Kondisi di Kubernetes cluster

### 3.1 Forwarder log yang sudah terpasang (`bindplane-logging`)

| Resource | Image | Fungsi |
|---|---|---|
| DaemonSet `log-forwarder-agent` (4 pod, 1 per node) | `otel/opentelemetry-collector-contrib:0.122.1` | `filelog` dari `/var/log/pods/*/*/*.log` (semua namespace kecuali `bindplane-logging`), `/var/log/messages`, `/var/log/secure`, `/var/log/audit/audit.log`, audit kube-apiserver |
| Deployment `log-forwarder-events` (1 pod) | idem | `k8sobjects` watch **Kubernetes Events** |

Pipeline (ConfigMap `log-forwarder-agent`):

```
filelog/containers (container parser, add_metadata_from_filepath)
  → memory_limiter → resource/node (k8s.node.name)
  → transform/container:
       attributes.hostname = k8s.node.name
       attributes.appname  = k8s.container.name
       priority 134 (stdout) / 131 (stderr)
       body = String({"k8s.namespace.name", "k8s.pod.name", "k8s.container.name",
                      "k8s.node.name", "log.iostream", "log": <baris asli>})
  → batch
  → exporter syslog  udp://10.100.33.105:5140  protocol rfc3164
```

Konsekuensi untuk korelasi:
1. **RFC3164 hanya membawa `hostname`, `appname`, `priority`, dan teks pesan.** Semua resource/log attributes OTel (`k8s.*`, `log.iostream`, dll.) **hilang** sebagai atribut; yang tersisa hanya di dalam string JSON di body.
2. Baris log asli yang sudah JSON (pino/slog/logstash) jadi **JSON di-escape di dalam JSON** (`"log":"{\"level\":30,...}"`) → perlu parsing 2 lapis di BindPlane/OpenPipeline sebelum field seperti `trace_id` bisa dipakai.
3. **UDP** = tanpa jaminan sampai; banyak receiver syslog juga memotong pesan RFC3164 (umumnya 1–2 KB, kadang 8 KB), padahal body dibatasi di 32.000 karakter. Stack trace Java panjang berisiko terpotong/hilang.
4. `appname` = nama container (bukan service/workload), `hostname` = node — cukup untuk filter kasar, tidak cukup untuk topologi Dynatrace.
5. `10.100.33.105` berada di luar node cluster (`.93–.96`) — diasumsikan VM BindPlane/collector gateway. Konfigurasi sisi gateway → Dynatrace **belum diperiksa** (tidak ada di repo).

### 3.2 Dynatrace Operator / DynaKube

- DynaKube `k8s-cluster-dev`: mode **`cloudNativeFullStack`**, `metadataEnrichment.enabled: true`, **`logMonitoring: {}` (aktif)**.
- Namespace `ticketing-app` ter-label `dynakube.internal.dynatrace.com/instance=k8s-cluster-dev` (masuk scope injeksi). Tidak ada anotasi opt-out di Deployment.
- File enrichment ada di pod ter-inject: `/var/lib/dynatrace/enrichment/dt_metadata.json` berisi `k8s.cluster.uid`, `k8s.namespace.name`, `k8s.pod.name`, `k8s.workload.name`, `dt.entity.kubernetes_cluster`, dll.

> ⚠️ `logMonitoring` aktif berarti **OneAgent juga kemungkinan sudah meng-ingest log container yang sama** langsung ke Dynatrace. Jika jalur BindPlane juga mengirim ke Dynatrace → **log ganda** (biaya ×2, query membingungkan). Harus diputuskan satu jalur (lihat §5). Belum bisa diverifikasi karena token `dtctl` mendapat `NOT_AUTHORIZED_FOR_TABLE` untuk tabel `logs`.

### 3.3 Status instrumentasi OneAgent di pod ticketing-app (temuan kritis)

| Pod | Init `dynatrace-operator` | `LD_PRELOAD` | Library di `/opt/dynatrace/oneagent-paas` | OneAgent di `/proc/1/maps` |
|---|---|---|---|---|
| admin, booking(psnh2), flight(txdbq), frontend(rmlk8), notification(fqrwl), pricing(c67dr), profile(×2), train(p9tc6), auth(48rrw) | ✅ | ✅ di-set | ❌ **direktori kosong** | ❌ 0 |
| api-gateway (×2), payment (×2), hotel, auth(b28hc), booking(q5lhw), flight(bhdkq), frontend(bpd6b), notification(hxf56), pricing(dqdnz), train(n7lpl) | ❌ tidak ter-inject | ❌ | – | ❌ 0 |

Penjelasan:
- Semua pod app restart ~16 hari lalu (bersamaan dengan restart CSI driver di `k8s-worker1`) → kemungkinan reboot node. Container di-restart **dalam pod lama**, bind-mount CSI `oneagent-bin` sekarang menunjuk direktori kosong → `LD_PRELOAD` gagal diam-diam.
- Pod tanpa init container dibuat saat webhook Dynatrace tidak tersedia (webhook *fail-open*), jadi tidak pernah ter-inject.
- **Akibatnya: tidak ada trace PurePath dari ticketing-app saat ini, dan tidak ada yang bisa meng-inject trace context ke log.** Ini harus dibereskan dulu sebelum bicara korelasi log↔trace.

Perbaikan (belum dijalankan — butuh persetujuan):
```bash
kubectl rollout restart deploy -n ticketing-app
# verifikasi per pod (harus > 0):
kubectl exec -n ticketing-app <pod> -- sh -c 'grep -c oneagent /proc/1/maps'
```

---

## 4. Apa yang dibutuhkan Dynatrace untuk korelasi

| Jenis korelasi | Field yang dibutuhkan di record log | Kondisi sekarang |
|---|---|---|
| **Log ↔ Trace/Span** (tab *Logs* di distributed trace, "View trace" dari log) | `trace_id` (32 hex) dan `span_id` (16 hex) sebagai **atribut top-level** (OneAgent menulis `dt.trace_id`/`dt.span_id`; OpenPipeline/OTLP memetakan ke `trace_id`/`span_id`) | ❌ Tidak ada di log mana pun (0 baris dari ±400 rb baris dicek) |
| **Log ↔ Entitas/Topologi** (log muncul di halaman workload/pod/service) | `k8s.cluster.uid` atau `dt.entity.kubernetes_cluster`, `k8s.namespace.name`, `k8s.pod.name`/`k8s.pod.uid`, `k8s.container.name`, `k8s.workload.name`; idealnya `dt.entity.process_group_instance`/`dt.entity.service` | ⚠️ Ada sebagian, tapi **terkubur di string body syslog**; `k8s.cluster.uid`, `pod.uid`, `workload.name` tidak dikirim |
| **Log ↔ Bisnis** (cari semua log untuk satu booking) | ID bisnis konsisten, mis. `booking_id`, `payment_id`, `request_id` | ❌ Belum ada di log mana pun |

---

## 5. Rekomendasi arsitektur pipeline

```
Pod stdout ──► OTel/BindPlane Agent (DaemonSet) ──OTLP──► BindPlane Gateway ──OTLP/HTTP──► Dynatrace
               • filelog + container parser                 • routing/filter              /api/v2/otlp/v1/logs
               • k8sattributes (pod.uid, workload,          • (opsional) masking PII      (token: logs.ingest)
                 cluster.uid)
               • parse JSON body → attributes
               • angkat trace_id/span_id ke field top-level
               • drop health-probe
```

1. **Ganti exporter `syslog` → `otlp`/`otlphttp`** (agent → gateway BindPlane, gateway → Dynatrace OTLP). OTLP mempertahankan resource attributes, `TraceId`/`SpanId` native, TCP + retry. Jika syslog *wajib* (mis. ada SIEM), gunakan **RFC5424 over TCP** dan kirim body asli tanpa dibungkus ulang, lalu parse di OpenPipeline.
2. Tambah processor **`k8sattributes`** (butuh RBAC get/list/watch pods, replicasets, namespaces) agar ada `k8s.pod.uid`, `k8s.deployment.name`, `k8s.cluster.uid` → Dynatrace bisa menautkan ke entitas K8s. Set `k8s.cluster.uid = 3950f7d5-b27f-4ad7-b091-bf7a6933fc0c` agar cocok dengan cluster yang dipantau OneAgent.
3. **Parse JSON** body (`ParseJSON(body)`) untuk pino/slog/logstash; normalisasi `level`/`severity`; pindahkan `dt.trace_id`→`trace_id`, `dt.span_id`→`span_id` (atau set field OTLP `trace_id`/`span_id`).
4. **Buang log health probe** (`/health`, `/health/ready`, `kube-probe/`) di agent → memangkas >95 % volume Go/nginx (hemat biaya ingest Dynatrace).
5. **Hindari ingest ganda**: pilih salah satu
   - (a) BindPlane sebagai jalur resmi → nonaktifkan ingest log OneAgent untuk `ticketing-app` (Settings → Log Monitoring → *Log ingest rules*, exclude namespace), **tetapi tetap pertahankan OneAgent code module** untuk trace + enrichment trace_id ke log; atau
   - (b) OneAgent sebagai jalur Dynatrace, BindPlane hanya ke tujuan lain.
   Use case Anda = (a).

---

## 6. Gap per service & action item

| # | Prioritas | Item | Komponen | Detail |
|---|---|---|---|---|
| 1 | P0 | Pulihkan instrumentasi OneAgent | semua | `kubectl rollout restart deploy -n ticketing-app`; verifikasi `/proc/1/maps`. Tanpa ini trace tidak ada → korelasi trace mustahil. |
| 2 | P0 | Ubah pipeline BindPlane ke OTLP + k8sattributes + parse JSON | `bindplane-logging` + gateway | Lihat §5. |
| 3 | P0 | Putuskan jalur tunggal ingest ke Dynatrace | DynaKube / Settings | Hindari duplikasi dengan `logMonitoring` OneAgent. |
| 4 | P1 | Pastikan *log enrichment* OneAgent aktif & terverifikasi | Java, Node.js | Java+Logback (MDC → LogstashEncoder) seharusnya otomatis. Untuk pino perlu dicek setelah api-gateway ter-inject; jika tidak muncul, tambahkan `mixin` pino yang membaca trace context. |
| 5 | P1 | Go: log access sebagai JSON + trace context | auth, booking, payment, notification, hotel | Ganti `gin.Default()` → `gin.New()` + `gin.Recovery()` + middleware slog JSON; set `GIN_MODE=release`; tambahkan `trace_id` (dari header W3C `traceparent` yang dipropagasi OneAgent) dan `request_id`. **Dukungan auto-enrichment OneAgent untuk `log/slog` perlu diverifikasi** — jangan diasumsikan. |
| 6 | P1 | Java: tambah log aplikasi per-request/bisnis | admin, flight, train, pricing, profile | Saat ini hampir tidak ada log runtime; tambah log di controller/service (mis. hasil search, error ke DB) supaya ada yang bisa dikorelasikan. |
| 7 | P1 | Tambah ID bisnis konsisten | booking, payment, notification, api-gateway | `booking_id`, `payment_id`, `request_id` (propagasi `X-Request-ID` dari gateway). Jangan log PII (email, nomor kartu, token). |
| 8 | P2 | nginx: `log_format` JSON + `$http_traceparent`/`$request_id`, sembunyikan probe | frontend | `access_log off` untuk probe atau map `$http_user_agent ~ kube-probe`. |
| 9 | P2 | Hasilkan traffic nyata untuk validasi | – | Saat ini traffic hampir 100 % health probe; jalankan synthetic monitor (SYN-xx) / skenario booking untuk menguji korelasi. |
| 10 | P2 | Beri token `dtctl` scope `storage:logs:read` | Dynatrace | Agar ingest & korelasi bisa diverifikasi lewat DQL. |

---

## 7. Cara uji korelasi di Dynatrace (setelah P0 selesai)

```dql
// 1. Log ticketing-app masuk & dari jalur mana
fetch logs, from: now()-1h
| filter k8s.namespace.name == "ticketing-app"
| summarize n = count(), withTrace = countIf(isNotNull(trace_id)),
            by: { k8s.container.name, dt.openpipeline.source, log.source }
```

```dql
// 2. Ambil satu trace_id dari log, lalu cari span-nya
fetch logs, from: now()-1h
| filter k8s.namespace.name == "ticketing-app" and isNotNull(trace_id)
| fields timestamp, k8s.container.name, trace_id, span_id, content
| limit 20
```

```dql
// 3. Satu trace → semua log lintas service (bukti korelasi end-to-end)
fetch logs, from: now()-1h
| filter trace_id == "<trace_id dari query 2>"
| sort timestamp asc
| fields timestamp, k8s.container.name, loglevel, content
```

Kriteria lulus:
- [ ] Log ticketing-app hanya muncul **sekali** (satu `dt.openpipeline.source`).
- [ ] `withTrace > 0` untuk api-gateway, Java services, dan Go services yang menangani request bisnis.
- [ ] Dari UI *Distributed Tracing* → buka trace booking → tab **Logs** menampilkan log dari api-gateway → booking-service → payment-service.
- [ ] Dari halaman workload `booking-service` (Kubernetes app) → tab Logs menampilkan log (korelasi topologi).

---

## 8. Batasan pemeriksaan ini

- Sisi **BindPlane gateway (`10.100.33.105`)** dan konfigurasi tujuan Dynatrace-nya tidak diperiksa (tidak ada akses/konfigurasi di repo).
- **Data log di Dynatrace tidak bisa dibaca** (`NOT_AUTHORIZED_FOR_TABLE` pada token `dtctl`), jadi duplikasi ingest dan parsing OpenPipeline belum terverifikasi.
- Tidak ada perubahan yang dilakukan ke cluster; semua perbaikan di atas masih berupa rekomendasi.
