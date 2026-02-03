/**
 * One-Click Upsell - Global (Multi-Product)
 * Suporta múltiplos produtos condicionais baseados no nome do produto adicionado
 */

(function () {
  "use strict";

  function getCartApi() {
    if (window.AfitCartApi) return window.AfitCartApi;

    const ROOT_URL = window.Shopify?.routes?.root || "/";
    const state = {
      cache: null,
      inflight: null,
      lastFetchAt: 0,
    };
    const MIN_INTERVAL = 800;

    function fetchCart(options = {}) {
      const force = options.force === true;
      const now = Date.now();

      if (!force && state.cache && now - state.lastFetchAt < MIN_INTERVAL) {
        return Promise.resolve(state.cache);
      }

      if (state.inflight) return state.inflight;

      state.inflight = fetch(`${ROOT_URL}cart.js`, {
        headers: { Accept: "application/json" },
      })
        .then((response) => {
          if (!response.ok) throw new Error("Cart fetch failed");
          return response.json();
        })
        .then((cart) => {
          state.cache = cart;
          state.lastFetchAt = Date.now();
          return cart;
        })
        .finally(() => {
          state.inflight = null;
        });

      return state.inflight;
    }

    function invalidate() {
      state.cache = null;
      state.lastFetchAt = 0;
    }

    window.AfitCartApi = { fetchCart, invalidate };
    return window.AfitCartApi;
  }

  function initOCP() {
    const config = window.OCP_CONFIG;
    const modal = document.getElementById("ocp-upsell-global");
    const countdownEl = document.querySelector("[data-countdown-target]");
    const productsContainer = document.getElementById("ocp-products-container");

    if (!config || !modal || !productsContainer) return;

    const STORAGE_KEY = `ocp:lastShown:${config.offerKey}`;
    const ROOT_URL = window.Shopify?.routes?.root || "/";
    const cartApi = getCartApi();
    let countdownInterval = null;
    let currentProducts = [];
    let lastAddedProduct = null;
    let lastAddedVariantId = null;
    let maybeShowTimeout = null;

    // Setup
    setupEventListeners();
    setupTriggers();
    exposeTestUtils();

    // ========== Event Listeners ==========

    function setupEventListeners() {
      modal.addEventListener("click", (e) => {
        if (e.target.matches("[data-ocp-close], .ocp-backdrop")) {
          closeModal();
        } else if (e.target.matches("[data-ocp-add]")) {
          const variantId = parseInt(e.target.dataset.variantId);
          if (variantId) {
            addUpsell(variantId, e.target);
          }
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-visible")) {
          closeModal();
        }
      });
    }

    function scheduleMaybeShowUpsell() {
      if (maybeShowTimeout) return;
      maybeShowTimeout = setTimeout(async () => {
        maybeShowTimeout = null;
        await maybeShowUpsell();
      }, 400);
    }

    // ========== Triggers ==========

    function setupTriggers() {
      // Form submissions
      document.addEventListener(
        "submit",
        async (e) => {
          const form = e.target;
          if (form instanceof HTMLFormElement && form.action?.includes("/cart/add")) {
            const formData = new FormData(form);
            const variantId = Number(formData.get("id"));
            if (Number.isFinite(variantId)) {
              lastAddedVariantId = variantId;
              lastAddedProduct = null;
              cartApi.invalidate();
            }
            scheduleMaybeShowUpsell();
          }
        },
        true
      );

      // Fetch interception
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

        if (url.includes("/cart/add") && response.ok) {
          try {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            if (data.product_title) {
              lastAddedProduct = data.product_title;
              lastAddedVariantId = null;
            }
          } catch (e) {
            // Silently fail
          }
          cartApi.invalidate();
          scheduleMaybeShowUpsell();
        }

        return response;
      };

      // Custom events
      ["cart:item-added", "product:added"].forEach((event) => {
        document.addEventListener(event, () => scheduleMaybeShowUpsell());
      });
    }

    // ========== Product Detection ==========

    async function getProductTitleByVariant(variantId) {
      try {
        const cart = await fetchCart();
        const item = cart.items?.find((i) => i.variant_id === variantId || i.id === variantId);
        return item?.product_title || null;
      } catch (e) {
        return null;
      }
    }

    function determineProductGroup() {
      if (!lastAddedProduct) return "default";

      const productName = lastAddedProduct.toLowerCase();

      if (productName.includes("dumbbell")) {
        return "dumbbell";
      } else if (productName.includes("bike")) {
        return "bike";
      }

      return "default";
    }

    // ========== Show Logic ==========

    async function maybeShowUpsell() {
      if (isCheckoutPage() || !hasPassedCooldown()) return;

      if (!lastAddedProduct && lastAddedVariantId) {
        lastAddedProduct = await getProductTitleByVariant(lastAddedVariantId);
        lastAddedVariantId = null;
      }

      const productGroup = determineProductGroup();
      const products = config.products[productGroup] || config.products.default;

      if (!products || products.length === 0) return;

      // Filter out products already in cart
      const cart = await fetchCart();
      const availableProducts = products.filter((p) => p && p.variantId && !productInCart(cart, p.variantId));

      if (availableProducts.length === 0) return;

      currentProducts = availableProducts;
      renderProducts();
      showModal();
      markAsShown();
    }

    async function checkAndCloseIfAllAdded() {
      if (currentProducts.length === 0) {
        // No more products to show, close modal
        setTimeout(() => {
          closeModal();
        }, 1200);
        return;
      }

      // Check if all remaining products are already in cart
      const cart = await fetchCart();
      const allInCart = currentProducts.every((p) => productInCart(cart, p.variantId));

      if (allInCart) {
        // All products are in cart, close modal
        setTimeout(() => {
          closeModal();
        }, 1200);
      }
    }

    function isCheckoutPage() {
      const path = window.location.pathname;
      return path.includes("/checkout") || path === "/cart";
    }

    function hasPassedCooldown() {
      const last = getLastShown();
      return Date.now() - last >= config.cooldownMs;
    }

    function productInCart(cart, variantId) {
      return cart?.items?.some((item) => item.variant_id === variantId || item.id === variantId) || false;
    }

    async function fetchCart() {
      return cartApi.fetchCart();
    }

    // ========== Render Products ==========

    function renderProducts() {
      productsContainer.innerHTML = "";

      currentProducts.forEach((product) => {
        const card = createProductCard(product);
        productsContainer.appendChild(card);
      });

      productsContainer.classList.toggle("is-single", currentProducts.length === 1);
    }

    function createProductCard(product) {
      const card = document.createElement("div");
      card.className = "ocp-product-card";

      const discountPercent = calculateDiscount(product.price, product.comparePrice);

      card.innerHTML = `
        ${
          product.image
            ? `
          <div class="ocp-product-image">
            <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
          </div>
        `
            : ""
        }
        <div class="ocp-product-info">
          <div class="ocp-name">${escapeHtml(product.title)}</div>
          <div class="ocp-price">
            <span>${product.price}</span>
            ${
              product.comparePrice && discountPercent > 0
                ? `
              <s>${product.comparePrice}</s>
              <span class="ocp-discount-badge">-${discountPercent}%</span>
            `
                : ""
            }
          </div>
          <button 
            class="ocp-cta" 
            type="button" 
            data-ocp-add 
            data-variant-id="${product.variantId}">
            ${config.ctaLabel}
          </button>
        </div>
      `;

      return card;
    }

    function calculateDiscount(priceStr, comparePriceStr) {
      if (!comparePriceStr) return 0;

      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      const comparePrice = parseFloat(comparePriceStr.replace(/[^0-9.]/g, ""));

      if (comparePrice <= price) return 0;

      return Math.round(((comparePrice - price) / comparePrice) * 100);
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    // ========== Modal Controls ==========

    function showModal() {
      modal.classList.add("is-visible");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("ocp-open");

      if (config.showCountdown && countdownEl) {
        startCountdown(config.countdownDuration);
      }

      const firstButton = modal.querySelector("[data-ocp-add]");
      if (firstButton) setTimeout(() => firstButton.focus(), 100);
    }

    function closeModal() {
      stopCountdown();
      modal.classList.remove("is-visible");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("ocp-open");
      currentProducts = [];
      lastAddedProduct = null;
      lastAddedVariantId = null;
    }

    // ========== Countdown ==========

    function startCountdown(duration) {
      let timeLeft = duration;
      updateCountdownDisplay(timeLeft);

      countdownInterval = setInterval(() => {
        timeLeft--;
        updateCountdownDisplay(timeLeft);

        if (timeLeft <= 0) {
          stopCountdown();
          closeModal();
        }
      }, 1000);
    }

    function stopCountdown() {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }

    function updateCountdownDisplay(seconds) {
      if (!countdownEl) return;

      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const parts = [];
      if (hours > 0) parts.push(`${hours}:${mins.toString().padStart(2, "0")}`);
      else parts.push(String(mins));

      parts.push(secs.toString().padStart(2, "0"));

      countdownEl.textContent = parts.join(":");
    }

    // ========== Add Upsell ==========

    async function addUpsell(variantId, button) {
      const originalText = button?.textContent;

      if (button) {
        button.disabled = true;
        button.textContent = "Adding...";
      }

      try {
        await fetch(`${ROOT_URL}cart/add.js`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id: variantId,
            quantity: 1,
            properties: { _ocp: "1", _ocp_offer: config.offerKey },
          }),
        }).then((res) => {
          if (!res.ok) throw new Error("Add failed");
          return res.json();
        });

        // Update UI to show product added
        if (button) {
          button.textContent = "✓ Added!";
          button.style.background = "#10b981";
          setTimeout(() => {
            button.remove();
          }, 1000);
        }

        cartApi.invalidate();
        await refreshCart();
        showNotification();

        // Remove product from current display
        currentProducts = currentProducts.filter((p) => p.variantId !== variantId);

        // Check and close if all products are added
        await checkAndCloseIfAllAdded();
      } catch (error) {
        alert("Unable to add product. Please try again.");
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    }

    async function refreshCart() {
      const cartDrawer = document.querySelector("cart-drawer");
      if (!cartDrawer) return;

      const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";

      try {
        const response = await fetch(`${ROOT_URL}cart?sections=${sectionId}`);
        const sections = await response.json();
        updateCartDrawer(sections[sectionId]);
        const cart = await cartApi.fetchCart({ force: true });
        await updateCartCount(cart);
      } catch (e) {
        window.location.reload();
      }
    }

    function updateCartDrawer(sectionHTML) {
      if (!sectionHTML) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(sectionHTML, "text/html");

      const itemsContainer = document.getElementById("CartDrawer-Items");
      const newItems = doc.querySelector("#CartDrawer-Items");
      if (itemsContainer && newItems) {
        itemsContainer.innerHTML = newItems.innerHTML;
      }

      const footer = document.querySelector(".cart-drawer__footer");
      const newFooter = doc.querySelector(".cart-drawer__footer");
      if (footer && newFooter) {
        footer.innerHTML = newFooter.innerHTML;
      }
    }

    async function updateCartCount(cart) {
      const cartData = cart || (await fetchCart());
      const countElements = document.querySelectorAll(".cart-count, [data-cart-count]");

      countElements.forEach((el) => {
        el.textContent = cartData.item_count;
        el.classList.toggle("hidden", cartData.item_count === 0);
      });
    }

    function showNotification() {
      if (window.CartNotification?.success) {
        window.CartNotification.success({
          title: "Added to Cart!",
          message: "Upsell product successfully added.",
          type: "success",
        });
      }
    }

    // ========== Storage ==========

    function getLastShown() {
      const value = localStorage.getItem(STORAGE_KEY);
      const timestamp = value ? Number(value) : 0;
      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function markAsShown() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    // ========== Test Utils ==========

    function exposeTestUtils() {
      window.resetOCPCooldown = function () {
        localStorage.removeItem(STORAGE_KEY);
        return "Cooldown reset. Add a product to cart to trigger upsell.";
      };

      window.testOCPProducts = function (group) {
        lastAddedProduct = group === "dumbbell" ? "Test Dumbbell" : group === "bike" ? "Test Bike" : "Test Other";
        maybeShowUpsell();
        return `Testing OCP with ${group} products`;
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOCP);
  } else {
    initOCP();
  }
})();
