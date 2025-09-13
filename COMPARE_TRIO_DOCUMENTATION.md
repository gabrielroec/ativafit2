# Seção Comparison Trio Cards - Documentação

## Visão Geral

A seção "Comparison Trio Cards" é uma seção Shopify Online Store 2.0 que exibe até 4 cartões de produtos lado a lado, ideal para comparações de produtos. Cada cartão é um block configurável com badges, descrições, bullets, preços e CTAs.

## Arquivo

- **Localização**: `sections/compare-trio.liquid`
- **Tipo**: Seção OS 2.0 com blocks
- **Dependências**: Nenhuma (vanilla JS apenas para AJAX cart)

## Funcionalidades

### Layout Responsivo

- **Mobile**: 1 coluna
- **Tablet**: 2 colunas
- **Desktop**: 3 colunas
- **Equal Height**: Opção para alinhar CTAs na base

### Configurações por Cartão (Block)

- **Produto**: Picker de produto do Shopify
- **Badge**: Label + estilo (default/highlight)
- **Título**: Override opcional do título do produto
- **Imagem**: Override opcional da imagem do produto
- **Faixas**: Até 3 linhas de descrição em formato pílula
- **Weight Range**: Texto curto para faixa de peso
- **Bullets**: 2 grupos (superior e inferior) com até 4 itens cada
- **Preço**: Auto (produto) ou manual com prefixo "From"
- **CTA**: Link para produto ou Add to Cart AJAX

### Recursos de Acessibilidade

- Marcação semântica (`<article>`, `<h3>`, `<ul>`)
- `aria-labelledby` nos cartões
- `aria-live="polite"` para mensagens AJAX
- Estados de foco visíveis
- Navegação por teclado completa

## Como Usar

### 1. Adicionar a Seção

1. No Shopify Admin, vá para **Online Store > Themes**
2. Clique em **Customize** no tema ativo
3. Adicione uma nova seção e selecione **Comparison Trio Cards**

### 2. Configurar Cartões

1. Clique em **Add block** para adicionar cartões
2. Configure cada cartão:
   - **Product**: Selecione o produto
   - **Badge**: Adicione label e escolha estilo
   - **Straplines**: Adicione até 3 faixas de descrição
   - **Bullets**: Configure bullets superiores e inferiores
   - **CTA**: Configure botão e ação

### 3. Configurar AJAX Cart (Opcional)

Para usar Add to Cart AJAX, você precisa descobrir o `section_id` do seu cart drawer:

#### Método 1: Inspeção do Elemento

1. Abra o site no navegador
2. Abra o cart drawer (clique no ícone do carrinho)
3. Clique com botão direito no drawer e selecione **Inspecionar**
4. Procure por um atributo `data-section-id` no elemento do drawer
5. Copie o valor (ex: `cart-drawer`, `mini-cart`, etc.)

#### Método 2: Código Fonte

1. Visualize o código fonte da página
2. Procure por `data-section-id` relacionado ao cart drawer
3. O valor estará em algo como: `data-section-id="cart-drawer"`

#### Configurar no Admin

1. Na seção **AJAX Cart Settings**
2. Cole o `section_id` encontrado no campo **Cart Drawer Section ID**

## Configurações da Seção

### Layout

- **Gap between cards**: Espaçamento entre cartões (16-48px)
- **Max card width**: Largura máxima dos cartões (300-500px)
- **Equal height cards**: Alinha CTAs na base

### Estilização

- **Card border radius**: Raio das bordas (0-20px)
- **Card shadow**: Sombra dos cartões
- **Card padding**: Espaçamento interno (16-40px)

### Cores

- **Section background**: Cor de fundo da seção
- **Text color**: Cor do texto
- **Card background**: Cor de fundo dos cartões
- **Border color**: Cor das bordas
- **Badge colors**: Cores dos badges (default e highlight)
- **Button colors**: Cores dos botões (normal e hover)

## Uso com Dynamic Sources

### Metafields

Para usar metafields nas faixas e bullets:

1. **Crie metafields** no Admin:

   - `products.strapline_1` (Single line text)
   - `products.strapline_2` (Single line text)
   - `products.strapline_3` (Single line text)
   - `products.bullets_top` (Multi-line text)
   - `products.bullets_bottom` (Multi-line text)

2. **Configure nos produtos** os valores dos metafields

3. **Modifique o código** (opcional):

```liquid
<!-- Substitua as configurações manuais por: -->
{%- assign strapline_1 = product.metafields.custom.strapline_1 | default: block.settings.strapline_1 -%}
{%- assign bullets_top = product.metafields.custom.bullets_top | split: '\n' -%}
```

### Metaobjects

Para usar metaobjects para configurações de cartão:

1. **Crie um metaobject** `product_comparison` com campos:

   - `badge_label` (Single line text)
   - `badge_style` (Single line text)
   - `straplines` (Multi-line text)
   - `bullets` (Multi-line text)

2. **Associe** o metaobject ao produto via metafield

3. **Modifique o código** para usar os dados do metaobject

## Troubleshooting

### AJAX Cart não funciona

1. Verifique se o `cart_drawer_section_id` está correto
2. Confirme se o cart drawer existe no tema
3. Verifique o console do navegador para erros

### Cartões não alinham

1. Ative a opção **Equal height cards**
2. Verifique se todos os cartões têm CTAs configurados
3. Ajuste o **Max card width** se necessário

### Imagens não carregam

1. Verifique se o produto tem imagem principal
2. Configure **Image override** se necessário
3. Verifique se a imagem está publicada

### Badge highlight não aparece

1. Apenas um cartão pode ter `badge_style = "highlight"`
2. Verifique se o badge tem label configurado
3. Confirme as cores do highlight badge

## Personalização Avançada

### CSS Customizado

Adicione CSS personalizado no `theme.css`:

```css
/* Personalizar cartões específicos */
.tt-compare-trio__card--highlight {
  border: 2px solid #your-color;
  box-shadow: 0 0 20px rgba(your-color, 0.3);
}

/* Personalizar badges */
.tt-compare-trio__badge--highlight::before {
  content: "★ ";
}
```

### JavaScript Customizado

Para funcionalidades adicionais, adicione no `theme.js`:

```javascript
// Evento customizado quando cartão é adicionado
document.addEventListener("compare-trio:cart-added", function (e) {
  console.log("Product added:", e.detail.productId);
  // Sua lógica aqui
});
```

## Suporte

Para dúvidas ou problemas:

1. Verifique esta documentação
2. Teste em modo de desenvolvimento
3. Verifique o console do navegador
4. Confirme as configurações do tema

## Changelog

- **v1.0**: Versão inicial com todas as funcionalidades básicas
- Suporte completo a OS 2.0
- AJAX cart integrado
- Acessibilidade completa
- Layout responsivo
