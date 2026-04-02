/**
 * Bundle page: syncs step 1–3 selections into the configuration sidebar and checkout.
 */
(function () {
  'use strict';

  function getMoneyFormat() {
    if (window.theme && window.theme.moneyFormat) return window.theme.moneyFormat;
    if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
      return '${{amount}}';
    }
    return '${{amount}}';
  }

  function formatMoney(cents) {
    var c = Number(cents);
    if (!Number.isFinite(c)) c = 0;
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(c, getMoneyFormat());
    }
    return '$' + (c / 100).toFixed(2);
  }

  function parseCentsFromInput(input) {
    if (!input) return 0;
    var raw = input.getAttribute('data-bundle-price-cents');
    var n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }

  function init(root) {
    if (!root || root.getAttribute('data-bundle-summary-init') === '1') return;
    root.setAttribute('data-bundle-summary-init', '1');

    var savingsAmountEl = root.querySelector('[data-summary-savings-amount]');
    var totalBucksEl = root.querySelector('[data-summary-total-bucks]');
    var totalSubEl = root.querySelector('[data-summary-total-sub]');
    var checkoutBtn = root.querySelector('[data-bundle-checkout]');
    var mobileToggleBtn = root.querySelector('[data-bundle-mobile-toggle]');
    var mobileBackdrop = root.querySelector('[data-bundle-mobile-backdrop]');
    var mobileCloseBtn = root.querySelector('[data-bundle-mobile-close]');
    var linesRoot = root.querySelector('.bundle-configuration-sidebar__lines');
    var step3Section = document.querySelector('[data-section-type="bundle-step-recovery-protocol"]');

    function getCheckedInStep(type) {
      var sec = document.querySelector('[data-section-type="' + type + '"]');
      if (!sec) return [];
      return Array.prototype.slice.call(sec.querySelectorAll('.bundle-option-card__input:checked'));
    }

    function getRecoveryCard() {
      if (!step3Section) return null;
      return step3Section.querySelector('[data-bundle-recovery-card]');
    }

    function ensureFallbackLine() {
      if (!linesRoot) return;
      if (linesRoot.querySelector('[data-summary-empty-row]')) return;
      linesRoot.innerHTML =
        '<li class="bundle-summary__line bundle-summary__line--empty" data-summary-empty-row>' +
        '<div class="bundle-summary__line-body">' +
        '<span class="bundle-summary__line-title">No items selected yet</span>' +
        '</div>' +
        '<span class="bundle-summary__line-price">—</span>' +
        '</li>';
    }

    function renderLines(lines) {
      if (!linesRoot) return;
      if (!lines.length) {
        ensureFallbackLine();
        return;
      }
      linesRoot.innerHTML = '';
      lines.forEach(function (line) {
        var li = document.createElement('li');
        li.className = 'bundle-summary__line';

        var body = document.createElement('div');
        body.className = 'bundle-summary__line-body';

        var title = document.createElement('span');
        title.className = 'bundle-summary__line-title';
        title.textContent = line.title || '';

        var category = document.createElement('span');
        category.className = 'bundle-summary__line-cat';
        category.textContent = line.category || '';

        body.appendChild(title);
        body.appendChild(category);

        var right = document.createElement('div');
        right.className = 'bundle-summary__line-right';

        var price = document.createElement('span');
        price.className = 'bundle-summary__line-price';
        price.textContent = formatMoney(line.priceCents);
        right.appendChild(price);

        if (line.discountCents > 0) {
          var saving = document.createElement('span');
          saving.className = 'bundle-summary__line-saving';
          saving.textContent = 'saving ' + formatMoney(line.discountCents);
          right.appendChild(saving);
        }

        li.appendChild(body);
        li.appendChild(right);
        linesRoot.appendChild(li);
      });
    }

    function closeMobilePanel() {
      root.classList.remove('is-mobile-open');
      document.body.classList.remove('bundle-mobile-open');
      if (mobileToggleBtn) mobileToggleBtn.setAttribute('aria-expanded', 'false');
    }

    function openMobilePanel() {
      root.classList.add('is-mobile-open');
      document.body.classList.add('bundle-mobile-open');
      if (mobileToggleBtn) mobileToggleBtn.setAttribute('aria-expanded', 'true');
    }

    function updateTotals(subtotalCents, savingsCents) {
      var total = Math.max(0, subtotalCents);
      if (savingsAmountEl) {
        savingsAmountEl.textContent = 'SAVING ' + formatMoney(Math.max(0, savingsCents));
      }
      if (totalBucksEl && totalSubEl) {
        var full = formatMoney(total);
        var idx = full.lastIndexOf('.');
        if (idx === -1) {
          totalBucksEl.textContent = full;
          totalSubEl.textContent = '';
        } else {
          totalBucksEl.textContent = full.slice(0, idx);
          totalSubEl.textContent = full.slice(idx);
        }
      }
    }

    function updateStepLocks() {
      var step1Count = getCheckedInStep('bundle-step-dumbbell-base').length;

      var step2El = document.querySelector('[data-section-type="bundle-step-support-storage"]');
      var step3El = document.querySelector('[data-section-type="bundle-step-recovery-protocol"]');

      // ── Step 2: locked until step 1 has ≥1 selection ──
      var step2Locked = step1Count === 0;
      if (step2El) {
        if (step2Locked) {
          step2El.querySelectorAll('.bundle-option-card__input').forEach(function (inp) {
            inp.checked = false;
            inp.disabled = true;
          });
        } else {
          step2El.querySelectorAll('.bundle-option-card__input').forEach(function (inp) {
            inp.disabled = false;
          });
        }
        step2El.classList.toggle('is-locked', step2Locked);
      }

      var step2Count = step2Locked ? 0 : getCheckedInStep('bundle-step-support-storage').length;

      // ── Step 3: locked until step 2 has ≥1 selection ──
      var step3Locked = step2Locked || step2Count === 0;
      if (step3El) {
        if (step3Locked) {
          var recoveryCard = step3El.querySelector('[data-bundle-recovery-card]');
          if (recoveryCard && recoveryCard.classList.contains('is-included')) {
            recoveryCard.classList.remove('is-included');
            var recovBtn = recoveryCard.querySelector('[data-bundle-recovery-toggle]');
            if (recovBtn) {
              recovBtn.setAttribute('aria-pressed', 'false');
              recovBtn.classList.remove('bundle-steps__recovery-include--active');
            }
          }
        }
        var recoveryToggle = step3El.querySelector('[data-bundle-recovery-toggle]');
        if (recoveryToggle) recoveryToggle.disabled = step3Locked;
        step3El.classList.toggle('is-locked', step3Locked);
      }

      // ── Checkout button: incomplete state ──
      if (checkoutBtn) {
        checkoutBtn.classList.toggle('is-incomplete', step1Count === 0 || step2Count === 0);
      }
    }

    function refresh() {
      var subtotal = 0;
      var savings = 0;
      var summaryLines = [];

      var step1Inputs = getCheckedInStep('bundle-step-dumbbell-base');
      var step2Inputs = getCheckedInStep('bundle-step-support-storage');

      step1Inputs.concat(step2Inputs).forEach(function (input) {
        var price = parseCentsFromInput(input);
        var discount = parseInt(input.getAttribute('data-bundle-discount-cents') || '0', 10) || 0;
        subtotal += price;
        savings += discount;
        summaryLines.push({
          title: input.getAttribute('data-bundle-line-title') || '',
          category: input.getAttribute('data-bundle-line-category') || '',
          priceCents: price,
          discountCents: discount,
        });
      });

      var card = getRecoveryCard();
      if (card && card.classList.contains('is-included')) {
        var price = parseInt(card.getAttribute('data-bundle-price-cents') || '0', 10) || 0;
        var discount = parseInt(card.getAttribute('data-bundle-discount-cents') || '0', 10) || 0;
        subtotal += price;
        savings += discount;
        summaryLines.push({
          title: card.getAttribute('data-bundle-line-title') || '',
          category: card.getAttribute('data-bundle-line-category') || '',
          priceCents: price,
          discountCents: discount,
        });
      }

      renderLines(summaryLines);
      updateTotals(subtotal, savings);
      updateStepLocks();
    }

    document.addEventListener('change', function (e) {
      if (e.target && e.target.matches && e.target.matches('.bundle-option-card__input')) {
        refresh();
      }
    });

    document.addEventListener('click', function (e) {
      var toggle = e.target.closest && e.target.closest('[data-bundle-recovery-toggle]');
      if (!toggle) return;
      var card = getRecoveryCard();
      if (!card) return;
      e.preventDefault();
      var on = !card.classList.contains('is-included');
      card.classList.toggle('is-included', on);
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.classList.toggle('bundle-steps__recovery-include--active', on);
      refresh();
    });

    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', function () {
        if (root.classList.contains('is-mobile-open')) {
          closeMobilePanel();
        } else {
          openMobilePanel();
        }
      });
    }

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', function () {
        closeMobilePanel();
      });
    }

    if (mobileCloseBtn) {
      mobileCloseBtn.addEventListener('click', function () {
        closeMobilePanel();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-mobile-open')) {
        closeMobilePanel();
      }
    });

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        var step1 = getCheckedInStep('bundle-step-dumbbell-base');
        var step2 = getCheckedInStep('bundle-step-support-storage');
        var card = getRecoveryCard();
        if (!step1.length || !step2.length) {
          window.alert(checkoutBtn.getAttribute('data-alert-incomplete') || 'Please complete all steps.');
          return;
        }
        var qtyByVariantId = {};
        step1.concat(step2).forEach(function (input) {
          var id = parseInt(input.value, 10);
          if (!Number.isFinite(id)) return;
          qtyByVariantId[id] = (qtyByVariantId[id] || 0) + 1;
        });
        if (card && card.classList.contains('is-included')) {
          var vid = card.getAttribute('data-bundle-variant-id');
          var addOnId = parseInt(vid, 10);
          if (Number.isFinite(addOnId)) {
            qtyByVariantId[addOnId] = (qtyByVariantId[addOnId] || 0) + 1;
          }
        }
        var items = Object.keys(qtyByVariantId).map(function (id) {
          return { id: parseInt(id, 10), quantity: qtyByVariantId[id] };
        });
        checkoutBtn.disabled = true;
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('add failed');
            window.location.href = checkoutBtn.getAttribute('data-checkout-url') || '/checkout';
          })
          .catch(function () {
            checkoutBtn.disabled = false;
            window.location.href = '/cart';
          });
      });
    }

    refresh();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-bundle-summary-root]').forEach(init);

    // Smooth scroll for hero CTA → Step 1
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href="#bundle-step-1"]');
      if (!link) return;
      var target = document.getElementById('bundle-step-1');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
