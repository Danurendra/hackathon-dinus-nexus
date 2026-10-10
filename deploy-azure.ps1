# Persiapan demo Azure. Default: preflight lokal, tanpa akses/perubahan Azure.
# Resource berbayar harus sudah disiapkan dan disetujui; lihat docs/AZURE_DEPLOYMENT.md.
[CmdletBinding()]
param (
    [switch]$Deploy,
    [switch]$ApproveCosts,
    [string]$SubscriptionId,
    [string]$ResourceGroup,
    [string]$AcrName,
    [string]$EnvironmentName,
    [string]$RegistryIdentity,
    [string]$BackendName = 'api-dinusnexus',
    [string]$FrontendName = 'web-dinusnexus'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Jangan menyertakan argumen CLI dalam error: dapat berisi secret.
function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    # Docker mengirim progress ke stderr meski sukses; periksa exit code, bukan stream.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $result = & $Command @Arguments 2>$null
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($LASTEXITCODE -ne 0) {
        throw "$Command gagal (exit $LASTEXITCODE). Periksa status resource; argumen/output disembunyikan untuk melindungi secret."
    }
    return $result
}

function Get-AzureValue {
    param([string[]]$Arguments)
    return ((Invoke-Checked 'az' ($Arguments + @('--only-show-errors', '-o', 'tsv'))) -join "`n").Trim()
}

if ($Deploy -and -not $ApproveCosts) {
    throw 'Deployment memerlukan -ApproveCosts setelah anggaran dan durasi disetujui.'
}

foreach ($tool in @('docker', 'az')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool belum tersedia. Instal Docker Desktop/Azure CLI terlebih dahulu."
    }
}

foreach ($file in @('Dockerfile', 'frontend/Dockerfile', 'frontend/Dockerfile.dockerignore', 'frontend/package-lock.json', 'src/data/devices.json', 'alembic/versions/0004_user_sessions.py')) {
    if (-not (Test-Path (Join-Path $PSScriptRoot $file))) {
        throw "File wajib belum tersedia: $file"
    }
}

if (-not $Deploy) {
    Write-Host 'Preflight lokal lulus: CLI dan file wajib tersedia (belum memeriksa build/koneksi).'
    Write-Host 'Tidak ada perintah Azure, build, migrasi, atau resource berbayar yang dijalankan.'
    Write-Host 'Lanjutkan checklist docs/AZURE_DEPLOYMENT.md; -Deploy -ApproveCosts hanya setelah persetujuan.'
    return
}

foreach ($name in @('SubscriptionId', 'ResourceGroup', 'AcrName', 'EnvironmentName', 'RegistryIdentity')) {
    if ([string]::IsNullOrWhiteSpace((Get-Variable $name -ValueOnly))) {
        throw "Parameter -$name wajib untuk deployment ke resource existing."
    }
}
foreach ($name in @('DATABASE_URL', 'DINUSNEXUS_API_KEY')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "Environment $name wajib; script tidak membaca/menampilkan .env."
    }
}
if ($env:DATABASE_URL -notmatch '^postgresql\+psycopg://' -or $env:DATABASE_URL -notmatch '[?&]sslmode=(require|verify-ca|verify-full)(&|$)') {
    throw 'DATABASE_URL harus PostgreSQL psycopg dengan sslmode=require atau verifikasi sertifikat.'
}
if ($BackendName -eq $FrontendName) {
    throw 'Nama backend dan frontend harus berbeda.'
}
if ($RegistryIdentity -notmatch '/providers/Microsoft.ManagedIdentity/userAssignedIdentities/') {
    throw 'RegistryIdentity harus resource ID user-assigned managed identity dengan AcrPull pada registry.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm diperlukan untuk security audit lockfile sebelum deployment.'
}

