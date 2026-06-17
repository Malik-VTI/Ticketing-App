# Migrasi ke Sealed Secrets (SEC-03)

Tujuan: berhenti menyimpan secret **plaintext** di git (`deployments/01-secrets.yaml`).
Dengan Bitnami Sealed Secrets, secret dienkripsi memakai public-key controller di
cluster menjadi resource `SealedSecret` yang **aman di-commit**. Hanya controller di
cluster yang bisa men-decrypt-nya kembali menjadi `Secret` biasa.

```
01-secrets.yaml (plaintext)  --kubeseal-->  01-sealed-secrets.yaml (ciphertext, aman commit)
                                                     |
                                          apply ke cluster
                                                     v
                                  controller decrypt --> Secret "ticketing-secrets"
                                                     |
                          dipakai semua service via envFrom.secretRef
```

## Prasyarat
- `kubectl` sudah terkonfigurasi ke cluster target. ✅ (terdeteksi)
- `kubeseal` CLI. ❌ (belum ter-install — lihat langkah 2)

---

## Langkah

### 1. Install controller Sealed Secrets di cluster
```bash
# Cek rilis terbaru di https://github.com/bitnami-labs/sealed-secrets/releases
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.27.1/controller.yaml
# Default ter-install di namespace kube-system dengan nama sealed-secrets-controller
kubectl get pods -n kube-system | grep sealed-secrets
```

### 2. Install kubeseal CLI (Windows)
```powershell
# via Chocolatey
choco install kubeseal
# atau unduh kubeseal.exe dari halaman Releases yang sama, taruh di PATH
```

### 3. ROTATE semua nilai secret (WAJIB)
Nilai lama (`P@ssw0rd`, `bGZiXRX...`, dll.) sudah ter-expose di git history, jadi
harus diganti — bukan sekadar dipindah.
```bash
cp deployments/01-secrets.example.yaml deployments/01-secrets.yaml   # file ini di-gitignore
# Generate nilai baru:
openssl rand -base64 32        # untuk JWT_SECRET_KEY
openssl rand -base64 32        # untuk INTERNAL_API_KEY
# Ganti DB_PASSWORD dengan password kuat baru, dan ubah juga di DB server.
# Isi semua REPLACE_ME di deployments/01-secrets.yaml dengan nilai baru.
```

> Penting: setelah JWT_SECRET_KEY dirotasi, semua token lama jadi invalid (user perlu
> login ulang). INTERNAL_API_KEY dipakai bersama booking & payment — keduanya otomatis
> ambil nilai baru dari Secret `ticketing-secrets` lewat `envFrom`, jadi tetap cocok.

### 4. Seal
```bash
bash deployments/sealed-secrets/seal.sh
# menghasilkan deployments/01-sealed-secrets.yaml
```

### 5. Cutover (berhenti commit plaintext)
```bash
git add deployments/01-sealed-secrets.yaml deployments/01-secrets.example.yaml
git rm --cached deployments/01-secrets.yaml      # stop melacak plaintext
# .gitignore sudah mengabaikan deployments/01-secrets.yaml (lihat .gitignore)
git commit -m "security(SEC-03): migrate k8s secrets to Sealed Secrets"
```
Jenkins (`kubectl apply -f deployments/`) memakai checkout git yang bersih, sehingga
plaintext tidak akan ikut ter-apply lagi; hanya `01-sealed-secrets.yaml` yang dipakai.

### 6. Bersihkan git history (opsional tapi disarankan)
Nilai lama masih ada di commit lama. Untuk benar-benar menghapus:
```bash
# Pakai git-filter-repo (https://github.com/newren/git-filter-repo)
git filter-repo --path deployments/01-secrets.yaml --invert-paths
```
Karena ini menulis ulang history (force-push), koordinasikan dengan semua kolaborator.
Yang terpenting tetap: **rotasi nilai (langkah 3)** — itu yang membuat nilai lama tak berguna.

---

## Verifikasi pasca-apply
```bash
kubectl get sealedsecret -n ticketing-app
kubectl get secret ticketing-secrets -n ticketing-app   # harus terbentuk oleh controller
kubectl rollout restart deployment -n ticketing-app      # agar service ambil nilai baru
```

## File terkait
- `deployments/01-secrets.example.yaml` — template placeholder (aman commit)
- `deployments/01-secrets.yaml` — plaintext, **gitignored**, jangan commit
- `deployments/01-sealed-secrets.yaml` — hasil seal (aman commit) — dibuat di langkah 4
- `deployments/sealed-secrets/seal.sh` — helper
