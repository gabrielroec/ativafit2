# Sistema de Notificação de Carrinho

Este sistema implementa notificações toast modernas e responsivas que aparecem quando produtos são adicionados ao carrinho.

## 🚀 Funcionalidades

- ✅ **Notificações de Sucesso**: Quando produtos são adicionados com sucesso
- ❌ **Notificações de Erro**: Quando há problemas ao adicionar produtos
- ⚠️ **Notificações de Aviso**: Para situações que requerem atenção
- 📱 **Design Responsivo**: Funciona perfeitamente em desktop e mobile
- 🎨 **Design Moderno**: Interface limpa e profissional
- ⏰ **Auto-hide**: Desaparece automaticamente após 5 segundos
- 🖱️ **Interativo**: Pode ser fechado manualmente ou com a tecla ESC
- 🌙 **Modo Escuro**: Suporte automático para tema escuro

## 📁 Arquivos Modificados

### Novos Arquivos

- `snippets/cart-notification.liquid` - Componente principal de notificação
- `snippets/notification-test.liquid` - Arquivo de teste (opcional)

### Arquivos Modificados

- `layout/theme.liquid` - Inclui o componente de notificação
- `snippets/product-card.liquid` - Adiciona notificações aos botões de adicionar
- `snippets/product-card-custom.liquid` - Intercepta formulários de adição ao carrinho
- `assets/cart-drawer.js` - Usa o sistema de notificação global
- `assets/theme.js` - Adiciona notificações aos eventos do tema principal

## 🎯 Como Funciona

### 1. Componente de Notificação

O componente `cart-notification.liquid` cria um sistema de notificação toast que:

- Aparece no canto superior direito da tela
- Tem animações suaves de entrada e saída
- Suporta diferentes tipos (sucesso, erro, aviso)
- É totalmente responsivo

### 2. Integração Automática

O sistema se integra automaticamente com:

- **Product Cards**: Notificações quando produtos são adicionados via botões
- **Formulários de Produto**: Intercepta envios de formulários de adição ao carrinho
- **Cart Drawer**: Usa o sistema global em vez de notificações locais
- **Theme.js**: Adiciona notificações aos eventos nativos do tema

### 3. API JavaScript

O sistema expõe uma API global para uso em outros scripts:

```javascript
// Notificação de sucesso
window.CartNotification.success("Produto adicionado!", "Sucesso");

// Notificação de erro
window.CartNotification.error("Erro ao adicionar produto", "Erro");

// Notificação de aviso
window.CartNotification.warning("Atenção necessária", "Aviso");
```

## 🧪 Testando o Sistema

### Opção 1: Teste Automático

Para testar rapidamente, você pode incluir temporariamente o arquivo de teste:

```liquid
{% render 'notification-test' %}
```

Isso adicionará um painel de teste no canto inferior esquerdo com botões para testar diferentes tipos de notificação.

### Opção 2: Teste Manual

1. Adicione um produto ao carrinho usando qualquer botão de "Adicionar ao Carrinho"
2. Observe a notificação aparecer no canto superior direito
3. Teste fechar a notificação clicando no X ou pressionando ESC
4. Teste o auto-hide deixando a notificação aberta por 5 segundos

## 🎨 Personalização

### Cores e Estilos

As cores podem ser personalizadas editando o CSS no arquivo `cart-notification.liquid`:

```css
/* Cor de sucesso */
.cart-notification__icon {
  background: linear-gradient(135deg, #10b981, #059669);
}

/* Cor de erro */
.cart-notification.error .cart-notification__icon {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

/* Cor de aviso */
.cart-notification.warning .cart-notification__icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}
```

### Textos

Os textos padrão podem ser alterados no JavaScript:

```javascript
// No método show() da classe CartNotification
const {
  title = "Produto adicionado!", // Título padrão
  message = "O item foi adicionado ao seu carrinho com sucesso.", // Mensagem padrão
  type = "success",
  duration = 5000, // Duração em milissegundos
} = options;
```

### Posicionamento

Para alterar a posição da notificação:

```css
.cart-notification {
  top: 20px; /* Distância do topo */
  right: 20px; /* Distância da direita */
}
```

## 🔧 Solução de Problemas

### Notificação não aparece

1. Verifique se o componente está incluído no `theme.liquid`
2. Confirme que não há erros JavaScript no console
3. Teste usando o arquivo `notification-test.liquid`

### Conflitos com outros scripts

- O sistema usa `window.CartNotification` como namespace global
- Verifica se `window.CartNotification` existe antes de usar
- Não interfere com outros sistemas de notificação

### Problemas de estilo

- O CSS está encapsulado no componente
- Usa `!important` apenas quando necessário
- Não afeta outros elementos da página

## 📱 Compatibilidade

- ✅ **Desktop**: Chrome, Firefox, Safari, Edge
- ✅ **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- ✅ **Tablets**: iPad, Android tablets
- ✅ **Acessibilidade**: Suporte a leitores de tela, navegação por teclado

## 🚀 Próximos Passos

Para melhorar ainda mais o sistema, considere:

1. **Animações**: Adicionar mais tipos de animação
2. **Som**: Notificações sonoras (opcional)
3. **Histórico**: Manter histórico de notificações
4. **Temas**: Mais opções de tema visual
5. **Analytics**: Rastrear interações com notificações

## 📞 Suporte

Se encontrar problemas ou tiver sugestões:

1. Verifique o console do navegador para erros JavaScript
2. Teste em diferentes navegadores e dispositivos
3. Use o arquivo de teste para isolar problemas
4. Consulte a documentação do Shopify Liquid para dúvidas específicas

---

**Nota**: Este sistema segue as melhores práticas do Shopify 2.0 e é totalmente compatível com temas modernos.

