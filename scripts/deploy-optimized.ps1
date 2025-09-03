# ========================================
# SCRIPT DE DEPLOY OTIMIZADO
# Ativafit Theme Optimization
# ========================================

param(
    [switch]$Verbose = $false,
    [switch]$SkipBackup = $false,
    [switch]$SkipMinification = $false,
    [string]$StoreUrl = "ativafit-tech.myshopify.com"
)

# Configurações
$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Cores para output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

# Função para log colorido
function Write-Log {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    if ($Color -eq "White") {
        Write-Host $LogMessage
    } else {
        Write-Host $LogMessage -ForegroundColor $Color
    }
}

# Função para criar backup
function New-Backup {
    Write-Log "`n💾 CRIANDO BACKUP..." $Cyan
    
    try {
        $Timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
        $BackupMessage = "Backup antes do deploy otimizado - $Timestamp"
        
        # Git add
        Write-Log "  📝 Adicionando arquivos ao Git..." $Green
        git add -A
        
        # Git commit
        Write-Log "  💾 Criando commit de backup..." $Green
        git commit -m $BackupMessage
        
        # Git tag
        Write-Log "  🏷️  Criando tag de backup..." $Green
        $TagName = "backup-$Timestamp"
        git tag $TagName
        
        Write-Log "  ✅ Backup criado: $TagName" $Green
        return $TagName
    } catch {
        Write-Log "  ❌ Erro ao criar backup: $($_.Exception.Message)" $Red
        throw
    }
}

# Função para executar minificação
function Invoke-Minification {
    if ($SkipMinification) {
        Write-Log "⏭️  Pulando minificação (--SkipMinification)" $Yellow
        return
    }
    
    Write-Log "`n🔧 EXECUTANDO MINIFICAÇÃO..." $Cyan
    
    try {
        $MinifyScript = Join-Path $PSScriptRoot "minify-assets.ps1"
        if (Test-Path $MinifyScript) {
            & $MinifyScript
            if ($LASTEXITCODE -eq 0) {
                Write-Log "  ✅ Minificação concluída com sucesso" $Green
            } else {
                throw "Minificação falhou com código $LASTEXITCODE"
            }
        } else {
            throw "Script de minificação não encontrado: $MinifyScript"
        }
    } catch {
        Write-Log "  ❌ Erro na minificação: $($_.Exception.Message)" $Red
        throw
    }
}

# Função para atualizar referências no tema
function Update-ThemeReferences {
    Write-Log "`n🔄 ATUALIZANDO REFERÊNCIAS NO TEMA..." $Cyan
    
    try {
        # Backup das referências originais
        $ThemeLiquid = "layout/theme.liquid"
        $ThemePageflyLiquid = "layout/theme.pagefly.liquid"
        
        if (Test-Path $ThemeLiquid) {
            Copy-Item $ThemeLiquid "$ThemeLiquid.backup" -Force
            Write-Log "  📋 Backup criado: $ThemeLiquid.backup" $Green
        }
        
        if (Test-Path $ThemePageflyLiquid) {
            Copy-Item $ThemePageflyLiquid "$ThemePageflyLiquid.backup" -Force
            Write-Log "  📋 Backup criado: $ThemePageflyLiquid.backup" $Green
        }
        
        # Atualizar theme.liquid
        if (Test-Path $ThemeLiquid) {
            Write-Log "  🔄 Atualizando $ThemeLiquid..." $Green
            $Content = Get-Content $ThemeLiquid -Raw
            
            # Substituir referências CSS
            $Content = $Content -replace "global\.css", "global.min.css"
            $Content = $Content -replace "theme\.css", "theme.min.css"
            $Content = $Content -replace "cart-drawer\.css", "cart-drawer.min.css"
            $Content = $Content -replace "barlow-override\.css", "barlow-override.min.css"
            
            # Substituir referências JS
            $Content = $Content -replace "theme\.js", "theme.min.js"
            $Content = $Content -replace "custom\.js", "custom.min.js"
            $Content = $Content -replace "cart-drawer\.js", "cart-drawer.min.js"
            
            Set-Content $ThemeLiquid $Content -Encoding UTF8
            Write-Log "  ✅ $ThemeLiquid atualizado" $Green
        }
        
        # Atualizar theme.pagefly.liquid
        if (Test-Path $ThemePageflyLiquid) {
            Write-Log "  🔄 Atualizando $ThemePageflyLiquid..." $Green
            $Content = Get-Content $ThemePageflyLiquid -Raw
            
            # Substituir referências CSS
            $Content = $Content -replace "global\.css", "global.min.css"
            $Content = $Content -replace "theme\.css", "theme.min.css"
            $Content = $Content -replace "cart-drawer\.css", "cart-drawer.min.css"
            $Content = $Content -replace "barlow-override\.css", "barlow-override.min.css"
            
            # Substituir referências JS
            $Content = $Content -replace "theme\.js", "theme.min.js"
            $Content = $Content -replace "custom\.js", "custom.min.js"
            $Content = $Content -replace "cart-drawer\.js", "cart-drawer.min.js"
            
            Set-Content $ThemePageflyLiquid $Content -Encoding UTF8
            Write-Log "  ✅ $ThemePageflyLiquid atualizado" $Green
        }
        
        Write-Log "  ✅ Referências atualizadas com sucesso" $Green
    } catch {
        Write-Log "  ❌ Erro ao atualizar referências: $($_.Exception.Message)" $Red
        throw
    }
}

