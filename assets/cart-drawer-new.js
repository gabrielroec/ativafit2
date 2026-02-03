/**
 * Cart Drawer Component - Shopify 2.0
 *
 * Implementa cart drawer seguindo as práticas oficiais da Shopify:
 * - Web Components para encapsulamento
 * - Fetch API para Cart API
 * - Acessibilidade (ARIA, keyboard)
 * - Performance otimizada
 *
 * Referências:
 * - https://shopify.dev/docs/api/ajax/reference/cart
 * - https://shopify.dev/docs/storefronts/themes/best-practices
 */

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

if (!customElements.get("cart-drawer")) {
  customElements.define(
    "cart-drawer",
    class CartDrawer extends HTMLElement {
      constructor() {
        super();
        this.drawer = this.querySelector("#CartDrawer");
        this.closeButtons = this.querySelectorAll("[data-close-drawer]");
        this.isOpen = false;

        this.addEventListener("keyup", (evt) => evt.code === "Escape" && this.close());
        this.closeButtons.forEach((button) => {
          button.addEventListener("click", this.close.bind(this));
        });

        // Setup loyalty button
        this.setupLoyaltyButton();
      }

      setupLoyaltyButton() {
        const loyaltyBtn = this.querySelector("[data-open-loyalty]");
        if (!loyaltyBtn) return;

        loyaltyBtn.addEventListener("click", () => {
          // Tenta encontrar o botão original do BON Loyalty
          const originalBtn =
            document.getElementById("bon-loyalty-btn") ||
            document.querySelector('[id*="bon-loyalty"]') ||
            document.querySelector('button[aria-label="BON-Loyalty-btn"]');

          if (originalBtn) {
            // Clica no botão original para abrir o iframe
            originalBtn.click();
          }
        });
      }

      open() {
        this.isOpen = true;
        this.classList.add("is-open");
        this.drawer.setAttribute("aria-hidden", "false");

        // Prevent body scroll
        document.body.classList.add("cart-drawer-open");

        // Focus management
        this.drawer.focus();

        // Dispatch event
        this.dispatchEvent(new CustomEvent("cart-drawer:open", { bubbles: true }));
      }

      close() {
        this.isOpen = false;
        this.classList.remove("is-open");
        this.drawer.setAttribute("aria-hidden", "true");

        // Re-enable body scroll
        document.body.classList.remove("cart-drawer-open");

        // Dispatch event
        this.dispatchEvent(new CustomEvent("cart-drawer:close", { bubbles: true }));
      }
    }
  );
}

if (!customElements.get("cart-remove-button")) {
  customElements.define(
    "cart-remove-button",
    class CartRemoveButton extends HTMLElement {
      constructor() {
        super();

        this.addEventListener("click", (event) => {
          event.preventDefault();
          const line = parseInt(this.dataset.line);
          this.updateCart(line, 0);
        });
      }

      updateCart(line, quantity) {
        this.classList.add("loading");

        const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";

        const body = JSON.stringify({
          line: line,
          quantity: quantity,
          sections: sectionId,
          sections_url: window.location.pathname,
        });

        fetch("/cart/change.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: body,
        })
          .then((response) => response.json())
          .then((state) => {
            if (state.errors || state.status === "bad_request") {
              console.error(state);
              this.classList.remove("loading");
              return;
            }

            this.renderContents(state);
            this.classList.remove("loading");
          })
          .catch((error) => {
            console.error("Error:", error);
            this.classList.remove("loading");
          });
      }

      renderContents(parsedState) {
        const cartDrawerItems = document.getElementById("CartDrawer-Items");
        const sectionId = cartDrawerItems?.dataset.id || "cart-drawer";

        if (cartDrawerItems && parsedState.sections && parsedState.sections[sectionId]) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(parsedState.sections[sectionId], "text/html");

          // Update items list
          const newItems = doc.querySelector("#CartDrawer-Items");
          if (newItems) {
            cartDrawerItems.innerHTML = newItems.innerHTML;
          }

          // Update recommendations if visible
          const cartDrawerRecommendations = document.getElementById("CartDrawer-Recommendations");
          const newRecommendations = doc.querySelector("#CartDrawer-Recommendations");
          if (cartDrawerRecommendations && newRecommendations) {
            cartDrawerRecommendations.innerHTML = newRecommendations.innerHTML;
          } else if (cartDrawerRecommendations && !newRecommendations) {
            // If no more recommendations, remove the section
            cartDrawerRecommendations.remove();
          }

          // Update entire footer (subtotal, badges, payment terms) - all calculated values
          const footer = document.querySelector(".cart-drawer__footer");
          const newFooter = doc.querySelector(".cart-drawer__footer");
          if (footer && newFooter) {
            footer.innerHTML = newFooter.innerHTML;
          }
        }

        // Update cart count
        this.updateCartCount(parsedState.item_count);

        // Check if cart is empty and update drawer state
        const cartDrawer = document.querySelector("cart-drawer");
        if (parsedState.item_count === 0) {
          cartDrawer?.classList.add("is-empty");
        } else {
          cartDrawer?.classList.remove("is-empty");
        }
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
      }

      updateCartCount(count) {
        const cartCountElements = document.querySelectorAll(".cart-count, [data-cart-count]");
        cartCountElements.forEach((element) => {
          element.textContent = count;
          element.classList.toggle("hidden", count === 0);
        });
      }

      formatMoney(cents) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(cents / 100);
      }
    }
  );
}

