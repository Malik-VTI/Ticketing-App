#!/usr/bin/env bash
# =============================================================================
# seal.sh — meng-enkripsi deployments/01-secrets.yaml menjadi
#           deployments/01-sealed-secrets.yaml (aman di-commit).
#
# Prasyarat:
#   - kubectl terkonfigurasi ke cluster target
#   - kubeseal CLI ter-install (lihat README.md)
#   - controller sealed-secrets sudah berjalan di cluster
#   - deployments/01-secrets.yaml berisi nilai ASLI yang sudah dirotasi
#
# Pakai:
#   bash deployments/sealed-secrets/seal.sh
#
# Override controller (default mengikuti instalasi standar):
#   CONTROLLER_NS=kube-system CONTROLLER_NAME=sealed-secrets-controller \
#     bash deployments/sealed-secrets/seal.sh
# =============================================================================
set -euo pipefail

# Direktori deployments/ (parent dari folder script ini)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

PLAINTEXT="$DEPLOY_DIR/01-secrets.yaml"
SEALED="$DEPLOY_DIR/01-sealed-secrets.yaml"

CONTROLLER_NS="${CONTROLLER_NS:-kube-system}"
CONTROLLER_NAME="${CONTROLLER_NAME:-sealed-secrets-controller}"

command -v kubeseal >/dev/null 2>&1 || { echo "ERROR: kubeseal tidak ditemukan di PATH. Lihat README.md."; exit 1; }
command -v kubectl  >/dev/null 2>&1 || { echo "ERROR: kubectl tidak ditemukan di PATH."; exit 1; }

if [[ ! -f "$PLAINTEXT" ]]; then
  echo "ERROR: $PLAINTEXT tidak ada."
  echo "       Salin dari template: cp deployments/01-secrets.example.yaml deployments/01-secrets.yaml"
  echo "       lalu isi nilai asli (yang sudah dirotasi)."
  exit 1
fi

# Cegah placeholder ikut ter-seal tanpa sengaja
if grep -q "REPLACE_ME" "$PLAINTEXT"; then
  echo "ERROR: $PLAINTEXT masih mengandung placeholder REPLACE_ME. Isi nilai asli dulu."
  exit 1
fi

echo ">> Menyegel $PLAINTEXT memakai controller $CONTROLLER_NAME (ns: $CONTROLLER_NS)..."
kubeseal \
  --controller-namespace "$CONTROLLER_NS" \
  --controller-name "$CONTROLLER_NAME" \
  --format yaml \
  < "$PLAINTEXT" \
  > "$SEALED"

echo ">> Berhasil: $SEALED"
echo ""
echo "Langkah berikutnya:"
echo "  1. Verifikasi isi $SEALED (hanya ciphertext, tidak ada nilai asli)."
echo "  2. git add deployments/01-sealed-secrets.yaml"
echo "  3. Saat cutover, berhenti melacak plaintext:"
echo "       git rm --cached deployments/01-secrets.yaml"
echo "  4. kubectl apply -f deployments/01-sealed-secrets.yaml"
echo "     (controller akan otomatis membuat Secret 'ticketing-secrets')"
