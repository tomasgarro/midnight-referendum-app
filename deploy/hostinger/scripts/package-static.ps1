[CmdletBinding()]
param(
  [string]$RepoRoot = '',
  [string]$DistPath = '',
  [string]$OutputPath = '',
  [ValidateSet('demo', 'undeployed', 'preview')]
  [string]$Mode = 'demo',
  [switch]$Build,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
if (-not $DistPath) { $DistPath = Join-Path $RepoRoot 'ui\dist' }
$DistPath = [System.IO.Path]::GetFullPath($DistPath)
if (-not $OutputPath) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $OutputPath = Join-Path $RepoRoot "deploy\hostinger\artifacts\ui_$stamp.zip"
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

if ($Build) {
  if ($DryRun) {
    Write-Host "DRY-RUN: VITE_APP_MODE=$Mode npm run build --workspace midnight-referendum-ui"
  } else {
    $previousMode = $env:VITE_APP_MODE
    Push-Location $RepoRoot
    try {
      $env:VITE_APP_MODE = $Mode
      & npm run build --workspace midnight-referendum-ui
    } finally {
      if ($null -eq $previousMode) {
        Remove-Item Env:VITE_APP_MODE -ErrorAction SilentlyContinue
      } else {
        $env:VITE_APP_MODE = $previousMode
      }
      Pop-Location
    }
    if ($LASTEXITCODE -ne 0) { throw "Vite build failed with exit code $LASTEXITCODE" }
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $DistPath 'index.html') -PathType Leaf)) {
  throw "Missing ui/dist/index.html. Run the reviewed Vite build first."
}

$files = @(Get-ChildItem -LiteralPath $DistPath -Recurse -File)
$forbiddenName = [regex]'(^|[\\/])\.env(?:\.|$)|\.pem$|\.key$|\.pk$|\.vk$'
$forbiddenText = @('RELAYER_SEED', 'CICO_ISSUER_WALLET_SEED', 'CICO_ISSUER_ROLE_SECRET', 'CICO_ROOT_PUBLISHER_SECRET_HEX', 'V2_FIXTURE_HOLDER_SECRET_HEX')
foreach ($file in $files) {
  if ($forbiddenName.IsMatch($file.FullName)) { throw "Forbidden file in static output: $($file.Name)" }
  if ($file.Extension -in @('.html', '.js', '.css', '.json', '.map')) {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($marker in $forbiddenText) {
      if ($text.Contains($marker)) { throw "Forbidden secret marker '$marker' in $($file.Name)" }
    }
  }
}

if ($DryRun) {
  Write-Host "DRY-RUN: $($files.Count) public files would be archived with index.html at ZIP root."
  Write-Host "DRY-RUN: output would be $OutputPath"
  exit 0
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("midnight-ui-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
  Copy-Item -Path (Join-Path $DistPath '*') -Destination $stage -Recurse -Force
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $OutputPath -CompressionLevel Optimal -Force
  Write-Host "Created $OutputPath"
} finally {
  Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}
