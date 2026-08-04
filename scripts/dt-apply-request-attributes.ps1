<#
  Menerapkan seluruh definisi request attribute di
  deployments/dynatrace/request-attributes/*.json ke tenant Dynatrace.

  Request attributes ada di Configuration API v1, BUKAN Settings 2.0 - jadi
  dtctl tidak bisa dipakai untuk ini. Lihat docs/DYNATRACE-REQUEST-ATTRIBUTES.md.

  Idempoten: kalau sudah ada RA dengan nama yang sama, ia di-PUT (update),
  bukan dibuat ganda.

  Pakai:
    $env:DT_ENV   = "https://pxo94309.live.dynatrace.com"
    $env:DT_TOKEN = "dt0c01...."          # scope: CaptureRequestData
    ./scripts/dt-apply-request-attributes.ps1 -WhatIfOnly   # validasi saja, tidak menulis
    ./scripts/dt-apply-request-attributes.ps1               # terapkan
    ./scripts/dt-apply-request-attributes.ps1 -Filter 'ra-1*'
#>
param(
  [switch]$WhatIfOnly,
  [string]$Filter = '*.json'
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 tidak selalu menegosiasikan TLS 1.2 secara default.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $env:DT_ENV)   { throw "DT_ENV belum diset (mis. https://pxo94309.live.dynatrace.com)" }
if (-not $env:DT_TOKEN) { throw "DT_TOKEN belum diset (butuh scope CaptureRequestData)" }

$base    = "$($env:DT_ENV.TrimEnd('/'))/api/config/v1/service/requestAttributes"
$headers = @{ Authorization = "Api-Token $env:DT_TOKEN" }

# Dynatrace mengembalikan detail pelanggaran constraint di BODY respons error.
# Invoke-RestMethod melempar exception dan menyembunyikannya, jadi kita gali sendiri.
function Get-DtErrorBody($errorRecord) {
  if ($errorRecord.ErrorDetails -and $errorRecord.ErrorDetails.Message) {
    return $errorRecord.ErrorDetails.Message
  }
  $resp = $errorRecord.Exception.Response
  if ($resp) {
    try {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      return $reader.ReadToEnd()
    } catch { }
  }
  return $errorRecord.Exception.Message
}

function Invoke-Dt($method, $uri, $bodyText) {
  $params = @{ Method = $method; Uri = $uri; Headers = $headers; UseBasicParsing = $true }
  if ($bodyText) {
    # Kirim sebagai byte UTF-8 supaya karakter non-ASCII tidak rusak.
    $params.Body        = [System.Text.Encoding]::UTF8.GetBytes($bodyText)
    $params.ContentType = 'application/json; charset=utf-8'
  }
  try {
    return Invoke-RestMethod @params
  } catch {
    throw "HTTP $method $uri gagal:`n$(Get-DtErrorBody $_)"
  }
}

# Peta nama => id dari RA yang sudah ada di tenant
$existing = @{}
foreach ($v in (Invoke-Dt 'GET' $base $null).values) { $existing[$v.name] = $v.id }
Write-Host "Tenant sudah punya $($existing.Count) request attribute." -ForegroundColor DarkGray

$dir   = Join-Path $PSScriptRoot '..\deployments\dynatrace\request-attributes'
$files = Get-ChildItem -Path $dir -Filter $Filter | Sort-Object Name
if (-not $files) { throw "Tidak ada file cocok '$Filter' di $dir" }

$created = 0; $updated = 0; $failed = 0
foreach ($file in $files) {
  $body = Get-Content $file.FullName -Raw

  # Validasi lokal dulu - file kosong / JSON rusak tidak perlu sampai ke API.
  if ([string]::IsNullOrWhiteSpace($body)) {
    Write-Host "[SKIP] $($file.Name) - file kosong" -ForegroundColor Red; $failed++; continue
  }
  try { $name = ($body | ConvertFrom-Json).name } catch {
    Write-Host "[SKIP] $($file.Name) - JSON tidak valid: $($_.Exception.Message)" -ForegroundColor Red; $failed++; continue
  }
  if (-not $name) {
    Write-Host "[SKIP] $($file.Name) - field 'name' kosong" -ForegroundColor Red; $failed++; continue
  }

  $id = $existing[$name]

  try {
    # Validasi sisi server lewat endpoint /validator bawaan Dynatrace
    $validateUrl = if ($id) { "$base/$id/validator" } else { "$base/validator" }
    Invoke-Dt 'POST' $validateUrl $body | Out-Null
    Write-Host "[ok  ] validasi  $name" -ForegroundColor DarkGray

    if ($WhatIfOnly) { continue }

    if ($id) {
      Invoke-Dt 'PUT' "$base/$id" $body | Out-Null
      Write-Host "[updt] $name" -ForegroundColor Yellow; $updated++
    } else {
      $res = Invoke-Dt 'POST' $base $body
      $existing[$name] = $res.id
      Write-Host "[crea] $name -> $($res.id)" -ForegroundColor Green; $created++
    }
  } catch {
    Write-Host "[GAGAL] $($file.Name) ($name)" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    $failed++
  }
}

Write-Host ""
if ($WhatIfOnly) {
  Write-Host "Mode validasi: $($files.Count - $failed)/$($files.Count) definisi lolos. Tidak ada yang ditulis." -ForegroundColor Cyan
} else {
  Write-Host "Selesai - dibuat: $created, diperbarui: $updated, gagal: $failed" -ForegroundColor Cyan
}
if ($failed) { exit 1 }
