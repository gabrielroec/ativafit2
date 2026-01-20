/**
 * One-Click Upsell - Global (Snippet-based)
 * Guaranteed to work on all pages via snippet rendering
 */

(function() {
  'use strict';

  function initOCP() {
    const config = window.OCP_CONFIG;
    const modal = document.getElementById('ocp-upsell-global');
    const countdownEl = document.querySelector('[data-countdown-target]');
    
    if (!config || !modal) return;

    const STORAGE_KEY = `ocp:lastShown:${config.offerKey}`;
    const ROOT_URL = window.Shopify?.routes?.root || '/';
    let countdownInterval = null;

    // Setup
    setupEventListeners();
    setupTriggers();
    exposeTestUtils();

    // ========== Event Listeners ==========

    function setupEventListeners() {
      modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-ocp-close], .ocp-backdrop')) {
          closeModal();
        } else if (e.target.matches('[data-ocp-add]')) {
          addUpsell();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-visible')) {
          closeModal();
        }
      });
    }

    // ========== Triggers ==========

    function setupTriggers() {
      // Form submissions
      document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form instanceof HTMLFormElement && form.action?.includes('/cart/add')) {
          setTimeout(maybeShowUpsell, 400);
        }
      }, true);

      // Fetch interception
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        
        if (url.includes('/cart/add') && response.ok) {
          setTimeout(maybeShowUpsell, 400);
        }
        
        return response;
      };

      // Custom events
      ['cart:item-added', 'product:added'].forEach(event => {
        document.addEventListener(event, () => setTimeout(maybeShowUpsell, 400));
      });
    }

    // ========== Show Logic ==========

    async function maybeShowUpsell() {
      if (isCheckoutPage() || !hasPassedCooldown()) return;
      if (!(await canShowUpsell())) return;

      showModal();
      markAsShown();
    }

    function isCheckoutPage() {
      const path = window.location.pathname;
      return path.includes('/checkout') || path === '/cart';
    }

    function hasPassedCooldown() {
      const last = getLastShown();
      return Date.now() - last >= config.cooldownMs;
    }

    async function canShowUpsell() {
      try {
        const cart = await fetchCart();
        return !productInCart(cart, config.variantId);
      } catch (e) {
        return false;
      }
    }

    function productInCart(cart, variantId) {
      return cart?.items?.some(item => 
        item.variant_id === variantId || item.id === variantId
      ) || false;
    }

    async function fetchCart() {
      const response = await fetch(`${ROOT_URL}cart.js`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Cart fetch failed');
      return response.json();
    }

    // ========== Modal Controls ==========

    function showModal() {
      modal.classList.add('is-visible');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('ocp-open');
      
      if (config.showCountdown && countdownEl) {
        startCountdown(config.countdownDuration);
      }
      
      const button = modal.querySelector('[data-ocp-add]');
      if (button) setTimeout(() => button.focus(), 100);
    }

    function closeModal() {
      stopCountdown();
      modal.classList.remove('is-visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('ocp-open');
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
      if (hours > 0) parts.push(`${hours}:${mins.toString().padStart(2, '0')}`);
      else parts.push(String(mins));
      
      parts.push(secs.toString().padStart(2, '0'));
      
      countdownEl.textContent = parts.join(':');
    }

    // ========== Add Upsell ==========

    async function addUpsell() {
      const button = modal.querySelector('[data-ocp-add]');
      const originalText = button?.textContent;
      
      if (button) {
        button.disabled = true;
        button.textContent = 'Adding...';
      }

      try {
        await fetch(`${ROOT_URL}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            id: config.variantId,
            quantity: 1,
            properties: { '_ocp': '1', '_ocp_offer': config.offerKey }
          })
        }).then(res => {
          if (!res.ok) throw new Error('Add failed');
          return res.json();
        });

        closeModal();
        await refreshCart();
        showNotification();
      } catch (error) {
        alert('Unable to add product. Please try again.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    }

    async function refreshCart() {
      const cartDrawer = document.querySelector('cart-drawer');
      if (!cartDrawer) return;

      const sectionId = document.getElementById('CartDrawer-Items')?.dataset.id || 'cart-drawer';
      
      try {
        const response = await fetch(`${ROOT_URL}cart?sections=${sectionId}`);
        const sections = await response.json();
        updateCartDrawer(sections[sectionId]);
        await updateCartCount();
      } catch (e) {
        window.location.reload();
      }
    }

    function updateCartDrawer(sectionHTML) {
      if (!sectionHTML) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(sectionHTML, 'text/html');
      
      const itemsContainer = document.getElementById('CartDrawer-Items');
      const newItems = doc.querySelector('#CartDrawer-Items');
      if (itemsContainer && newItems) {
        itemsContainer.innerHTML = newItems.innerHTML;
      }
      
      const footer = document.querySelector('.cart-drawer__footer');
      const newFooter = doc.querySelector('.cart-drawer__footer');
      if (footer && newFooter) {
        footer.innerHTML = newFooter.innerHTML;
      }
    }

    async function updateCartCount() {
      const cart = await fetchCart();
      const countElements = document.querySelectorAll('.cart-count, [data-cart-count]');
      
      countElements.forEach(el => {
        el.textContent = cart.item_count;
        el.classList.toggle('hidden', cart.item_count === 0);
      });
    }

    function showNotification() {
      if (window.CartNotification?.success) {
        window.CartNotification.success({
          title: "Added to Cart!",
          message: "Upsell product successfully added.",
          type: "success"
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
      window.resetOCPCooldown = function() {
        localStorage.removeItem(STORAGE_KEY);
        return 'Cooldown reset. Add a product to cart to trigger upsell.';
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOCP);
  } else {
    initOCP();
  }

})();

