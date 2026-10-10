# Regression tanpa Pester, Docker daemon, Azure login, database, atau AI live.
# Jalankan dari root: powershell -NoProfile -File tests/test_azure_deployment.ps1
$ErrorActionPreference = 'Stop'
$script:deployScript = Join-Path (Split-Path $PSScriptRoot -Parent) 'deploy-azure.ps1'
$global:azurePrepCalls = [System.Collections.Generic.List[object]]::new()
$global:azurePrepFailBuild = $false
$global:azurePrepFailAudit = $false

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

# Fungsi ini menimpa executable pada scope test; tidak ada perintah cloud nyata.
function docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
    $global:azurePrepCalls.Add(@{ tool = 'docker'; arguments = $CliArgs })
    $global:LASTEXITCODE = 0
    if ($global:azurePrepFailBuild -and $CliArgs[0] -eq 'build') {
        $global:LASTEXITCODE = 42
        Write-Output 'sensitive-output-must-not-leak'
    }
}

function az {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
    $global:azurePrepCalls.Add(@{ tool = 'az'; arguments = $CliArgs })
    $global:LASTEXITCODE = 0
    $command = $CliArgs -join ' '
    if ($command -like 'account show*') { return '00000000-0000-0000-0000-000000000000' }
    if ($command -like 'acr show*') { return 'demo.azurecr.io' }
    if ($command -like 'containerapp list*') { return 'unrelated-team-app' }
    if ($command -like 'containerapp show*') {
        if ($CliArgs -contains 'api-dinusnexus') { return 'api.example.test' }
        return 'web.example.test'
    }
    return 'resource-id'
}

function npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
    $global:azurePrepCalls.Add(@{ tool = 'npm'; arguments = $CliArgs })
    $global:LASTEXITCODE = 0
    if ($global:azurePrepFailAudit) { $global:LASTEXITCODE = 1 }
}

function Invoke-RestMethod {
    param([string]$Uri, [int]$TimeoutSec)
    Assert-True ($Uri -eq 'https://api.example.test/health') 'Health URL salah.'
    return @{ status = 'ok' }
}

function Assert-Blocked {
    param([hashtable]$Parameters, [string]$Expected)
    $global:azurePrepCalls.Clear()
    $caught = $false
    try { & $script:deployScript @Parameters } catch {
        $caught = $true
        Assert-True ($_.Exception.Message -like "*$Expected*") 'Error guard tidak cocok.'
    }
    Assert-True $caught 'Deployment seharusnya diblokir.'
    Assert-True ($global:azurePrepCalls.Count -eq 0) 'Guard memanggil Docker/Azure sebelum validasi selesai.'
}

