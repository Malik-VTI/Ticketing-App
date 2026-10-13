# Pola Log dari Kubernetes Cluster ke BindPlane

> Snapshot: **2026-10-13** · Cluster `k8s-cluster-dev` · Config forwarder: `deployments/bindplane/log-forwarder-agent-ticketing.yaml` (sudah aktif)
> Contoh pesan di bawah diambil dari log asli lewat *dry-run* collector (exporter `debug`, tanpa mengirim apa pun).
> Skema log aplikasi: [LOGGING-STANDARD.md](LOGGING-STANDARD.md).

## 1. Gambaran umum

```
                         ┌── logs/app ─────────────────────┐  log.pipeline = "app"
 DaemonSet               │   container ticketing-app       │
 log-forwarder-agent ────┼── logs/surrounding-containers ──┼──► syslog UDP RFC3164
 (4 node)                │   container namespace lain      │    10.100.33.105:5140
                         └── logs/surrounding-node ────────┘  log.pipeline = "surrounding"
                             /var/log/messages, secure,
                             audit.log, kube-apiserver audit
 Deployment
 log-forwarder-events ───── k8sobjects (events, watch) ───────► syslog UDP (sama)   appname = "k8s-events"
```

Setiap pesan adalah **syslog RFC3164**. Header-nya hanya membawa 3 field, isi sebenarnya ada di *message* (selalu JSON):

| Header syslog | Isi |
|---|---|
| `hostname` | nama node (`k8s-master`, `k8s-worker1..3`); untuk event K8s: `k8s-cluster-dev` |
| `appname` | nama container (jalur container), `os-messages` / `os-secure` / `os-auditd` / `kube-apiserver-audit` (jalur node), `k8s-events` (event) |
| `priority` | facility local0 + severity: **131** = error, **132** = warning, **134** = info, **135** = debug |

**Kunci pemilahan di BindPlane** (setelah *Parse JSON* pada message):

| Ingin memilih | Kondisi |
|---|---|
| Semua log aplikasi ticketing-app | `log.pipeline == "app"` |
| Semua log sekitar (infra, namespace lain, OS) | `log.pipeline == "surrounding"` |
| Event Kubernetes | `appname == "k8s-events"` |
| Jenis log aplikasi | `log.type` ∈ `access`, `app`, `business`, `security`, `audit` |
| Event bisnis tertentu | `event.name` (lihat §2.3) |
| Sumber surrounding | `log.source` ∈ `container`, `os-messages`, `os-secure`, `os-auditd`, `kube-apiserver-audit` |

## 2. Jalur `app` — aplikasi ticketing-app

**Sumber:** container di namespace `ticketing-app`, kecuali job `trendmicro-scan-job-*`, init container `dynatrace-operator`, dan baris kosong.
**Format:** JSON datar = log aplikasi asli + `k8s.namespace.name`, `k8s.pod.name`, `k8s.container.name`, `k8s.node.name`, `log.pipeline`.
**`appname`:** nama service (`api-gateway`, `booking-service`, …). **`priority`:** mengikuti `level`.

### 2.1 Ringkasan pola

| Pola | Identifikasi | Komponen | Volume relatif* |
|---|---|---|---|
| Access log HTTP | `log.type=access` | semua (12) | tinggi — 1 baris/request |
| Lifecycle / teknis | `log.type=app` | semua | rendah (startup, warning konfigurasi, error) |
| Event bisnis | `log.type=business` + `event.name` | booking, payment, notification, hotel, flight, train, pricing, profile | mengikuti transaksi |
| Event keamanan | `log.type=security` + `event.name` | authentication, profile, booking | mengikuti login |
| Audit admin | `log.type=audit` + `event.name=catalog.*` | hotel, flight, train | jarang |
| Non-JSON | tidak ada `log.type`, isi di `message` | frontend (entrypoint nginx), api-gateway (banner `npm start`) | beberapa baris per start |

\* Dalam sampel ~25 jam setelah deploy v1.2.0: access ±2.000, app ±600, business ±560 (`hotel.searched` 301, `pricing.calculated` 108, `train.searched` 87, `flight.searched` 63, …). Trafik saat ini didominasi synthetic monitor Dynatrace.

### 2.2 Contoh per pola

