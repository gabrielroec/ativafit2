/**
 * Collection Filters — Universal JS
 * Builds smart filters from product data attributes when native Shopify filters aren't available.
 * Price range slider, mobile drawer, instant search, sort, client-side filtering.
 */
(function () {
  'use strict';

  /* ==========================
     UTILITY
     ========================== */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function money(cents) { return '$' + (cents / 100).toFixed(2).replace(/\.00$/, ''); }

  /* ==========================
     JS FILTER ENGINE (fallback)
     Reads data-product-* from .collection-grid-simple__item
     ========================== */
  function initJsFilters() {
    var container = qs('[data-js-filter-groups]');
    if (!container) return;

    var items = qsa('.collection-grid-simple__item[data-product-type]');
    if (items.length === 0) return;

    /* Collect unique values */
    var types = {};
    var vendors = {};
    var priceMin = Infinity;
    var priceMax = 0;
    var hasInStock = false;
    var hasOutOfStock = false;

    items.forEach(function (item) {
      var type = item.getAttribute('data-product-type') || '';
      var vendor = item.getAttribute('data-product-vendor') || '';
      var price = parseInt(item.getAttribute('data-product-price') || '0', 10);
      var available = item.getAttribute('data-product-available') === 'true';

      if (type) types[type] = (types[type] || 0) + 1;
      if (vendor) vendors[vendor] = (vendors[vendor] || 0) + 1;
      if (price < priceMin) priceMin = price;
      if (price > priceMax) priceMax = price;
      if (available) hasInStock = true;
      if (!available) hasOutOfStock = true;
    });

    /* State */
    var activeFilters = {
      types: [],
      vendors: [],
      availability: null,
      priceMin: priceMin,
      priceMax: priceMax
    };
    var globalPriceMin = priceMin;
    var globalPriceMax = priceMax;

    /* Build HTML for a filter group */
    function buildGroup(title, id, values, isOpen) {
      var html = '<details class="cf-filter-group"' + (isOpen ? ' open' : '') + '>';
      html += '<summary class="cf-filter-group__header">';
      html += '<span class="cf-filter-group__title">' + title + '</span>';
      html += '<svg class="cf-filter-group__chevron" width="12" height="12" viewBox="0 0 12 12"><polyline points="2 4 6 8 10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      html += '</summary>';
      html += '<div class="cf-filter-group__body">';
      html += '<ul class="cf-filter-list" role="list">';

      Object.keys(values).sort().forEach(function (label) {
        var count = values[label];
        var cbId = 'jsf-' + id + '-' + label.replace(/[^a-zA-Z0-9]/g, '_');
        html += '<li class="cf-filter-list__item">';
        html += '<label class="cf-filter-checkbox" for="' + cbId + '">';
        html += '<input type="checkbox" class="cf-filter-checkbox__input" id="' + cbId + '" data-filter-key="' + id + '" data-filter-value="' + label + '">';
        html += '<span class="cf-filter-checkbox__box"><svg class="cf-filter-checkbox__check" width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
        html += '<span class="cf-filter-checkbox__label">' + label + '</span>';
        html += '<span class="cf-filter-checkbox__count">(' + count + ')</span>';
        html += '</label>';
        html += '</li>';
      });

      html += '</ul></div></details>';
      return html;
    }

    function buildPriceGroup() {
      var minDollars = Math.floor(globalPriceMin / 100);
      var maxDollars = Math.ceil(globalPriceMax / 100);
      if (maxDollars <= minDollars) maxDollars = minDollars + 100;

      var html = '<details class="cf-filter-group" open>';
      html += '<summary class="cf-filter-group__header">';
      html += '<span class="cf-filter-group__title">Price</span>';
      html += '<svg class="cf-filter-group__chevron" width="12" height="12" viewBox="0 0 12 12"><polyline points="2 4 6 8 10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      html += '</summary>';
      html += '<div class="cf-filter-group__body">';
      html += '<div class="cf-price-range" data-price-range data-min="' + minDollars + '" data-max="' + maxDollars + '">';
      html += '<div class="cf-price-range__track"><div class="cf-price-range__bar" data-price-bar></div>';
      html += '<input type="range" class="cf-price-range__input cf-price-range__input--min" min="' + minDollars + '" max="' + maxDollars + '" step="1" value="' + minDollars + '" data-price-range-min>';
      html += '<input type="range" class="cf-price-range__input cf-price-range__input--max" min="' + minDollars + '" max="' + maxDollars + '" step="1" value="' + maxDollars + '" data-price-range-max>';
      html += '</div>';
      html += '<div class="cf-price-range__values">';
      html += '<div class="cf-price-range__field"><span class="cf-price-range__currency">$</span><input type="number" class="cf-price-range__number" min="' + minDollars + '" max="' + maxDollars + '" value="' + minDollars + '" data-price-input-min></div>';
      html += '<span class="cf-price-range__separator">—</span>';
      html += '<div class="cf-price-range__field"><span class="cf-price-range__currency">$</span><input type="number" class="cf-price-range__number" min="' + minDollars + '" max="' + maxDollars + '" value="' + maxDollars + '" data-price-input-max></div>';
      html += '</div></div>';
      html += '</div></details>';
      return html;
    }

    /* Render filter groups */
    var groupsHtml = '';

    /* Availability */
    if (hasInStock || hasOutOfStock) {
      var availVals = {};
      if (hasInStock) availVals['In stock'] = items.filter(function (i) { return i.getAttribute('data-product-available') === 'true'; }).length;
      if (hasOutOfStock) availVals['Out of stock'] = items.filter(function (i) { return i.getAttribute('data-product-available') !== 'true'; }).length;
      groupsHtml += buildGroup('Availability', 'availability', availVals, true);
    }

    /* Price */
    if (globalPriceMax > globalPriceMin) {
      groupsHtml += buildPriceGroup();
    }

    /* Product Type */
    if (Object.keys(types).length > 1) {
      groupsHtml += buildGroup('Product Type', 'type', types, false);
    }

    /* Vendor */
    if (Object.keys(vendors).length > 1) {
      groupsHtml += buildGroup('Brand', 'vendor', vendors, false);
    }

    container.innerHTML = groupsHtml;

    /* Init price range UI */
    initPriceRanges();

    /* Listen for checkbox changes */
    container.addEventListener('change', function (e) {
      var input = e.target;
      if (!input.matches('.cf-filter-checkbox__input')) return;

      var key = input.getAttribute('data-filter-key');
      var val = input.getAttribute('data-filter-value');

      if (key === 'type') {
        toggleArrayValue(activeFilters.types, val, input.checked);
      } else if (key === 'vendor') {
        toggleArrayValue(activeFilters.vendors, val, input.checked);
      } else if (key === 'availability') {
        if (input.checked) {
          activeFilters.availability = val;
        } else {
          activeFilters.availability = null;
        }
        container.querySelectorAll('[data-filter-key="availability"]').forEach(function (cb) {
          if (cb !== input) cb.checked = false;
        });
      }

      applyJsFilters();
    });

    /* Price range change via debounced input events */
    var priceDebounce;
    container.addEventListener('input', function (e) {
      if (e.target.matches('[data-price-range-min], [data-price-range-max], [data-price-input-min], [data-price-input-max]')) {
        clearTimeout(priceDebounce);
        priceDebounce = setTimeout(function () {
          var minInput = qs('[data-price-input-min]', container) || qs('[data-price-range-min]', container);
          var maxInput = qs('[data-price-input-max]', container) || qs('[data-price-range-max]', container);
          activeFilters.priceMin = (parseFloat(minInput.value) || 0) * 100;
          activeFilters.priceMax = (parseFloat(maxInput.value) || Infinity) * 100;
          applyJsFilters();
        }, 400);
      }
    });

    function toggleArrayValue(arr, val, add) {
      var idx = arr.indexOf(val);
      if (add && idx === -1) arr.push(val);
      if (!add && idx !== -1) arr.splice(idx, 1);
    }

    function applyJsFilters() {
      var visibleCount = 0;
      var grid = qs('[data-collection-grid]');
      var noResults = qs('[data-no-search-results]');
      var countEl = qs('[data-product-count]');
      var clearBtns = qsa('[data-js-clear-all]');
      var activePillsContainer = qs('[data-js-active-filters]');
      var hasAny = activeFilters.types.length > 0 || activeFilters.vendors.length > 0 || activeFilters.availability !== null ||
        activeFilters.priceMin > globalPriceMin || activeFilters.priceMax < globalPriceMax;

      items.forEach(function (item) {
        var show = true;
        var type = item.getAttribute('data-product-type') || '';
        var vendor = item.getAttribute('data-product-vendor') || '';
        var price = parseInt(item.getAttribute('data-product-price') || '0', 10);
        var available = item.getAttribute('data-product-available') === 'true';

        if (activeFilters.types.length > 0 && activeFilters.types.indexOf(type) === -1) show = false;
        if (activeFilters.vendors.length > 0 && activeFilters.vendors.indexOf(vendor) === -1) show = false;
        if (activeFilters.availability === 'In stock' && !available) show = false;
        if (activeFilters.availability === 'Out of stock' && available) show = false;
        if (price < activeFilters.priceMin || price > activeFilters.priceMax) show = false;

        item.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      if (noResults) noResults.style.display = (visibleCount === 0) ? '' : 'none';
      if (countEl) countEl.textContent = visibleCount + (visibleCount === 1 ? ' product' : ' products');

      clearBtns.forEach(function (btn) {
        btn.style.display = hasAny ? '' : 'none';
      });

      /* Update active count badge */
      var activeCount = activeFilters.types.length + activeFilters.vendors.length +
        (activeFilters.availability ? 1 : 0) +
        (activeFilters.priceMin > globalPriceMin || activeFilters.priceMax < globalPriceMax ? 1 : 0);
      var badge = qs('[data-active-count]');
      if (badge) {
        badge.textContent = activeCount;
        badge.style.display = activeCount > 0 ? '' : 'none';
      }

      /* Build active pills */
      if (activePillsContainer) {
        var pillsHtml = '';
        activeFilters.types.forEach(function (t) {
          pillsHtml += '<button type="button" class="cf-active-pill" data-remove-filter="type" data-remove-value="' + t + '">';
          pillsHtml += '<span class="cf-active-pill__label">Type: ' + t + '</span>';
          pillsHtml += '<svg class="cf-active-pill__x" width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
          pillsHtml += '</button>';
        });
        activeFilters.vendors.forEach(function (v) {
          pillsHtml += '<button type="button" class="cf-active-pill" data-remove-filter="vendor" data-remove-value="' + v + '">';
          pillsHtml += '<span class="cf-active-pill__label">Brand: ' + v + '</span>';
          pillsHtml += '<svg class="cf-active-pill__x" width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
          pillsHtml += '</button>';
        });
        if (activeFilters.availability) {
          pillsHtml += '<button type="button" class="cf-active-pill" data-remove-filter="availability" data-remove-value="' + activeFilters.availability + '">';
          pillsHtml += '<span class="cf-active-pill__label">' + activeFilters.availability + '</span>';
          pillsHtml += '<svg class="cf-active-pill__x" width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
          pillsHtml += '</button>';
        }
        if (hasAny && pillsHtml) {
          pillsHtml += '<button type="button" class="cf-active-pill cf-active-pill--clear" data-js-clear-all>Clear all</button>';
        }
        activePillsContainer.innerHTML = pillsHtml;
        activePillsContainer.style.display = pillsHtml ? '' : 'none';

        /* Pill remove click */
        activePillsContainer.querySelectorAll('[data-remove-filter]').forEach(function (pill) {
          pill.addEventListener('click', function () {
            var key = pill.getAttribute('data-remove-filter');
            var val = pill.getAttribute('data-remove-value');
            if (key === 'type') toggleArrayValue(activeFilters.types, val, false);
            if (key === 'vendor') toggleArrayValue(activeFilters.vendors, val, false);
            if (key === 'availability') activeFilters.availability = null;
            syncCheckboxes();
            applyJsFilters();
          });
        });
        activePillsContainer.querySelectorAll('[data-js-clear-all]').forEach(function (btn) {
          btn.addEventListener('click', clearAll);
        });
      }
    }

    function syncCheckboxes() {
      container.querySelectorAll('.cf-filter-checkbox__input').forEach(function (cb) {
        var key = cb.getAttribute('data-filter-key');
        var val = cb.getAttribute('data-filter-value');
        if (key === 'type') cb.checked = activeFilters.types.indexOf(val) !== -1;
        if (key === 'vendor') cb.checked = activeFilters.vendors.indexOf(val) !== -1;
        if (key === 'availability') cb.checked = activeFilters.availability === val;
      });
      /* Also sync drawer checkboxes */
      var drawerBody = qs('[data-filter-drawer-body]');
      if (drawerBody) {
        drawerBody.querySelectorAll('.cf-filter-checkbox__input').forEach(function (cb) {
          var key = cb.getAttribute('data-filter-key');
          var val = cb.getAttribute('data-filter-value');
          if (key === 'type') cb.checked = activeFilters.types.indexOf(val) !== -1;
          if (key === 'vendor') cb.checked = activeFilters.vendors.indexOf(val) !== -1;
          if (key === 'availability') cb.checked = activeFilters.availability === val;
        });
      }
    }

    function clearAll() {
      activeFilters.types = [];
      activeFilters.vendors = [];
      activeFilters.availability = null;
      activeFilters.priceMin = globalPriceMin;
      activeFilters.priceMax = globalPriceMax;
      syncCheckboxes();
      /* Reset price inputs */
      var minSlider = qs('[data-price-range-min]', container);
      var maxSlider = qs('[data-price-range-max]', container);
      var minNum = qs('[data-price-input-min]', container);
      var maxNum = qs('[data-price-input-max]', container);
      if (minSlider) minSlider.value = Math.floor(globalPriceMin / 100);
      if (maxSlider) maxSlider.value = Math.ceil(globalPriceMax / 100);
      if (minNum) minNum.value = Math.floor(globalPriceMin / 100);
      if (maxNum) maxNum.value = Math.ceil(globalPriceMax / 100);
      initPriceRanges();
      applyJsFilters();
    }

    /* Clear all buttons outside container */
    qsa('[data-js-clear-all]').forEach(function (btn) {
      btn.addEventListener('click', clearAll);
    });

    /* Clone filters into mobile drawer */
    var drawerBody = qs('[data-filter-drawer-body]');
    if (drawerBody && drawerBody.children.length === 0) {
      var jsFiltersEl = qs('[data-js-filters]');
      if (jsFiltersEl) {
        var clone = jsFiltersEl.cloneNode(true);
        clone.removeAttribute('data-js-filters');

        clone.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-d'; });
        clone.querySelectorAll('[for]').forEach(function (el) { el.setAttribute('for', el.getAttribute('for') + '-d'); });

        drawerBody.appendChild(clone);
        initPriceRangesIn(clone);

        clone.addEventListener('change', function (e) {
          var input = e.target;
          if (!input.matches('.cf-filter-checkbox__input')) return;
          var key = input.getAttribute('data-filter-key');
          var val = input.getAttribute('data-filter-value');
          if (key === 'type') toggleArrayValue(activeFilters.types, val, input.checked);
          if (key === 'vendor') toggleArrayValue(activeFilters.vendors, val, input.checked);
          if (key === 'availability') {
            activeFilters.availability = input.checked ? val : null;
            clone.querySelectorAll('[data-filter-key="availability"]').forEach(function (cb) { if (cb !== input) cb.checked = false; });
          }
          syncCheckboxes();
          applyJsFilters();
        });

        var drawerPriceDebounce;
        clone.addEventListener('input', function (e) {
          if (e.target.matches('[data-price-range-min], [data-price-range-max], [data-price-input-min], [data-price-input-max]')) {
            clearTimeout(drawerPriceDebounce);
            drawerPriceDebounce = setTimeout(function () {
              var mi = qs('[data-price-input-min]', clone) || qs('[data-price-range-min]', clone);
              var ma = qs('[data-price-input-max]', clone) || qs('[data-price-range-max]', clone);
              activeFilters.priceMin = (parseFloat(mi.value) || 0) * 100;
              activeFilters.priceMax = (parseFloat(ma.value) || Infinity) * 100;
              applyJsFilters();
            }, 400);
          }
        });
      }
    }

    /* Apply button in drawer */
    var drawerApply = qs('[data-filter-drawer-apply]');
    if (drawerApply) {
      drawerApply.addEventListener('click', function () {
        closeDrawer();
      });
    }
  }

  /* ==========================
     PRICE RANGE UI
     ========================== */
  function initPriceRanges() {
    qsa('[data-price-range]').forEach(function (w) { initPriceRangeWidget(w); });
  }

  function initPriceRangesIn(ctx) {
    qsa('[data-price-range]', ctx).forEach(function (w) { initPriceRangeWidget(w); });
  }

  function initPriceRangeWidget(wrap) {
    var inputMin = qs('[data-price-range-min]', wrap);
    var inputMax = qs('[data-price-range-max]', wrap);
    var numberMin = qs('[data-price-input-min]', wrap);
    var numberMax = qs('[data-price-input-max]', wrap);
    var bar = qs('[data-price-bar]', wrap);
    if (!inputMin || !inputMax || !bar) return;

    var rMin = parseFloat(inputMin.min) || 0;
    var rMax = parseFloat(inputMin.max) || 1000;

    function update() {
      var lo = parseFloat(inputMin.value);
      var hi = parseFloat(inputMax.value);
      bar.style.left = ((lo - rMin) / (rMax - rMin) * 100) + '%';
      bar.style.width = (((hi - lo) / (rMax - rMin)) * 100) + '%';
    }

    inputMin.addEventListener('input', function () {
      if (parseFloat(inputMin.value) > parseFloat(inputMax.value)) inputMin.value = inputMax.value;
      if (numberMin) numberMin.value = inputMin.value;
      update();
    });
    inputMax.addEventListener('input', function () {
      if (parseFloat(inputMax.value) < parseFloat(inputMin.value)) inputMax.value = inputMin.value;
      if (numberMax) numberMax.value = inputMax.value;
      update();
    });
    if (numberMin) {
      numberMin.addEventListener('change', function () {
        var v = Math.max(rMin, Math.min(parseFloat(numberMin.value) || rMin, parseFloat(inputMax.value)));
        numberMin.value = v;
        inputMin.value = v;
        update();
      });
    }
    if (numberMax) {
      numberMax.addEventListener('change', function () {
        var v = Math.min(rMax, Math.max(parseFloat(numberMax.value) || rMax, parseFloat(inputMin.value)));
        numberMax.value = v;
        inputMax.value = v;
        update();
      });
    }
    update();
  }

  /* ==========================
     MOBILE DRAWER
     ========================== */
  var drawerEl, overlayEl;

  function openDrawer() {
    drawerEl = qs('[data-filter-drawer]');
    overlayEl = qs('[data-filter-drawer-overlay]');
    if (drawerEl) drawerEl.classList.add('is-open');
    if (overlayEl) overlayEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerEl = qs('[data-filter-drawer]');
    overlayEl = qs('[data-filter-drawer-overlay]');
    if (drawerEl) drawerEl.classList.remove('is-open');
    if (overlayEl) overlayEl.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initDrawer() {
    var toggle = qs('[data-filter-drawer-toggle]');
    var closeBtn = qs('[data-filter-drawer-close]');
    overlayEl = qs('[data-filter-drawer-overlay]');

    if (toggle) toggle.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlayEl) overlayEl.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* ==========================
     SORT
     ========================== */
  function initSort() {
    var sel = qs('[data-sort-select]');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sel.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  }

  /* ==========================
     SEARCH (client-side)
     ========================== */
  function initSearch() {
    var input = qs('[data-collection-search]');
    var clearBtn = qs('[data-search-clear]');
    if (!input) return;

    var timer;
    function run() {
      var q = input.value.trim().toLowerCase();
      var cards = qsa('[data-product-card-simple]');
      var noRes = qs('[data-no-search-results]');
      var visible = 0;

      if (clearBtn) clearBtn.classList.toggle('is-visible', q.length > 0);

      cards.forEach(function (card) {
        var item = card.closest('.collection-grid-simple__item');
        if (!item) return;
        if (!q) { item.style.removeProperty('display'); visible++; return; }
        var title = (card.querySelector('.product-card-simple__title') || {}).textContent || '';
        var type = item.getAttribute('data-product-type') || '';
        var vendor = item.getAttribute('data-product-vendor') || '';
        var s = (title + ' ' + type + ' ' + vendor).toLowerCase();
        var match = s.indexOf(q) !== -1;
        if (match && item.style.display !== 'none') { visible++; }
        else if (!match) { item.style.display = 'none'; }
      });

      if (noRes) noRes.style.display = (q && visible === 0) ? '' : 'none';
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 200);
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        run();
        input.focus();
      });
    }
  }

  /* ==========================
     NATIVE FILTER AUTO-SUBMIT
     ========================== */
  function initNativeFilters() {
    var form = qs('[data-collection-filters-form]');
    if (!form) return;
    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-filter-checkbox]')) form.submit();
    });

    /* Clone into drawer */
    var drawerBody = qs('[data-filter-drawer-body]');
    if (drawerBody && drawerBody.children.length === 0) {
      var clone = form.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-d'; });
      clone.querySelectorAll('[for]').forEach(function (el) { el.setAttribute('for', el.getAttribute('for') + '-d'); });
      drawerBody.appendChild(clone);
      initPriceRangesIn(clone);
      clone.addEventListener('change', function (e) {
        if (e.target.matches('[data-filter-checkbox]')) clone.submit();
      });
    }
  }

  /* ==========================
     INIT
     ========================== */
  function init() {
    initDrawer();
    initSort();
    initSearch();

    if (qs('[data-collection-filters-form]')) {
      initNativeFilters();
    }
    if (qs('[data-js-filter-groups]')) {
      initJsFilters();
    }

    initPriceRanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
