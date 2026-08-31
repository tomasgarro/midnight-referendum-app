[CmdletBinding()]
param(
  [string]$DeployRoot = '',
  [string]$EnvFile = '',
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
if (-not $DeployRoot) { $DeployRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path }
$DeployRoot = (Resolve-Path -LiteralPath $DeployRoot).Path
if (-not $EnvFile) { $EnvFile = Join-Path $DeployRoot '.env.public.local' }
$EnvFile = [System.IO.Path]::GetFullPath($EnvFile)
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  if (-not $Apply) {
    Write-Host "DRY-RUN: interpolation file is not rendered yet: $EnvFile"
    Write-Host 'DRY-RUN: no containers changed and no volumes were removed.'
    exit 0
  }
  throw "Missing interpolation file: $EnvFile"
}

$message = @"
Rollback is volume-preserving and changes only the image references in the
service env files. Review the previous immutable CICO_IMAGE, RELAYER_IMAGE,
RARIMO_IMAGE, CADDY_IMAGE, and MIDNIGHT_PROOF_IMAGE values before applying.
Command: docker compose --env-file '$EnvFile' -f docker-compose.vps.yml up -d --no-build --force-recreate
"@
if (-not $Apply) {
  Write-Host $message
  Write-Host 'DRY-RUN: no containers changed and no volumes were removed.'
  exit 0
}

& (Join-Path $DeployRoot 'scripts\preflight.ps1') -DeployRoot $DeployRoot -EnvFile $EnvFile
Push-Location $DeployRoot
try { & docker compose --env-file $EnvFile -f docker-compose.vps.yml up -d --no-build --force-recreate } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'Rollback recreate failed; inspect the prior service state before retrying.' }
Write-Host 'Rollback applied without deleting volumes. Verify health checks and canonical receipts before reopening traffic.'
