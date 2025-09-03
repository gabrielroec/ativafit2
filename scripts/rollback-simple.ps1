# Script de Rollback - Ativafit Theme
param(
    [string]$BackupTag = "",
    [switch]$ListBackups = $false,
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] $Message" -ForegroundColor $Color
}

function Get-AvailableBackups {
    Write-Log "BACKUPS DISPONIVEIS:" "Cyan"
    
    try {
        $Tags = git tag -l "backup-*" | Sort-Object -Descending
        
        if ($Tags.Count -eq 0) {
            Write-Log "Nenhum backup encontrado" "Red"
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
            
            Write-Log "$Index. $Tag" "Green"
            Write-Log "   Hash: $Hash" "Yellow"
            Write-Log "   Data: $Date" "Yellow"
            Write-Log "   Mensagem: $Message" "Yellow"
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
        Write-Log "Erro ao listar backups: $($_.Exception.Message)" "Red"
        return @()
    }
}

function Restore-Backup {
    param([string]$Tag)
    
    Write-Log "RESTAURANDO BACKUP: $Tag" "Cyan"
    
    try {
        $TagExists = git tag -l $Tag
        if (-not $TagExists) {
            throw "Tag de backup nao encontrada: $Tag"
        }
        
        if (-not $Force) {
            Write-Log "ATENCAO: Esta operacao ira reverter todas as mudancas!" "Yellow"
            Write-Log "Voce tem certeza que deseja continuar? (s/N)" "Yellow"
            $Confirmation = Read-Host
            
            if ($Confirmation -ne "s" -and $Confirmation -ne "S" -and $Confirmation -ne "sim") {
                Write-Log "Rollback cancelado pelo usuario" "Red"
                return $false
            }
        }
        
        Write-Log "Fazendo checkout do backup..." "Green"
        git checkout $Tag
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Checkout concluido" "Green"
        } else {
            throw "Erro no checkout do backup"
        }
        
        $ThemeLiquidBackup = "layout/theme.liquid.backup"
        $ThemePageflyLiquidBackup = "layout/theme.pagefly.liquid.backup"
        
        if (Test-Path $ThemeLiquidBackup) {
            Write-Log "Restaurando theme.liquid..." "Green"
            Copy-Item $ThemeLiquidBackup "layout/theme.liquid" -Force
            Remove-Item $ThemeLiquidBackup -Force
        }
        
        if (Test-Path $ThemePageflyLiquidBackup) {
            Write-Log "Restaurando theme.pagefly.liquid..." "Green"
            Copy-Item $ThemePageflyLiquidBackup "layout/theme.pagefly.liquid" -Force
            Remove-Item $ThemePageflyLiquidBackup -Force
        }
        
        Write-Log "Removendo arquivos minificados..." "Green"
        $MinFiles = Get-ChildItem -Path "assets" -Filter "*.min.*" -Recurse
        foreach ($File in $MinFiles) {
            Remove-Item $File.FullName -Force
            Write-Log "  Removido: $($File.Name)" "Yellow"
        }
        
        Write-Log "Commitando restauracao..." "Green"
        git add -A
        git commit -m "Rollback para $Tag - $(Get-Date -Format 'yyyy-MM-dd-HHmm')"
        
        Write-Log "Backup restaurado com sucesso" "Green"
        return $true
        
    } catch {
        Write-Log "Erro ao restaurar backup: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Deploy-Rollback {
    Write-Log "FAZENDO DEPLOY DO ROLLBACK..." "Cyan"
    
    try {
        Write-Log "Enviando rollback para Shopify..." "Green"
        $DeployCommand = "shopify theme push --store ativafit-tech.myshopify.com --force"
        
        Invoke-Expression $DeployCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Deploy do rollback concluido" "Green"
        } else {
            throw "Deploy do rollback falhou com codigo $LASTEXITCODE"
        }
    } catch {
        Write-Log "Erro no deploy do rollback: $($_.Exception.Message)" "Red"
        throw
    }
}

function Test-RollbackFunctionality {
    Write-Log "VERIFICANDO FUNCIONAMENTO APOS ROLLBACK..." "Cyan"
    
    try {
        $TestUrl = "https://ativafit-tech.myshopify.com"
        Write-Log "Testando: $TestUrl" "Green"
        
        $Response = Invoke-WebRequest -Uri $TestUrl -Method Head -TimeoutSec 30 -ErrorAction Stop
        
        if ($Response.StatusCode -eq 200) {
            Write-Log "Site respondendo normalmente (HTTP $($Response.StatusCode))" "Green"
        } else {
            Write-Log "Site respondendo com status: $($Response.StatusCode)" "Yellow"
        }
        
        Write-Log "Verifique manualmente:" "Yellow"
        Write-Log "  - Homepage carrega corretamente" "Yellow"
        Write-Log "  - Funcionalidades estao funcionando" "Yellow"
        Write-Log "  - Estilos estao aplicados" "Yellow"
        
    } catch {
        Write-Log "Nao foi possivel verificar o site automaticamente" "Yellow"
        Write-Log "Verifique manualmente em: https://ativafit-tech.myshopify.com" "Yellow"
    }
}

function Start-Rollback {
    Write-Log "=========================================" "Cyan"
    Write-Log "INICIANDO ROLLBACK" "Cyan"
    Write-Log "=========================================" "Cyan"
    
    try {
        if ($ListBackups) {
            $Backups = Get-AvailableBackups
            if ($Backups.Count -eq 0) {
                Write-Log "Nenhum backup disponivel para rollback" "Red"
                exit 1
            }
            exit 0
        }
        
        if ([string]::IsNullOrEmpty($BackupTag)) {
            $Backups = Get-AvailableBackups
            if ($Backups.Count -eq 0) {
                Write-Log "Nenhum backup disponivel para rollback" "Red"
                exit 1
            }
            
            Write-Log "Digite o numero do backup que deseja restaurar:" "Yellow"
            $Choice = Read-Host
            
            if ([int]::TryParse($Choice, [ref]$null) -and [int]$Choice -ge 1 -and [int]$Choice -le $Backups.Count) {
                $BackupTag = $Backups[[int]$Choice - 1].Tag
            } else {
                Write-Log "Escolha invalida" "Red"
                exit 1
            }
        }
        
        $RestoreSuccess = Restore-Backup $BackupTag
        if (-not $RestoreSuccess) {
            Write-Log "Falha na restauracao do backup" "Red"
            exit 1
        }
        
        Deploy-Rollback
        Test-RollbackFunctionality
        
        $EndTime = Get-Date
        $Duration = $EndTime - $StartTime
        
        Write-Log "=========================================" "Cyan"
        Write-Log "ROLLBACK CONCLUIDO COM SUCESSO!" "Green"
        Write-Log "=========================================" "Cyan"
        Write-Log "Backup restaurado: $BackupTag" "Green"
        Write-Log "Tempo total: $($Duration.TotalMinutes.ToString('F1')) minutos" "Green"
        Write-Log "Site: https://ativafit-tech.myshopify.com" "Green"
        
        Write-Log "O site foi restaurado para o estado anterior" "Yellow"
        Write-Log "Todas as otimizacoes foram revertidas" "Yellow"
        
        exit 0
        
    } catch {
        Write-Log "ERRO NO ROLLBACK: $($_.Exception.Message)" "Red"
        Write-Log "Se o problema persistir, contate o suporte tecnico" "Yellow"
        exit 1
    }
}

try {
    Start-Rollback
} catch {
    Write-Log "ERRO CRITICO: $($_.Exception.Message)" "Red"
    exit 1
}
