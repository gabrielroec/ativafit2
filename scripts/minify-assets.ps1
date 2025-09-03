# ========================================
# SCRIPT DE MINIFICAÇÃO DE ASSETS
# Ativafit Theme Optimization
# ========================================

param(
    [switch]$Verbose = $false,
    [switch]$DryRun = $false
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

# Função para verificar se ferramentas estão instaladas
function Test-Tools {
    Write-Log "Verificando ferramentas necessárias..." $Cyan
    
    # Verificar Terser
    try {
        $terserVersion = npx terser --version 2>$null
        if ($terserVersion) {
            Write-Log "✅ Terser encontrado: $terserVersion" $Green
        } else {
            throw "Terser não encontrado"
        }
    } catch {
        Write-Log "❌ Terser não encontrado. Instalando..." $Yellow
        npm install -g terser
        Write-Log "✅ Terser instalado com sucesso" $Green
    }
    
    # Verificar CleanCSS
    try {
        $cleancssVersion = npx cleancss --version 2>$null
        if ($cleancssVersion) {
            Write-Log "✅ CleanCSS encontrado: $cleancssVersion" $Green
        } else {
            throw "CleanCSS não encontrado"
        }
    } catch {
        Write-Log "❌ CleanCSS não encontrado. Instalando..." $Yellow
        npm install -g clean-css-cli
        Write-Log "✅ CleanCSS instalado com sucesso" $Green
    }
}

# Função para minificar JavaScript
function Invoke-JSMinification {
    param([string]$FilePath)
    
    $FileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $FileDir = [System.IO.Path]::GetDirectoryName($FilePath)
    $MinFile = Join-Path $FileDir "$FileName.min.js"
    
    try {
        if ($DryRun) {
            Write-Log "  [DRY RUN] Minificaria: $FilePath -> $MinFile" $Yellow
            return @{ Success = $true; OriginalSize = 0; MinifiedSize = 0 }
        }
        
        $OriginalSize = (Get-Item $FilePath).Length
        npx terser $FilePath -o $MinFile -c -m 2>$null
        
        if (Test-Path $MinFile) {
            $MinifiedSize = (Get-Item $MinFile).Length
            $Savings = $OriginalSize - $MinifiedSize
            $Percentage = [math]::Round(($Savings / $OriginalSize) * 100, 1)
            
            Write-Log "  ✅ $FileName.js: $OriginalSize bytes -> $MinifiedSize bytes ($Percentage% economia)" $Green
            return @{ Success = $true; OriginalSize = $OriginalSize; MinifiedSize = $MinifiedSize; Savings = $Savings }
        } else {
            throw "Arquivo minificado não foi criado"
        }
    } catch {
        Write-Log "  ❌ Erro ao minificar $FilePath`: $($_.Exception.Message)" $Red
        return @{ Success = $false; OriginalSize = 0; MinifiedSize = 0; Savings = 0 }
    }
}

# Função para minificar CSS
function Invoke-CSSMinification {
    param([string]$FilePath)
    
    $FileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $FileDir = [System.IO.Path]::GetDirectoryName($FilePath)
    $MinFile = Join-Path $FileDir "$FileName.min.css"
    
    try {
        if ($DryRun) {
            Write-Log "  [DRY RUN] Minificaria: $FilePath -> $MinFile" $Yellow
            return @{ Success = $true; OriginalSize = 0; MinifiedSize = 0 }
        }
        
        $OriginalSize = (Get-Item $FilePath).Length
        npx cleancss -o $MinFile $FilePath 2>$null
        
        if (Test-Path $MinFile) {
            $MinifiedSize = (Get-Item $MinFile).Length
            $Savings = $OriginalSize - $MinifiedSize
            $Percentage = [math]::Round(($Savings / $OriginalSize) * 100, 1)
            
            Write-Log "  ✅ $FileName.css: $OriginalSize bytes -> $MinifiedSize bytes ($Percentage% economia)" $Green
            return @{ Success = $true; OriginalSize = $OriginalSize; MinifiedSize = $MinifiedSize; Savings = $Savings }
        } else {
            throw "Arquivo minificado não foi criado"
        }
    } catch {
        Write-Log "  ❌ Erro ao minificar $FilePath`: $($_.Exception.Message)" $Red
        return @{ Success = $false; OriginalSize = 0; MinifiedSize = 0; Savings = 0 }
    }
}

# Função principal
function Start-Minification {
    Write-Log "=========================================" $Cyan
    Write-Log "🚀 INICIANDO MINIFICAÇÃO DE ASSETS" $Cyan
    Write-Log "=========================================" $Cyan
    
    if ($DryRun) {
        Write-Log "⚠️  MODO DRY RUN - Nenhum arquivo será modificado" $Yellow
    }
    
    # Verificar ferramentas
    Test-Tools
    
    # Encontrar arquivos para minificar
    Write-Log "`n📁 Procurando arquivos para minificar..." $Cyan
    
    $JSFiles = Get-ChildItem -Path "assets" -Filter "*.js" | Where-Object { $_.Name -notlike "*.min.js" }
    $CSSFiles = Get-ChildItem -Path "assets" -Filter "*.css" | Where-Object { $_.Name -notlike "*.min.css" }
    
    Write-Log "Encontrados $($JSFiles.Count) arquivos JavaScript" $Green
    Write-Log "Encontrados $($CSSFiles.Count) arquivos CSS" $Green
    
    # Estatísticas
    $TotalOriginalSize = 0
    $TotalMinifiedSize = 0
    $TotalSavings = 0
    $SuccessCount = 0
    $ErrorCount = 0
    
    # Minificar JavaScript
    if ($JSFiles.Count -gt 0) {
        Write-Log "`n🔧 Minificando arquivos JavaScript..." $Cyan
        foreach ($File in $JSFiles) {
            $Result = Invoke-JSMinification $File.FullName
            if ($Result.Success) {
                $TotalOriginalSize += $Result.OriginalSize
                $TotalMinifiedSize += $Result.MinifiedSize
                $TotalSavings += $Result.Savings
                $SuccessCount++
            } else {
                $ErrorCount++
            }
        }
    }
    
    # Minificar CSS
    if ($CSSFiles.Count -gt 0) {
        Write-Log "`n🎨 Minificando arquivos CSS..." $Cyan
        foreach ($File in $CSSFiles) {
            $Result = Invoke-CSSMinification $File.FullName
            if ($Result.Success) {
                $TotalOriginalSize += $Result.OriginalSize
                $TotalMinifiedSize += $Result.MinifiedSize
                $TotalSavings += $Result.Savings
                $SuccessCount++
            } else {
                $ErrorCount++
            }
        }
    }
    
    # Relatório final
    $EndTime = Get-Date
    $Duration = $EndTime - $StartTime
    
    Write-Log "`n=========================================" $Cyan
    Write-Log "📊 RELATÓRIO FINAL" $Cyan
    Write-Log "=========================================" $Cyan
    Write-Log "Arquivos processados: $SuccessCount" $Green
    Write-Log "Erros: $ErrorCount" $(if ($ErrorCount -eq 0) { $Green } else { $Red })
    Write-Log "Tamanho original: $([math]::Round($TotalOriginalSize / 1KB, 1)) KB" $Green
    Write-Log "Tamanho minificado: $([math]::Round($TotalMinifiedSize / 1KB, 1)) KB" $Green
    Write-Log "Economia total: $([math]::Round($TotalSavings / 1KB, 1)) KB ($([math]::Round(($TotalSavings / $TotalOriginalSize) * 100, 1))%)" $Green
    Write-Log "Tempo de execução: $($Duration.TotalSeconds.ToString('F1'))s" $Green
    
    if ($ErrorCount -eq 0) {
        Write-Log "`n✅ MINIFICAÇÃO CONCLUÍDA COM SUCESSO!" $Green
        exit 0
    } else {
        Write-Log "`n⚠️  MINIFICAÇÃO CONCLUÍDA COM ERROS" $Yellow
        exit 1
    }
}

# Executar script
try {
    Start-Minification
} catch {
    Write-Log "❌ ERRO CRÍTICO: $($_.Exception.Message)" $Red
    exit 1
}
