// Klaviyo Popup Cleaner Script
// Remove tags H1 vazias do popup do Klaviyo
// Executa automaticamente quando o DOM estiver carregado

(function () {
  "use strict";

  console.log("🔧 Klaviyo Popup Cleaner iniciado...");

  // Função para limpar tags H1 vazias
  function cleanEmptyH1Tags() {
    // Procura por todos os elementos H1 dentro do popup do Klaviyo
    const klaviyoForms = document.querySelectorAll('[data-testid="klaviyo-form-UbasUU"], .klaviyo-form, [class*="klaviyo"]');

    klaviyoForms.forEach((form) => {
      // Procura por todos os H1 dentro do formulário
      const h1Elements = form.querySelectorAll("h1");

      h1Elements.forEach((h1) => {
        // Remove espaços em branco e quebras de linha
        const textContent = h1.textContent.trim();

        // Se o H1 estiver vazio ou contiver apenas espaços/quebras de linha
        if (!textContent || textContent === "" || textContent === "&nbsp;") {
          console.log("🗑️ Removendo H1 vazio:", h1);
          h1.remove();
        }
        // Se o H1 contém apenas comentários HTML
        else if (textContent.includes("<!--StartFragment-->") || textContent.includes("<!--EndFragment-->")) {
          console.log("🗑️ Removendo H1 com comentários:", h1);
          h1.remove();
        }
        // Se o H1 contém apenas espaços não-quebráveis
        else if (textContent === "\u00A0" || textContent === " ") {
          console.log("🗑️ Removendo H1 com espaços:", h1);
          h1.remove();
        }
      });
    });
  }

  // Função para observar mudanças no DOM (quando o popup aparece)
  function observeDOM() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        // Se novos nós foram adicionados
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Verifica se algum dos nós adicionados é do Klaviyo
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              // Element node
              // Verifica se é um popup do Klaviyo
              if (
                node.querySelector &&
                (node.querySelector('[data-testid="klaviyo-form-UbasUU"]') ||
                  node.querySelector(".klaviyo-form") ||
                  node.classList.contains("klaviyo-form") ||
                  node.querySelector('[class*="klaviyo"]'))
              ) {
                console.log("🎯 Popup do Klaviyo detectado!");
                // Aguarda um pouco para o popup carregar completamente
                setTimeout(cleanEmptyH1Tags, 100);
              }
            }
          });
        }
      });
    });

    // Inicia a observação
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("👀 Observador DOM ativado para popups do Klaviyo");
  }

  // Função para limpar periodicamente (backup)
  function periodicCleanup() {
    setInterval(function () {
      cleanEmptyH1Tags();
    }, 2000); // Executa a cada 2 segundos
  }

  // Inicialização
  function init() {
    console.log("🚀 Inicializando Klaviyo Popup Cleaner...");

    // Limpa imediatamente se já houver popups
    cleanEmptyH1Tags();

    // Inicia observação do DOM
    observeDOM();

    // Inicia limpeza periódica
    periodicCleanup();

    console.log("✅ Klaviyo Popup Cleaner ativo!");
  }

  // Executa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Também executa imediatamente para casos onde o script é carregado após o DOM
  setTimeout(init, 100);
})();
