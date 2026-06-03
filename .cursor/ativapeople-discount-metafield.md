# Metafield `percentage_discount_ativapeople`

## Onde configurar (Shopify Admin)

1. **Desconto global (todos os produtos)**  
   **Configurações → Dados personalizados → Loja**  
   - Adicionar definição  
   - Namespace e chave: `custom.percentage_discount_ativapeople`  
   - Nome: ex. "Desconto AtivaPeople (%)"  
   - Tipo: **Número inteiro** (ou decimal)  
   - Valor: `10`, `15`, `20`, etc.

2. **Exceção por produto (opcional)**  
   **Configurações → Dados personalizados → Produtos**  
   - Mesma chave: `custom.percentage_discount_ativapeople`  
   - Se preenchido no produto, **substitui** o valor da loja para aquele SKU.

## Prioridade

1. Metafield do **produto**  
2. Metafield da **loja**  
3. **10%** se ambos estiverem vazios  

## Uso no tema

- Snippet: `snippets/product-info.liquid` (badge AtivaPeople)  
- JS: `sections/product-main-section.liquid` — ao trocar variante, o preço do badge usa o mesmo `%` (`data-ativapeople-discount-pct`).
