# Script de Deploy Otimizado - Ativafit Theme
param(
    [switch]$SkipBackup = $false,
    [switch]$SkipMinification = $false,
    [string]$StoreUrl = "ativafit-tech.myshopify.com"
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] $Message" -ForegroundColor $Color
}

function New-Backup {
    Write-Log "CRIANDO BACKUP..." "Cyan"
    
    try {
        $Timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
        $BackupMessage = "Backup antes do deploy otimizado - $Timestamp"
        
        Write-Log "Adicionando arquivos ao Git..." "Green"
        git add -A
        
        Write-Log "Criando commit de backup..." "Green"
        git commit -m $BackupMessage
        
        Write-Log "Criando tag de backup..." "Green"
        $TagName = "backup-$Timestamp"
        git tag $TagName
        
        Write-Log "Backup criado: $TagName" "Green"
        return $TagName
    } catch {
        Write-Log "Erro ao criar backup: $($_.Exception.Message)" "Red"
        throw
    }
}

function Invoke-Minification {
    if ($SkipMinification) {
        Write-Log "Pulando minificacao (--SkipMinification)" "Yellow"
        return
    }
    
    Write-Log "EXECUTANDO MINIFICACAO..." "Cyan"
    
    try {
        $MinifyScript = Join-Path $PSScriptRoot "minify-assets-simple.ps1"
        if (Test-Path $MinifyScript) {
            & $MinifyScript
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Minificacao concluida com sucesso" "Green"
            } else {
                throw "Minificacao falhou com codigo $LASTEXITCODE"
            }
        } else {
            throw "Script de minificacao nao encontrado: $MinifyScript"
        }
    } catch {
        Write-Log "Erro na minificacao: $($_.Exception.Message)" "Red"
        throw
    }
}

function Update-ThemeReferences {
    Write-Log "ATUALIZANDO REFERENCIAS NO TEMA..." "Cyan"
    
    try {
        $ThemeLiquid = "layout/theme.liquid"
        $ThemePageflyLiquid = "layout/theme.pagefly.liquid"
        
        if (Test-Path $ThemeLiquid) {
            Copy-Item $ThemeLiquid "$ThemeLiquid.backup" -Force
            Write-Log "Backup criado: $ThemeLiquid.backup" "Green"
        }
        
        if (Test-Path $ThemePageflyLiquid) {
            Copy-Item $ThemePageflyLiquid "$ThemePageflyLiquid.backup" -Force
            Write-Log "Backup criado: $ThemePageflyLiquid.backup" "Green"
        }
        
        if (Test-Path $ThemeLiquid) {
            Write-Log "Atualizando $ThemeLiquid..." "Green"
            $Content = Get-Content $ThemeLiquid -Raw
            
            $Content = $Content -replace "global\.css", "global.min.css"
            $Content = $Content -replace "theme\.css", "theme.min.css"
            $Content = $Content -replace "cart-drawer\.css", "cart-drawer.min.css"
            $Content = $Content -replace "barlow-override\.css", "barlow-override.min.css"
            
            $Content = $Content -replace "theme\.js", "theme.min.js"
            $Content = $Content -replace "custom\.js", "custom.min.js"
            $Content = $Content -replace "cart-drawer\.js", "cart-drawer.min.js"
            
            Set-Content $ThemeLiquid $Content -Encoding UTF8
            Write-Log "$ThemeLiquid atualizado" "Green"
        }
        
        if (Test-Path $ThemePageflyLiquid) {
            Write-Log "Atualizando $ThemePageflyLiquid..." "Green"
            $Content = Get-Content $ThemePageflyLiquid -Raw
            
            $Content = $Content -replace "global\.css", "global.min.css"
            $Content = $Content -replace "theme\.css", "theme.min.css"
            $Content = $Content -replace "cart-drawer\.css", "cart-drawer.min.css"
            $Content = $Content -replace "barlow-override\.css", "barlow-override.min.css"
            
            $Content = $Content -replace "theme\.js", "theme.min.js"
            $Content = $Content -replace "custom\.js", "custom.min.js"
            $Content = $Content -replace "cart-drawer\.js", "cart-drawer.min.js"
            
            Set-Content $ThemePageflyLiquid $Content -Encoding UTF8
            Write-Log "$ThemePageflyLiquid atualizado" "Green"
        }
        
        Write-Log "Referencias atualizadas com sucesso" "Green"
    } catch {
        Write-Log "Erro ao atualizar referencias: $($_.Exception.Message)" "Red"
        throw
    }
}