Push-Location $PSScriptRoot
try {
    # Audit sebelum Azure/migrasi. Jangan mem-bypass advisory high/critical untuk demo publik.
    Push-Location (Join-Path $PSScriptRoot 'frontend')
    try {
        Write-Host 'Audit dependency frontend; advisory high/critical memblokir deployment...'
        $null = Invoke-Checked 'npm' @('audit', '--omit=dev', '--audit-level=high')
    } finally {
        Pop-Location
    }
    # Tidak mengubah subscription default pengguna. Semua perintah Azure diberi scope eksplisit.
    $active = Get-AzureValue @('account', 'show', '--subscription', $SubscriptionId, '--query', 'id')
    if ($active -ne $SubscriptionId) { throw 'Subscription tidak cocok. Periksa az login dan SubscriptionId.' }
    $null = Get-AzureValue @('group', 'show', '--subscription', $SubscriptionId, '--name', $ResourceGroup, '--query', 'id')
    $acrServer = Get-AzureValue @('acr', 'show', '--subscription', $SubscriptionId, '--name', $AcrName, '--query', 'loginServer')
    $null = Get-AzureValue @('containerapp', 'env', 'show', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--name', $EnvironmentName, '--query', 'id')
    $existing = @(Invoke-Checked 'az' @('containerapp', 'list', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--query', '[].name', '-o', 'tsv', '--only-show-errors'))
    if ($existing -contains $BackendName -or $existing -contains $FrontendName) {
        throw 'Nama aplikasi sudah digunakan. Script hanya untuk deploy awal; tidak menimpa revisi/secret existing.'
    }
    $null = Invoke-Checked 'docker' @('version', '--format', '{{.Server.Version}}')
    $tag = Get-Date -Format 'yyyyMMddHHmmss'
    $backendImage = "$acrServer/dinusnexus-backend:$tag"
    $frontendImage = "$acrServer/dinusnexus-frontend:$tag"
    Write-Host "Backend image: $backendImage"
    Write-Host "Frontend image: $frontendImage"

    Write-Host 'Build backend lokal (tidak memakai ACR Tasks berbayar)...'
    $null = Invoke-Checked 'docker' @('build', '--platform', 'linux/amd64', '-t', $backendImage, '.')
    # Secret diwariskan melalui environment, bukan nilai pada argumen docker.
    Write-Host 'Migrasi database demo existing. Database harus dapat dijangkau dari mesin ini.'
    $null = Invoke-Checked 'docker' @('run', '--rm', '--env', 'DATABASE_URL', $backendImage, 'alembic', 'upgrade', 'head')
    $null = Invoke-Checked 'az' @('acr', 'login', '--subscription', $SubscriptionId, '--name', $AcrName, '--only-show-errors')
    $null = Invoke-Checked 'docker' @('push', $backendImage)

    $scope = @('--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--only-show-errors', '-o', 'none')
    $common = @('--environment', $EnvironmentName, '--registry-server', $acrServer,
        '--user-assigned', $RegistryIdentity, '--registry-identity', $RegistryIdentity,
        '--ingress', 'external', '--min-replicas', '0', '--max-replicas', '1', '--cpu', '0.5', '--memory', '1Gi')
    Write-Host 'Deploy backend dengan secret references dan AI nonaktif...'
    $null = Invoke-Checked 'az' (@('containerapp', 'create', '--name', $BackendName, '--image', $backendImage,
        '--target-port', '8000', '--secrets', "database-url=$env:DATABASE_URL", "api-key=$env:DINUSNEXUS_API_KEY",
        '--env-vars', 'DATABASE_URL=secretref:database-url', 'DINUSNEXUS_API_KEY=secretref:api-key',
        'CORS_ORIGINS=https://invalid.example', 'LLM_ENABLED=false', 'LLM_FALLBACK_ENABLED=false',
        'LLM_API_KEY=', 'OPENAI_API_KEY=', 'DEBUG=false') + $common + $scope)
    $backendHost = Get-AzureValue @('containerapp', 'show', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--name', $BackendName, '--query', 'properties.configuration.ingress.fqdn')
    if (-not $backendHost) { throw 'FQDN backend belum tersedia.' }
    $backendUrl = "https://$backendHost"

    Write-Host 'Build frontend lokal, tanpa API key browser...'
    $null = Invoke-Checked 'docker' @('build', '--platform', 'linux/amd64', '-f', 'frontend/Dockerfile',
        '--build-arg', "NEXT_PUBLIC_API_BASE_URL=$backendUrl", '-t', $frontendImage, '.')
    $null = Invoke-Checked 'docker' @('push', $frontendImage)
    $null = Invoke-Checked 'az' (@('containerapp', 'create', '--name', $FrontendName, '--image', $frontendImage,
        '--target-port', '3000') + $common + $scope)
    $frontendHost = Get-AzureValue @('containerapp', 'show', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--name', $FrontendName, '--query', 'properties.configuration.ingress.fqdn')
    if (-not $frontendHost) { throw 'FQDN frontend belum tersedia.' }
    $frontendUrl = "https://$frontendHost"
    $null = Invoke-Checked 'az' (@('containerapp', 'update', '--name', $BackendName,
        '--set-env-vars', "CORS_ORIGINS=$frontendUrl") + $scope)

    $health = Invoke-RestMethod -Uri "$backendUrl/health" -TimeoutSec 90
    if ($health.status -ne 'ok') { throw 'Liveness backend gagal.' }
    Write-Host "Frontend: $frontendUrl/login"
    Write-Host "Backend: $backendUrl"
    Write-Host 'Resource dibuat dan liveness lulus; belum berarti demo end-to-end terverifikasi.'
    Write-Host 'Buat akun melalui CLI, lalu uji login, task, evidence dan history setelah restart sesuai checklist.'
    Write-Host 'Chat/analisis AI sengaja nonaktif; scale-to-zero menghilangkan conversation dalam memori.'
} catch {
    Write-Warning 'Persiapan/deploy terhenti. Resource yang sudah dibuat tidak dihapus otomatis; tinjau Portal dan biaya sebelum mencoba ulang.'
    throw
} finally {
    Pop-Location
}
