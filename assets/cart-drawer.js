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

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
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

    content.innerHTML = `
      <div class="cart-drawer-items">
        ${items}
      </div>
      <div class="cart-drawer-footer">
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

  renderCartItem(item, lineIndex) {
    const discountAmount = item.original_line_price - item.final_line_price;
    const hasDiscount = discountAmount > 0;

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
            ${hasDiscount ? `<span class="compare-price regular">${this.formatMoney(item.original_line_price)}</span>` : ""}
          </div>
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
