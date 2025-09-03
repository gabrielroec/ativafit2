# ========================================
# SCRIPT DE ROLLBACK
# Ativafit Theme Optimization
# ========================================

param(
    [string]$BackupTag = "",
    [switch]$ListBackups = $false,
    [switch]$Force = $false
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

# Função para listar backups disponíveis
function Get-AvailableBackups {
    Write-Log "`n📋 BACKUPS DISPONÍVEIS:" $Cyan
    
    try {
        $Tags = git tag -l "backup-*" | Sort-Object -Descending
        
        if ($Tags.Count -eq 0) {
            Write-Log "  ❌ Nenhum backup encontrado" $Red
            return @()
        }
        
        $BackupList = @()
        $Index = 1
        
        foreach ($Tag in $Tags) {
            $TagInfo = git show --no-patch --format="%H|%ci|%s" $Tag
            $Parts = $TagInfo -split '\|'
            $Hash = $Parts[0].Substring(0, 8)
            $Date = $Parts[1]
            $Message = $Parts[2]
            
            Write-Log "  $Index. $Tag" $Green
            Write-Log "     Hash: $Hash" $Yellow
            Write-Log "     Data: $Date" $Yellow
            Write-Log "     Mensagem: $Message" $Yellow
            Write-Log ""
            
            $BackupList += @{
                Tag = $Tag
                Hash = $Hash
                Date = $Date
                Message = $Message
            }
            
            $Index++
        }
        
        return $BackupList
    } catch {
        Write-Log "  ❌ Erro ao listar backups: $($_.Exception.Message)" $Red
        return @()
    }
}

# Função para restaurar backup
function Restore-Backup {
    param([string]$Tag)
    
    Write-Log "`n🔄 RESTAURANDO BACKUP: $Tag" $Cyan
    
    try {
        # Verificar se tag existe
        $TagExists = git tag -l $Tag
        if (-not $TagExists) {
            throw "Tag de backup não encontrada: $Tag"
        }
        
        # Confirmar rollback
        if (-not $Force) {
            Write-Log "⚠️  ATENÇÃO: Esta operação irá reverter todas as mudanças!" $Yellow
            Write-Log "Você tem certeza que deseja continuar? (s/N)" $Yellow
            $Confirmation = Read-Host
            
            if ($Confirmation -ne "s" -and $Confirmation -ne "S" -and $Confirmation -ne "sim") {
                Write-Log "❌ Rollback cancelado pelo usuário" $Red
                return $false
            }
        }
        
        # Fazer checkout do backup
        Write-Log "  🔄 Fazendo checkout do backup..." $Green
        git checkout $Tag
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "  ✅ Checkout concluído" $Green
        } else {
            throw "Erro no checkout do backup"
        }
        
        # Restaurar arquivos de backup se existirem
        $ThemeLiquidBackup = "layout/theme.liquid.backup"
        $ThemePageflyLiquidBackup = "layout/theme.pagefly.liquid.backup"
        
        if (Test-Path $ThemeLiquidBackup) {
            Write-Log "  🔄 Restaurando theme.liquid..." $Green
            Copy-Item $ThemeLiquidBackup "layout/theme.liquid" -Force
            Remove-Item $ThemeLiquidBackup -Force
        }
        
        if (Test-Path $ThemePageflyLiquidBackup) {
            Write-Log "  🔄 Restaurando theme.pagefly.liquid..." $Green
            Copy-Item $ThemePageflyLiquidBackup "layout/theme.pagefly.liquid" -Force
            Remove-Item $ThemePageflyLiquidBackup -Force
        }
        
        # Remover arquivos minificados
        Write-Log "  🗑️  Removendo arquivos minificados..." $Green
        $MinFiles = Get-ChildItem -Path "assets" -Filter "*.min.*" -Recurse
        foreach ($File in $MinFiles) {
            Remove-Item $File.FullName -Force
            Write-Log "    Removido: $($File.Name)" $Yellow
        }
        
        # Commit da restauração
        Write-Log "  📝 Commitando restauração..." $Green
        git add -A
        git commit -m "Rollback para $Tag - $(Get-Date -Format 'yyyy-MM-dd-HHmm')"
        
        Write-Log "  ✅ Backup restaurado com sucesso" $Green
        return $true
        
    } catch {
        Write-Log "  ❌ Erro ao restaurar backup: $($_.Exception.Message)" $Red
        return $false
    }
}

