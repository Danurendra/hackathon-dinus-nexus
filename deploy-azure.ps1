# ==============================================================================
# DinusNexus Azure Deployment Script (Hemat & Efektif)
# Memanfaatkan Azure Container Apps (Consumption / Serverless) + PostgreSQL
# ==============================================================================

param (
    [string]$ResourceGroup = "rg-dinusnexus",
    [string]$Location = "southeastasia",
    [string]$AcrName = "acrdinusnexus$((Get-Random -Maximum 9999).ToString('D4'))",
    [string]$DbAdmin = "dinusadmin",
    [string]$DbPassword = "DinusNexus2026!",
    [string]$ApiKey = "06431bfc490640038e877c92db706484107b30932b9e48f584ed9030b68f3638"
)

Write-Host "=== 1. Membuat Resource Group di Azure ($Location) ===" -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

Write-Host "=== 2. Membuat Azure Container Registry (Basic - Hemat ~$0.16/hari) ===" -ForegroundColor Cyan
az acr create --resource-group $ResourceGroup --name $AcrName --sku Basic --admin-enabled true

$acrServer = "$AcrName.azurecr.io"
$acrPassword = (az acr credential show --name $AcrName --query "passwords[0].value" -o tsv)

Write-Host "=== 3. Build Image Backend di Cloud (az acr build) ===" -ForegroundColor Cyan
# Build langsung di cloud Azure tanpa perlu Docker Desktop lokal!
az acr build --registry $AcrName --image dinusnexus-backend:latest .

Write-Host "=== 4. Membuat Azure Container Apps Environment ===" -ForegroundColor Cyan
az containerapp env create `
  --name env-dinusnexus `
  --resource-group $ResourceGroup `
  --location $Location

Write-Host "=== 5. Deploy Backend Container App ===" -ForegroundColor Cyan
az containerapp create `
  --name api-dinusnexus `
  --resource-group $ResourceGroup `
  --environment env-dinusnexus `
  --image "$acrServer/dinusnexus-backend:latest" `
  --registry-server $acrServer `
  --registry-username $AcrName `
  --registry-password $acrPassword `
  --target-port 8000 `
  --ingress external `
  --min-replicas 0 `
  --max-replicas 1 `
  --env-vars `
    "DINUSNEXUS_API_KEY=$ApiKey" `
    "CORS_ORIGINS=*"

$backendFqdn = (az containerapp show --name api-dinusnexus --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv)
$backendUrl = "https://$backendFqdn"
Write-Host "Backend URL: $backendUrl" -ForegroundColor Green

Write-Host "=== 6. Build Image Frontend di Cloud dengan URL Backend Baru ===" -ForegroundColor Cyan
az acr build `
  --registry $AcrName `
  --image dinusnexus-frontend:latest `
  --build-arg "NEXT_PUBLIC_API_BASE_URL=$backendUrl" `
  --build-arg "NEXT_PUBLIC_DINUSNEXUS_API_KEY=$ApiKey" `
  ./frontend

Write-Host "=== 7. Deploy Frontend Container App ===" -ForegroundColor Cyan
az containerapp create `
  --name web-dinusnexus `
  --resource-group $ResourceGroup `
  --environment env-dinusnexus `
  --image "$acrServer/dinusnexus-frontend:latest" `
  --registry-server $acrServer `
  --registry-username $AcrName `
  --registry-password $acrPassword `
  --target-port 3000 `
  --ingress external `
  --min-replicas 0 `
  --max-replicas 1

$frontendFqdn = (az containerapp show --name web-dinusnexus --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv)
$frontendUrl = "https://$frontendFqdn"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT DINUSNEXUS KE AZURE BERHASIL! " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Frontend Web URL: $frontendUrl" -ForegroundColor Yellow
Write-Host "Backend API URL:  $backendUrl" -ForegroundColor Yellow
Write-Host "Swagger Docs URL: $backendUrl/docs" -ForegroundColor Yellow
Write-Host "Catatan: Container diatur min-replicas=0 (auto scale to 0) agar menghemat kredit Azure Anda!" -ForegroundColor Cyan
