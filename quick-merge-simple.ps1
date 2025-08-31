# QUICK THEME MERGE - Versao Simples
param([Parameter(Mandatory=$true)][string]$StoreName)

Write-Host "QUICK MERGE INICIADO!" -ForegroundColor Green
Write-Host "Loja: $StoreName" -ForegroundColor Cyan

# 1. BACKUP
Write-Host "`nCriando backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
git add -A 2>$null
git commit -m "Auto backup - $timestamp" 2>$null
git tag "backup-$timestamp" 2>$null
Write-Host "Backup criado: backup-$timestamp" -ForegroundColor Green

# 2. BAIXAR TEMA
Write-Host "`nBaixando tema da loja..." -ForegroundColor Yellow
$upstreamDir = "_temp_upstream"
if (Test-Path $upstreamDir) { Remove-Item $upstreamDir -Recurse -Force }
New-Item -ItemType Directory -Path $upstreamDir -Force | Out-Null

Push-Location $upstreamDir
try {
    shopify theme pull --store $StoreName
    Write-Host "Tema baixado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO ao baixar tema!" -ForegroundColor Red
    Pop-Location
    Remove-Item $upstreamDir -Recurse -Force
    exit 1
}
Pop-Location

# 3. ANALISAR DIFERENCAS
Write-Host "`nAnalisando diferencas..." -ForegroundColor Yellow
$safeFiles = @()
$reviewFiles = @()

$upstreamFiles = Get-ChildItem -Recurse -Path $upstreamDir -Include "*.liquid", "*.js", "*.css"

foreach ($file in $upstreamFiles) {
    $relativePath = $file.FullName.Replace((Get-Item $upstreamDir).FullName, "").TrimStart("\")
    
    # Pular settings_data.json
    if ($relativePath -eq "config/settings_data.json") { continue }
    
    $localPath = $relativePath
    $isDifferent = $false
    
    if (-not (Test-Path $localPath)) {
        $isDifferent = $true
    } else {
        $localHash = (Get-FileHash $localPath -ErrorAction SilentlyContinue).Hash
        $upstreamHash = (Get-FileHash $file.FullName -ErrorAction SilentlyContinue).Hash
        if ($localHash -ne $upstreamHash) {
            $isDifferent = $true
        }
    }
    
    if ($isDifferent) {
        # Arquivos seguros
        if ($relativePath -match "^assets/.*\.(css|js|svg|png|jpg|woff)$") {
            $safeFiles += $relativePath
        } else {
            $reviewFiles += $relativePath
        }
    }
}

Write-Host "Seguros para aplicar: $($safeFiles.Count)" -ForegroundColor Green
Write-Host "Precisam revisao: $($reviewFiles.Count)" -ForegroundColor Yellow

# 4. APLICAR SEGUROS
if ($safeFiles.Count -gt 0) {
    Write-Host "`nAplicando mudancas seguras..." -ForegroundColor Yellow
    foreach ($file in $safeFiles) {
        $sourcePath = Join-Path $upstreamDir $file
        $targetPath = $file
        $targetDir = Split-Path $targetPath -Parent
        if ($targetDir -and -not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $sourcePath $targetPath -Force
        Write-Host "  Aplicado: $file" -ForegroundColor Green
    }
}

# 5. CRIAR REVIEW PACK
if ($reviewFiles.Count -gt 0) {
    Write-Host "`nCriando pack para revisao..." -ForegroundColor Yellow
    $reviewDir = "REVIEW_$timestamp"
    New-Item -ItemType Directory -Path $reviewDir -Force | Out-Null
    
    foreach ($file in $reviewFiles) {
        $sourcePath = Join-Path $upstreamDir $file
        $reviewPath = Join-Path $reviewDir $file
        $reviewDirPath = Split-Path $reviewPath -Parent
        if (-not (Test-Path $reviewDirPath)) {
            New-Item -ItemType Directory -Path $reviewDirPath -Force | Out-Null
        }
        Copy-Item $sourcePath $reviewPath -Force
    }
    
    "# ARQUIVOS PARA REVISAO - $timestamp`n`nTotal: $($reviewFiles.Count) arquivos`n`n" + 
    ($reviewFiles | ForEach-Object { "- $_" } | Out-String) | 
    Out-File (Join-Path $reviewDir "README.txt") -Encoding UTF8
    
    Write-Host "Pack criado: $reviewDir/" -ForegroundColor Green
}

# 6. LIMPEZA
Remove-Item $upstreamDir -Recurse -Force

# 7. RESUMO
Write-Host "`nMERGE CONCLUIDO!" -ForegroundColor Green
Write-Host "Aplicados automaticamente: $($safeFiles.Count) arquivos" -ForegroundColor Green
if ($reviewFiles.Count -gt 0) {
    Write-Host "Para revisao manual: $($reviewFiles.Count) arquivos (pasta: REVIEW_$timestamp)" -ForegroundColor Yellow
}
Write-Host "Backup disponivel: backup-$timestamp" -ForegroundColor Cyan

Write-Host "`nROLLBACK (se necessario):" -ForegroundColor Red
Write-Host "git reset --hard backup-$timestamp" -ForegroundColor White
