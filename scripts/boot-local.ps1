$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$port = 3100
$siteUrl = "http://127.0.0.1:$port/choose-face"
$dataDir = Join-Path $projectDir ".data"
$stdoutLog = Join-Path $dataDir "boot-server.log"
$stderrLog = Join-Path $dataDir "boot-server-error.log"

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js and npm are required to run THE CLUSTER."
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if (-not $listener) {
  $command = "npm.cmd run dev -- --hostname 127.0.0.1 --port $port"
  Start-Process `
    -FilePath $env:ComSpec `
    -ArgumentList @("/d", "/c", $command) `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog | Out-Null
}

Write-Host "Starting THE CLUSTER at $siteUrl ..."
$ready = $false
for ($attempt = 0; $attempt -lt 120; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $siteUrl -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $ready) {
  Write-Error "The local server did not become ready. See $stderrLog"
}

Start-Process $siteUrl
