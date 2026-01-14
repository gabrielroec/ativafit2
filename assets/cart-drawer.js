class CartDrawer {
  constructor() {
    this.drawer = null;
    this.overlay = null;
    this.isOpen = false;
    this.cartData = null;
    this.variantDataCache = new Map(); // Cache for variant price data

    // Recommended products configuration with contextual rules
    this.recommendationRules = {
      // Default recommendations (when no specific product is in cart)
      default: [
        {
          id: "31292579512403",
          title: "Ativafit Atlas Dumbbell Stand for Home Workout",
          price: "$129.99",
          image: "//ativafit-tech.myshopify.com/cdn/shop/files/img_v3_0289_53efa24e-f544-4df6-bc1c-6dab8ca3e69g_600x600.png?v=1708515072",
          alt: "Ativafit Atlas Dumbbell Stand for Home Workout",
        },
        {
          id: "31292578431059",
          title: "Ativafit Anchor Adjustable Multi-purpose Foldable Home Workout Bench",
          price: "$139.99",
          image: "//ativafit-tech.myshopify.com/cdn/shop/files/DBBench.png?v=1686016009&width=600",
          alt: "Ativafit Anchor Adjustable Multi-purpose Foldable Home Workout Bench",
        },
      ],

      // Recommendations when Spark Dumbbell is in cart
      "spark-dumbbell": [
        {
          id: "31292578431059",
          title: "Ativafit Anchor Adjustable Multi-purpose Foldable Home Workout Bench",
          price: "$139.99",
          image: "//ativafit-tech.myshopify.com/cdn/shop/files/DBBench.png?v=1686016009&width=600",
          alt: "Ativafit Anchor Adjustable Multi-purpose Foldable Home Workout Bench",
        },
        {
          id: "31292579512403",
          title: "Ativafit Atlas Dumbbell Stand for Home Workout",
          price: "$129.99",
          image: "//ativafit-tech.myshopify.com/cdn/shop/files/img_v3_0289_53efa24e-f544-4df6-bc1c-6dab8ca3e69g_600x600.png?v=1708515072",
          alt: "Ativafit Atlas Dumbbell Stand for Home Workout",
        },
      ],

      // Recommendations when Lava 66 Lb or Flare 88 Lb is in cart (HIGH PRIORITY)
      "heavy-dumbbells": [
        {
          id: "32365968261203",
          title: "Ativafit Apex Pro Adjustable Weight Bench",
          price: "$229.99",
          originalPrice: "$259.99",
          image: "//www.ativafit.com/cdn/shop/files/proadjustableweightbench45.png?v=1753925502&width=600",
          alt: "Ativafit Apex Pro Adjustable Weight Bench",
          hasDiscount: true,
        },
        {
          id: "31292579512403",
          title: "Ativafit Atlas Dumbbell Stand for Home Workout",
          price: "$129.99",
          image: "//www.ativafit.com/cdn/shop/files/img_v3_0289_53efa24e-f544-4df6-bc1c-6dab8ca3e69g.png?v=1708515072&width=600",
          alt: "Ativafit Atlas Dumbbell Stand for Home Workout",
        },
      ],
    };

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
      ${window.shopifyCountryCode && window.shopifyCountryCode.toUpperCase() !== "US" ? `` : ""}
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

    // Product card form submissions - Only handle if not already handled by product-card-custom.liquid
    document.addEventListener("submit", (e) => {
      if (e.target.matches(".product-card form") || e.target.closest(".product-card form")) {
        console.log("Cart-drawer intercepted form submission");

        // Check if this form is already being handled by product-card-custom.liquid
        if (e.target.dataset.handledByProductCard === "true" || e.target.dataset.processing === "true") {
          console.log("Form already handled by product-card-custom.liquid, skipping cart-drawer processing");
          return; // Let product-card-custom.liquid handle it
        }

        console.log("Processing form with cart-drawer");
        // Only handle forms that don't have the custom handling
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
    // Prevent double processing if form is already handled by product-card-custom.liquid
    if (form.dataset.handledByProductCard === "true" || form.dataset.processing === "true") {
      console.log("Form already handled by product-card-custom.liquid, skipping cart-drawer processing");
      return;
    }

    const formData = new FormData(form);

    // Capture discount data from the product card HTML
    // Check both regular product cards and recommended product cards
    const productCard = form.closest(".product-card");
    const recommendedCard = form.closest(".cart-drawer-product-card");
    let discountInfo = null;

    // Try to get discount from regular product card first
    if (productCard) {
      // Look for old price (crossed out) - this is the key indicator
      const oldPriceElement = productCard.querySelector(".old-price");
      const currentPriceElement = productCard.querySelector(".current-price");
      const discountBadge = productCard.querySelector(".discount-badge");

      // Only need old price and current price to detect discount (badge is optional)
      if (oldPriceElement && currentPriceElement) {
        // Extract prices from text content
        const oldPriceText = oldPriceElement.textContent.trim().replace(/[^0-9.]/g, "");
        const currentPriceText = currentPriceElement.textContent.trim().replace(/[^0-9.]/g, "");

        if (oldPriceText && currentPriceText) {
          const oldPrice = parseFloat(oldPriceText) * 100; // Convert to cents
          const currentPrice = parseFloat(currentPriceText) * 100; // Convert to cents

          if (oldPrice > currentPrice) {
            // Extract percentage from badge if available (optional)
            let discountPercentage = 0;
            if (discountBadge) {
              const badgeText = discountBadge.textContent.trim();
              const percentageMatch = badgeText.match(/(\d+)%/);
              discountPercentage = percentageMatch ? parseInt(percentageMatch[1]) : 0;
            }

            discountInfo = {
              originalPrice: oldPrice,
              currentPrice: currentPrice,
              savings: oldPrice - currentPrice,
              percentage: discountPercentage,
            };

            console.log("Cart-drawer: Captured discount info from product card:", discountInfo);
          }
        }
      }
    }

    // If not found in regular product card, try recommended product card
    if (!discountInfo && recommendedCard) {
      const oldPriceElement = recommendedCard.querySelector(".old-price");
      const currentPriceElement = recommendedCard.querySelector(".current-price");

      if (oldPriceElement && currentPriceElement) {
        // Extract prices from text content
        const oldPriceText = oldPriceElement.textContent.trim().replace(/[^0-9.]/g, "");
        const currentPriceText = currentPriceElement.textContent.trim().replace(/[^0-9.]/g, "");

        if (oldPriceText && currentPriceText) {
          const oldPrice = parseFloat(oldPriceText) * 100; // Convert to cents
          const currentPrice = parseFloat(currentPriceText) * 100; // Convert to cents

          if (oldPrice > currentPrice) {
            discountInfo = {
              originalPrice: oldPrice,
              currentPrice: currentPrice,
              savings: oldPrice - currentPrice,
              percentage: 0,
            };

            console.log("Cart-drawer: Captured discount info from recommended product card:", discountInfo);
          }
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

          // Store by variant ID (as string for consistency)
          const variantId = (result.variant_id || result.id).toString();
          window.cartDiscountData.set(variantId, discountInfo);
          console.log("Cart-drawer: Stored discount data for variant:", variantId, discountInfo);
        }

        // Success notification is handled by theme.js to avoid duplication

        // Small delay to ensure Shopify has processed compare_at_price
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Load cart data - this will detect compare_at_price automatically
        await this.loadCartData();
        this.updateCartCount();
        this.open();

        // Update recommended products section
        await this.updateRecommendedSection();

        // Force multiple cart reloads to ensure compare_at_price is detected
        // This is especially important for recommended products and discount detection
        setTimeout(async () => {
          console.log("[addToCart] Second reload at 300ms...");
          await this.loadCartData();
          await this.updateRecommendedSection();
        }, 300);

        setTimeout(async () => {
          console.log("[addToCart] Third reload at 600ms...");
          await this.loadCartData();
          await this.updateRecommendedSection();
        }, 600);

        // Show internal notification AFTER all reloads are complete
        // This ensures the notification stays visible and doesn't get removed by cart reloads
        setTimeout(() => {
          const productTitle = result.product_title || "Product";
          this.showInternalNotification(
            'Join <a href="https://www.ativafit.com/pages/ativapeople-rewards-program" target="_blank" style="color: #eb701f; text-decoration: underline; font-weight: bold;">AtivaPeople</a> & get 10% off your first order.',
            "success"
          );
        }, 700);
      } else {
        const error = await response.json();
        console.error("Error adding product:", error.message || "Error adding product");

        // Show success message anyway since the product might have been added
        // This prevents the confusing double message issue
        setTimeout(() => {
          this.showInternalNotification(
            'Join <a href="https://www.ativafit.com/pages/ativapeople-rewards-program" target="_blank" style="color: #eb701f; text-decoration: underline; font-weight: bold;">AtivaPeople</a> & get 10% off your first order.',
            "success"
          );
        }, 500);
      }
    } catch (error) {
      console.error("Cart add error:", error);

      // Show success message anyway since the product might have been added
      // This prevents the confusing double message issue
      setTimeout(() => {
        this.showInternalNotification(
          'Join <a href="https://www.ativafit.com/pages/ativapeople-rewards-program" target="_blank" style="color: #eb701f; text-decoration: underline; font-weight: bold;">AtivaPeople</a> & get 10% off your first order.',
          "success"
        );
      }, 500);
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

  async renderCart() {
    const content = this.drawer.querySelector(".cart-drawer-content");

    if (!this.cartData || this.cartData.item_count === 0) {
      const recommendedHtml = await this.renderRecommendedProducts();
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
        ${recommendedHtml}
      `;
      this.bindCartEvents();
      return;
    }

    const items = this.cartData.items.map((item, index) => this.renderCartItem(item, index + 1)).join("");
    const discounts = this.renderDiscounts();
    const savingsInfo = this.renderSavingsInfo();
    const freeShippingBanner = this.renderFreeShippingBanner();
    const recommendedHtml = await this.renderRecommendedProducts();

    content.innerHTML = `
      ${freeShippingBanner}
      <div class="cart-drawer-items">
        ${items}
      </div>
      ${recommendedHtml}
      <div class="cart-drawer-footer">
        ${savingsInfo}
        ${discounts}
        <div class="cart-drawer-subtotal">
          <span class="bold">Subtotal</span>
          <div class="cart-drawer-subtotal-price">
            ${
              this.getTotalSavings() > 0
                ? `<span class="cart-drawer-subtotal-savings-badge">You save ${this.formatMoney(this.getTotalSavings())}</span>`
                : ""
            }
            <span class="bold">${this.formatMoney(this.cartData.total_price)}</span>
            ${
              this.getTotalSavings() > 0
                ? `<span class="cart-drawer-subtotal-original regular">${this.formatMoney(this.getTotalOriginalPrice())}</span>`
                : ""
            }
          </div>
        </div>
        <div class="cart-drawer-actions">
          <button class="cart-drawer-checkout bold" onclick="window.location.href='/checkout'">
            Checkout
          </button>
          <div class="cart-drawer-payment-badges">
            <img src="https://download.logo.wine/logo/Mastercard/Mastercard-Logo.wine.png" alt="Mastercard" class="payment-badge" loading="lazy">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/PayPal_Logo2014.png" alt="PayPal" class="payment-badge" loading="lazy">
            <img src="https://cdn.shopify.com/shopifycloud/help-center/manual/shop-pay-installments/shop-pay-logo-color.png" alt="Shop Pay" class="payment-badge" loading="lazy">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/de/Amazon_icon.png" alt="Amazon Pay" class="payment-badge" loading="lazy">
            <img src="https://cdn-icons-png.freepik.com/256/5968/5968245.png?semt=ais_white_label" alt="American Express" class="payment-badge" loading="lazy">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfp_3jN-zgVDJzWjr1I4lKWWRothBbWHb8hQ&s" alt="Apple Pay" class="payment-badge" loading="lazy">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSECDKIpkdSUbFaBLjhaAxj0qMcSdLRFvvtvQ&s" alt="Diners Club" class="payment-badge" loading="lazy">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/1280px-Google_Pay_Logo.svg.png" alt="Google Pay" class="payment-badge" loading="lazy">
          </div>
        </div>
      </div>
    `;

    this.bindCartEvents();
  }

  // Helper function to find discount data in item
  findDiscountData(item) {
    const variantIdStr = item.variant_id.toString();

    // Debug: Log all available price fields
    console.log(`[findDiscountData] Checking item: ${item.product_title} (variant: ${variantIdStr})`, {
      compare_at_price: item.compare_at_price,
      price: item.price,
      original_price: item.original_price,
      final_line_price: item.final_line_price,
      line_price: item.line_price,
      quantity: item.quantity,
      total_discount: item.total_discount,
      discounts: item.discounts,
      line_level_discount_allocations: item.line_level_discount_allocations,
    });

    // PRIORITY 1: Check compare_at_price directly from Shopify cart item (HIGHEST PRIORITY - Real-time)
    // This is the native Shopify field for original/comparison price
    // IMPORTANT: compare_at_price is in CENTS, not dollars
    if (item.compare_at_price && item.compare_at_price !== null && item.compare_at_price > 0) {
      const comparePrice = Number(item.compare_at_price);
      const currentPrice = Number(item.price);

      console.log("[findDiscountData] 🔍 compare_at_price check:", {
        compare_at_price: comparePrice,
        price: currentPrice,
        difference: comparePrice - currentPrice,
        isGreater: comparePrice > currentPrice,
      });

      if (comparePrice > currentPrice && currentPrice > 0) {
        const perUnitSavings = comparePrice - currentPrice;
        const totalSavings = perUnitSavings * item.quantity;
        const originalLinePrice = comparePrice * item.quantity;

        console.log("[findDiscountData] ✅ Found discount via compare_at_price (REAL-TIME):", {
          variant: variantIdStr,
          product: item.product_title,
          compare_at_price: comparePrice,
          price: currentPrice,
          quantity: item.quantity,
          perUnitSavings: perUnitSavings,
          totalSavings: totalSavings,
          originalLinePrice: originalLinePrice,
          finalLinePrice: item.final_line_price,
        });

        return {
          hasDiscount: true,
          originalPrice: originalLinePrice,
          currentPrice: item.final_line_price,
          savings: totalSavings,
          method: "compare_at_price_realtime",
        };
      }
    }

    // PRIORITY 2: Try to get stored discount data from when product was added
    if (window.cartDiscountData && window.cartDiscountData.has(variantIdStr)) {
      const storedDiscount = window.cartDiscountData.get(variantIdStr);
      console.log("Found stored discount data for variant:", variantIdStr, storedDiscount);

      // Adjust for quantity - use stored per-unit prices
      const perUnitOriginal = storedDiscount.originalPrice;
      const perUnitCurrent = storedDiscount.currentPrice;
      const perUnitSavings = storedDiscount.savings;

      return {
        hasDiscount: true,
        originalPrice: perUnitOriginal * item.quantity,
        currentPrice: item.final_line_price,
        savings: perUnitSavings * item.quantity,
        method: "stored_from_product_card",
      };
    }

    // PRIORITY 3: Fallback to cart data analysis
    console.log("No compare_at_price found, checking other discount sources for variant:", variantIdStr);

    // Check if there's a total_discount field (most reliable)
    if (item.total_discount && item.total_discount > 0) {
      const originalPrice = item.line_price + item.total_discount;
      console.log("Found discount via total_discount:", item.total_discount);
      return {
        hasDiscount: true,
        originalPrice: originalPrice,
        currentPrice: item.final_line_price,
        savings: item.total_discount,
        method: "total_discount",
      };
    }

    // Check original_price vs price (per unit) - ALWAYS check this
    // IMPORTANT: original_price is also in CENTS
    if (item.original_price && item.original_price !== null && item.original_price > 0) {
      const originalPrice = Number(item.original_price);
      const currentPrice = Number(item.price);

      console.log("[findDiscountData] 🔍 original_price check:", {
        original_price: originalPrice,
        price: currentPrice,
        difference: originalPrice - currentPrice,
        isGreater: originalPrice > currentPrice,
      });

      if (originalPrice > currentPrice && currentPrice > 0) {
        const savings = (originalPrice - currentPrice) * item.quantity;
        console.log("[findDiscountData] ✅ Found discount via original_price:", {
          original: originalPrice,
          current: currentPrice,
          quantity: item.quantity,
          savings: savings,
        });
        return {
          hasDiscount: true,
          originalPrice: originalPrice * item.quantity,
          currentPrice: item.final_line_price,
          savings: savings,
          method: "original_price",
        };
      }
    }

    // Check compare_at_price in properties if available (custom property)
    if (item.properties && item.properties._compare_at_price) {
      const compareAtPrice = parseFloat(item.properties._compare_at_price) * 100;
      if (compareAtPrice > item.final_line_price) {
        console.log("[findDiscountData] ✅ Found discount via compare_at_price property");
        return {
          hasDiscount: true,
          originalPrice: compareAtPrice * item.quantity,
          currentPrice: item.final_line_price,
          savings: (compareAtPrice - item.price) * item.quantity,
          method: "compare_at_price_property",
        };
      }
    }

    // PRIORITY 4: Check line_price vs final_line_price (SAFETY NET)
    // If there's a difference, it means a discount was applied
    if (item.line_price && item.final_line_price && item.line_price > item.final_line_price) {
      const savings = item.line_price - item.final_line_price;
      console.log("[findDiscountData] ✅ Found discount via line_price difference:", {
        line_price: item.line_price,
        final_line_price: item.final_line_price,
        savings: savings,
      });
      return {
        hasDiscount: true,
        originalPrice: item.line_price,
        currentPrice: item.final_line_price,
        savings: savings,
        method: "line_price_difference",
      };
    }

    // PRIORITY 5: Check discounts array or line_level_discount_allocations
    if (
      (item.discounts && item.discounts.length > 0) ||
      (item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0)
    ) {
      let totalDiscountAmount = 0;

      // Sum up all discounts
      if (item.discounts) {
        item.discounts.forEach((discount) => {
          totalDiscountAmount += discount.amount || 0;
        });
      }

      if (item.line_level_discount_allocations) {
        item.line_level_discount_allocations.forEach((allocation) => {
          totalDiscountAmount += allocation.amount || 0;
        });
      }

      if (totalDiscountAmount > 0) {
        const originalPrice = item.final_line_price + totalDiscountAmount;
        console.log("[findDiscountData] ✅ Found discount via discounts array:", {
          totalDiscountAmount: totalDiscountAmount,
          originalPrice: originalPrice,
        });
        return {
          hasDiscount: true,
          originalPrice: originalPrice,
          currentPrice: item.final_line_price,
          savings: totalDiscountAmount,
          method: "discounts_array",
        };
      }
    }

    // If no discount found, return no discount
    console.log("[findDiscountData] ❌ No discount found for item:", item.product_title, "variant:", variantIdStr);
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

  renderFreeShippingBanner() {
    // Debug: Log all available country-related variables
    console.log("[renderFreeShippingBanner] Debug info:", {
      shopifyCountryCode: window.shopifyCountryCode,
      shopifyCountryCodeType: typeof window.shopifyCountryCode,
      shopifyCountryCodeUpperCase: window.shopifyCountryCode ? window.shopifyCountryCode.toUpperCase() : null,
      isUS: window.shopifyCountryCode && window.shopifyCountryCode.toUpperCase() === "US",
      shopifyCountry: window.shopifyCountry || "not available",
      shopifyLocale: window.shopifyLocale || "not available",
    });

    // Only show free shipping banner for US customers
    if (window.shopifyCountryCode && window.shopifyCountryCode.toUpperCase() === "US") {
      console.log("[renderFreeShippingBanner] ✅ Rendering free shipping banner for US customer");
      return `
        <div class="cart-drawer-free-shipping">
          <div class="free-shipping-message">🎉 Congrats! Free shipping unlocked!</div>
          <div class="free-shipping-progress">
            <div class="free-shipping-progress-bar">
              <div class="free-shipping-progress-fill"></div>
              <div class="free-shipping-truck-icon">
                <svg viewBox="0 -1 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M12.31 16.826C12.2864 17.9963 11.3464 18.9278 10.2052 18.9118C9.06401 18.8957 8.14927 17.9382 8.15697 16.7676C8.16467 15.5971 9.09191 14.6522 10.2332 14.652C10.7897 14.6578 11.3212 14.8901 11.7106 15.2978C12.1001 15.7055 12.3157 16.2552 12.31 16.826V16.826Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M22.2014 16.826C22.1778 17.9963 21.2378 18.9278 20.0966 18.9118C18.9554 18.8957 18.0407 17.9382 18.0484 16.7676C18.0561 15.5971 18.9833 14.6522 20.1246 14.652C20.6811 14.6578 21.2126 14.8901 21.602 15.2978C21.9915 15.7055 22.2071 16.2552 22.2014 16.826V16.826Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path d="M17.8032 17.576C18.2174 17.576 18.5532 17.2402 18.5532 16.826C18.5532 16.4118 18.2174 16.076 17.8032 16.076V17.576ZM12.31 16.076C11.8958 16.076 11.56 16.4118 11.56 16.826C11.56 17.2402 11.8958 17.576 12.31 17.576V16.076ZM17.0571 16.826C17.0571 17.2402 17.3928 17.576 17.8071 17.576C18.2213 17.576 18.5571 17.2402 18.5571 16.826H17.0571ZM18.5571 11.559C18.5571 11.1448 18.2213 10.809 17.8071 10.809C17.3928 10.809 17.0571 11.1448 17.0571 11.559H18.5571ZM17.8071 16.076C17.3928 16.076 17.0571 16.4118 17.0571 16.826C17.0571 17.2402 17.3928 17.576 17.8071 17.576V16.076ZM18.0518 17.576C18.466 17.576 18.8018 17.2402 18.8018 16.826C18.8018 16.4118 18.466 16.076 18.0518 16.076V17.576ZM22.189 16.0762C21.7749 16.0852 21.4465 16.4281 21.4555 16.8423C21.4644 17.2564 21.8074 17.5848 22.2215 17.5758L22.189 16.0762ZM24.4 14.485L25.1499 14.4718C25.1492 14.4331 25.1455 14.3946 25.1389 14.3565L24.4 14.485ZM24.63 11.4305C24.559 11.0224 24.1706 10.7491 23.7625 10.8201C23.3544 10.8911 23.0812 11.2794 23.1521 11.6875L24.63 11.4305ZM17.8031 6.127C17.3889 6.127 17.0531 6.46279 17.0531 6.877C17.0531 7.29121 17.3889 7.627 17.8031 7.627V6.127ZM21.2849 6.877L21.2849 7.62702L21.2897 7.62698L21.2849 6.877ZM22.8737 7.56387L22.327 8.07731L22.327 8.07731L22.8737 7.56387ZM23.4835 9.218L22.7342 9.18603C22.7319 9.23979 22.7354 9.29363 22.7446 9.34663L23.4835 9.218ZM23.1522 11.6876C23.2232 12.0957 23.6116 12.3689 24.0197 12.2979C24.4278 12.2268 24.701 11.8384 24.6299 11.4304L23.1522 11.6876ZM18.5531 6.877C18.5531 6.46279 18.2174 6.127 17.8031 6.127C17.3889 6.127 17.0531 6.46279 17.0531 6.877H18.5531ZM17.0531 11.559C17.0531 11.9732 17.3889 12.309 17.8031 12.309C18.2174 12.309 18.5531 11.9732 18.5531 11.559H17.0531ZM17.0531 6.877C17.0531 7.29121 17.3889 7.627 17.8031 7.627C18.2174 7.627 18.5531 7.29121 18.5531 6.877H17.0531ZM17.8031 6.077L17.0531 6.0722V6.077H17.8031ZM16.7657 5L16.77 4.25H16.7657V5ZM7.42037 5L7.42037 4.24999L7.41679 4.25001L7.42037 5ZM6.68411 5.31693L6.14467 4.79587L6.14467 4.79587L6.68411 5.31693ZM6.382 6.075L7.13201 6.075L7.13199 6.07158L6.382 6.075ZM6.382 15.75L7.132 15.7534V15.75H6.382ZM6.68411 16.5081L6.14467 17.0291L6.14467 17.0291L6.68411 16.5081ZM7.42037 16.825L7.41679 17.575H7.42037V16.825ZM8.1526 17.575C8.56681 17.575 8.9026 17.2392 8.9026 16.825C8.9026 16.4108 8.56681 16.075 8.1526 16.075V17.575ZM17.8051 10.808C17.3909 10.808 17.0551 11.1438 17.0551 11.558C17.0551 11.9722 17.3909 12.308 17.8051 12.308V10.808ZM23.893 12.308C24.3072 12.308 24.643 11.9722 24.643 11.558C24.643 11.1438 24.3072 10.808 23.893 10.808V12.308ZM1 6.25C0.585786 6.25 0.25 6.58579 0.25 7C0.25 7.41421 0.585786 7.75 1 7.75V6.25ZM4.05175 7.75C4.46596 7.75 4.80175 7.41421 4.80175 7C4.80175 6.58579 4.46596 6.25 4.05175 6.25V7.75ZM1.975 9.25C1.56079 9.25 1.225 9.58579 1.225 10C1.225 10.4142 1.56079 10.75 1.975 10.75V9.25ZM3.925 10.75C4.33921 10.75 4.675 10.4142 4.675 10C4.675 9.58579 4.33921 9.25 3.925 9.25V10.75ZM2.56975 12.25C2.15554 12.25 1.81975 12.5858 1.81975 13C1.81975 13.4142 2.15554 13.75 2.56975 13.75V12.25ZM3.925 13.75C4.33921 13.75 4.675 13.4142 4.675 13C4.675 12.5858 4.33921 12.25 3.925 12.25V13.75ZM17.8032 16.076H12.31V17.576H17.8032V16.076ZM18.5571 16.826V11.559H17.0571V16.826H18.5571ZM17.8071 17.576H18.0518V16.076H17.8071V17.576ZM22.2215 17.5758C23.8876 17.5397 25.1791 16.1341 25.1499 14.4718L23.6501 14.4982C23.6655 15.3704 22.9939 16.0587 22.189 16.0762L22.2215 17.5758ZM25.1389 14.3565L24.63 11.4305L23.1521 11.6875L23.6611 14.6135L25.1389 14.3565ZM17.8031 7.627H21.2849V6.127H17.8031V7.627ZM21.2897 7.62698C21.6768 7.62448 22.0522 7.7847 22.327 8.07731L23.4204 7.05042C22.8641 6.4581 22.0909 6.12177 21.28 6.12702L21.2897 7.62698ZM22.327 8.07731C22.6025 8.37065 22.7519 8.7712 22.7342 9.18603L24.2328 9.24997C24.2675 8.43728 23.976 7.642 23.4204 7.05042L22.327 8.07731ZM22.7446 9.34663L23.1522 11.6876L24.6299 11.4304L24.2224 9.08937L22.7446 9.34663ZM17.0531 6.877V11.559H18.5531V6.877H17.0531ZM18.5531 6.877V6.077H17.0531V6.877H18.5531ZM18.5531 6.0818C18.5562 5.60485 18.3745 5.14259 18.0422 4.79768L16.9619 5.83829C17.0188 5.8974 17.0537 5.98123 17.0532 6.0722L18.5531 6.0818ZM18.0422 4.79768C17.7094 4.45212 17.2522 4.25277 16.77 4.25001L16.7615 5.74999C16.8331 5.7504 16.9056 5.77984 16.9619 5.83829L18.0422 4.79768ZM16.7657 4.25H7.42037V5.75H16.7657V4.25ZM7.41679 4.25001C6.93498 4.25231 6.4778 4.45098 6.14467 4.79587L7.22355 5.83799C7.27989 5.77967 7.3524 5.75033 7.42396 5.74999L7.41679 4.25001ZM6.14467 4.79587C5.81216 5.1401 5.62983 5.60177 5.63201 6.07843L7.13199 6.07158C7.13158 5.98066 7.16659 5.89696 7.22355 5.83799L6.14467 4.79587ZM5.632 6.075V15.75H7.132V6.075H5.632ZM5.63201 15.7466C5.62983 16.2232 5.81216 16.6849 6.14467 17.0291L7.22355 15.987C7.16659 15.928 7.13158 15.8443 7.13199 15.7534L5.63201 15.7466ZM6.14467 17.0291C6.4778 17.374 6.93498 17.5727 7.41679 17.575L7.42396 16.075C7.3524 16.0747 7.27988 16.0453 7.22355 15.987L6.14467 17.0291ZM7.42037 17.575H8.1526V16.075H7.42037V17.575ZM17.8051 12.308H23.893V10.808H17.8051V12.308ZM1 7.75H4.05175V6.25H1V7.75ZM1.975 10.75H3.925V9.25H1.975V10.75ZM2.56975 13.75H3.925V12.25H2.56975V13.75Z" fill="#ffffff"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    console.log("[renderFreeShippingBanner] ❌ NOT showing free shipping banner - customer is not in US");
    return "";
  }

  // Helper function to calculate total original price (before discounts)
  getTotalOriginalPrice() {
    if (!this.cartData || !this.cartData.items) {
      return 0;
    }

    let totalOriginal = 0;

    // Calculate original price from all items
    this.cartData.items.forEach((item, index) => {
      const discountData = this.findDiscountData(item);
      if (discountData.hasDiscount) {
        totalOriginal += discountData.originalPrice;
      } else {
        // If no discount, use final_line_price as original
        totalOriginal += item.final_line_price;
      }
    });

    // Add cart-level discounts to get the true original total
    if (this.cartData.cart_level_discount_applications) {
      this.cartData.cart_level_discount_applications.forEach((discount) => {
        totalOriginal += discount.total_allocated_amount;
      });
    }

    return totalOriginal;
  }

  // Helper function to calculate total savings
  getTotalSavings() {
    if (!this.cartData || !this.cartData.items) {
      return 0;
    }

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

    return totalSavings;
  }

  renderSavingsInfo() {
    const totalSavings = this.getTotalSavings();

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

  // Determine which recommendation set to use based on cart content with priority system
  getRecommendationContext() {
    if (!this.cartData || !this.cartData.items) {
      return "default";
    }

    // Check for heavy dumbbells first (HIGH PRIORITY)
    const heavyDumbbellsInCart = this.cartData.items.some(
      (item) =>
        (item.product_title && item.product_title.toLowerCase().includes("lava") && item.product_title.toLowerCase().includes("66")) ||
        (item.product_title.toLowerCase().includes("flare") && item.product_title.toLowerCase().includes("88"))
    );

    // Check if Spark Dumbbell is in cart (LOWER PRIORITY)
    const sparkDumbbellInCart = this.cartData.items.some(
      (item) =>
        item.product_title && item.product_title.toLowerCase().includes("spark") && item.product_title.toLowerCase().includes("dumbbell")
    );

    console.log(
      "Cart items:",
      this.cartData.items.map((item) => item.product_title)
    );
    console.log("Heavy Dumbbells (Lava/Flare) in cart:", heavyDumbbellsInCart);
    console.log("Spark Dumbbell in cart:", sparkDumbbellInCart);

    // Priority system: Heavy dumbbells > Spark dumbbell > default
    if (heavyDumbbellsInCart) {
      console.log("Recommendation context: heavy-dumbbells (HIGH PRIORITY)");
      return "heavy-dumbbells";
    } else if (sparkDumbbellInCart) {
      console.log("Recommendation context: spark-dumbbell");
      return "spark-dumbbell";
    }

    console.log("Recommendation context: default");
    return "default";
  }

  // Get products that are NOT in the cart based on current context
  getAvailableRecommendedProducts() {
    const context = this.getRecommendationContext();
    const recommendedProducts = this.recommendationRules[context] || this.recommendationRules.default;

    if (!this.cartData || !this.cartData.items) {
      return recommendedProducts;
    }

    const cartVariantIds = this.cartData.items.map((item) => item.variant_id.toString());
    return recommendedProducts.filter((product) => !cartVariantIds.includes(product.id));
  }

  // Fetch variant data from Shopify to get compare_at_price
  async fetchVariantPriceData(variantId) {
    // Check cache first
    if (this.variantDataCache.has(variantId)) {
      return this.variantDataCache.get(variantId);
    }

    try {
      // Try to fetch variant data using Shopify's cart endpoint
      // We'll make a temporary add and immediately check the response
      const formData = new FormData();
      formData.append("id", variantId);
      formData.append("quantity", 0); // Add 0 quantity to just check without adding

      // Alternative: use /variants/{id}.js endpoint
      const response = await fetch(`/variants/${variantId}.js`);

      if (response.ok) {
        const variantData = await response.json();
        const priceData = {
          price: variantData.price,
          compare_at_price: variantData.compare_at_price,
          available: variantData.available,
        };

        // Cache the result
        this.variantDataCache.set(variantId, priceData);
        console.log(`[fetchVariantPriceData] Fetched price data for variant ${variantId}:`, priceData);
        return priceData;
      }
    } catch (error) {
      console.log(`[fetchVariantPriceData] Could not fetch variant data for ${variantId}:`, error);
    }

    return null;
  }

  async renderRecommendedProducts() {
    const availableProducts = this.getAvailableRecommendedProducts();

    // Don't show section if no products available
    if (availableProducts.length === 0) {
      return "";
    }

    // Fetch price data for all available products
    const productsWithPrices = await Promise.all(
      availableProducts.map(async (product) => {
        const priceData = await this.fetchVariantPriceData(product.id);

        // Determine pricing
        let currentPrice = product.price;
        let originalPrice = null;
        let hasDiscount = false;

        if (priceData) {
          // Use real Shopify data
          currentPrice = this.formatMoney(priceData.price);

          if (priceData.compare_at_price && priceData.compare_at_price > priceData.price) {
            originalPrice = this.formatMoney(priceData.compare_at_price);
            hasDiscount = true;
            console.log(`[renderRecommendedProducts] Product ${product.id} has discount:`, {
              current: currentPrice,
              original: originalPrice,
            });
          }
        } else if (product.hasDiscount && product.originalPrice) {
          // Fallback to static data
          originalPrice = product.originalPrice;
          hasDiscount = true;
        }

        return {
          ...product,
          currentPrice,
          originalPrice,
          hasDiscount,
        };
      })
    );

    const productsHtml = productsWithPrices
      .map(
        (product) => `
      <div class="cart-drawer-product-card" data-variant-id="${product.id}">
        <div class="cart-drawer-product-image">
          <img src="${product.image}" alt="${product.alt}" loading="lazy">
        </div>
        <div class="cart-drawer-product-info">
          <h4 class="cart-drawer-product-title bold">${product.title}</h4>
          <div class="cart-drawer-product-price">
            <span class="current-price bold">${product.currentPrice}</span>
            ${product.hasDiscount && product.originalPrice ? `<span class="old-price regular">${product.originalPrice}</span>` : ""}
          </div>
          <form action="/cart/add" method="post" class="cart-drawer-product-form">
            <input type="hidden" name="id" value="${product.id}">
            <input type="hidden" name="quantity" value="1">
            <button type="submit" class="cart-drawer-add-btn">ADD</button>
          </form>
        </div>
      </div>
    `
      )
      .join("");

    return `
      <div class="cart-drawer-recommended">
        <h3 class="cart-drawer-recommended-title bold">Recommended for you</h3>
        <div class="cart-drawer-recommended-products">
          ${productsHtml}
        </div>
      </div>
    `;
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

    // Bind recommended product form submissions
    this.drawer.querySelectorAll(".cart-drawer-product-form").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addToCart(e.target);
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
        // Update recommended products section
        await this.updateRecommendedSection();
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
        // Update recommended products section
        await this.updateRecommendedSection();
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

  async updateRecommendedSection() {
    const content = this.drawer.querySelector(".cart-drawer-content");
    if (!content) return;

    const recommendedSection = content.querySelector(".cart-drawer-recommended");
    const newRecommendedHtml = await this.renderRecommendedProducts();

    if (recommendedSection) {
      if (newRecommendedHtml) {
        // Update existing section
        recommendedSection.outerHTML = newRecommendedHtml;
      } else {
        // Remove section if no products available
        recommendedSection.remove();
      }
    } else if (newRecommendedHtml) {
      // Add section if it doesn't exist but products are available
      const footer = content.querySelector(".cart-drawer-footer");
      if (footer) {
        footer.insertAdjacentHTML("beforebegin", newRecommendedHtml);
      }
    }

    // Re-bind events for new recommended products
    this.bindCartEvents();
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

  /* Recommended Products Styles - Minimalist Design */
  .cart-drawer-recommended {
    padding: 24px 20px;
    border-top: 1px solid #f1f3f4;
    background: #fafbfc;
  }

  .cart-drawer-recommended-title {
    font-size: 16px !important;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 20px 0 !important;
    text-align: left;
    letter-spacing: 0.01em;
  }

  .cart-drawer-recommended-products {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cart-drawer-product-card {
    display: flex;
    background: #fff;
    border: none;
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
  }

  .cart-drawer-product-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .cart-drawer-product-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .cart-drawer-product-card:hover::before {
    opacity: 1;
  }

  .cart-drawer-product-image {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    margin-right: 16px;
    border-radius: 8px;
    overflow: hidden;
    background: #f8fafc;
  }

  .cart-drawer-product-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.3s ease;
  }

  .cart-drawer-product-card:hover .cart-drawer-product-image img {
    transform: scale(1.05);
  }

  .cart-drawer-product-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }

  .cart-drawer-product-title {
    font-size: 14px!important;
    font-weight: 500;
    color: #374151;
    margin: 0 0 6px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    letter-spacing: -0.01em;
  }

  .cart-drawer-product-price {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cart-drawer-product-price .current-price {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .cart-drawer-product-price .old-price {
    font-size: 13px;
    font-weight: 500;
    color: #9ca3af;
    text-decoration: line-through;
  }

  .cart-drawer-product-form {
    margin: 0;
    display: flex;
    justify-content: flex-end;
  }

  .cart-drawer-add-btn {
    background: #f8fafc;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    width: fit-content;
    letter-spacing: 0.01em;
  }

  .cart-drawer-add-btn:hover {
    background: #eb701f;
    color: #fff;
    border-color: #eb701f;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(235, 112, 31, 0.2);
  }

  .cart-drawer-add-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(235, 112, 31, 0.2);
  }

  /* Free Shipping Banner Styles */
  .cart-drawer-free-shipping {
    margin-bottom: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .free-shipping-message {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    text-align: center;
  }

  .free-shipping-progress {
    position: relative;
    width: 100%;
    height: 10px;
    background: #e5e7eb;
    border-radius: 12px;
    overflow: visible;
  }

  .free-shipping-progress-bar {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .free-shipping-progress-fill {
    width: 100%;
    height: 100%;
    background: #10b981;
    border-radius: 12px;
    transition: width 0.3s ease;
  }

  .free-shipping-truck-icon {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

 .free-shipping-truck-icon svg {
    width: 20px;
    height: 20px;
}

  /* Free Shipping Banner Styles */
  .cart-drawer-free-shipping {
    margin-bottom: 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .free-shipping-message {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    text-align: center;
  }

  .free-shipping-progress {
    position: relative;
    width: 100%;
    height: 10px;
    background: #e5e7eb;
    border-radius: 12px;
    overflow: visible;
  }

  .free-shipping-progress-bar {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .free-shipping-progress-fill {
    width: 100%;
    height: 100%;
    background: #10b981;
    border-radius: 12px;
    transition: width 0.3s ease;
  }

  .free-shipping-truck-icon {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    background: #10b981;
    border-radius: 50%;
  }

  .free-shipping-truck-icon svg {
    width: 20px;
    height: 20px;
  }

  /* Subtotal Savings Badge Styles */
  .cart-drawer-subtotal-price {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .cart-drawer-subtotal-original {
    font-size: 14px;
    font-weight: 500;
    color: #9ca3af;
    text-decoration: line-through;
  }

  .cart-drawer-subtotal-savings-badge {
    font-size: 13px;
    font-weight: 500;
    color: #10b981;
    background: #ecfdf5;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;
    line-height: 1.2;
  }

  /* Payment Badges Styles */
  .cart-drawer-payment-badges {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .payment-badge {
    height: 24px;
    width: auto;
    object-fit: contain;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .payment-badge:hover {
    opacity: 1;
  }

  /* Mobile adjustments */
  @media screen and (max-width: 768px) {
    .cart-drawer-recommended {
      padding: 20px 16px;
    }

    .cart-drawer-recommended-title {
      font-size: 15px;
      margin-bottom: 16px;
    }

    .cart-drawer-product-card {
      padding: 14px;
      border-radius: 10px;
    }

    .cart-drawer-product-image {
      width: 64px;
      height: 64px;
      margin-right: 14px;
      border-radius: 6px;
    }

    .cart-drawer-product-title {
      font-size: 13px;
      margin-bottom: 5px;
      line-height: 1.3;
    }

    .cart-drawer-product-price {
    }

    .cart-drawer-product-price .current-price {
      font-size: 14px;
    }

    .cart-drawer-add-btn {
      padding: 7px 14px;
      font-size: 12px;
      border-radius: 6px;
    }
  }
`;
document.head.appendChild(style);