**Access log** (`log.type=access`, `logger=http.access` di Java)
```json
{"client.address":"10.244.100.244","deployment.environment":"dev","dt.span_id":"be4150a9dfc712d2","dt.trace_id":"b8dbd0235389cd4f647c2f05b15e6151","duration_ms":379.54661,"http.request.method":"GET","http.response.status_code":200,"http.route":"/pricing/calculate","k8s.container.name":"pricing-service","k8s.namespace.name":"ticketing-app","k8s.node.name":"k8s-worker2","k8s.pod.name":"pricing-service-7fcbbdd468-j5zpk","level":"INFO","log.pipeline":"app","log.type":"access","logger":"http.access","message":"http request","parent_span_id":"f795aa328e41a279","request_id":"f696994c5759d615228bcb31ad1b5d2e","service.name":"pricing-service","service.version":"v1.2.0","thread":"http-nio-8086-exec-4","timestamp":"2026-10-12T11:37:27.295903061Z","trace_id":"b8dbd0235389cd4f647c2f05b15e6151","url.path":"/pricing/calculate","user_agent.original":"axios/1.13.2"}
```
- Level: `ERROR` bila status 5xx, `WARN` bila 4xx. Health probe yang **gagal** (mis. `/health/ready` 503 saat DB belum siap) tetap tercatat sebagai ERROR; probe yang sukses tidak dicatat.
- `request_id` sama di gateway dan service tujuan → bisa di-*join* lintas service.

**Lifecycle / teknis** (`log.type=app`)
```json
{"deployment.environment":"dev","k8s.container.name":"booking-service","k8s.namespace.name":"ticketing-app","k8s.node.name":"k8s-worker2","k8s.pod.name":"booking-service-654f8cfdf9-tmf8l","level":"WARN","log.pipeline":"app","log.type":"app","message":"Warning: No .env file found. Using environment variables or defaults.","service.name":"booking-service","service.version":"v1.2.0","timestamp":"2026-10-12T10:59:01.311487847Z"}
```
Java menambah `logger`, `thread`, dan `error.stack_trace` (bila ada exception).

**Event bisnis** (`log.type=business`)
```json
{"booking.amount":586850,"booking.currency":"IDR","booking.id":"19268092-12ad-4fba-9381-8fe643b14639","booking.item_count":1,"booking.quantity":1,"booking.reference":"BK-CKDC7SXN","booking.status":"pending","booking.type":"train","deployment.environment":"dev","dt.span_id":"0af1a8c7927515a6","dt.trace_id":"c1ad94768602e83a2c7c73cb2637c75c","event.name":"booking.created","k8s.container.name":"booking-service","k8s.namespace.name":"ticketing-app","k8s.pod.name":"booking-service-654f8cfdf9-zt6hn","level":"INFO","log.pipeline":"app","log.type":"business","message":"booking created","request_id":"31042667b1e1ee6866a35b768e8cf79d","service.name":"booking-service","service.version":"v1.2.0","timestamp":"2026-10-12T02:26:57.341652904Z","trace_id":"c1ad94768602e83a2c7c73cb2637c75c","user.id":"16a…"}
```
```json
{"event.name":"pricing.calculated","log.type":"business","pricing.base_price":1240000,"pricing.coupon_applied":true,"pricing.coupon_code":"SAVE10","pricing.currency":"IDR","pricing.discount":124000,"pricing.tax":124000,"pricing.total_price":1240000,"request_id":"f696994c5759d615228bcb31ad1b5d2e","service.name":"pricing-service", "…":"…"}
```

**Event keamanan** (`log.type=security`) — dengan credential **dummy** karena `LOG_DEMO_SENSITIVE=true`
```json
{"event.name":"user.login.failed","log.type":"security","level":"WARN","auth.failure_reason":"invalid_password","user.id":"…","sensitive.dummy":true,"user.email":"dummy.user@example.com","auth.password":"Dummy#Passw0rd!","auth.access_token":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkdW1teSJ9.ZHVtbXktc2lnbmF0dXJl","service.name":"authentication-service","…":"…"}
```
Event pembayaran membawa dummy `payment.card.number` (`4111111111111111`), `payment.card.cvv`, `payment.card.expiry`, `payment.card.holder`. Semua nilai dummy konstan dan selalu disertai `"sensitive.dummy":true` → target rule masking BindPlane.

**Audit admin** (`log.type=audit`)
```json
{"event.name":"catalog.rooms.updated","log.type":"audit","audit.resource":"rooms","audit.action":"updated","audit.resource_id":"…","http.route":"/admin/hotels/rooms/:id","service.name":"hotel-service","…":"…"}
```

