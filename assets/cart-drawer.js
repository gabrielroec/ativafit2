class CartDrawer {
  constructor() {
    this.drawer = null;
    this.overlay = null;
    this.isOpen = false;
    this.cartData = null;

    this.init();
  }

  init() {
    this.createElements();
    this.bindEvents();
    this.updateCartCount();
  }

  createElements() {
    // Create overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "cart-drawer-overlay";
    document.body.appendChild(this.overlay);

    // Create drawer
    this.drawer = document.createElement("div");
    this.drawer.className = "cart-drawer";
    this.drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3 class="cart-drawer-title bold">Your Cart</h3>
        <button class="cart-drawer-close">&times;</button>
      </div>
      <div class="cart-drawer-content">
        <div class="cart-drawer-loading" style="padding: 40px; text-align: center;">
          Loading...
        </div>
      </div>
    `;
    document.body.appendChild(this.drawer);
  }

  bindEvents() {
    // Close drawer events
    this.overlay.addEventListener("click", () => this.close());
    this.drawer.querySelector(".cart-drawer-close").addEventListener("click", () => this.close());

    // Cart icon click
    document.addEventListener("click", (e) => {
      if (e.target.closest('a[href="/cart"]') || e.target.closest(".cart-icon")) {
        e.preventDefault();
        this.open();
      }
    });

    // Product card form submissions
    document.addEventListener("submit", (e) => {
      if (e.target.matches(".product-card form") || e.target.closest(".product-card form")) {
        e.preventDefault();
        this.addToCart(e.target);
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  async addToCart(form) {
    const formData = new FormData(form);

    // Capture discount data from the product card HTML
    const productCard = form.closest(".product-card");
    let discountInfo = null;

    if (productCard) {
      // Look for discount badge
      const discountBadge = productCard.querySelector(".discount-badge");

      // Look for old price (crossed out)
      const oldPriceElement = productCard.querySelector(".old-price");
      const currentPriceElement = productCard.querySelector(".current-price");

      if (discountBadge && oldPriceElement && currentPriceElement) {
        // Extract percentage from badge (e.g., "54% OFF")
        const badgeText = discountBadge.textContent.trim();
        const percentageMatch = badgeText.match(/(\d+)%/);
        const discountPercentage = percentageMatch ? parseInt(percentageMatch[1]) : 0;

        // Extract prices from text content
        const oldPriceText = oldPriceElement.textContent.trim().replace(/[^0-9.]/g, "");
        const currentPriceText = currentPriceElement.textContent.trim().replace(/[^0-9.]/g, "");

        const oldPrice = parseFloat(oldPriceText) * 100; // Convert to cents
        const currentPrice = parseFloat(currentPriceText) * 100; // Convert to cents

        if (oldPrice > currentPrice) {
          discountInfo = {
            originalPrice: oldPrice,
            currentPrice: currentPrice,
            savings: oldPrice - currentPrice,
            percentage: discountPercentage,
          };

          console.log("Captured discount info from product card:", discountInfo);
        }
      }
    }

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        // Store discount info for this product if we found it
        if (discountInfo) {
          // Create a storage system for discount data
          if (!window.cartDiscountData) {
            window.cartDiscountData = new Map();
          }

          // Store by variant ID
          const variantId = result.variant_id || result.id;
          window.cartDiscountData.set(variantId, discountInfo);
          console.log("Stored discount data for variant:", variantId, discountInfo);
        }

        // Success notification is handled by theme.js to avoid duplication

        await this.loadCartData();
        this.updateCartCount();
        this.open();

        // Show internal notification in the cart drawer AFTER opening
        setTimeout(() => {
          const productTitle = result.product_title || "Product";
          this.showInternalNotification(`${productTitle} has been added to your cart!`, "success");
        }, 100);
      } else {
        const error = await response.json();
        console.error("Error adding product:", error.message || "Error adding product");

        // Error notification is handled by theme.js to avoid duplication

        // Show internal error notification in the cart drawer
        this.showInternalNotification(error.message || "Unable to add product to cart. Please try again.", "error");
      }
    } catch (error) {
      console.error("Cart add error:", error);

      // Error notification is handled by theme.js to avoid duplication

      // Show internal error notification in the cart drawer
      this.showInternalNotification("Unable to add product to cart. Please try again.", "error");
    }
  }

  async loadCartData() {
    try {
      const response = await fetch("/cart.js");
      this.cartData = await response.json();
      this.renderCart();
      return this.cartData;
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  }

  renderCart() {
    const content = this.drawer.querySelector(".cart-drawer-content");

    if (!this.cartData || this.cartData.item_count === 0) {
      content.innerHTML = `
        <div class="cart-drawer-empty">
          <div class="cart-drawer-empty-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </div>
          <div class="cart-drawer-empty-text regular">Your cart is empty</div>
          <a href="/collections/all" class="cart-drawer-continue bold">Continue Shopping</a>
        </div>
      `;
      return;
    }

    const items = this.cartData.items.map((item, index) => this.renderCartItem(item, index + 1)).join("");
    const discounts = this.renderDiscounts();
    const savingsInfo = this.renderSavingsInfo();

    content.innerHTML = `
      <div class="cart-drawer-items">
        ${items}
      </div>
      <div class="cart-drawer-footer">
        ${savingsInfo}
        ${discounts}
        <div class="cart-drawer-subtotal">
          <span class="bold">Subtotal</span>
          <span class="bold">${this.formatMoney(this.cartData.total_price)}</span>
        </div>
        <div class="cart-drawer-actions">
          <button class="cart-drawer-checkout bold" onclick="window.location.href='/checkout'">
            Checkout
          </button>
          <button class="cart-drawer-view-cart bold" onclick="window.location.href='/cart'">View Cart</button>
        </div>
      </div>
    `;

    this.bindCartEvents();
  }

  // Helper function to find discount data in item
  findDiscountData(item) {
    // First, try to get stored discount data from when product was added
    if (window.cartDiscountData && window.cartDiscountData.has(item.variant_id)) {
      const storedDiscount = window.cartDiscountData.get(item.variant_id);
      console.log("Found stored discount data for variant:", item.variant_id, storedDiscount);

      // Adjust for quantity
      return {
        hasDiscount: true,
        originalPrice: storedDiscount.originalPrice * item.quantity,
        currentPrice: item.final_line_price,
        savings: storedDiscount.savings * item.quantity,
        method: "stored_from_product_card",
      };
    }

    // Fallback to cart data analysis (original logic)
    console.log("No stored discount data found, checking cart object...");

    // Check if there's a total_discount field (most reliable)
    if (item.total_discount > 0) {
      const originalPrice = item.line_price + item.total_discount;
      return {
        hasDiscount: true,
        originalPrice: originalPrice,
        currentPrice: item.final_line_price,
        savings: item.total_discount,
        method: "total_discount",
      };
    }

    // Check original_price vs price (per unit)
    if (item.original_price > item.price) {
      const savings = (item.original_price - item.price) * item.quantity;
      return {
        hasDiscount: true,
        originalPrice: item.original_price * item.quantity,
        currentPrice: item.final_line_price,
        savings: savings,
        method: "original_price",
      };
    }

    // If no discount found, return no discount
    return {
      hasDiscount: false,
      originalPrice: 0,
      currentPrice: item.final_line_price,
      savings: 0,
      method: "none",
    };
  }

  renderCartItem(item, lineIndex) {
    const discountData = this.findDiscountData(item);
    console.log(`Item: ${item.product_title} | Discount: ${discountData.hasDiscount ? "YES" : "NO"} | Method: ${discountData.method}`);

    return `
      <div class="cart-drawer-item" data-line="${lineIndex}">
        <div class="cart-drawer-item-image">
          ${item.image ? `<img src="${item.image}" alt="${item.title}">` : '<div style="background: #f0f0f0;"></div>'}
        </div>
        <div class="cart-drawer-item-details">
          <h4 class="cart-drawer-item-title bold">${item.product_title}</h4>
          ${
            item.variant_title && item.variant_title !== "Default Title"
              ? `<p class="cart-drawer-item-variant regular">${item.variant_title}</p>`
              : ""
          }
          <div class="cart-drawer-item-price">
            <span class="bold">${this.formatMoney(item.final_line_price)}</span>
            ${discountData.hasDiscount ? `<span class="compare-price regular">${this.formatMoney(discountData.originalPrice)}</span>` : ""}
          </div>
          ${
            discountData.hasDiscount
              ? `
            <div class="cart-drawer-item-savings">
              <span class="savings-text regular">You save ${this.formatMoney(discountData.savings)}</span>
            </div>
          `
              : ""
          }
          <div class="cart-drawer-quantity">
            <button class="cart-drawer-quantity-btn" onclick="window.cartDrawer.updateQuantity(${lineIndex}, ${item.quantity - 1})" ${
      item.quantity <= 1 ? "disabled" : ""
    }>
              -
            </button>
            <input type="number" class="cart-drawer-quantity-input" value="${
              item.quantity
            }" min="1" onchange="window.cartDrawer.updateQuantity(${lineIndex}, this.value)">
            <button class="cart-drawer-quantity-btn" onclick="window.cartDrawer.updateQuantity(${lineIndex}, ${item.quantity + 1})">
              +
            </button>
          </div>
          <button class="cart-drawer-remove regular" onclick="window.cartDrawer.removeItem(${lineIndex})">
            Remove
          </button>
        </div>
      </div>
    `;
  }

  renderDiscounts() {
    if (!this.cartData.cart_level_discount_applications || this.cartData.cart_level_discount_applications.length === 0) {
      return "";
    }

    return this.cartData.cart_level_discount_applications
      .map(
        (discount) => `
      <div class="cart-drawer-discount">
        <span class="bold">${discount.title}</span>
        <span class="bold">-${this.formatMoney(discount.total_allocated_amount)}</span>
      </div>
    `
      )
      .join("");
  }

  renderSavingsInfo() {
    let totalSavings = 0;

    // Calculate savings from all items
    this.cartData.items.forEach((item, index) => {
      const discountData = this.findDiscountData(item);
      totalSavings += discountData.savings;
    });

    // Add cart-level discounts
    if (this.cartData.cart_level_discount_applications) {
      this.cartData.cart_level_discount_applications.forEach((discount) => {
        totalSavings += discount.total_allocated_amount;
      });
    }

    console.log("Total cart savings:", this.formatMoney(totalSavings));

    if (totalSavings > 0) {
      return `
        <div class="cart-drawer-savings">
          <div class="savings-banner">
            <div class="savings-icon">🎉</div>
            <div class="savings-content">
              <div class="savings-title bold">You're saving with Ativafit!</div>
              <div class="savings-amount bold">${this.formatMoney(totalSavings)} total savings</div>
            </div>
          </div>
        </div>
      `;
    }

    return "";
  }

  bindCartEvents() {
    // Prevent quantity input from going below 1
    this.drawer.querySelectorAll(".cart-drawer-quantity-input").forEach((input) => {
      input.addEventListener("blur", (e) => {
        if (parseInt(e.target.value) < 1) {
          e.target.value = 1;
        }
      });
    });
  }

  async updateQuantity(lineIndex, quantity) {
    quantity = Math.max(1, parseInt(quantity));

    try {
      const response = await fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          line: lineIndex,
          quantity: quantity,
        }),
      });

      if (response.ok) {
        await this.loadCartData();
        this.updateCartCount();
      } else {
        console.error("Failed to update quantity");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  }

  async removeItem(lineIndex) {
    try {
      const response = await fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          line: lineIndex,
          quantity: 0,
        }),
      });

      if (response.ok) {
        await this.loadCartData();
        this.updateCartCount();
      } else {
        console.error("Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }

  updateCartCount() {
    fetch("/cart.js")
      .then((response) => response.json())
      .then((cart) => {
        const countElements = document.querySelectorAll(".cart-count, .header__cart-count");
        countElements.forEach((element) => {
          element.textContent = cart.item_count;
          element.style.display = cart.item_count > 0 ? "block" : "none";
        });
      })
      .catch((error) => console.error("Error updating cart count:", error));
  }

  formatMoney(cents) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }

  async open() {
    if (!this.cartData) {
      await this.loadCartData();
    }

    this.isOpen = true;
    this.overlay.classList.add("active");
    this.drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove("active");
    this.drawer.classList.remove("open");
    document.body.style.overflow = "";
  }

  showInternalNotification(message, type = "success") {
    // Only show if drawer is open
    if (!this.isOpen) {
      console.log("Cart drawer is not open, skipping internal notification");
      return;
    }

    // Remove any existing internal notification
    const existingNotification = this.drawer.querySelector(".cart-drawer-internal-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `cart-drawer-internal-notification ${type}`;

    // Add inline styles identical to external notification (dark mode)
    notification.style.cssText = `
      margin: 15px;
      background: #1f2937;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
      border: none;
      overflow: hidden;
      transform: translateY(0);
      opacity: 1;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Barlow', sans-serif;
      will-change: transform, opacity;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    `;

    const iconSvg =
      type === "success"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`;

    const iconStyle =
      type === "success"
        ? "background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);"
        : "background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);";

    notification.innerHTML = `
      <div class="cart-drawer-internal-notification__content" style="display: flex; align-items: flex-start; padding: 20px; gap: 16px;">
        <div class="cart-drawer-internal-notification__icon" style="flex-shrink: 0; width: 44px; height: 44px; ${iconStyle} border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-top: 2px;">
          ${iconSvg}
        </div>
        <div class="cart-drawer-internal-notification__text" style="flex: 1; min-width: 0;">
          <h4 class="cart-drawer-internal-notification__title" style="font-size: 17px; font-weight: 600; color: #f9fafb; margin: 0 0 6px; line-height: 1.25; letter-spacing: -0.01em;">Product Added!</h4>
          <p class="cart-drawer-internal-notification__message" style="font-size: 15px; color: #d1d5db; margin: 0; line-height: 1.4; letter-spacing: -0.01em;">${message}</p>
        </div>
        <button class="cart-drawer-internal-notification__close" aria-label="Close notification" style="flex-shrink: 0; background: none; border: none; padding: 8px; cursor: pointer; color: #9ca3af; border-radius: 8px; transition: all 0.2s ease; margin-top: 2px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;

    // Add to drawer content
    const content = this.drawer.querySelector(".cart-drawer-content");
    if (!content) {
      console.error("Cart drawer content not found");
      return;
    }

    content.insertBefore(notification, content.firstChild);
    console.log("Internal notification added to cart drawer:", message);

    // Add event listener for close button
    const closeButton = notification.querySelector(".cart-drawer-internal-notification__close");
    closeButton.addEventListener("click", () => {
      notification.classList.add("cart-drawer-internal-notification--hide");
      setTimeout(() => notification.remove(), 300);
    });

    // Add hover styles for close button (dark mode)
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.color = "#d1d5db";
      closeButton.style.background = "#374151";
    });
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.color = "#9ca3af";
      closeButton.style.background = "none";
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add("cart-drawer-internal-notification--hide");
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }
}

// Initialize cart drawer when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.cartDrawer = new CartDrawer();
});

// Add animation keyframes to document
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