if (!customElements.get("quantity-input")) {
  customElements.define(
    "quantity-input",
    class QuantityInput extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector("input");
        this.changeEvent = new Event("change", { bubbles: true });

        this.querySelectorAll("button").forEach((button) => button.addEventListener("click", this.onButtonClick.bind(this)));

        this.input.addEventListener("change", this.onInputChange.bind(this));
      }

      onButtonClick(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const line = parseInt(button.dataset.line);
        const newQuantity = parseInt(button.dataset.quantity);

        if (newQuantity < 1) return;

        this.input.value = newQuantity;
        this.updateCart(line, newQuantity);
      }

      onInputChange(event) {
        const value = parseInt(event.target.value);
        if (value < 1) {
          event.target.value = 1;
          return;
        }

        const line = parseInt(event.target.dataset.line);
        this.updateCart(line, value);
      }

      updateCart(line, quantity) {
        this.classList.add("loading");

        const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";

        const body = JSON.stringify({
          line: line,
          quantity: quantity,
          sections: sectionId,
          sections_url: window.location.pathname,
        });

        fetch("/cart/change.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: body,
        })
          .then((response) => response.json())
          .then((state) => {
            if (state.errors || state.status === "bad_request") {
              console.error(state);
              this.input.value = this.input.defaultValue;
              this.classList.remove("loading");
              return;
            }

            this.renderContents(state);
            this.classList.remove("loading");
          })
          .catch((error) => {
            console.error("Error:", error);
            this.input.value = this.input.defaultValue;
            this.classList.remove("loading");
          });
      }

      renderContents(parsedState) {
        const cartDrawerItems = document.getElementById("CartDrawer-Items");
        const sectionId = cartDrawerItems?.dataset.id || "cart-drawer";

        if (cartDrawerItems && parsedState.sections && parsedState.sections[sectionId]) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(parsedState.sections[sectionId], "text/html");

          // Update items list
          const newItems = doc.querySelector("#CartDrawer-Items");
          if (newItems) {
            cartDrawerItems.innerHTML = newItems.innerHTML;
          }

          // Update recommendations if visible
          const cartDrawerRecommendations = document.getElementById("CartDrawer-Recommendations");
          const newRecommendations = doc.querySelector("#CartDrawer-Recommendations");
          if (cartDrawerRecommendations && newRecommendations) {
            cartDrawerRecommendations.innerHTML = newRecommendations.innerHTML;
          } else if (cartDrawerRecommendations && !newRecommendations) {
            // If no more recommendations, remove the section
            cartDrawerRecommendations.remove();
          }

          // Update entire footer (subtotal, badges, payment terms) - all calculated values
          const footer = document.querySelector(".cart-drawer__footer");
          const newFooter = doc.querySelector(".cart-drawer__footer");
          if (footer && newFooter) {
            footer.innerHTML = newFooter.innerHTML;
          }
        }

        // Update cart count
        this.updateCartCount(parsedState.item_count);

        // Check if cart is empty
        const cartDrawer = document.querySelector("cart-drawer");
        if (parsedState.item_count === 0) {
          cartDrawer?.classList.add("is-empty");
        } else {
          cartDrawer?.classList.remove("is-empty");
        }
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
      }

      updateCartCount(count) {
        const cartCountElements = document.querySelectorAll(".cart-count, [data-cart-count]");
        cartCountElements.forEach((element) => {
          element.textContent = count;
          element.classList.toggle("hidden", count === 0);
        });
      }

      formatMoney(cents) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(cents / 100);
      }
    }
  );
}

