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

        await this.loadCartData();
        this.updateCartCount();
        this.open();
        this.showAddedNotification(result);
      } else {
        const error = await response.json();
        this.showError(error.message || "Error adding product");
      }
    } catch (error) {
      console.error("Cart add error:", error);
      this.showError("Error adding product");
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
      this.showError("Error loading cart");
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
        this.showError("Failed to update quantity");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      this.showError("Error updating quantity");
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
        this.showError("Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      this.showError("Error removing item");
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

  showAddedNotification(product) {
    // Create temporary notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease;
      font-weight: 600;
    `;
    notification.innerHTML = `<span class="bold">${product.product_title} added to cart!</span>`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showError(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 600;
    `;
    notification.innerHTML = `<span class="bold">${message}</span>`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
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
