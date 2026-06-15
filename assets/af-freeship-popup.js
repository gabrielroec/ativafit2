/**
 * AtivaFit — Popup 1: PDP / Free Shipping
 * ------------------------------------------------------------------
 * Mostra um lembrete de "Free Shipping ativo" na página de produto para
 * usuários que demonstram interesse (permanecem ~1-2 min) mas ainda não
 * adicionaram o produto ao carrinho.
 *
 * IMPORTANTE — A/B TEST (Intelligems):
 *   Este script NÃO roda sozinho. O markup é renderizado em todas as PDPs
 *   (versão A e B), porém a lógica só ativa quando explicitamente habilitada.
 *
 *   Versão A (controle): nada é injetado -> popup nunca aparece.
 *   Versão B (variante): no injetor JS do Intelligems, cole:
 *
 *       window.AF_FREESHIP_POPUP_ENABLED = true;
 *       window.AFFreeShipPopup && window.AFFreeShipPopup.enable();
 *
 *   A ordem de carregamento (injetor vs. tema) não importa: o flag global
 *   AF_FREESHIP_POPUP_ENABLED é checado quando o tema carrega, e enable()
 *   é idempotente / aguarda o DOM caso seja chamado cedo demais.
 *
 * QA manual: window.AFFreeShipPopup.show()  // força a exibição imediata
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var DISMISS_KEY = "af_fsp_dismissed"; // sessionStorage: ao fechar, não mostra de novo na sessão
  var DEFAULT_DELAY = 90000; // ~1,5 min (dentro da janela de 1-2 min)

  var state = {
    enabled: false,
    pending: false,
    added: false,
    shown: false,
    timer: null,
    root: null,
    productId: null,
    variantId: null,
    delay: DEFAULT_DELAY,
  };

  function rootUrl() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
  }

  function isDismissed() {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setDismissed() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (e) {}
  }

  function clearTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function markAddedAndStop() {
    state.added = true;
    clearTimer();
    setDismissed();
  }

  function readConfig() {
    var root = document.querySelector("[data-af-fsp]");
    if (!root) return;
    state.root = root;
    var d = parseInt(root.getAttribute("data-af-fsp-delay"), 10);
    if (!isNaN(d) && d > 0) state.delay = d;
    state.productId = root.getAttribute("data-af-fsp-product-id") || null;
    state.variantId = root.getAttribute("data-af-fsp-variant") || null;
  }

  /**
   * Localiza o form de Add to Cart principal da PDP, ignorando forms de
   * recomendações, cards e do cart drawer.
   */
  function findProductForm() {
    var EXCLUDE =
      "cart-drawer, #CartDrawer, [data-product-recommendations], .product-recommendations, " +
      ".product-card, .card-wrapper, .ocp-modal, [data-af-fsp]";
    var forms = Array.prototype.slice.call(document.querySelectorAll('form[action*="/cart/add"]'));
    var candidates = forms.filter(function (f) {
      var idInput = f.querySelector('input[name="id"]');
      if (!idInput || !idInput.value) return false;
      if (f.closest(EXCLUDE)) return false;
      return true;
    });
    var visible = candidates.filter(function (f) {
      return f.offsetParent !== null;
    });
    return visible[0] || candidates[0] || forms[0] || null;
  }

  /**
   * Detecta Add to Cart feito na própria página para nunca incomodar um
   * usuário que já está convertendo. O interceptor do tema (cart-drawer-new.js)
   * para a propagação do evento "submit", então observamos o "click" do botão
   * e o evento "cart-drawer:open" disparado após o add.
   */
  function watchAddToCart() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest("[data-af-fsp]")) return; // cliques dentro do próprio popup
        if (t.closest("[data-add-to-cart]")) {
          markAddedAndStop();
          hide();
          return;
        }
        var submitBtn = t.closest('[type="submit"]');
        if (submitBtn && submitBtn.closest('form[action*="/cart/add"]')) {
          markAddedAndStop();
          hide();
        }
      },
      true
    );

    document.addEventListener("cart-drawer:open", function () {
      markAddedAndStop();
      hide();
    });
  }

  function alreadyInCart() {
    var pid = state.productId ? String(state.productId) : null;
    if (!pid) return Promise.resolve(false);

    var read =
      window.AfitCartApi && window.AfitCartApi.fetchCart
        ? window.AfitCartApi.fetchCart()
        : fetch(rootUrl() + "cart.js", {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
          }).then(function (r) {
            return r.json();
          });

    return Promise.resolve(read)
      .then(function (cart) {
        if (!cart || !cart.items) return false;
        return cart.items.some(function (it) {
          return String(it.product_id) === pid;
        });
      })
      .catch(function () {
        return false;
      });
  }

  function onKeydown(e) {
    if (e.key === "Escape" || e.code === "Escape") close();
  }

  function show() {
    if (!state.root || state.added || state.shown || isDismissed()) return;
    state.shown = true;
    clearTimer();
    state.root.classList.add("is-visible");
    state.root.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKeydown, true);
  }

  function hide() {
    if (!state.root) return;
    state.root.classList.remove("is-visible");
    state.root.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown, true);
  }

  function close() {
    hide();
    setDismissed(); // não exibir novamente nesta sessão
  }

  function onCtaClick() {
    // Adiciona o produto atual usando o fluxo nativo do tema (drawer/redirect).
    markAddedAndStop();
    hide();

    var form = findProductForm();
    if (form) {
      var btn =
        form.querySelector('[type="submit"]:not([disabled])') ||
        form.querySelector("button:not([type='button'])");
      if (btn) {
        btn.click();
        return;
      }
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return;
      }
      form.submit();
      return;
    }

    // Fallback: sem form na página -> adiciona via API e abre o drawer / vai pro cart.
    if (state.variantId) {
      fetch(rootUrl() + "cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ items: [{ id: parseInt(state.variantId, 10), quantity: 1 }] }),
      })
        .then(function () {
          if (window.AfitCartApi && window.AfitCartApi.invalidate) window.AfitCartApi.invalidate();
          var drawer = document.querySelector("cart-drawer");
          if (drawer && typeof drawer.open === "function") {
            drawer.open();
          } else {
            window.location.href = rootUrl() + "cart";
          }
        })
        .catch(function () {
          window.location.href = rootUrl() + "cart";
        });
    } else {
      window.location.href = rootUrl() + "cart";
    }
  }

  function bindUi() {
    state.root.addEventListener("click", function (e) {
      if (e.target.closest("[data-af-fsp-cta]")) {
        e.preventDefault();
        onCtaClick();
        return;
      }
      if (e.target.closest("[data-af-fsp-dismiss]")) {
        e.preventDefault();
        close();
        return;
      }
      // clique no backdrop (o próprio overlay) fecha
      if (e.target === state.root) close();
    });
  }

  function enable() {
    if (state.enabled || state.pending) return;

    // Aguarda o DOM se enable() for chamado cedo demais (injetor antes do parse).
    if (document.readyState === "loading") {
      state.pending = true;
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          state.pending = false;
          enable();
        },
        { once: true }
      );
      return;
    }

    state.enabled = true;
    readConfig();

    if (!state.root) return; // não é PDP / markup ausente
    if (isDismissed()) return; // já fechou nesta sessão

    bindUi();
    watchAddToCart();

    alreadyInCart().then(function (inCart) {
      if (inCart) {
        markAddedAndStop(); // produto já no carrinho -> não exibir
        return;
      }
      clearTimer();
      state.timer = setTimeout(show, state.delay);
    });
  }

  // API pública
  window.AFFreeShipPopup = window.AFFreeShipPopup || {};
  window.AFFreeShipPopup.enable = enable;
  window.AFFreeShipPopup.show = show; // gatilho manual p/ QA
  window.AFFreeShipPopup.close = close;

  function maybeAutoEnable() {
    if (
      window.AF_FREESHIP_POPUP_ENABLED === true ||
      document.documentElement.classList.contains("af-freeship-on")
    ) {
      enable();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeAutoEnable);
  } else {
    maybeAutoEnable();
  }
})();
