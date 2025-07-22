# Cart Drawer Implementation

Um sistema completo de carrinho deslizante (cart drawer) para a loja Shopify.

## 🚀 Recursos Implementados

### ✅ **Funcionalidades Principais:**

- **Abertura automática** quando produto é adicionado via product-card-custom
- **Atualização em tempo real** do contador do carrinho
- **Controles de quantidade** com botões + e -
- **Remoção de itens** do carrinho
- **Resumo completo** com descontos e total
- **Botões de ação** (Finalizar Compra / Ver Carrinho)
- **Design responsivo** (desktop e mobile)

### ✅ **Integração com Product Cards:**

- Captura automaticamente submissões de formulário dos product-card-custom
- Funciona com botões desktop (hover) e mobile (fixo)
- Mostra notificação de produto adicionado
- Atualiza contador do carrinho instantaneamente

### ✅ **Experiência do Usuário:**

- **Animações suaves** de entrada/saída
- **Overlay escuro** para foco no carrinho
- **Tecla ESC** para fechar
- **Click no overlay** para fechar
- **Scroll interno** quando muitos itens
- **Estado vazio** com call-to-action

## 📁 Arquivos Criados

### 1. **CSS: `assets/cart-drawer.css`**

- Estilos completos do cart drawer
- Layout flexbox responsivo
- Animações e transições
- Variações mobile e desktop

### 2. **JavaScript: `assets/cart-drawer.js`**

- Classe `CartDrawer` para gerenciar funcionalidades
- Captura eventos de formulários de produtos
- APIs do Shopify para carrinho (`/cart/add.js`, `/cart/change.js`, `/cart.js`)
- Atualização automática de contador
- Notificações de sucesso/erro

### 3. **Integração: `layout/theme.liquid`**

```liquid
<!-- Cart Drawer -->
{{ 'cart-drawer.css' | asset_url | stylesheet_tag }}
<script src="{{ 'cart-drawer.js' | asset_url }}" defer></script>
```

### 4. **Headers Atualizados:**

- `sections/header-custom.liquid`: Adicionada classe `cart-icon`
- `sections/header.liquid`: Adicionada classe `cart-icon`

## 🎯 Como Funciona

### **1. Ao Clicar em "SHOP NOW" ou "BUY NOW":**

```javascript
// O cart drawer captura automaticamente:
document.addEventListener("submit", (e) => {
  if (e.target.closest(".product-card form")) {
    e.preventDefault();
    this.addToCart(e.target);
  }
});
```

### **2. Ao Clicar no Ícone do Carrinho:**

```javascript
// Abre o cart drawer:
document.addEventListener("click", (e) => {
  if (e.target.closest(".cart-icon")) {
    e.preventDefault();
    this.open();
  }
});
```

### **3. Gerenciamento de Quantidade:**

```javascript
// Atualiza via API do Shopify:
await fetch("/cart/change.js", {
  method: "POST",
  body: JSON.stringify({ line: index, quantity: newQty }),
});
```

## 🎨 Personalização

### **Cores e Estilos:**

```css
/* No arquivo cart-drawer.css */
.cart-drawer-checkout {
  background: #eb701f; /* Cor primária */
}

.cart-drawer-item-price {
  color: #eb701f; /* Cor do preço */
}
```

### **Textos e Idiomas:**

```javascript
// No arquivo cart-drawer.js - método renderCart()
"Seu carrinho está vazio";
"Continuar Comprando";
"Finalizar Compra";
"Ver Carrinho";
```

### **Moeda:**

```javascript
// No método formatMoney()
currency: 'USD', // Altere para 'BRL' se necessário
```

## 📱 Responsividade

### **Desktop (400px de largura):**

- Drawer desliza da direita
- Overlay escuro
- Controles completos

### **Mobile (100vw de largura):**

- Ocupa tela inteira
- Imagens menores (60px)
- Padding reduzido
- Touch-friendly

## 🔧 APIs Utilizadas

### **Shopify Cart API:**

- `POST /cart/add.js` - Adicionar produto
- `POST /cart/change.js` - Alterar quantidade
- `GET /cart.js` - Buscar dados do carrinho

### **Estrutura de Dados:**

```javascript
{
  item_count: 2,
  total_price: 50000, // em centavos
  items: [
    {
      id: 123,
      title: "Produto",
      quantity: 1,
      price: 25000,
      image: "url",
      // ...
    }
  ]
}
```

## 🚦 Status

### ✅ **Funcionando:**

- Integração com product-card-custom
- Abertura/fechamento do drawer
- Adição de produtos
- Alteração de quantidades
- Remoção de itens
- Atualização de contador
- Design responsivo

### 🎯 **Testado em:**

- Product cards desktop (hover)
- Product cards mobile (botão fixo)
- Ícones do carrinho (ambos headers)
- Diferentes tamanhos de tela

## 🔗 Integração Completa

O cart drawer está **100% integrado** com:

- ✅ `snippets/product-card-custom.liquid`
- ✅ `sections/header-custom.liquid`
- ✅ `sections/header.liquid`
- ✅ Sistema de contadores do Shopify
- ✅ APIs nativas do Shopify

**Resultado:** Experiência de carrinho moderna e fluida! 🎉
