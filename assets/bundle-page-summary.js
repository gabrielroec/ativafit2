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

  function parseCompareCentsFromInput(input) {
    if (!input) return 0;
    var raw = input.getAttribute('data-bundle-compare-price-cents');
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

    document.body.classList.add('bundle-page--has-summary');

    function findCheckedInStep(type) {
      var sec = document.querySelector('[data-section-type="' + type + '"]');
      if (!sec) return null;
      return sec.querySelector('.bundle-option-card__input:checked');
    }

    function getRecoveryCard() {
      var sec = document.querySelector('[data-section-type="bundle-step-recovery-protocol"]');
      if (!sec) return null;
      return sec.querySelector('[data-bundle-recovery-card]');
    }

    function setLine(slot, title, category, iconName, priceCents, empty) {
      var li = root.querySelector('[data-summary-line="' + slot + '"]');
      if (!li) return;
      var icon = li.querySelector('[data-summary-line-icon]');
      var titleEl = li.querySelector('[data-summary-line-title]');
      var catEl = li.querySelector('[data-summary-line-cat]');
      var priceEl = li.querySelector('[data-summary-line-price]');
      li.classList.toggle('bundle-summary__line--empty', !!empty);
      if (empty) {
        if (icon) {
          icon.textContent = 'more_horiz';
          icon.classList.add('bundle-summary__icon--muted');
        }
        if (titleEl) titleEl.textContent = li.getAttribute('data-empty-title') || '—';
        if (catEl) catEl.textContent = '';
        if (priceEl) priceEl.textContent = '—';
        return;
      }
      if (icon) {
        icon.textContent = iconName || 'circle';
        icon.classList.remove('bundle-summary__icon--muted');
      }
      if (titleEl) titleEl.textContent = title || '';
      if (catEl) catEl.textContent = category || '';
      if (priceEl) priceEl.textContent = formatMoney(priceCents);
    }

    function updateTotals(subtotalCents, savingsCents) {
      var total = Math.max(0, subtotalCents);
      if (savingsAmountEl) {
        savingsAmountEl.textContent = '-' + formatMoney(Math.max(0, savingsCents));
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

    function refresh() {
      var subtotal = 0;
      var savings = 0;

      var r1 = findCheckedInStep('bundle-step-dumbbell-base');
      if (r1) {
        var r1Price = parseCentsFromInput(r1);
        var r1Compare = parseCompareCentsFromInput(r1);
        setLine(
          '1',
          r1.getAttribute('data-bundle-line-title') || '',
          r1.getAttribute('data-bundle-line-category') || '',
          r1.getAttribute('data-bundle-icon') || 'fitness_center',
          r1Price,
          false
        );
        subtotal += r1Price;
        if (r1Compare > r1Price) savings += r1Compare - r1Price;
      } else {
        setLine('1', '', '', '', 0, true);
      }

      var r2 = findCheckedInStep('bundle-step-support-storage');
      if (r2) {
        var r2Price = parseCentsFromInput(r2);
        var r2Compare = parseCompareCentsFromInput(r2);
        setLine(
          '2',
          r2.getAttribute('data-bundle-line-title') || '',
          r2.getAttribute('data-bundle-line-category') || '',
          r2.getAttribute('data-bundle-icon') || 'event_seat',
          r2Price,
          false
        );
        subtotal += r2Price;
        if (r2Compare > r2Price) savings += r2Compare - r2Price;
      } else {
        setLine('2', '', '', '', 0, true);
      }

      var card = getRecoveryCard();
      if (card && card.classList.contains('is-included')) {
        var t = card.getAttribute('data-bundle-line-title') || '';
        var cat = card.getAttribute('data-bundle-line-category') || '';
        var ic = card.getAttribute('data-bundle-icon') || 'vibration';
        var pc = parseInt(card.getAttribute('data-bundle-price-cents') || '0', 10) || 0;
        var cc = parseInt(card.getAttribute('data-bundle-compare-price-cents') || '0', 10) || 0;
        setLine('3', t, cat, ic, pc, false);
        subtotal += pc;
        if (cc > pc) savings += cc - pc;
      } else {
        setLine('3', '', '', '', 0, true);
      }

      updateTotals(subtotal, savings);
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
      toggle.classList.toggle('bundle-step-recovery-protocol__included--active', on);
      refresh();
    });

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        var r1 = findCheckedInStep('bundle-step-dumbbell-base');
        var r2 = findCheckedInStep('bundle-step-support-storage');
        var card = getRecoveryCard();
        if (!r1 || !r2) {
          window.alert(checkoutBtn.getAttribute('data-alert-incomplete') || 'Please complete all steps.');
          return;
        }
        var items = [
          { id: parseInt(r1.value, 10), quantity: 1 },
          { id: parseInt(r2.value, 10), quantity: 1 },
        ];
        if (card && card.classList.contains('is-included')) {
          var vid = card.getAttribute('data-bundle-variant-id');
          if (vid) items.push({ id: parseInt(vid, 10), quantity: 1 });
        }
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
  });
})();