function Invoke-Deploy {
    Write-Log "FAZENDO DEPLOY PARA SHOPIFY..." "Cyan"
    
    try {
        Write-Log "Commitando mudancas..." "Green"
        git add -A
        git commit -m "Deploy otimizado - $(Get-Date -Format 'yyyy-MM-dd-HHmm')"
        
        Write-Log "Enviando para Shopify..." "Green"
        $DeployCommand = "shopify theme push --store $StoreUrl --force"
        
        Invoke-Expression $DeployCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Deploy concluido com sucesso" "Green"
        } else {
            throw "Deploy falhou com codigo $LASTEXITCODE"
        }
    } catch {
        Write-Log "Erro no deploy: $($_.Exception.Message)" "Red"
        throw
    }
}

function Test-SiteFunctionality {
    Write-Log "VERIFICANDO FUNCIONAMENTO DO SITE..." "Cyan"
    
    try {
        $TestUrl = "https://$StoreUrl"
        Write-Log "Testando: $TestUrl" "Green"
        
        $Response = Invoke-WebRequest -Uri $TestUrl -Method Head -TimeoutSec 30 -ErrorAction Stop
        
        if ($Response.StatusCode -eq 200) {
            Write-Log "Site respondendo normalmente (HTTP $($Response.StatusCode))" "Green"
        } else {
            Write-Log "Site respondendo com status: $($Response.StatusCode)" "Yellow"
        }
        
        Write-Log "Verifique manualmente:" "Yellow"
        Write-Log "  - Homepage carrega corretamente" "Yellow"
        Write-Log "  - Cart drawer funciona" "Yellow"
        Write-Log "  - Product gallery funciona" "Yellow"
        Write-Log "  - Estilos estao aplicados" "Yellow"
        
    } catch {
        Write-Log "Nao foi possivel verificar o site automaticamente" "Yellow"
        Write-Log "Verifique manualmente em: https://$StoreUrl" "Yellow"
    }
}

function Start-Deploy {
    Write-Log "=========================================" "Cyan"
    Write-Log "INICIANDO DEPLOY OTIMIZADO" "Cyan"
    Write-Log "=========================================" "Cyan"
    Write-Log "Store: $StoreUrl" "Green"
    Write-Log "Skip Backup: $SkipBackup" "Green"
    Write-Log "Skip Minification: $SkipMinification" "Green"
    
    try {
        if (-not $SkipBackup) {
            $BackupTag = New-Backup
        }
        
        Invoke-Minification
        Update-ThemeReferences
        Invoke-Deploy
        Test-SiteFunctionality
        
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        Write-Log "=========================================" "Cyan"
        Write-Log "DEPLOY CONCLUIDO COM SUCESSO!" "Green"
        Write-Log "=========================================" "Cyan"
        Write-Log "Tempo total: $($Duration.TotalMinutes.ToString('F1')) minutos" "Green"
        Write-Log "Store: https://$StoreUrl" "Green"
        
        if (-not $SkipBackup) {
            Write-Log "Backup: $BackupTag" "Green"
        }
        
        Write-Log "PROXIMOS PASSOS:" "Yellow"
        Write-Log "1. Teste o site manualmente" "Yellow"
        Write-Log "2. Verifique PageSpeed Insights" "Yellow"
        Write-Log "3. Execute nova auditoria SEMrush em 1-2 semanas" "Yellow"
        
        exit 0
        
    } catch {
        Write-Log "ERRO NO DEPLOY: $($_.Exception.Message)" "Red"
        Write-Log "Use o script rollback-simple.ps1 para reverter as mudancas" "Yellow"
        exit 1
    }
}

try {
    Start-Deploy
} catch {
    Write-Log "ERRO CRITICO: $($_.Exception.Message)" "Red"
    exit 1
}