**Non-JSON** (dibungkus otomatis oleh forwarder)
```json
{"k8s.container.name":"api-gateway","k8s.namespace.name":"ticketing-app","k8s.node.name":"k8s-worker2","k8s.pod.name":"api-gateway-8467684858-mdmwr","log.iostream":"stdout","log.pipeline":"app","message":"> api-gateway@1.0.0 start"}
```

### 2.3 Daftar `event.name`

| Kategori | event.name |
|---|---|
| security | `user.registered`, `user.register.failed`, `user.login.succeeded`, `user.login.failed`, `token.refreshed`, `token.refresh.failed`, `user.logout`, `user.password.changed`, `user.password.change.failed`, `booking.access.denied` |
| business — booking | `booking.created`, `booking.create.failed`, `booking.cancelled`, `booking.confirmed`, `booking.confirm.rejected`, `booking.confirm.failed`, `booking.expired`, `notification.dispatch.failed` |
| business — payment | `payment.succeeded`, `payment.failed`, `payment.create.failed`, `payment.refunded`, `payment.refund.rejected` |
| business — notifikasi | `notification.sent`, `notification.failed` |
| business — katalog & harga | `hotel.searched`, `hotel.availability.checked`, `hotel.rooms.reserved`, `hotel.rooms.reserve.failed`, `hotel.rooms.released`, `flight.searched`, `train.searched`, `flight.seats.reserved`, `flight.seats.reserve.failed`, `flight.seats.released`, `flight.seats.release.failed`, `train.seats.*` (sama), `search.executed`, `pricing.calculated`, `profile.updated` |
| audit | `catalog.<resource>.<created\|updated\|deleted>` (resource: `hotels`, `room-types`, `rooms`, `rates`, `airlines`, `airports`, `flights`, `schedules`, `stations`, `trains`, `coaches`, …) |

## 3. Jalur `surrounding` — container di luar aplikasi

**Sumber:** semua container di namespace lain + job `trendmicro-scan-job-*` dan init `dynatrace-operator` di ticketing-app.
Namespace yang saat ini punya pod: `beego-app`, `calico-apiserver`, `calico-system`, `dynatrace`, `easytrade`, `easytravel`, `ingress-nginx`, `kube-system`, `local-path-storage`, `metallb-system`, `my-microservices`, `orm-test`, `redis-demo`, `teachback`, `tigera-operator`, `tj-demo`, `trendmicro-system`, `unguard`.
**Format:** baris asli **tidak di-parse**, dibungkus sebagai string di field `log`:

```json
{"k8s.container.name":"coredns","k8s.namespace.name":"kube-system","k8s.node.name":"k8s-master","k8s.pod.name":"coredns-944b48b48-khzm4","log":".:53","log.iostream":"stdout","log.pipeline":"surrounding","log.source":"container"}
```
```json
{"k8s.container.name":"dynatrace-operator","k8s.namespace.name":"redis-demo","k8s.node.name":"k8s-worker1","k8s.pod.name":"redis-enterprise-call-home-client-29864100-8whfd","log":"{\"level\":\"info\",\"ts\":\"2026-10-12T23:00:03.491Z\",\"logger\":\"bootstrap\",\"msg\":\"starting configuration\"}","log.iostream":"stdout","log.pipeline":"surrounding","log.source":"container"}
```

- `priority` = 131 untuk stderr, 134 untuk stdout. Komponen kube-system (apiserver, controller-manager, etcd, scheduler, kube-proxy) menulis ke **stderr**, jadi semuanya tercatat 131 walaupun isinya info.
- Volume terbesar di node master (sampel): `kube-controller-manager` ±19 rb, `kube-apiserver` ±12 rb, `etcd` ±10 rb, `elastic-agent` ±9 rb baris.

## 4. Jalur `surrounding` — log OS node & audit Kubernetes

| `appname` / `log.source` | File | Isi | Contoh `log` |
|---|---|---|---|
| `os-messages` | `/var/log/messages` | systemd, kubelet, containerd (via rsyslog) — volume **terbesar** | `Oct 11 00:00:22 k8s-master systemd[1]: Starting Rotate log files...` |
| `os-secure` | `/var/log/secure` | sshd, sudo, PAM | `Oct 11 00:56:46 k8s-master sshd[1197766]: error: kex_exchange_identification: Connection closed by remote host` |
| `os-auditd` | `/var/log/audit/audit.log` | auditd (SELinux, netfilter, syscall) | `type=NETFILTER_CFG msg=audit(1791728100.923:55709): table=nat:52262 family=2 entries=228 op=nft_unregister_chain …` |
| `kube-apiserver-audit` | `/var/log/kubernetes/kube-apiserver-audit.log` (hanya master) | audit API server (JSON audit.k8s.io/v1) | `{"kind":"Event","apiVersion":"audit.k8s.io/v1","level":"Request","stage":"RequestReceived","requestURI":"/api/v1/namespaces/redis-demo/services/redis-enterprise","verb":"update","user":{"username":"system:serviceaccount:redis-demo:redis-enterprise-operator",…}}` |