$oldDatabase = $env:DATABASE_URL
$oldKey = $env:DINUSNEXUS_API_KEY
try {
    & $script:deployScript
    Assert-True ($global:azurePrepCalls.Count -eq 0) 'Preflight default tidak boleh memanggil executable.'
    Write-Host 'PASS: preflight default tanpa operasi eksternal'

    Assert-Blocked @{ Deploy = $true } '-ApproveCosts'
    Assert-Blocked @{ Deploy = $true; ApproveCosts = $true } '-SubscriptionId'
    Write-Host 'PASS: guard persetujuan biaya dan parameter wajib'

    $parameters = @{
        Deploy = $true; ApproveCosts = $true
        SubscriptionId = '00000000-0000-0000-0000-000000000000'
        ResourceGroup = 'rg-demo'; AcrName = 'demo'; EnvironmentName = 'env-demo'
        RegistryIdentity = '/subscriptions/test/resourceGroups/rg-demo/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pull-demo'
    }
    $env:DATABASE_URL = ''
    $env:DINUSNEXUS_API_KEY = 'dummy-test-key'
    Assert-Blocked $parameters 'Environment DATABASE_URL'
    $env:DATABASE_URL = 'postgresql+psycopg://test:test@db.example.test/demo'
    Assert-Blocked $parameters 'sslmode'
    $env:DATABASE_URL += '?sslmode=require'
    $sameNames = $parameters.Clone()
    $sameNames.BackendName = 'same-app'
    $sameNames.FrontendName = 'same-app'
    Assert-Blocked $sameNames 'harus berbeda'
    Write-Host 'PASS: guard environment, TLS dan nama aplikasi'

    $global:azurePrepCalls.Clear()
    & $script:deployScript @parameters
    $migrate = -1
    $firstCreate = -1
    for ($i = 0; $i -lt $global:azurePrepCalls.Count; $i++) {
        $call = $global:azurePrepCalls[$i]
        $argsText = $call.arguments -join ' '
        if ($call.tool -eq 'docker' -and $argsText -like 'run*alembic upgrade head') { $migrate = $i }
        if ($call.tool -eq 'az') {
            Assert-True ($call.arguments -contains '--subscription') 'Perintah Azure tanpa scope subscription.'
            Assert-True ($argsText -notlike '*credential show*') 'Tidak boleh mengambil password ACR.'
            Assert-True ($argsText -notlike '*group create*' -and $argsText -notlike '*acr create*' -and $argsText -notlike '*env create*') 'Tidak boleh membuat infrastruktur otomatis.'
        }
        if ($argsText -like 'containerapp create*') {
            if ($firstCreate -eq -1) { $firstCreate = $i }
            Assert-True ($call.arguments -contains '--registry-identity') 'Registry harus memakai managed identity.'
            if ($call.arguments -contains 'api-dinusnexus') {
                Assert-True ($call.arguments -contains 'DATABASE_URL=secretref:database-url') 'Database harus secret reference.'
                Assert-True ($call.arguments -contains 'LLM_FALLBACK_ENABLED=false') 'Fallback AI harus nonaktif.'
            }
        }
        Assert-True ($argsText -notlike '*NEXT_PUBLIC_DINUSNEXUS_API_KEY*') 'API key tidak boleh masuk build frontend.'
        if ($call.tool -eq 'docker' -and $argsText -like 'build*frontend/Dockerfile*') {
            Assert-True ($call.arguments[-1] -eq '.') 'Context frontend harus root repo.'
        }
    }
    Assert-True ($migrate -ge 0 -and $migrate -lt $firstCreate) 'Migrasi harus mendahului deployment API.'
    $corsUpdated = @($global:azurePrepCalls | Where-Object { $_.arguments -contains 'CORS_ORIGINS=https://web.example.test' })
    Assert-True ($corsUpdated.Count -eq 1) 'CORS harus origin frontend exact.'
    Write-Host 'PASS: alur deployment dimock, migrasi, scope, identity, secret, build dan CORS'

    $global:azurePrepCalls.Clear()
    $global:azurePrepFailBuild = $true
    $caught = $false
    try { & $script:deployScript @parameters } catch {
        $caught = $true
        Assert-True ($_.Exception.Message -like '*exit 42*') 'Exit code gagal tidak diteruskan.'
        Assert-True ($_.Exception.Message -notlike '*sensitive-output*') 'Output sensitif bocor ke error.'
    }
    Assert-True $caught 'Build gagal harus menghentikan script.'
    $creates = @($global:azurePrepCalls | Where-Object { ($_.arguments -join ' ') -like 'containerapp create*' })
    Assert-True ($creates.Count -eq 0) 'Build gagal tidak boleh melanjutkan deployment.'
    Write-Host 'PASS: fail-fast tanpa membocorkan output'

    $global:azurePrepCalls.Clear()
    $global:azurePrepFailBuild = $false
    $global:azurePrepFailAudit = $true
    $caught = $false
    try { & $script:deployScript @parameters } catch {
        $caught = $true
        Assert-True ($_.Exception.Message -like '*npm gagal*') 'Audit gagal tidak diteruskan.'
    }
    Assert-True $caught 'Audit gagal harus memblokir deploy.'
    Assert-True ($global:azurePrepCalls.Count -eq 1 -and $global:azurePrepCalls[0].tool -eq 'npm') 'Audit gagal tidak boleh memanggil Azure/Docker/migrasi.'
    Write-Host 'PASS: security audit memblokir deploy sebelum operasi Azure'
} finally {
    $env:DATABASE_URL = $oldDatabase
    $env:DINUSNEXUS_API_KEY = $oldKey
    Remove-Variable azurePrepCalls, azurePrepFailBuild, azurePrepFailAudit -Scope Global
}