// Helper function to format money
function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// Open cart drawer when item is added
document.addEventListener("DOMContentLoaded", () => {
  const cartApi = getCartApi();
  // Handle recommendation button clicks
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      e.preventDefault();
      const variantId = addBtn.dataset.variantId;
      const originalText = addBtn.textContent;

      if (!variantId) return;

      addBtn.classList.add("loading");
      addBtn.disabled = true;
      addBtn.textContent = "Adding...";

      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: variantId,
          quantity: 1,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to add to cart");
          return response.json();
        })
        .then(() => {
          cartApi.invalidate();
          const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";
          return fetch(`/cart?sections=${sectionId}`);
        })
        .then((res) => res.json())
        .then((sections) => {
          const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";
          const cartDrawerItems = document.getElementById("CartDrawer-Items");
          const sectionContent = sections[sectionId];

          if (cartDrawerItems && sectionContent) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(sectionContent, "text/html");

            const newItems = doc.querySelector("#CartDrawer-Items");
            if (newItems) {
              cartDrawerItems.innerHTML = newItems.innerHTML;
            }

            const cartDrawerRecommendations = document.getElementById("CartDrawer-Recommendations");
            const newRecommendations = doc.querySelector("#CartDrawer-Recommendations");
            if (cartDrawerRecommendations && newRecommendations) {
              cartDrawerRecommendations.innerHTML = newRecommendations.innerHTML;
            } else if (cartDrawerRecommendations && !newRecommendations) {
              cartDrawerRecommendations.remove();
            }

            const footer = document.querySelector(".cart-drawer__footer");
            const newFooter = doc.querySelector(".cart-drawer__footer");
            if (footer && newFooter) {
              footer.innerHTML = newFooter.innerHTML;
            }
          }

          return cartApi.fetchCart({ force: true });
        })
        .then((cart) => {
          const cartCountElements = document.querySelectorAll(".cart-count, [data-cart-count]");
          cartCountElements.forEach((element) => {
            element.textContent = cart.item_count;
            element.classList.toggle("hidden", cart.item_count === 0);
          });

          // Show success notification
          if (window.CartNotification) {
            window.CartNotification.success({
              title: "Product Added!",
              message:
                'Join <a href="https://www.ativafit.com/pages/ativapeople-rewards-program" target="_blank" style="color: #eb701f; text-decoration: underline; font-weight: bold;">AtivaPeople</a> & get 10% off your first order.',
              type: "success",
            });
          }

          const cartDrawer = document.querySelector("cart-drawer");
          if (cartDrawer) {
            if (cart.item_count === 0) {
              cartDrawer.classList.add("is-empty");
            } else {
              cartDrawer.classList.remove("is-empty");
            }
            cartDrawer.open();
          }
        })
        .catch((error) => {
          console.error("Error adding to cart:", error);
          if (window.CartNotification) {
            window.CartNotification.error({
              title: "Error!",
              message: "Error adding product to cart. Please try again.",
              type: "error",
            });
          } else {
            alert("Error adding product to cart. Please try again.");
          }
        })
        .finally(() => {
          addBtn.classList.remove("loading");
          addBtn.disabled = false;
          addBtn.textContent = originalText;
        });
    }
  });

  // Intercept add to cart forms using event delegation (works for dynamically added forms)
  document.addEventListener(
    "submit",
    (e) => {
      // Get the form element (in case event is from button)
      const form = e.target.closest ? e.target.closest("form") : e.target;
      if (!form || form.tagName !== "FORM") return;

      // Check if it's an add to cart form
      const isAddToCartForm = form.action && form.action.includes("/cart/add");

      if (isAddToCartForm) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const formData = new FormData(form);
        const button = form.querySelector('[type="submit"]');
        const originalText = button?.textContent;

        if (button) {
          button.classList.add("loading");
          button.disabled = true;
          button.textContent = "Adding...";
        }

        fetch("/cart/add.js", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to add to cart");
            }
            return response.json();
          })
          .then((data) => {
            console.log("Product added to cart:", data);
            cartApi.invalidate();

            // Update cart drawer content using Shopify Section Rendering API
            const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";

            return fetch(`/cart?sections=${sectionId}`);
          })
          .then((res) => res.json())
          .then((sections) => {
            const sectionId = document.getElementById("CartDrawer-Items")?.dataset.id || "cart-drawer";
            const cartDrawerItems = document.getElementById("CartDrawer-Items");
            const sectionContent = sections[sectionId];

            if (cartDrawerItems && sectionContent) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(sectionContent, "text/html");
              const newItems = doc.querySelector("#CartDrawer-Items");
              if (newItems) {
                cartDrawerItems.innerHTML = newItems.innerHTML;
              }

              // Update recommendations if visible
              const cartDrawerRecommendations = document.getElementById("CartDrawer-Recommendations");
              const newRecommendations = doc.querySelector("#CartDrawer-Recommendations");
              if (cartDrawerRecommendations && newRecommendations) {
                cartDrawerRecommendations.innerHTML = newRecommendations.innerHTML;
              } else if (cartDrawerRecommendations && !newRecommendations) {
                // If no more recommendations, remove the section
                cartDrawerRecommendations.remove();
              }

              // Update entire footer (subtotal with badges, payment terms) - all calculated values
              const footer = document.querySelector(".cart-drawer__footer");
              const newFooter = doc.querySelector(".cart-drawer__footer");
              if (footer && newFooter) {
                footer.innerHTML = newFooter.innerHTML;
              }
            }

            // Update cart count and open drawer
            return cartApi.fetchCart({ force: true });
          })
          .then((cart) => {
            // Update cart count
            const cartCountElements = document.querySelectorAll(".cart-count, [data-cart-count]");
            cartCountElements.forEach((element) => {
              element.textContent = cart.item_count;
              element.classList.toggle("hidden", cart.item_count === 0);
            });

            // Update subtotal
            const subtotal = document.querySelector("[data-cart-subtotal]");
            if (subtotal) {
              subtotal.textContent = formatMoney(cart.total_price);
            }

            // Show success notification
            if (window.CartNotification) {
              window.CartNotification.success({
                title: "Product Added!",
                message:
                  'Join <a href="https://www.ativafit.com/pages/ativapeople-rewards-program" target="_blank" style="color: #eb701f; text-decoration: underline; font-weight: bold;">AtivaPeople</a> & get 10% off your first order.',
                type: "success",
              });
            }

            // Update drawer state and open
            const cartDrawer = document.querySelector("cart-drawer");
            if (cartDrawer) {
              if (cart.item_count === 0) {
                cartDrawer.classList.add("is-empty");
              } else {
                cartDrawer.classList.remove("is-empty");
              }
              // Open drawer
              cartDrawer.open();
            }
          })
          .catch((error) => {
            console.error("Error adding to cart:", error);
            if (window.CartNotification) {
              window.CartNotification.error({
                title: "Error!",
                message: "Error adding product to cart. Please try again.",
                type: "error",
              });
            } else {
              alert("Error adding product to cart. Please try again.");
            }
          })
          .finally(() => {
            if (button) {
              button.classList.remove("loading");
              button.disabled = false;
              button.textContent = originalText;
            }
          });

        return false;
      }
    },
    true
  ); // Use capture phase to intercept before other handlers

  // Cart icon click
  document.addEventListener("click", (e) => {
    if (e.target.closest('[href="/cart"]') || e.target.closest("[data-cart-toggle]")) {
      e.preventDefault();
      const cartDrawer = document.querySelector("cart-drawer");
      if (cartDrawer) {
        cartDrawer.open();
      }
    }
  });

  // ========== Recommendations Collapse/Expand ==========

  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-recommendations-toggle]");
    if (!button) return;

    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isExpanded));
  });
});
