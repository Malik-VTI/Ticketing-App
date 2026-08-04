# RCA Observability — Data `ticketing-app` Tidak Masuk ke Dynatrace SaaS

> **Tanggal analisa:** 2026-07-27
> **Branch saat analisa:** `deploy/release-v1.1.0`
> **Lingkungan:** cluster `k8s-cluster-dev` (4 node, RHEL 9.6, k8s v1.30.14) → Dynatrace SaaS tenant `pxo94309`
> **Metodologi:** `kubectl` untuk sisi cluster + `dtctl` (DQL/Settings) untuk sisi Dynatrace. Setiap akar masalah diverifikasi langsung ke proses yang berjalan, bukan disimpulkan dari konfigurasi.
> **Catatan:** ID temuan (mis. `OBS-A`) stabil untuk pelacakan. Bagian [Klaim yang Diluruskan](#klaim-yang-diluruskan) mencatat dugaan awal yang ternyata salah — sengaja disimpan agar tidak diulang.

---

## Ringkasan Eksekutif

Keluhan awal: *"data dari aplikasi di namespace ticketing-app tidak masuk ke Dynatrace SaaS."*

Kenyataannya **sebagian besar data sudah masuk sejak awal** — log, metrik K8s, process instance, dan 10 dari 12 service semuanya normal. Yang benar-benar hilang hanya **trace/service dari `booking-service` & `payment-service`**, dan penyebabnya sama sekali bukan Dynatrace, melainkan **drift konfigurasi di cluster** yang membuat kedua service menjalankan binary lama yang tidak bisa di-instrumentasi.

### Scoreboard

| ID | Temuan | Dampak | Status |
|---|---|---|---|
| `OBS-A` | booking & payment menjalankan binary Go **static** → OneAgent tak pernah ter-load | Nol trace/service dari 2 service inti | ✅ Selesai |
| `OBS-B` | Rollout `v1.1.0` macet 3 hari 19 jam (`CreateContainerConfigError`) | Pod lama 24 hari tetap melayani | ✅ Selesai |
| `OBS-C` | Setting koneksi Kubernetes duplikat di tenant | Membingungkan, nol data 30 hari | ✅ Dihapus |
| `OBS-D` | RUM `ticketing-app.local` kosong | Tidak ada data user nyata | ✅ Selesai |
| `OBS-E` | DynaKube `MonitoredEntity=False` sejak 2026-06-04 | Nihil (kosmetik) | ⛔ Sengaja dibiarkan |

### Hasil akhir

```
Service ter-tag ticketing-app : 10/12  →  12/12
booking-service               : 2 req/24 jam   →  2.103 req/jam
payment-service               : tidak ada entity  →  1.493 req/jam
RUM ticketing-app.local       : hilang 7+ hari  →  APPLICATION-B6CFD25DEFD0D739 aktif
```

---

## `OBS-A` — booking & payment tidak ter-instrumentasi

**Status:** ✅ Selesai

### Gejala

- `booking-service`: **2 request / 24 jam** (service lain ~57.900/hari)
- `payment-service`: **tidak punya service entity sama sekali**
- Padahal: pod `Running`, annotation `oneagent.dynatrace.com/injected=true`, init container `dynatrace-operator` jalan, env `LD_PRELOAD` terpasang — semua "terlihat" benar.

### Akar masalah

Tes penentu — apakah library OneAgent benar-benar ter-load ke proses:

```bash
kubectl exec -n ticketing-app <pod> -- sh -c 'grep -c oneagent /proc/1/maps'
```

| Service | Hasil | Arti |
|---|---|---|
| `booking-service` | **0** | agent tak pernah ter-load |
| `payment-service` | **0** | agent tak pernah ter-load |
| `notification-service` | **20** | normal (`libdwarf.so`, `libelf.so.1`) |

Penyebabnya berlapis:

1. Deployment di cluster punya init container **`stage-binary`** dari image lama `malikvti/*-service:1.0.2` yang menjalankan `cp /root/main /stage/main`.
2. Container utama di-override `command: ["/stage/main"]` + `workingDir: /stage`.
3. Akibatnya, **meskipun `image:` sudah `v1.1.0`, yang dieksekusi tetap binary lama dari image `1.0.2`** — dan binary itu **statically linked** (tanpa ELF interpreter).
4. Binary Go static dimuat kernel langsung tanpa dynamic loader → **`LD_PRELOAD` diabaikan diam-diam** → OneAgent tidak pernah masuk ke proses.

> Inilah kenapa semua indikator di level Kubernetes tampak sehat: injeksi *memang* berhasil di level pod; yang gagal adalah tahap `LD_PRELOAD` di level proses, dan kegagalan itu tidak menghasilkan error apa pun.

### Kondisi repo — sudah benar sejak awal

Repo **tidak perlu diubah**. Drift ini murni hasil `kubectl patch`/`edit` manual di cluster yang tidak pernah dibersihkan.

- `backend/booking-service/Dockerfile` & `backend/payment-service/Dockerfile` sudah membangun binary dinamis sejak commit `adc92db` (2026-07-02):
  ```dockerfile
  RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-linkmode=external" -o main .
  ```
- `deployments/04-booking-service.yaml` & `15-payment-service.yaml` **tidak punya `initContainers`/`workingDir`/`volumes` sama sekali**.
- Image `v1.1.0` diverifikasi lewat pod diagnostik sekali pakai: `/app/main` **dinamis** (interpreter `/lib/ld-musl-x86_64.so.1`), berjalan sebagai uid 1000, dan aplikasinya start normal (`Database connection established successfully`).

### ⚠️ Jebakan: `kubectl apply` TIDAK menghapus drift ini

`initContainers`, `command`, `workingDir`, `volumeMounts`, dan `volumes` ditambahkan secara **imperatif**, sehingga tidak tercatat di anotasi `kubectl.kubernetes.io/last-applied-configuration`. Konsekuensinya 3-way merge buta terhadapnya:

```bash
kubectl diff -f deployments/04-booking-service.yaml   # keluar KOSONG — apply tidak akan mengubah apa pun
```

Harus JSON patch eksplisit. **Drift-nya 5 field, bukan 2** — membuang `initContainers` + `command` saja membuat pod `CrashLoopBackOff` dengan `exit 127: /bin/sh: ./main: not found`, karena CMD image (`/bin/sh -c "./main"`) bersifat relatif sedangkan `workingDir` masih menunjuk `/stage` (emptyDir kosong).

### Perbaikan yang diterapkan

```bash
# rm-stage.json
[
  {"op": "remove", "path": "/spec/template/spec/initContainers"},
  {"op": "remove", "path": "/spec/template/spec/containers/0/command"},
  {"op": "remove", "path": "/spec/template/spec/containers/0/workingDir"},
  {"op": "remove", "path": "/spec/template/spec/containers/0/volumeMounts"},
  {"op": "remove", "path": "/spec/template/spec/volumes"}
]
```

```bash
kubectl patch deploy booking-service -n ticketing-app --type=json --patch-file rm-stage.json
kubectl patch deploy payment-service -n ticketing-app --type=json --patch-file rm-stage.json
```

> Di Windows/PowerShell gunakan `--patch-file`, jangan `-p '<json inline>'` — quoting-nya kacau.

### Verifikasi

```
booking-service : exe=/app/main   oneagent mappings=20
payment-service : exe=/app/main   oneagent mappings=20
```

Entity baru muncul dengan penamaan konsisten seperti service Go lain, menggantikan entity lama `main booking-service-* on port 8082` yang mandek:

| Service | Entity ID | Request |
|---|---|---|
| `booking-service-*` | `SERVICE-943E847CEA772875` | 2.103/jam |
| `payment-service-*` | `SERVICE-0F61CC1D27AC07CF` | 1.493/jam |

---

## `OBS-B` — Rollout `v1.1.0` macet 3 hari 19 jam

**Status:** ✅ Selesai (efek samping dari perbaikan `OBS-A`)

```
Init:CreateContainerConfigError
container's runAsUser breaks non-root policy
```

Init container `stage-binary` berjalan sebagai root (image `1.0.2` menyalin dari `/root/main`), sementara pod menetapkan `runAsNonRoot: true`. ReplicaSet baru tidak pernah hidup, sehingga RS lama berumur 24 hari terus melayani trafik.

Menghapus `stage-binary` (lihat `OBS-A`) sekaligus menyelesaikan ini. Karena strategi `RollingUpdate`, pod lama tetap melayani selama transisi — **tidak ada downtime**.

---

## `OBS-C` — Setting koneksi Kubernetes duplikat

**Status:** ✅ Dihapus

Tenant punya dua entri `builtin:cloud.kubernetes` berlabel `k8s-cluster-dev` dengan endpoint identik `https://10.100.33.93:6443`:

| Scope | Data 30 hari | Entity |
|---|---|---|
| `KUBERNETES_CLUSTER-7249AB5059FA65E7` | 10,8 juta datapoint | ada (aktif) |
| `KUBERNETES_CLUSTER-A89488E6A332E8E7` | **0** | tidak pernah ada |

Yang mati dihapus via `dtctl delete settings <objectId>`. Backup object-nya diambil lebih dulu, walau `authToken` tetap ter-mask sehingga penghapusan tidak sepenuhnya reversibel — token harus dibuat ulang bila suatu saat dibutuhkan.

Sisa koneksi di tenant kini masing-masing tunggal: `k8s-cluster-dev`, `alfi-k3s`, `ocp-demo`, `fedora36-app`.

---

## `OBS-D` — RUM `ticketing-app.local` kosong

**Status:** ✅ Selesai

Dari empat dugaan awal, hanya satu yang benar-benar jadi penyebab.

| Dugaan | Verdict |
|---|---|
| Tag RUM ganda (CDN manual + OneAgent auto) | ❌ Sudah beres sebelumnya — halaman memuat tepat 1 agen |
| Data salah rute ke *"My web application"* | ❌ Artefak pengujian (lihat bawah) |
| `costAndTrafficControl: 50` | ⚠️ Benar, tapi minor — sudah dinaikkan ke 100 |
| **Tidak ada trafik browser nyata** | ✅ **Ini penyebab sesungguhnya** |

### Soal "salah rute" — cara mengujinya dengan benar

Aturan deteksi aplikasi (`DOMAIN_MATCHES ticketing-app.local` → `APPLICATION-B6CFD25DEFD0D739`) **selalu berfungsi**. Request yang Host header-nya bukan `ticketing-app.local` — curl ke pod IP, probe kubelet — memang wajar jatuh ke catch-all. Jadi pengujian harus menyertakan Host yang benar:

```bash
# nginx listen di 8080 (bukan 80), dan `localhost` gagal resolve (ke ::1) → pakai 127.0.0.1
kubectl exec -n ticketing-app deploy/frontend -c frontend -- sh -c \
  'wget -qO- --header="Host: ticketing-app.local" http://127.0.0.1:8080/ | grep -o "app=[a-f0-9]*"'
# → app=b6cfd25defd0d739   (benar: ticketing-app.local)

kubectl exec -n ticketing-app deploy/frontend -c frontend -- sh -c \
  'wget -qO- http://127.0.0.1:8080/ | grep -o "app=[a-f0-9]*"'
# → app=ea7c4b59f27d43eb   (catch-all "My web application")
```

### Perubahan yang diterapkan

`builtin:rum.web.enablement` scope `APPLICATION-B6CFD25DEFD0D739`: `costAndTrafficControl` **50 → 100** (default environment memang 100; hanya aplikasi ini yang tertinggal).

### Kunci penyelesaian

Probe Kubernetes tidak menjalankan JavaScript, jadi **tidak pernah** menghasilkan sesi RUM. Setelah aplikasi dibuka lewat browser sungguhan, `ticketing-app.local` langsung muncul kembali sebagai entity aktif.

---

## `OBS-E` — DynaKube `MonitoredEntity=False` — **jangan diperbaiki**

**Status:** ⛔ Sengaja dibiarkan

```
MonitoredEntity=False  reason=StatusOutdated
msg=Kubernetes Cluster MEID is outdated in the status
since=2026-06-04
```

Log operator: `no MEs found, no kubernetesClusterMEID will be set in the dynakube status`.

Operator mencari entity cluster berdasarkan UID `kube-system` (`3950f7d5-b27f-4ad7-b091-bf7a6933fc0c`), tetapi koneksi `k8s-cluster-dev` memakai `clusterIdEnabled: false` sehingga entity diidentifikasi lewat `endpointUrl`, bukan UID → tidak ketemu.

### Menyalakan `clusterIdEnabled: true` BUKAN perbaikan

Schema `builtin:cloud.kubernetes` v3.1.1 punya **dua mode yang saling eksklusif**. API menolak dengan `400`:

```
activeGateGroup, endpointUrl, authToken, certificateCheckEnabled, hostnameVerificationEnabled
→ "Property should not be set as it does not satisfy the precondition: clusterIdEnabled = 'false'"
```

| | `clusterIdEnabled: false` | `clusterIdEnabled: true` |
|---|---|---|
| Identifikasi | via `endpointUrl` | via UID kube-system |
| Koneksi API ActiveGate | ada | **tidak ada** |
| Dipakai | `k8s-cluster-dev` | `alfi-k3s`, `ocp-demo`, `fedora36-app` |

Cluster ini memakai **ActiveGate eksternal** (grup `default`, `dynatrace-eag` / `10.100.33.92:9999`) — pilihan arsitektur yang disengaja, tanpa ActiveGate in-cluster. Untuk mode itu, `clusterIdEnabled: false` justru **wajib**. Menyalakannya akan mencabut koneksi API dan mematikan monitoring K8s.

**Dampak praktis kondisi `False` ini nihil:** `kubernetesClusterMEID` yang tersimpan sudah benar, enrichment jalan (log membawa `dt.entity.kubernetes_cluster` yang tepat), dan `dt.kubernetes.pods` mengalir normal. Ini konsekuensi arsitektur, bukan misconfig.

---

## Klaim yang Diluruskan

Tiga dugaan yang sempat dipegang selama analisa ternyata **salah** dan sudah dikoreksi:

1. **"Drift-nya cuma `initContainers` + `command`."**
   Salah — ada 5 field. Membuang dua saja menyebabkan `CrashLoopBackOff`. `workingDir: /stage` adalah pemicu sesungguhnya dari `exit 127`.

2. **"Duplikat koneksi Kubernetes menyebabkan `MonitoredEntity=False`."**
   Salah — setelah duplikat dihapus, kondisinya tidak berubah sama sekali. Penyebab sebenarnya adalah mode `clusterIdEnabled` (lihat `OBS-E`), dan itu memang tidak boleh diubah.

3. **"Control-plane `k8s-master` flapping."**
   Salah — saat seluruh subnet lab (keempat node *dan* ingress) tidak terjangkau, Dynatrace tetap menerima log dari cluster secara real-time. Artinya cluster sehat; yang putus adalah jalur jaringan/VPN dari workstation. Selalu uji lewat jalur independen sebelum menyimpulkan cluster bermasalah.

---

## Metode Diagnostik yang Terbukti Berguna

| Tujuan | Perintah |
|---|---|
| **Apakah proses benar-benar ter-instrumentasi OneAgent** | `kubectl exec <pod> -- sh -c 'grep -c oneagent /proc/1/maps'` — 0 = tidak, >0 = ya. Jauh lebih andal daripada memeriksa annotation atau env `LD_PRELOAD`, yang bisa terpasang tapi tak berefek |
| Binary dinamis atau static | `grep -aq ld-musl <binary>` (Alpine pakai musl, **bukan** `ld-linux`) |
| Deteksi drift yang tak terlihat `apply` | Bandingkan spec live dengan `kubectl.kubernetes.io/last-applied-configuration`; `kubectl diff` kosong ≠ tidak ada drift |
| Uji atribusi aplikasi RUM | `wget --header="Host: <domain>"` — tanpa Host yang benar, hasilnya menyesatkan |
| Cluster hidup atau jaringan kita yang putus | Cek ingest log di Dynatrace (jalur independen dari kubectl) |
| DQL dari Windows | Tulis ke file `.dql` lalu `dtctl query -f file.dql` — PowerShell memakan tanda kutip |

---

## Tindak Lanjut

- [ ] Commit penghapusan tag CDN RUM di `frontend/index.html` (masih *uncommitted* di `deploy/release-v1.1.0`)
- [ ] Pertimbangkan Synthetic browser monitor agar RUM punya trafik kontinu tanpa bergantung sesi manual
- [x] ~~Hapus setting Kubernetes duplikat~~
- [x] ~~Naikkan RUM cost control ke 100~~
- [x] ~~Bersihkan drift `stage-binary` di booking & payment~~

### Catatan pencegahan

Drift `stage-binary` bertahan berbulan-bulan tanpa terdeteksi karena `kubectl apply` maupun `kubectl diff` sama-sama diam. Selama deployment masih dikelola imperatif, pertimbangkan salah satu dari:

- Migrasi ke `kubectl apply --server-side` (drift imperatif ikut terekonsiliasi), atau
- GitOps (ArgoCD/Flux) yang mendeteksi *out-of-sync* terhadap manifest repo.

---

*Dokumen ini melengkapi [`IMPROVEMENT-FINDINGS.md`](IMPROVEMENT-FINDINGS.md) (temuan `OBS-01`/`OBS-02`) dan [`DEPLOYMENT.md`](DEPLOYMENT.md).*
