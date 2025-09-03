# Script de Minificacao de Assets - Ativafit Theme
param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $Timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Timestamp] $Message" -ForegroundColor $Color
}

function Test-Tools {
    Write-Log "Verificando ferramentas..." "Cyan"
    
    try {
        $terserVersion = npx terser --version 2>$null
        if ($terserVersion) {
            Write-Log "Terser encontrado: $terserVersion" "Green"
        } else {
            Write-Log "Instalando Terser..." "Yellow"
            npm install -g terser
        }
    } catch {
        Write-Log "Erro com Terser: $($_.Exception.Message)" "Red"
        return $false
    }
    
    try {
        $cleancssVersion = npx cleancss --version 2>$null
        if ($cleancssVersion) {
            Write-Log "CleanCSS encontrado: $cleancssVersion" "Green"
        } else {
            Write-Log "Instalando CleanCSS..." "Yellow"
            npm install -g clean-css-cli
        }
    } catch {
        Write-Log "Erro com CleanCSS: $($_.Exception.Message)" "Red"
        return $false
    }
    
    return $true
}

function Invoke-JSMinification {
    param([string]$FilePath)
    
    $FileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $FileDir = [System.IO.Path]::GetDirectoryName($FilePath)
    $MinFile = Join-Path $FileDir "$FileName.min.js"
    
    try {
        if ($DryRun) {
            Write-Log "  [DRY RUN] Minificaria: $FilePath -> $MinFile" "Yellow"
            return @{ Success = $true; OriginalSize = 0; MinifiedSize = 0 }
        }
        
        $OriginalSize = (Get-Item $FilePath).Length
        npx terser $FilePath -o $MinFile -c -m 2>$null
        
        if (Test-Path $MinFile) {
            $MinifiedSize = (Get-Item $MinFile).Length
            $Savings = $OriginalSize - $MinifiedSize
            $Percentage = [math]::Round(($Savings / $OriginalSize) * 100, 1)
            
            Write-Log "  $FileName.js: $OriginalSize bytes -> $MinifiedSize bytes ($Percentage% economia)" "Green"
            return @{ Success = $true; OriginalSize = $OriginalSize; MinifiedSize = $MinifiedSize; Savings = $Savings }
        } else {
            throw "Arquivo minificado nao foi criado"
        }
    } catch {
        Write-Log "  Erro ao minificar $FilePath - $($_.Exception.Message)" "Red"
        return @{ Success = $false; OriginalSize = 0; MinifiedSize = 0; Savings = 0 }
    }
}

function Invoke-CSSMinification {
    param([string]$FilePath)
    
    $FileName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $FileDir = [System.IO.Path]::GetDirectoryName($FilePath)
    $MinFile = Join-Path $FileDir "$FileName.min.css"
    
    try {
        if ($DryRun) {
            Write-Log "  [DRY RUN] Minificaria: $FilePath -> $MinFile" "Yellow"
            return @{ Success = $true; OriginalSize = 0; MinifiedSize = 0 }
        }
        
        $OriginalSize = (Get-Item $FilePath).Length
        npx cleancss -o $MinFile $FilePath 2>$null
        
        if (Test-Path $MinFile) {
            $MinifiedSize = (Get-Item $MinFile).Length
            $Savings = $OriginalSize - $MinifiedSize
            $Percentage = [math]::Round(($Savings / $OriginalSize) * 100, 1)
            
            Write-Log "  $FileName.css: $OriginalSize bytes -> $MinifiedSize bytes ($Percentage% economia)" "Green"
            return @{ Success = $true; OriginalSize = $OriginalSize; MinifiedSize = $MinifiedSize; Savings = $Savings }
        } else {
            throw "Arquivo minificado nao foi criado"
        }
    } catch {
        Write-Log "  Erro ao minificar $FilePath - $($_.Exception.Message)" "Red"
        return @{ Success = $false; OriginalSize = 0; MinifiedSize = 0; Savings = 0 }
    }
}

function Start-Minification {
    Write-Log "=========================================" "Cyan"
    Write-Log "INICIANDO MINIFICACAO DE ASSETS" "Cyan"
    Write-Log "=========================================" "Cyan"
    
    if ($DryRun) {
        Write-Log "MODO DRY RUN - Nenhum arquivo sera modificado" "Yellow"
    }
    
    if (-not (Test-Tools)) {
        Write-Log "Erro ao verificar ferramentas" "Red"
        exit 1
    }
    
    Write-Log "Procurando arquivos para minificar..." "Cyan"
    
    $JSFiles = Get-ChildItem -Path "assets" -Filter "*.js" | Where-Object { $_.Name -notlike "*.min.js" }
    $CSSFiles = Get-ChildItem -Path "assets" -Filter "*.css" | Where-Object { $_.Name -notlike "*.min.css" }
    
    Write-Log "Encontrados $($JSFiles.Count) arquivos JavaScript" "Green"
    Write-Log "Encontrados $($CSSFiles.Count) arquivos CSS" "Green"
    
    $TotalOriginalSize = 0
    $TotalMinifiedSize = 0
    $TotalSavings = 0
    $SuccessCount = 0
    $ErrorCount = 0
    
    if ($JSFiles.Count -gt 0) {
        Write-Log "Minificando arquivos JavaScript..." "Cyan"
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
    
    if ($CSSFiles.Count -gt 0) {
        Write-Log "Minificando arquivos CSS..." "Cyan"
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
    
    $EndTime = Get-Date
    $Duration = $EndTime - $StartTime
    
    Write-Log "=========================================" "Cyan"
    Write-Log "RELATORIO FINAL" "Cyan"
    Write-Log "=========================================" "Cyan"
    Write-Log "Arquivos processados: $SuccessCount" "Green"
    Write-Log "Erros: $ErrorCount" $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
    Write-Log "Tamanho original: $([math]::Round($TotalOriginalSize / 1KB, 1)) KB" "Green"
    Write-Log "Tamanho minificado: $([math]::Round($TotalMinifiedSize / 1KB, 1)) KB" "Green"
    if ($TotalOriginalSize -gt 0) {
        Write-Log "Economia total: $([math]::Round($TotalSavings / 1KB, 1)) KB ($([math]::Round(($TotalSavings / $TotalOriginalSize) * 100, 1))%)" "Green"
    } else {
        Write-Log "Economia total: 0 KB (0%)" "Green"
    }
    Write-Log "Tempo de execucao: $($Duration.TotalSeconds.ToString('F1'))s" "Green"
    
    if ($ErrorCount -eq 0) {
        Write-Log "MINIFICACAO CONCLUIDA COM SUCESSO!" "Green"
        exit 0
    } else {
        Write-Log "MINIFICACAO CONCLUIDA COM ERROS" "Yellow"
        exit 1
    }
}

try {
    Start-Minification
} catch {
    Write-Log "ERRO CRITICO: $($_.Exception.Message)" "Red"
    exit 1
}
