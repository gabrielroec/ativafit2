/**
 * One-Click Upsell - Shopify 2.0
 * 
 * Displays upsell popup after add-to-cart events
 * - Supports unlisted products (any active product works)
 * - localStorage cooldown to prevent spam
 * - Validates product not already in cart
 * - Integrates with existing cart drawer
 * 
 * @version 1.0.0
 */

(function() {
  'use strict';

  // Elements
  const config = getConfig();
  const modal = document.getElementById('ocp-upsell');
  const countdownEl = document.querySelector('[data-countdown-target]');
  
  if (!config || !modal) return;

  // Constants
  const STORAGE_KEY = `ocp:lastShown:${config.offerKey}`;
  const ROOT_URL = window.Shopify?.routes?.root || '/';

  // State
  let countdownInterval = null;

  // Initialize
  init();

  // ========== Initialization ==========

  function init() {
    setupEventListeners();
    setupTriggers();
    exposeTestUtils();
  }

  function getConfig() {
    const el = document.getElementById('ocp-config');
    if (!el) return null;

    try {
      const cfg = JSON.parse(el.textContent || '{}');
      return {
        variantId: cfg.variantId,
        cooldownMs: cfg.cooldownMs || 300000,
        offerKey: cfg.offerKey || 'default_offer',
        countdownDuration: cfg.countdownDuration || 120,
        showCountdown: cfg.showCountdown !== false
      };
    } catch (e) {
      return null;
    }
  }

  // ========== Event Listeners ==========

  function setupEventListeners() {
    modal.addEventListener('click', handleModalClick);
    document.addEventListener('keydown', handleEscapeKey);
  }

  function handleModalClick(e) {
    if (e.target.matches('[data-ocp-close], .ocp-backdrop')) {
      closeModal();
    } else if (e.target.matches('[data-ocp-add]')) {
      addUpsell();
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape' && modal.classList.contains('is-visible')) {
      closeModal();
    }
  }

  // ========== Triggers ==========

  function setupTriggers() {
    interceptFormSubmissions();
    interceptFetchCalls();
    listenToCustomEvents();
  }

  function interceptFormSubmissions() {
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form instanceof HTMLFormElement && form.action?.includes('/cart/add')) {
        setTimeout(maybeShowUpsell, 400);
      }
    }, true);
  }

  function interceptFetchCalls() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      
      if (url.includes('/cart/add') && response.ok) {
        setTimeout(maybeShowUpsell, 400);
      }
      
      return response;
    };
  }

  function listenToCustomEvents() {
    ['cart:item-added', 'product:added'].forEach(event => {
      document.addEventListener(event, () => setTimeout(maybeShowUpsell, 400));
    });
  }

  // ========== Show Logic ==========

  async function maybeShowUpsell() {
    if (shouldSkipUpsell()) return;
    if (!(await canShowUpsell())) return;

    showModal();
    markAsShown();
  }

  function shouldSkipUpsell() {
    return isCheckoutPage() || !hasPassedCooldown();
  }

  function isCheckoutPage() {
    const path = window.location.pathname;
    return path.includes('/checkout') || path === '/cart';
  }

  function hasPassedCooldown() {
    const lastShown = getLastShown();
    return Date.now() - lastShown >= config.cooldownMs;
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

  // ========== Countdown Timer ==========

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
    
    setButtonLoading(button, true);

    try {
      await addToCart(config.variantId, config.offerKey);
      closeModal();
      await refreshCart();
      showSuccessNotification();
    } catch (error) {
      showErrorNotification();
    } finally {
      setButtonLoading(button, false, originalText);
    }
  }

  function setButtonLoading(button, loading, text = null) {
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.textContent = 'Adding...';
    } else {
      button.disabled = false;
      if (text) button.textContent = text;
    }
  }

  async function addToCart(variantId, offerKey) {
    const response = await fetch(`${ROOT_URL}cart/add.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
        properties: {
          '_ocp': '1',
          '_ocp_offer': offerKey
        }
      })
    });

    if (!response.ok) throw new Error('Add to cart failed');
    return response.json();
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
      // Fallback: reload page
      window.location.reload();
    }
  }

  function updateCartDrawer(sectionHTML) {
    if (!sectionHTML) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(sectionHTML, 'text/html');
    
    // Update items
    const itemsContainer = document.getElementById('CartDrawer-Items');
    const newItems = doc.querySelector('#CartDrawer-Items');
    if (itemsContainer && newItems) {
      itemsContainer.innerHTML = newItems.innerHTML;
    }
    
    // Update footer
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

  // ========== API Helpers ==========

  async function fetchCart() {
    const response = await fetch(`${ROOT_URL}cart.js`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Cart fetch failed');
    return response.json();
  }

  // ========== Storage Helpers ==========

  function getLastShown() {
    const value = localStorage.getItem(STORAGE_KEY);
    const timestamp = value ? Number(value) : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function markAsShown() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  // ========== Notifications ==========

  function showSuccessNotification() {
    if (window.CartNotification?.success) {
      window.CartNotification.success({
        title: "Added to Cart!",
        message: "Upsell product successfully added.",
        type: "success"
      });
    }
  }

  function showErrorNotification() {
    if (window.CartNotification?.error) {
      window.CartNotification.error({
        title: "Error",
        message: "Unable to add product. Please try again.",
        type: "error"
      });
    } else {
      alert('Unable to add product. Please try again.');
    }
  }

  // ========== Test Utilities ==========

  function exposeTestUtils() {
    if (typeof window !== 'undefined') {
      window.resetOCPCooldown = function() {
        localStorage.removeItem(STORAGE_KEY);
        return 'Cooldown reset. Add a product to cart to trigger upsell.';
      };
    }
  }

})();