# Função para fazer deploy do rollback
function Deploy-Rollback {
    Write-Log "`n🚀 FAZENDO DEPLOY DO ROLLBACK..." $Cyan
    
    try {
        # Deploy usando Shopify CLI
        Write-Log "  🚀 Enviando rollback para Shopify..." $Green
        $DeployCommand = "shopify theme push --store ativafit-tech.myshopify.com --force"
        
        Invoke-Expression $DeployCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "  ✅ Deploy do rollback concluído" $Green
        } else {
            throw "Deploy do rollback falhou com código $LASTEXITCODE"
        }
    } catch {
        Write-Log "  ❌ Erro no deploy do rollback: $($_.Exception.Message)" $Red
        throw
    }
}

# Função para verificar funcionamento após rollback
function Test-RollbackFunctionality {
    Write-Log "`n🔍 VERIFICANDO FUNCIONAMENTO APÓS ROLLBACK..." $Cyan
    
    try {
        $TestUrl = "https://ativafit-tech.myshopify.com"
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
        Write-Log "    - Funcionalidades estão funcionando" $Yellow
        Write-Log "    - Estilos estão aplicados" $Yellow
        
    } catch {
        Write-Log "  ⚠️  Não foi possível verificar o site automaticamente" $Yellow
        Write-Log "  📋 Verifique manualmente em: https://ativafit-tech.myshopify.com" $Yellow
    }
}

# Função principal
function Start-Rollback {
    Write-Log "=========================================" $Cyan
    Write-Log "🔄 INICIANDO ROLLBACK" $Cyan
    Write-Log "=========================================" $Cyan
    
    try {
        # Listar backups se solicitado
        if ($ListBackups) {
            $Backups = Get-AvailableBackups
            if ($Backups.Count -eq 0) {
                Write-Log "❌ Nenhum backup disponível para rollback" $Red
                exit 1
            }
            exit 0
        }
        
        # Se não especificou tag, listar e pedir para escolher
        if ([string]::IsNullOrEmpty($BackupTag)) {
            $Backups = Get-AvailableBackups
            if ($Backups.Count -eq 0) {
                Write-Log "❌ Nenhum backup disponível para rollback" $Red
                exit 1
            }
            
            Write-Log "`nDigite o número do backup que deseja restaurar:" $Yellow
            $Choice = Read-Host
            
            if ([int]::TryParse($Choice, [ref]$null) -and [int]$Choice -ge 1 -and [int]$Choice -le $Backups.Count) {
                $BackupTag = $Backups[[int]$Choice - 1].Tag
            } else {
                Write-Log "❌ Escolha inválida" $Red
                exit 1
            }
        }
        
        # Restaurar backup
        $RestoreSuccess = Restore-Backup $BackupTag
        if (-not $RestoreSuccess) {
            Write-Log "❌ Falha na restauração do backup" $Red
            exit 1
        }
        
        # Deploy do rollback
        Deploy-Rollback
        
        # Verificar funcionamento
        Test-RollbackFunctionality
        
        # Relatório final
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        Write-Log "`n=========================================" $Cyan
        Write-Log "✅ ROLLBACK CONCLUÍDO COM SUCESSO!" $Green
        Write-Log "=========================================" $Cyan
        Write-Log "Backup restaurado: $BackupTag" $Green
        Write-Log "Tempo total: $($Duration.TotalMinutes.ToString('F1')) minutos" $Green
        Write-Log "Site: https://ativafit-tech.myshopify.com" $Green
        
        Write-Log "`n📋 O site foi restaurado para o estado anterior" $Yellow
        Write-Log "Todas as otimizações foram revertidas" $Yellow
        
        exit 0
        
    } catch {
        Write-Log "`n❌ ERRO NO ROLLBACK: $($_.Exception.Message)" $Red
        Write-Log "`n🆘 Se o problema persistir, contate o suporte técnico" $Yellow
        exit 1
    }
}

# Executar script
try {
    Start-Rollback
} catch {
    Write-Log "❌ ERRO CRÍTICO: $($_.Exception.Message)" $Red
    exit 1
}
