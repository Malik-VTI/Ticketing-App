<#
  Menarik seluruh request attribute berawalan `ticketing.` dari tenant Dynatrace
  ke deployments/dynatrace/request-attributes/ sebagai JSON.

  Gunanya: request attribute yang dibuat lewat UI - terutama Batch C
  (METHOD_PARAM, yang butuh signature Java persis dan jauh lebih aman dibuat
  lewat wizard) - ikut masuk git dan bisa diterapkan ulang lewat
  dt-apply-request-attributes.ps1.

  Field `id` dan `metadata` dibuang supaya berkasnya portabel antar tenant.

  Pakai:
    $env:DT_ENV   = "https://pxo94309.live.dynatrace.com"
    $env:DT_TOKEN = "dt0c01...."
    ./scripts/dt-export-request-attributes.ps1
    ./scripts/dt-export-request-attributes.ps1 -Prefix 'ticketing.pricing'
#>
param(
  [string]$Prefix = 'ticketing.',
  [string]$OutDir
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $env:DT_ENV)   { throw "DT_ENV belum diset" }
if (-not $env:DT_TOKEN) { throw "DT_TOKEN belum diset" }

$base    = "$($env:DT_ENV.TrimEnd('/'))/api/config/v1/service/requestAttributes"
$headers = @{ Authorization = "Api-Token $env:DT_TOKEN" }
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot '..\deployments\dynatrace\request-attributes' }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$all = (Invoke-RestMethod -Method GET -Uri $base -Headers $headers -UseBasicParsing).values |
       Where-Object { $_.name -like "$Prefix*" } | Sort-Object name

if (-not $all) { Write-Host "Tidak ada request attribute berawalan '$Prefix'." -ForegroundColor Yellow; return }

foreach ($item in $all) {
  $ra = Invoke-RestMethod -Method GET -Uri "$base/$($item.id)" -Headers $headers -UseBasicParsing

  # Buang field yang terikat tenant agar berkasnya bisa dipakai ulang
  $ra.PSObject.Properties.Remove('id')
  $ra.PSObject.Properties.Remove('metadata')

  # ticketing.booking.item_count -> booking-item-count
  $slug = ($ra.name -replace "^$([regex]::Escape($Prefix))", '') -replace '[._]', '-'
  $path = Join-Path $OutDir "exported-$slug.json"

  ($ra | ConvertTo-Json -Depth 20) | Out-File -FilePath $path -Encoding utf8
  Write-Host "[export] $($ra.name) -> $(Split-Path $path -Leaf)" -ForegroundColor Green
}

Write-Host "`n$($all.Count) request attribute diekspor ke $OutDir" -ForegroundColor Cyan
Write-Host "Cocokkan isinya dengan berkas ra-XX-*.json yang sudah ada, lalu hapus duplikatnya." -ForegroundColor DarkGray
