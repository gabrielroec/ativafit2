# Performance — Tarefas de Admin (fora do tema)

As otimizações de código já foram aplicadas no tema. Para chegar em score
Lighthouse Mobile >= 92, faltam ações no **admin** que não dá pra fazer no
código. Este doc cobre o passo-a-passo.

## 1. Consolidar containers GTM (manter apenas 2)

**Status:** o tema só carrega 2 scripts hardcoded:
- `GTM-NG7LT26D` (container principal)
- `AW-11366836138` (Google Ads gtag)

O Lighthouse reportou **12 gtag scripts** rodando porque o container
`NG7LT26D` está disparando 10 tags filhos (G-VY4JG85JG0, G-Q5CWX99FY2,
G-L3RX245M3Q, G-0TZXQ9VF8N, G-SVF0HHLXKN, GT-5DH5CNJ, AW-111…, AW-113…,
AW-603…, etc.).

Cada tag filho carrega ~150 KB de JS adicional + dispara long tasks no
main thread. **Total: ~1.9 MB e ~2.5s de CPU**.

### Como consolidar

1. Acesse https://tagmanager.google.com → container `GTM-NG7LT26D`.
2. Em **Tags**, liste tudo que está disparando. Provavelmente vai ver:
   - 1 ou 2 tags GA4 (Configuration tag) — manter **1 só** (provavelmente
     `G-L3RX245M3Q`, que é o principal).
   - Vários tags Google Ads conversion (AW-…) — pergunte ao marketing
     **quais campanhas estão ativas**. Pause/desative tags de campanhas
     antigas/concluídas.
   - Tags duplicados (mesmo evento disparando GA4 + GA4 Event) — consolide.
3. Meta: deixar **1 GA4 + 1-2 Google Ads ativos** dentro do container.
   Tudo o resto: pausar.
4. Publicar uma nova versão do GTM e re-rodar Lighthouse.

**Ganho esperado:** 1-2s de TBT.

## 2. GTM Consent Mode v2 — JÁ ATIVADO no tema

O snippet `gtag('consent', 'default', …)` foi adicionado no topo do `<head>`
em [`layout/theme.liquid`](layout/theme.liquid). Comportamento atual:

- **Visitantes EU/UK/EEA:** todos os tags de tracking (analytics_storage,
  ad_storage, ad_personalization) são **negados por padrão** até o consent
  ser concedido.
- **Visitantes fora EU/UK:** tudo permitido por padrão (mantém comportamento
  atual de tracking).

### Para ativar 100% (com cookie banner)

O Consent Mode só ganha efeito real se houver um **cookie banner** que
chama `gtag('consent', 'update', …)` quando o user aceita. Sugestões:

- **Cookiebot** (Shopify app, plano grátis até 100 visitantes EU/mês)
- **Iubenda** (Shopify app, ~$9/mês)
- **OneTrust** (enterprise)

Quando instalar o banner, configure pra chamar:
```js
// quando user aceita
gtag('consent', 'update', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
```

**Ganho esperado:** -50% TBT em visitantes EU (não disparam GTM até
consent), -10-20% no LCP global por liberar CPU/banda nos primeiros 500ms.

## 3. Hotjar — REMOVIDO

Já foi removido do tema em [`layout/theme.liquid`](layout/theme.liquid).

**Importante:** confirmar com Microsoft Clarity (já rodando via Shopify app
injection) se ele cobre as mesmas necessidades de heatmap/session replay.
Se não, reativar Hotjar com cuidado.

**Ganho:** ~63 KB transfer + ~275ms main thread CPU.

## 4. Server-side GTM (sGTM) — STUB ATIVADO no tema

Setting nova no admin: **Theme Settings → Performance & Tracking → GTM
server URL**. Deixe vazio para manter o comportamento atual (carrega de
googletagmanager.com).

### Como provisionar o servidor

1. Crie um container sGTM no GTM (https://tagmanager.google.com → Admin
   → New Container → Server).
2. Provisione o servidor:
   - **Opção A — Google Cloud (recomendado):** deploy automatizado em App
     Engine. ~$120/mês para tráfego médio.
   - **Opção B — Stape.io / Addingwell:** managed sGTM ~$20-50/mês.
3. Aponte o subdomínio `gtm.ativafit.com` (CNAME) pro servidor sGTM.
4. No GTM admin, mude as tags do container web (NG7LT26D) pra usarem
   `transport_url: 'https://gtm.ativafit.com'`.
5. Preencha a setting **GTM server URL** com `https://gtm.ativafit.com`
   no admin Shopify do tema.

**Ganho esperado:** -30-40% no JS payload de GTM no browser, -1-1.5s
de TBT em mobile. É a alavanca mais poderosa, mas requer setup de infra.

## 5. Apps Shopify pesados — revisar

O Lighthouse reportou tempo de CPU significativo destes apps:

| App | CPU main thread | Decisão sugerida |
|---|---|---|
| BON Loyalty | 1,106ms | Verificar se programa de fidelidade está rendendo. Se não, desinstalar. |
| Intercom | 663ms | Live chat — usa? Tem alternativa lighter (Tidio, Reamaze)? |
| Microsoft Clarity | 463ms | Heatmap — manter (substituiu Hotjar). |
| Klaviyo | 161ms | Email marketing — manter (CRO crítico). |

## Checklist final pra retest Lighthouse

Após:
- [ ] Consolidar GTM (deixar 1-2 tags ativos)
- [ ] Instalar cookie banner com Consent Mode update
- [ ] Confirmar Clarity cobre Hotjar
- [ ] (Opcional) Provisionar sGTM
- [ ] Rodar Lighthouse Mobile via PageSpeed Insights

Esperamos **score 88-94** em Mobile. CrUX (usuários reais) já está
passando: LCP 1.2s, FCP 1.1s.
