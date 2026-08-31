[CmdletBinding()]
param(
  [string]$DeployRoot = '',
  [string]$EnvFile = '',
  [switch]$DryRun,
  [switch]$SkipCompose
)

$ErrorActionPreference = 'Stop'
if (-not $DeployRoot) { $DeployRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path }
$DeployRoot = (Resolve-Path -LiteralPath $DeployRoot).Path
if (-not $EnvFile) { $EnvFile = Join-Path $DeployRoot '.env.public.local' }
$EnvFile = [System.IO.Path]::GetFullPath($EnvFile)

& node (Join-Path $DeployRoot 'scripts\validate-deployment.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Static deployment validation failed.' }

foreach ($name in @('Caddyfile', 'rarimo\Caddyfile', 'rarimo\config.yaml', '.env.cico.local', '.env.relayer.local', '.env.relayer-db.local', '.env.rarimo.local')) {
  $path = Join-Path $DeployRoot $name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    if ($DryRun) { Write-Host "DRY-RUN: missing runtime input (expected before rendering): $name" }
    else { throw "Missing runtime input: $path" }
  }
}
$runtimeFiles = @(
  (Join-Path $DeployRoot 'Caddyfile'),
  (Join-Path $DeployRoot 'rarimo\Caddyfile'),
  (Join-Path $DeployRoot 'rarimo\config.yaml'),
  (Join-Path $DeployRoot '.env.cico.local'),
  (Join-Path $DeployRoot '.env.relayer.local'),
  (Join-Path $DeployRoot '.env.relayer-db.local'),
  (Join-Path $DeployRoot '.env.rarimo.local')
)
foreach ($path in $runtimeFiles) {
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    if ((Get-Content -LiteralPath $path -Raw) -match 'REPLACE_|<resolve|<generate') {
      throw "Unresolved placeholder remains in $path"
    }
  }
}
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  if ($DryRun) { Write-Host "DRY-RUN: missing interpolation file (expected before release): $EnvFile" }
  else { throw "Missing interpolation file: $EnvFile" }
}

if (Test-Path -LiteralPath $EnvFile -PathType Leaf) {
  $envText = Get-Content -LiteralPath $EnvFile -Raw
  if ($envText -match 'REPLACE_|<resolve|<generate') { throw "Unresolved placeholder remains in $EnvFile" }
  if ($envText -match '(?im)^\w*(?:SEED|SECRET|PASSWORD|TOKEN)\w*\s*=') {
    throw "$EnvFile must contain interpolation and image values only; keep secrets in service-specific files."
  }
  foreach ($imageName in @('CADDY_IMAGE', 'CICO_IMAGE', 'RELAYER_IMAGE', 'RARIMO_IMAGE', 'MIDNIGHT_PROOF_IMAGE', 'POSTGRES_IMAGE')) {
    if ($envText -notmatch "(?m)^$imageName=.+@sha256:[0-9a-f]{64}$") {
      throw "$imageName must be an immutable tag@sha256:digest in $EnvFile"
    }
  }
}

if (-not $SkipCompose -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  if ($DryRun) { Write-Host "DRY-RUN: docker compose --env-file $EnvFile -f $DeployRoot\docker-compose.vps.yml config --quiet" }
  elseif (Test-Path -LiteralPath $EnvFile) {
    Push-Location $DeployRoot
    try { & docker compose --env-file $EnvFile -f docker-compose.vps.yml config --quiet } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'docker compose config rejected the deployment model.' }
  }
} elseif (-not $SkipCompose) {
  Write-Warning 'docker is not installed; Compose validation was skipped.'
}

Write-Host 'Preflight checks passed. No containers were created, started, stopped, or removed.'
