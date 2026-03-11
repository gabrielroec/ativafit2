/**
 * Global variant switcher for product-card-simple (collection grid, banner carousel, etc.)
 * Uses document-level delegation so it works inside Swiper and any section.
 */
(function() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.product-card-simple__variant-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var card = btn.closest('[data-product-card-simple]');
    if (!card) return;
    var variantId = btn.getAttribute('data-variant-id');
    var price = btn.getAttribute('data-price');
    var comparePrice = btn.getAttribute('data-compare-at-price');
    var showCompare = btn.getAttribute('data-show-compare') === 'true';
    var available = btn.getAttribute('data-available') === 'true';
    var imageSrc = btn.getAttribute('data-image-src');
    var input = card.querySelector('[data-variant-input]');
    var priceCurrent = card.querySelector('[data-price-current]');
    var priceCompare = card.querySelector('[data-price-compare]');
    var atcButton = card.querySelector('[data-atc-button]');
    var imageContainer = card.querySelector('.product-card-simple__image');
    var discountBadge = card.querySelector('.product-card-simple__discount-badge');
    var discountLabel = btn.getAttribute('data-discount-label') || '';
    if (input) input.value = variantId;
    if (priceCurrent) priceCurrent.textContent = price || '';
    if (priceCompare) {
      priceCompare.textContent = comparePrice || '';
      priceCompare.style.display = showCompare ? '' : 'none';
    }
    if (atcButton) {
      atcButton.disabled = !available;
      atcButton.textContent = available ? 'ADD TO CART' : 'Sold out';
      atcButton.setAttribute('aria-label', available ? 'Add to cart' : 'Sold out');
    }
    if (imageContainer && imageSrc) {
      var img = imageContainer.querySelector('img');
      if (img) {
        img.src = imageSrc;
        img.srcset = imageSrc + ' 1x';
      }
    }
    if (discountBadge) {
      if (discountLabel) {
        discountBadge.textContent = discountLabel;
        discountBadge.style.display = '';
      } else {
        discountBadge.style.display = 'none';
      }
    }
    card.querySelectorAll('.product-card-simple__variant-btn').forEach(function(b) {
      b.classList.toggle('product-card-simple__variant-btn--selected', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
  });
})();
