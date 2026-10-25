$ErrorActionPreference = 'Stop'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$hba = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$migration = 'C:\makhboz-api\migrations\025_product_weight_pricing.sql'
$trustMarker = '# makhboz-025-temp-trust'

function Enable-PostgresTrust {
  $text = Get-Content $hba -Raw
  if ($text -notmatch [regex]::Escape($trustMarker)) {
    $prefix = @"
$trustMarker
host makhboz postgres 127.0.0.1/32 trust

"@
    Set-Content -Path $hba -Value ($prefix + $text) -Encoding ascii
    Restart-Service postgresql-x64-18
    Start-Sleep -Seconds 4
  }
}

function Disable-PostgresTrust {
  $lines = Get-Content $hba
  $out = New-Object System.Collections.Generic.List[string]
  $skipNextBlank = $false
  foreach ($line in $lines) {
    if ($line -eq $trustMarker) { $skipNextBlank = $true; continue }
    if ($skipNextBlank -and $line -match '^\s*$') { $skipNextBlank = $false; continue }
    if ($line -match '^\s*host\s+makhboz\s+postgres\s+127\.0\.0\.1/32\s+trust\s*$') { continue }
    $out.Add($line)
  }
  Set-Content -Path $hba -Value $out -Encoding ascii
  Restart-Service postgresql-x64-18
  Start-Sleep -Seconds 4
}

try {
  if (-not (Test-Path $migration)) {
    Write-Output "missing_migration=$migration"
    exit 1
  }

  Enable-PostgresTrust

  & $psql -h 127.0.0.1 -U postgres -d makhboz -v ON_ERROR_STOP=1 -f $migration
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & $psql -h 127.0.0.1 -U postgres -d makhboz -tAc "SELECT 'price_per_kg=' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='price_per_kg') THEN 'yes' ELSE 'no' END;"
  & $psql -h 127.0.0.1 -U postgres -d makhboz -tAc "SELECT 'weight_options_g=' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='weight_options_g') THEN 'yes' ELSE 'no' END;"

  Stop-ScheduledTask -TaskName MakhbozApi -ErrorAction SilentlyContinue
  Start-Sleep 2
  Start-ScheduledTask -TaskName MakhbozApi
  Write-Output 'MakhbozApi restarted'
}
finally {
  Disable-PostgresTrust
}
