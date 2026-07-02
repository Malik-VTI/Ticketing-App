# Runbook: Rotasi Secret & Deploy (Jenkins → Kubernetes)

> Catatan: TLS via cert-manager **tidak dipakai** (keputusan). Ingress HTTP-only;
> lihat komentar di `deployments/13-ingress.yaml` untuk menambah TLS manual bila perlu.

---

## A. Rotasi Secret (SEC-03)

Semua service membaca kredensial dari satu Secret Kubernetes bernama **`ticketing-secrets`**
(namespace `ticketing-app`) lewat `envFrom.secretRef`. Isinya: `DB_SERVER`, `DB_DATABASE`,
`DB_USER`, `DB_PASSWORD`, `DB_PORT`, `JWT_SECRET_KEY`, `INTERNAL_API_KEY`.

Tujuan rotasi: ganti nilai lama yang sudah bocor (`P@ssw0rd`, `bGZiXRX...`, dll.) dengan nilai
baru — di cluster — tanpa menyimpan plaintext di git.

### Langkah

**1. Generate nilai baru**
```bash
openssl rand -base64 32   # untuk JWT_SECRET_KEY
openssl rand -base64 32   # untuk INTERNAL_API_KEY
# DB_PASSWORD: pilih password kuat baru (≥16 char)
```

**2. Ganti password di DB Postgres ASLI dulu** (nilai di Secret harus cocok dgn DB nyata):
```sql
ALTER USER postgres WITH PASSWORD '<db-pass-baru>';
```
> ⚠️ Kalau Secret diganti tapi DB tidak (atau sebaliknya), service gagal connect. Lakukan ini dulu/berbarengan.

**3. Update Secret di cluster** (imperatif — tidak menyimpan plaintext di git):
```bash
kubectl delete secret ticketing-secrets -n ticketing-app
kubectl create secret generic ticketing-secrets -n ticketing-app \
  --from-literal=DB_SERVER=10.100.33.184 \
  --from-literal=DB_DATABASE=ticketing_app \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD='<db-pass-baru>' \
  --from-literal=DB_PORT=5432 \
  --from-literal=JWT_SECRET_KEY='<jwt-baru>' \
  --from-literal=INTERNAL_API_KEY='<internal-baru>'
```

**4. Restart semua service** agar pod mengambil env baru (env dari Secret hanya di-inject saat pod start):
```bash
kubectl rollout restart deployment -n ticketing-app
```

**5. Berhenti melacak plaintext di git** (agar tidak bocor lagi di commit berikutnya):
```bash
git rm --cached deployments/01-secrets.yaml   # sudah ada di .gitignore
git commit -m "security(SEC-03): stop tracking plaintext k8s secret"
```
Setelah ini Secret hanya hidup di cluster + file lokal Anda (untracked).

### Efek samping yang HARUS diketahui
- **JWT_SECRET_KEY** dirotasi → semua access/refresh token lama **invalid** → user harus login ulang. (Wajar.)
- **INTERNAL_API_KEY** → booking (validasi) & payment (pengirim) sama-sama baca dari `ticketing-secrets`, jadi tetap cocok setelah restart.
- Default hardcoded `P@ssw0rd`/IP di `config.go` service lain (booking/payment/hotel) hanya dipakai bila env kosong — di cluster env selalu diisi Secret, jadi tak terpakai; dan setelah rotasi nilai `P@ssw0rd` jadi tidak berguna.

### (Opsional) bersihkan git history
Nilai lama masih ada di commit lama, tapi sudah tak berguna setelah rotasi. Untuk benar-benar menghapus:
```bash
git filter-repo --path deployments/01-secrets.yaml --invert-paths   # rewrite history → perlu force-push & koordinasi
```

---

## B. Deploy ke Kubernetes lewat Jenkins

### Prasyarat di cluster (sekali saja)
- Namespace + config: `kubectl apply -f deployments/00-namespace.yaml -f deployments/02-configmap.yaml`
- Secret `ticketing-secrets` sudah dibuat (lihat bagian A).
- `imagePullSecrets` **`dockerhub-credentials`** ada di namespace (untuk pull `docker.io/malikvti/*`).
- (Opsional) **metrics-server** bila ingin HPA aktif. Tanpa itu HPA idle, tidak merusak.
- Jenkins credentials: `dockerhub-credentials`, `k8s-kubeconfig`, `kaniko-git-credentials`.

### Jalankan pipeline
Arahkan Jenkins ke branch hasil merge (atau `fix/p3-devops`). Pipeline-nya:
1. **Test** (go/mvn/npm) — bisa UNSTABLE bila toolchain tak lengkap (tidak menggagalkan).
2. **Build & Push** image **non-root** sebagai `:latest` **dan** `:${BUILD_NUMBER}` (Kaniko).
3. **Security Scan** (Trivy, non-gating).
4. **Deploy**: `kubectl apply -f deployments/` → `kubectl rollout restart` → `rollout status`.

> ✅ Karena **Build & Push jalan SEBELUM Deploy**, image non-root `:latest` sudah ada di registry saat
> securityContext diterapkan — jadi **tidak crashloop**. Semua deployment memakai `:latest` + `Always`,
> dan `rollout restart` memaksa pod menarik image segar tiap run.

### Verifikasi
```bash
kubectl get pods -n ticketing-app          # semua Running, bukan CrashLoopBackOff
kubectl rollout status deployment -n ticketing-app
# cek satu endpoint lewat ingress:
curl -H "Host: ticketing-app.local" http://<ingress-ip>/api/health
```

### ⚠️ Jangan apply manual ke image lama
Jangan `kubectl apply -f deployments/` langsung tanpa build image non-root dulu — pod akan crashloop
(securityContext `runAsNonRoot` menolak image root lama). Jalankan **pipeline penuh** (build dulu), atau
secara manual: build+push semua image `:latest` → `kubectl apply -f deployments/` → `kubectl rollout restart`.

### Catatan
- TLS: tidak aktif (HTTP-only). Tambah manual bila perlu (lihat `13-ingress.yaml`).
- HPA: butuh metrics-server.
- Verifikasi log JSON & korelasi Dynatrace setelah deploy (OBS-01/OBS-02).