Format pembungkus:
```json
{"k8s.node.name":"k8s-master","log":"<baris asli>","log.pipeline":"surrounding","log.source":"os-messages"}
```
`priority` selalu 134.

## 5. Event Kubernetes (`appname=k8s-events`)

Dikirim oleh Deployment `log-forwarder-events` (receiver `k8sobjects`, mode *watch*). `hostname=k8s-cluster-dev`, `priority=134`. Message = objek watch `{"type":"ADDED|MODIFIED|DELETED","object":{<Event>}}`; objek Event-nya:

```json
{"type":"Warning","reason":"Unhealthy","message":"Readiness probe failed: Get \"http://10.244.100.220:8080/healthz\": context deadline exceeded","count":66,"firstTimestamp":"2026-10-12T11:42:35Z","lastTimestamp":"2026-10-13T03:35:36Z","involvedObject":{"kind":"Pod","name":"beego-app-7fd488459b-gj4lv","namespace":"beego-app"},"source":{"component":"kubelet","host":"k8s-worker3"}}
```
`reason` terbanyak saat snapshot: `Unhealthy`, `Pulled`, `Created`, `Started`, `NodeNotReady`, `TaintManagerEviction`, `SuccessfulCreate`, `Scheduled`. Event ini belum punya field `log.pipeline`, jadi pilih dengan `appname == "k8s-events"`.

## 6. Temuan & catatan

| # | Temuan | Dampak | Tindakan |
|---|---|---|---|
| 1 | **frontend masih format lama.** Deployment `frontend` di cluster me-mount ConfigMap `frontend-nginx-conf` (umur 103 hari, tidak ada di repo) ke `/etc/nginx/conf.d/default.conf`, sehingga `nginx.conf` dari image (v1.2.0 maupun v1.2.1) **tertimpa**. | Log frontend = teks combined + kube-probe (±19 rb baris non-JSON di sampel) | Isi ulang ConfigMap dari repo — lihat perintah di bawah |
| 2 | Banner `npm start` api-gateway (`> api-gateway@1.0.0 start`, `> node server.js`) | 2–4 baris non-JSON per start | Opsional: `CMD ["node","server.js"]` di Dockerfile gateway |
| 3 | `search.date` di flight/train tertulis sebagai array `[2026,10,15]` (LocalDate Java) | Kurang enak di-query | Ubah ke `date.toString()` di controller |
| 4 | `kube-apiserver-audit` memuat `authentication.kubernetes.io/credential-id` (JTI token SA) & identitas user | Data sensitif infra | Kandidat masking di BindPlane |
| 5 | Transport UDP RFC3164 | Pesan >1 KB berisiko terpotong; tidak ada konfirmasi terkirim | Pindah ke TCP/RFC5424 bila receiver mendukung |
| 6 | Event K8s belum diberi `log.pipeline` | Pemilahan pakai `appname` | Opsional: tambahkan di config `log-forwarder-events` |

Perintah perbaikan temuan #1 (PowerShell, dari root repo):
```powershell
kubectl get cm frontend-nginx-conf -n ticketing-app -o yaml > frontend-nginx-conf-backup.yaml
kubectl create configmap frontend-nginx-conf -n ticketing-app --from-file=default.conf=frontend\nginx.conf --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deploy/frontend -n ticketing-app
```
Verifikasi: `kubectl logs -n ticketing-app -l app=frontend --since=5m` harus berisi baris JSON `"service.name":"frontend","log.type":"access"` tanpa `kube-probe`.

## 7. Cara mengambil ulang snapshot ini

Dry-run collector di pod forwarder (tidak mengirim ke BindPlane, tidak mengganggu collector utama): ambil config live, ganti exporter ke `debug`, `start_at: beginning`, hapus `file_storage`, lalu jalankan
`kubectl exec -n bindplane-logging <pod-agent> -- /otelcol-contrib --config="yaml:<config>"` selama ±20 detik dan kelompokkan field `Body`.