# Função para fazer deploy
function Invoke-Deploy {
    Write-Log "`n🚀 FAZENDO DEPLOY PARA SHOPIFY..." $Cyan
    
    try {
        # Commit das mudanças
        Write-Log "  📝 Commitando mudanças..." $Green
        git add -A
        git commit -m "Deploy otimizado - $(Get-Date -Format 'yyyy-MM-dd-HHmm')"
        
        # Deploy usando Shopify CLI
        Write-Log "  🚀 Enviando para Shopify..." $Green
        $DeployCommand = "shopify theme push --store $StoreUrl --force"
        
        if ($Verbose) {
            Write-Log "  Executando: $DeployCommand" $Yellow
        }
        
        Invoke-Expression $DeployCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "  ✅ Deploy concluído com sucesso" $Green
        } else {
            throw "Deploy falhou com código $LASTEXITCODE"
        }
    } catch {
        Write-Log "  ❌ Erro no deploy: $($_.Exception.Message)" $Red
        throw
    }
}

# Função para verificar funcionamento
function Test-SiteFunctionality {
    Write-Log "`n🔍 VERIFICANDO FUNCIONAMENTO DO SITE..." $Cyan
    
    try {
        $TestUrl = "https://$StoreUrl"
        Write-Log "  🌐 Testando: $TestUrl" $Green
        
        # Teste básico de conectividade
        $Response = Invoke-WebRequest -Uri $TestUrl -Method Head -TimeoutSec 30 -ErrorAction Stop
        
        if ($Response.StatusCode -eq 200) {
            Write-Log "  ✅ Site respondendo normalmente (HTTP $($Response.StatusCode))" $Green
        } else {
            Write-Log "  ⚠️  Site respondendo com status: $($Response.StatusCode)" $Yellow
        }
        
        Write-Log "  📋 Verifique manualmente:" $Yellow
        Write-Log "    - Homepage carrega corretamente" $Yellow
        Write-Log "    - Cart drawer funciona" $Yellow
        Write-Log "    - Product gallery funciona" $Yellow
        Write-Log "    - Estilos estão aplicados" $Yellow
        
    } catch {
        Write-Log "  ⚠️  Não foi possível verificar o site automaticamente" $Yellow
        Write-Log "  📋 Verifique manualmente em: https://$StoreUrl" $Yellow
    }
}

# Função principal
function Start-Deploy {
    Write-Log "=========================================" $Cyan
    Write-Log "🚀 INICIANDO DEPLOY OTIMIZADO" $Cyan
    Write-Log "=========================================" $Cyan
    Write-Log "Store: $StoreUrl" $Green
    Write-Log "Skip Backup: $SkipBackup" $Green
    Write-Log "Skip Minification: $SkipMinification" $Green
    
    try {
        # 1. Backup
        if (-not $SkipBackup) {
            $BackupTag = New-Backup
        }
        
        # 2. Minificação
        Invoke-Minification
        
        # 3. Atualizar referências
        Update-ThemeReferences
        
        # 4. Deploy
        Invoke-Deploy
        
        # 5. Verificar funcionamento
        Test-SiteFunctionality
        
        # Relatório final
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        Write-Log "`n=========================================" $Cyan
        Write-Log "✅ DEPLOY CONCLUÍDO COM SUCESSO!" $Green
        Write-Log "=========================================" $Cyan
        Write-Log "Tempo total: $($Duration.TotalMinutes.ToString('F1')) minutos" $Green
        Write-Log "Store: https://$StoreUrl" $Green
        
        if (-not $SkipBackup) {
            Write-Log "Backup: $BackupTag" $Green
        }
        
        Write-Log "`n📋 PRÓXIMOS PASSOS:" $Yellow
        Write-Log "1. Teste o site manualmente" $Yellow
        Write-Log "2. Verifique PageSpeed Insights" $Yellow
        Write-Log "3. Execute nova auditoria SEMrush em 1-2 semanas" $Yellow
        
        exit 0
        
    } catch {
        Write-Log "`n❌ ERRO NO DEPLOY: $($_.Exception.Message)" $Red
        Write-Log "`n🔄 Use o script rollback.ps1 para reverter as mudanças" $Yellow
        exit 1
    }
}

# Executar script
try {
    Start-Deploy
} catch {
    Write-Log "❌ ERRO CRÍTICO: $($_.Exception.Message)" $Red
    exit 1
}
