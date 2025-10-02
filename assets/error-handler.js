// Error Handler Script - Corrige erros JavaScript comuns
// Executa automaticamente quando o DOM estiver carregado

(function () {
  "use strict";

  console.log("🔧 Error Handler Script iniciado...");

  // Função para capturar e tratar erros JavaScript
  function handleJavaScriptErrors() {
    // Captura erros não tratados
    window.addEventListener("error", function (event) {
      const error = event.error;
      const message = event.message;
      const filename = event.filename;
      const lineno = event.lineno;

      // Ignora erros de extensões do navegador
      if (
        filename &&
        (filename.includes("chrome-extension://") ||
          filename.includes("moz-extension://") ||
          filename.includes("safari-extension://") ||
          filename.includes("_AutofillCallbackHandler") ||
          filename.includes("extension://"))
      ) {
        console.log("🚫 Erro de extensão ignorado:", message);
        event.preventDefault();
        return false;
      }

      // Ignora erros de scripts externos problemáticos
      if (
        message &&
        (message.includes("_AutofillCallbackHandler") ||
          message.includes("Non-Error promise rejection") ||
          message.includes("Script error"))
      ) {
        console.log("🚫 Erro externo ignorado:", message);
        event.preventDefault();
        return false;
      }

      // Log outros erros para debug
      console.warn("⚠️ Erro JavaScript capturado:", {
        message: message,
        filename: filename,
        line: lineno,
        error: error,
      });
    });

    // Captura rejeições de Promise não tratadas
    window.addEventListener("unhandledrejection", function (event) {
      const reason = event.reason;

      // Ignora rejeições de extensões
      if (
        reason &&
        (reason.toString().includes("_AutofillCallbackHandler") ||
          reason.toString().includes("Non-Error promise rejection") ||
          reason.toString().includes("Script error"))
      ) {
        console.log("🚫 Rejeição de Promise ignorada:", reason);
        event.preventDefault();
        return false;
      }

      console.warn("⚠️ Rejeição de Promise não tratada:", reason);
    });
  }

  // Função para adicionar verificações de segurança em elementos DOM
  function addDOMSafetyChecks() {
    // Override de querySelector para adicionar verificações
    const originalQuerySelector = Element.prototype.querySelector;
    Element.prototype.querySelector = function (selector) {
      try {
        const result = originalQuerySelector.call(this, selector);
        return result;
      } catch (error) {
        console.warn("⚠️ Erro em querySelector:", selector, error);
        return null;
      }
    };

    // Override de querySelectorAll para adicionar verificações
    const originalQuerySelectorAll = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function (selector) {
      try {
        const result = originalQuerySelectorAll.call(this, selector);
        return result;
      } catch (error) {
        console.warn("⚠️ Erro em querySelectorAll:", selector, error);
        return [];
      }
    };

    // Override de getElementById para adicionar verificações
    const originalGetElementById = Document.prototype.getElementById;
    Document.prototype.getElementById = function (id) {
      try {
        const result = originalGetElementById.call(this, id);
        return result;
      } catch (error) {
        console.warn("⚠️ Erro em getElementById:", id, error);
        return null;
      }
    };
  }

  // Função para corrigir problemas de autofill
  function fixAutofillIssues() {
    // Remove listeners problemáticos de autofill
    const inputs = document.querySelectorAll('input[type="email"], input[type="text"], input[type="password"]');

    inputs.forEach((input) => {
      // Remove atributos que podem causar problemas
      input.removeAttribute("autocomplete");

      // Adiciona listener seguro para autofill
      input.addEventListener("animationstart", function (e) {
        if (e.animationName === "onAutoFillStart") {
          console.log("✅ Autofill detectado e tratado com segurança");
        }
      });

      // Previne erros de autofill
      input.addEventListener("input", function (e) {
        // Limpa qualquer callback problemático
        if (e.target._AutofillCallbackHandler) {
          delete e.target._AutofillCallbackHandler;
        }
      });
    });
  }

  // Função para corrigir problemas de ResizeObserver
  function fixResizeObserverIssues() {
    // Polyfill para ResizeObserver se não estiver disponível
    if (!window.ResizeObserver) {
      console.log("🔧 ResizeObserver não disponível, criando polyfill...");

      window.ResizeObserver = function (callback) {
        this.callback = callback;
        this.observers = new Map();

        this.observe = function (element) {
          if (this.observers.has(element)) return;

          const rect = element.getBoundingClientRect();
          this.observers.set(element, rect);

          // Simula mudanças de tamanho
          const checkSize = () => {
            const newRect = element.getBoundingClientRect();
            const oldRect = this.observers.get(element);

            if (newRect.width !== oldRect.width || newRect.height !== oldRect.height) {
              this.observers.set(element, newRect);
              try {
                this.callback([{ contentRect: newRect }]);
              } catch (error) {
                console.warn("⚠️ Erro no ResizeObserver callback:", error);
              }
            }

            requestAnimationFrame(checkSize);
          };

          requestAnimationFrame(checkSize);
        };

        this.disconnect = function () {
          this.observers.clear();
        };
      };
    }
  }

  // Função para corrigir problemas de vídeo
  function fixVideoIssues() {
    // Adiciona verificações de segurança para players de vídeo
    const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');

    videos.forEach((video) => {
      // Adiciona verificações de segurança
      if (video.play) {
        const originalPlay = video.play;
        video.play = function () {
          try {
            return originalPlay.call(this);
          } catch (error) {
            console.warn("⚠️ Erro ao reproduzir vídeo:", error);
            return Promise.resolve();
          }
        };
      }

      // Adiciona verificações para YouTube
      if (video.contentWindow && video.contentWindow.postMessage) {
        const originalPostMessage = video.contentWindow.postMessage;
        video.contentWindow.postMessage = function (message, targetOrigin) {
          try {
            return originalPostMessage.call(this, message, targetOrigin);
          } catch (error) {
            console.warn("⚠️ Erro no postMessage do vídeo:", error);
          }
        };
      }
    });
  }

  // Função para corrigir problemas de carregamento
  function fixLoadIssues() {
    // Adiciona verificações de segurança para imagens
    const images = document.querySelectorAll("img");

    images.forEach((img) => {
      img.addEventListener("error", function (e) {
        console.warn("⚠️ Erro ao carregar imagem:", img.src);
        // Adiciona classe para estilização de erro
        img.classList.add("load-error");
      });

      img.addEventListener("load", function (e) {
        img.classList.add("load-success");
      });
    });

    // Adiciona verificações de segurança para scripts
    const scripts = document.querySelectorAll("script[src]");

    scripts.forEach((script) => {
      script.addEventListener("error", function (e) {
        console.warn("⚠️ Erro ao carregar script:", script.src);
      });
    });
  }

  // Função principal de inicialização
  function init() {
    console.log("🚀 Inicializando Error Handler...");

    // Aplica todas as correções
    handleJavaScriptErrors();
    addDOMSafetyChecks();
    fixAutofillIssues();
    fixResizeObserverIssues();
    fixVideoIssues();
    fixLoadIssues();

    console.log("✅ Error Handler ativo!");
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
