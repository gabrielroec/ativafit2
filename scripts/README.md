# 🚀 Scripts de Automação - Ativafit Theme Optimization

Este diretório contém scripts PowerShell para automatizar o processo de otimização do tema Ativafit.

## 📁 Arquivos

- **`minify-assets-simple.ps1`** - Minifica todos os arquivos CSS e JavaScript
- **`deploy-simple.ps1`** - Deploy completo com backup e otimização
- **`rollback-simple.ps1`** - Reverte para versão anterior em caso de problemas

## 🛠️ Pré-requisitos

### 1. Node.js e NPM
```bash
# Verificar se está instalado
node --version
npm --version
```

### 2. Ferramentas de Minificação
Os scripts instalam automaticamente, mas você pode instalar manualmente:
```bash
npm install -g terser
npm install -g clean-css-cli
```

### 3. Shopify CLI
```bash
# Instalar Shopify CLI
npm install -g @shopify/cli @shopify/theme
```

### 4. Git
```bash
# Verificar se está instalado
git --version
```

## 📖 Como Usar

### 1. Minificação de Assets

```powershell
# Minificar todos os arquivos
.\scripts\minify-assets-simple.ps1

# Modo dry-run (apenas simular)
.\scripts\minify-assets-simple.ps1 -DryRun
```

**Resultado:**
- Cria arquivos `.min.css` e `.min.js`
- Relatório de economia de bytes
- Instala ferramentas automaticamente se necessário

### 2. Deploy Otimizado Completo

```powershell
# Deploy completo (backup + minificação + deploy)
.\scripts\deploy-simple.ps1

# Pular backup (não recomendado)
.\scripts\deploy-simple.ps1 -SkipBackup

# Pular minificação (usar arquivos já minificados)
.\scripts\deploy-simple.ps1 -SkipMinification

# Store personalizada
.\scripts\deploy-simple.ps1 -StoreUrl "sua-loja.myshopify.com"
```

**Fluxo:**
1. ✅ Cria backup automático
2. ✅ Minifica todos os assets
3. ✅ Atualiza referências no tema
4. ✅ Faz deploy para Shopify
5. ✅ Verifica funcionamento

### 3. Rollback (Reverter Mudanças)

```powershell
# Listar backups disponíveis
.\scripts\rollback-simple.ps1 -ListBackups

# Rollback para backup específico
.\scripts\rollback-simple.ps1 -BackupTag "backup-2025-01-15-1430"

# Rollback interativo (escolher backup)
.\scripts\rollback-simple.ps1

# Rollback forçado (sem confirmação)
.\scripts\rollback-simple.ps1 -BackupTag "backup-2025-01-15-1430" -Force
```

**Fluxo:**
1. ✅ Lista backups disponíveis
2. ✅ Restaura arquivos do backup
3. ✅ Remove arquivos minificados
4. ✅ Faz deploy da versão anterior
5. ✅ Verifica funcionamento

## 🔧 Configurações

### Store URL
Por padrão, os scripts usam `ativafit-tech.myshopify.com`. Para alterar:

```powershell
# No deploy-optimized.ps1
.\scripts\deploy-optimized.ps1 -StoreUrl "sua-loja.myshopify.com"

# No rollback.ps1 (editar o arquivo)
$StoreUrl = "sua-loja.myshopify.com"
```

### Arquivos Minificados
Os scripts processam automaticamente:
- **CSS:** `*.css` → `*.min.css`
- **JavaScript:** `*.js` → `*.min.js`

### Referências Atualizadas
Automaticamente atualiza:
- `layout/theme.liquid`
- `layout/theme.pagefly.liquid`

## 📊 Relatórios

### Minificação
```
=== RELATÓRIO DE MINIFICAÇÃO ===
Arquivos processados: 15
Economia total: 465KB (45%)
Tempo de execução: 2.3s
Status: ✅ SUCESSO
```

### Deploy
```
=== RELATÓRIO DE DEPLOY ===
Backup criado: backup-2025-01-15-1430
Arquivos otimizados: 15
Deploy status: ✅ SUCESSO
URL de teste: https://ativafit.com
```

## 🛡️ Segurança

### Backups Automáticos
- ✅ Git commits com timestamp
- ✅ Tags para identificação
- ✅ Backup de referências originais
- ✅ Verificação de integridade

### Rollback Seguro
- ✅ Confirmação antes de reverter
- ✅ Restauração completa
- ✅ Verificação de funcionamento
- ✅ Log de todas as operações

## 🚨 Solução de Problemas

### Erro: "Terser não encontrado"
```powershell
# Instalar manualmente
npm install -g terser
```

### Erro: "CleanCSS não encontrado"
```powershell
# Instalar manualmente
npm install -g clean-css-cli
```

### Erro: "Shopify CLI não encontrado"
```powershell
# Instalar Shopify CLI
npm install -g @shopify/cli @shopify/theme
```

### Erro: "Git não encontrado"
- Instalar Git: https://git-scm.com/downloads
- Reiniciar terminal após instalação

### Site não carrega após deploy
```powershell
# Fazer rollback imediato
.\scripts\rollback.ps1
```

## 📋 Checklist de Uso

### Antes de Usar
- [ ] Node.js instalado
- [ ] Git configurado
- [ ] Shopify CLI instalado
- [ ] Acesso à loja Shopify
- [ ] Backup manual (recomendado)

### Durante o Uso
- [ ] Executar em terminal PowerShell
- [ ] Verificar logs de erro
- [ ] Testar site após deploy
- [ ] Verificar PageSpeed Insights

### Após o Uso
- [ ] Testar funcionalidades críticas
- [ ] Verificar estilos aplicados
- [ ] Monitorar performance
- [ ] Executar nova auditoria SEMrush

## 🎯 Exemplos de Uso

### Cenário 1: Primeira Otimização
```powershell
# 1. Deploy completo
.\scripts\deploy-optimized.ps1

# 2. Testar site
# 3. Verificar PageSpeed Insights
```

### Cenário 2: Apenas Minificação
```powershell
# 1. Minificar assets
.\scripts\minify-assets.ps1

# 2. Deploy manual
shopify theme push --store ativafit-tech.myshopify.com
```

### Cenário 3: Problema no Site
```powershell
# 1. Listar backups
.\scripts\rollback.ps1 -ListBackups

# 2. Fazer rollback
.\scripts\rollback.ps1 -BackupTag "backup-2025-01-15-1430"
```

## 📞 Suporte

Em caso de problemas:
1. Verificar logs de erro
2. Tentar rollback
3. Verificar pré-requisitos
4. Contatar suporte técnico

---

**Desenvolvido para Ativafit Theme Optimization** 🚀
