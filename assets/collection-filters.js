/**
 * Collection Filters — Universal JS
 * Smart category mapping based on product titles/tags (aligned with site menu).
 * Price range slider, availability, mobile drawer, instant search, sort.
 */
(function () {
  'use strict';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ==========================
     FUZZY COLLECTION SEARCH
     - Várias palavras: todas precisam casar (AND), em qualquer ordem no texto.
     - Subsequência: letras do termo na ordem no texto (ex.: "trmp" → "trampoline").
     - Levenshtein leve: troca/esquecimento próximo ao tamanho da palavra.
     ========================== */
  function isSubsequence(token, text) {
    if (!token.length) return true;
    var j = 0;
    for (var i = 0; i < text.length && j < token.length; i++) {
      if (text.charAt(i) === token.charAt(j)) j++;
    }
    return j === token.length;
  }

  /** Remove vogais (ajuda termos curtos tipo "trm" a casar com "trampoline"). */
  function consonantSkeleton(s) {
    return s.replace(/[aeiou]/g, '');
  }

  function levenshteinWithin(a, b, max) {
    var la = a.length;
    var lb = b.length;
    if (la === 0) return lb <= max ? lb : max + 1;
    if (lb === 0) return la <= max ? la : max + 1;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev = new Array(lb + 1);
    var cur = new Array(lb + 1);
    var j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= lb; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      var swap = prev;
      prev = cur;
      cur = swap;
    }
    return prev[lb];
  }

  function tokenMatchesHaystack(token, hay, words) {
    if (hay.indexOf(token) !== -1) return true;
    var tl = token.length;
    if (tl === 0) return true;
    if (tl === 1) return false;

    if (tl >= 3 && isSubsequence(token, hay)) return true;

    if (tl >= 3 && tl <= 5) {
      var skelHay = consonantSkeleton(hay);
      if (skelHay.length >= tl && isSubsequence(token, skelHay)) return true;
    }

    var maxEd = tl <= 4 ? 1 : tl <= 8 ? 2 : 3;
    var i;
    var w;
    var skelW;
    for (i = 0; i < words.length; i++) {
      w = words[i];
      if (w.indexOf(token) !== -1) return true;
      if (tl >= 3 && isSubsequence(token, w)) return true;
      if (tl >= 3 && tl <= 5) {
        skelW = consonantSkeleton(w);
        if (skelW.length >= tl && isSubsequence(token, skelW)) return true;
      }
      if (Math.abs(w.length - tl) <= maxEd + 2 && levenshteinWithin(token, w, maxEd) <= maxEd) return true;
    }

    if (tl === 2) {
      for (i = 0; i < words.length; i++) {
        w = words[i];
        if (w.length <= 5 && levenshteinWithin(token, w, 1) <= 1) return true;
      }
    }
    return false;
  }

  /** query: string já trim/lowercase; hay: texto completo lowercase */
  function haystackMatchesSearchQuery(query, hay) {
    if (!query || !query.length) return true;
    var tokens = query.split(/\s+/).filter(function (t) { return t.length > 0; });
    if (tokens.length === 0) return true;
    var words = hay.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 0; });
    for (var t = 0; t < tokens.length; t++) {
      if (!tokenMatchesHaystack(tokens[t], hay, words)) return false;
    }
    return true;
  }

  function categorySearchHints(cat) {
    if (cat === 'Kids Trampoline') return 'trampoline tramp rebounder jump mini fitness';
    if (cat === 'Cardio') return 'cardio bike cycling vest endurance';
    if (cat === 'Strength') return 'strength weights dumbbell kettlebell bench';
    if (cat === 'Flexibility') return 'flexibility yoga balance stretching';
    if (cat === 'Accessory') return 'accessory replacement protection tray';
    return '';
  }

  /* ==========================
     SMART CATEGORY MAPPER
     Maps products to menu-aligned categories using title + tags + type
     ========================== */
  var CATEGORIES = ['Strength', 'Cardio', 'Flexibility', 'Kids Trampoline', 'Accessory'];

  function getCategory(title, tags, type) {
    var t = (title || '').toLowerCase();
    var tg = (tags || '').toLowerCase();
    var tp = (type || '').toLowerCase();

    if (tg.indexOf('accessories') !== -1 || tp === 'gift card' ||
        t.indexOf('accessories') !== -1 || t.indexOf('replacement') !== -1 ||
        t.indexOf('protection plan') !== -1 || t.indexOf('tray') !== -1) {
      return 'Accessory';
    }

    if (t.indexOf('trampoline') !== -1 || t.indexOf('pulsar') !== -1 ||
        t.indexOf('drift') !== -1 || t.indexOf('hopper') !== -1 ||
        tg.indexOf('rebounder') !== -1) {
      return 'Kids Trampoline';
    }

    if (t.indexOf('balance ball') !== -1 || t.indexOf('half ball') !== -1 ||
        tp === 'yoga') {
      return 'Flexibility';
    }

    if (t.indexOf('exercise bike') !== -1 || t.indexOf('foldable bike') !== -1 ||
        tg.indexOf('foldable stationary bikes') !== -1 ||
        t.indexOf('weighted vest') !== -1 || t.indexOf('gravity') !== -1 ||
        tg.indexOf('vest') !== -1) {
      return 'Cardio';
    }

    if (t.indexOf('dumbbell') !== -1 || t.indexOf('bench') !== -1 ||
        t.indexOf('stand') !== -1 || t.indexOf('kettlebell') !== -1 ||
        t.indexOf('massage gun') !== -1 || t.indexOf('pulse flex') !== -1 ||
        tp === 'free weights' || tp === 'dumbbells' ||
        t.indexOf('kit') !== -1 || t.indexOf('power kit') !== -1 ||
        t.indexOf('activation kit') !== -1) {
      return 'Strength';
    }

    return 'Other';
  }

  /* ==========================
     JS FILTER ENGINE
     ========================== */
  function initJsFilters() {
    var container = qs('[data-js-filter-groups]');
    if (!container) return;

    var items = qsa('.collection-grid-simple__item[data-product-price]');
    if (items.length === 0) return;

    var categories = {};
    var priceMin = Infinity;
    var priceMax = 0;
    var hasInStock = false;
    var hasOutOfStock = false;

    items.forEach(function (item) {
      var title = item.getAttribute('data-product-title') || '';
      var tags = item.getAttribute('data-product-tags') || '';
      var type = item.getAttribute('data-product-type') || '';
      var price = parseInt(item.getAttribute('data-product-price') || '0', 10);
      var available = item.getAttribute('data-product-available') === 'true';

      var cat = getCategory(title, tags, type);
      item.setAttribute('data-product-category', cat);
      categories[cat] = (categories[cat] || 0) + 1;

      if (price < priceMin) priceMin = price;
      if (price > priceMax) priceMax = price;
      if (available) hasInStock = true;
      if (!available) hasOutOfStock = true;
    });

    var globalPriceMin = priceMin;
    var globalPriceMax = priceMax;

    var activeFilters = {
      categories: [],
      availability: null,
      priceMin: globalPriceMin,
      priceMax: globalPriceMax
    };

    /** Search text (combined with filters in applyFilters; updates every keystroke) */
    var searchQuery = '';

    function buildCheckboxGroup(title, id, values, orderedKeys, isOpen) {
      var keys = orderedKeys || Object.keys(values).sort();
      var html = '<details class="cf-filter-group"' + (isOpen ? ' open' : '') + '>';
      html += '<summary class="cf-filter-group__header">';
      html += '<span class="cf-filter-group__title">' + title + '</span>';
      html += '<svg class="cf-filter-group__chevron" width="12" height="12" viewBox="0 0 12 12"><polyline points="2 4 6 8 10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      html += '</summary><div class="cf-filter-group__body"><ul class="cf-filter-list" role="list">';

      keys.forEach(function (label) {
        if (!values[label]) return;
        var cbId = 'jsf-' + id + '-' + label.replace(/[^a-zA-Z0-9]/g, '_');
        html += '<li class="cf-filter-list__item">';
        html += '<label class="cf-filter-checkbox" for="' + cbId + '">';
        html += '<input type="checkbox" class="cf-filter-checkbox__input" id="' + cbId + '" data-filter-key="' + id + '" data-filter-value="' + label + '">';
        html += '<span class="cf-filter-checkbox__box"><svg class="cf-filter-checkbox__check" width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
        html += '<span class="cf-filter-checkbox__label">' + label + '</span>';
        html += '<span class="cf-filter-checkbox__count">(' + values[label] + ')</span>';
        html += '</label></li>';
      });

      html += '</ul></div></details>';
      return html;
    }

    function buildPriceGroup() {
      var minD = Math.floor(globalPriceMin / 100);
      var maxD = Math.ceil(globalPriceMax / 100);
      if (maxD <= minD) maxD = minD + 100;

      var html = '<details class="cf-filter-group"><summary class="cf-filter-group__header">';
      html += '<span class="cf-filter-group__title">Price</span>';
      html += '<svg class="cf-filter-group__chevron" width="12" height="12" viewBox="0 0 12 12"><polyline points="2 4 6 8 10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      html += '</summary><div class="cf-filter-group__body">';
      html += '<div class="cf-price-range" data-price-range data-min="' + minD + '" data-max="' + maxD + '">';
      html += '<div class="cf-price-range__track"><div class="cf-price-range__bar" data-price-bar></div>';
      html += '<input type="range" class="cf-price-range__input cf-price-range__input--min" min="' + minD + '" max="' + maxD + '" step="1" value="' + minD + '" data-price-range-min>';
      html += '<input type="range" class="cf-price-range__input cf-price-range__input--max" min="' + minD + '" max="' + maxD + '" step="1" value="' + maxD + '" data-price-range-max>';
      html += '</div><div class="cf-price-range__values">';
      html += '<div class="cf-price-range__field"><span class="cf-price-range__currency">$</span><input type="number" class="cf-price-range__number" min="' + minD + '" max="' + maxD + '" value="' + minD + '" data-price-input-min></div>';
      html += '<span class="cf-price-range__separator">—</span>';
      html += '<div class="cf-price-range__field"><span class="cf-price-range__currency">$</span><input type="number" class="cf-price-range__number" min="' + minD + '" max="' + maxD + '" value="' + maxD + '" data-price-input-max></div>';
      html += '</div></div></div></details>';
      return html;
    }

    /* Render */
    var groupsHtml = '';

    var orderedCats = CATEGORIES.filter(function (c) { return categories[c]; });
    if (categories['Other']) orderedCats.push('Other');
    if (orderedCats.length > 1) {
      var catObj = {};
      orderedCats.forEach(function (c) { catObj[c] = categories[c]; });
      groupsHtml += buildCheckboxGroup('Category', 'category', catObj, orderedCats, true);
    }

    if (hasInStock || hasOutOfStock) {
      var avail = {};
      if (hasInStock) avail['In stock'] = items.filter(function (i) { return i.getAttribute('data-product-available') === 'true'; }).length;
      if (hasOutOfStock) avail['Out of stock'] = items.filter(function (i) { return i.getAttribute('data-product-available') !== 'true'; }).length;
      groupsHtml += buildCheckboxGroup('Availability', 'availability', avail, null, false);
    }

    if (globalPriceMax > globalPriceMin) {
      groupsHtml += buildPriceGroup();
    }

    container.innerHTML = groupsHtml;
    initPriceRanges();

    /* Event: checkbox change */
    container.addEventListener('change', function (e) {
      var input = e.target;
      if (!input.matches('.cf-filter-checkbox__input')) return;
      var key = input.getAttribute('data-filter-key');
      var val = input.getAttribute('data-filter-value');

      if (key === 'category') {
        toggle(activeFilters.categories, val, input.checked);
      } else if (key === 'availability') {
        activeFilters.availability = input.checked ? val : null;
        container.querySelectorAll('[data-filter-key="availability"]').forEach(function (cb) {
          if (cb !== input) cb.checked = false;
        });
      }
      applyFilters();
    });

    /* Event: price range */
    var priceTimer;
    container.addEventListener('input', function (e) {
      if (e.target.matches('[data-price-range-min],[data-price-range-max],[data-price-input-min],[data-price-input-max]')) {
        clearTimeout(priceTimer);
        priceTimer = setTimeout(function () {
          var mi = qs('[data-price-input-min]', container) || qs('[data-price-range-min]', container);
          var ma = qs('[data-price-input-max]', container) || qs('[data-price-range-max]', container);
          activeFilters.priceMin = (parseFloat(mi.value) || 0) * 100;
          activeFilters.priceMax = (parseFloat(ma.value) || Infinity) * 100;
          applyFilters();
        }, 350);
      }
    });

    function toggle(arr, val, add) {
      var idx = arr.indexOf(val);
      if (add && idx === -1) arr.push(val);
      if (!add && idx !== -1) arr.splice(idx, 1);
    }

    function applyFilters() {
      var visible = 0;
      var noRes = qs('[data-no-search-results]');
      var countEl = qs('[data-product-count]');
      var pillsEl = qs('[data-js-active-filters]');
      var q = (searchQuery || '').trim().toLowerCase();
      var hasAny = activeFilters.categories.length > 0 ||
        activeFilters.availability !== null ||
        activeFilters.priceMin > globalPriceMin ||
        activeFilters.priceMax < globalPriceMax ||
        q.length > 0;

      items.forEach(function (item) {
        var show = true;
        var cat = item.getAttribute('data-product-category') || '';
        var price = parseInt(item.getAttribute('data-product-price') || '0', 10);
        var avail = item.getAttribute('data-product-available') === 'true';

        if (activeFilters.categories.length > 0 && activeFilters.categories.indexOf(cat) === -1) show = false;
        if (activeFilters.availability === 'In stock' && !avail) show = false;
        if (activeFilters.availability === 'Out of stock' && avail) show = false;
        if (price < activeFilters.priceMin || price > activeFilters.priceMax) show = false;

        if (show && q.length > 0) {
          var title = item.getAttribute('data-product-title') || '';
          var tags = item.getAttribute('data-product-tags') || '';
          var pType = item.getAttribute('data-product-type') || '';
          var vendor = item.getAttribute('data-product-vendor') || '';
          var handle = item.getAttribute('data-product-handle') || '';
          var hints = categorySearchHints(cat);
          var card = item.querySelector('.product-card-simple__title');
          var cardText = card ? card.textContent : '';
          var hay = [title, cardText, cat, tags, pType, vendor, handle, hints]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .replace(/[-_]+/g, ' ');
          if (!haystackMatchesSearchQuery(q, hay)) show = false;
        }

        item.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      if (noRes) noRes.style.display = visible === 0 ? '' : 'none';
      if (countEl) countEl.textContent = visible + (visible === 1 ? ' product' : ' products');

      qsa('[data-js-clear-all]').forEach(function (b) { b.style.display = hasAny ? '' : 'none'; });

      var badge = qs('[data-active-count]');
      var ac = activeFilters.categories.length + (activeFilters.availability ? 1 : 0) +
        (activeFilters.priceMin > globalPriceMin || activeFilters.priceMax < globalPriceMax ? 1 : 0) +
        (q.length > 0 ? 1 : 0);
      if (badge) { badge.textContent = ac; badge.style.display = ac > 0 ? '' : 'none'; }

      /* Pills */
      if (pillsEl) {
        var ph = '';
        activeFilters.categories.forEach(function (c) {
          ph += pill('category', c, c);
        });
        if (activeFilters.availability) {
          ph += pill('availability', activeFilters.availability, activeFilters.availability);
        }
        if (activeFilters.priceMin > globalPriceMin || activeFilters.priceMax < globalPriceMax) {
          ph += pill('price', 'price', '$' + Math.floor(activeFilters.priceMin / 100) + ' — $' + Math.ceil(activeFilters.priceMax / 100));
        }
        if (ph) {
          ph += '<button type="button" class="cf-active-pill cf-active-pill--clear" data-js-clear-all>Clear all</button>';
        }
        pillsEl.innerHTML = ph;
        pillsEl.style.display = ph ? '' : 'none';

        pillsEl.querySelectorAll('[data-remove-filter]').forEach(function (p) {
          p.addEventListener('click', function () {
            var k = p.getAttribute('data-remove-filter');
            var v = p.getAttribute('data-remove-value');
            if (k === 'category') toggle(activeFilters.categories, v, false);
            if (k === 'availability') activeFilters.availability = null;
            if (k === 'price') { activeFilters.priceMin = globalPriceMin; activeFilters.priceMax = globalPriceMax; resetPriceUI(); }
            syncCheckboxes();
            applyFilters();
          });
        });
        pillsEl.querySelectorAll('[data-js-clear-all]').forEach(function (b) { b.addEventListener('click', clearAll); });
      }
    }

    function pill(key, value, label) {
      return '<button type="button" class="cf-active-pill" data-remove-filter="' + key + '" data-remove-value="' + value + '">' +
        '<span class="cf-active-pill__label">' + label + '</span>' +
        '<svg class="cf-active-pill__x" width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</button>';
    }

    function syncCheckboxes() {
      qsa('.cf-filter-checkbox__input').forEach(function (cb) {
        var k = cb.getAttribute('data-filter-key');
        var v = cb.getAttribute('data-filter-value');
        if (k === 'category') cb.checked = activeFilters.categories.indexOf(v) !== -1;
        if (k === 'availability') cb.checked = activeFilters.availability === v;
      });
    }

    function resetPriceUI() {
      var minD = Math.floor(globalPriceMin / 100);
      var maxD = Math.ceil(globalPriceMax / 100);
      qsa('[data-price-range-min]').forEach(function (el) { el.value = minD; });
      qsa('[data-price-range-max]').forEach(function (el) { el.value = maxD; });
      qsa('[data-price-input-min]').forEach(function (el) { el.value = minD; });
      qsa('[data-price-input-max]').forEach(function (el) { el.value = maxD; });
      initPriceRanges();
    }

    function clearAll() {
      activeFilters.categories = [];
      activeFilters.availability = null;
      activeFilters.priceMin = globalPriceMin;
      activeFilters.priceMax = globalPriceMax;
      searchQuery = '';
      var si = qs('[data-collection-search]');
      if (si) si.value = '';
      var sc = qs('[data-search-clear]');
      if (sc) sc.classList.remove('is-visible');
      syncCheckboxes();
      resetPriceUI();
      applyFilters();
    }

    qsa('[data-js-clear-all]').forEach(function (b) { b.addEventListener('click', clearAll); });

    /* Clone into drawer */
    var drawerBody = qs('[data-filter-drawer-body]');
    if (drawerBody && drawerBody.children.length === 0) {
      var src = qs('[data-js-filters]');
      if (src) {
        var clone = src.cloneNode(true);
        clone.removeAttribute('data-js-filters');
        clone.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-d'; });
        clone.querySelectorAll('[for]').forEach(function (el) { el.setAttribute('for', el.getAttribute('for') + '-d'); });
        drawerBody.appendChild(clone);
        initPriceRangesIn(clone);

        clone.addEventListener('change', function (e) {
          var input = e.target;
          if (!input.matches('.cf-filter-checkbox__input')) return;
          var k = input.getAttribute('data-filter-key');
          var v = input.getAttribute('data-filter-value');
          if (k === 'category') toggle(activeFilters.categories, v, input.checked);
          if (k === 'availability') {
            activeFilters.availability = input.checked ? v : null;
            clone.querySelectorAll('[data-filter-key="availability"]').forEach(function (cb) { if (cb !== input) cb.checked = false; });
          }
          syncCheckboxes();
          applyFilters();
        });

        var dpt;
        clone.addEventListener('input', function (e) {
          if (e.target.matches('[data-price-range-min],[data-price-range-max],[data-price-input-min],[data-price-input-max]')) {
            clearTimeout(dpt);
            dpt = setTimeout(function () {
              var mi = qs('[data-price-input-min]', clone) || qs('[data-price-range-min]', clone);
              var ma = qs('[data-price-input-max]', clone) || qs('[data-price-range-max]', clone);
              activeFilters.priceMin = (parseFloat(mi.value) || 0) * 100;
              activeFilters.priceMax = (parseFloat(ma.value) || Infinity) * 100;
              applyFilters();
            }, 350);
          }
        });
      }
    }

    var drawerApply = qs('[data-filter-drawer-apply]');
    if (drawerApply) drawerApply.addEventListener('click', closeDrawer);

    /* Search: same frame as filters — every keystroke, clearing restores grid */
    var searchInput = qs('[data-collection-search]');
    var searchClearBtn = qs('[data-search-clear]');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value;
        applyFilters();
        if (searchClearBtn) searchClearBtn.classList.toggle('is-visible', searchQuery.trim().length > 0);
      });
      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', function () {
          searchInput.value = '';
          searchQuery = '';
          applyFilters();
          searchClearBtn.classList.remove('is-visible');
          searchInput.focus();
        });
      }
    }

    applyFilters();
  }

  /* ==========================
     PRICE RANGE UI
     ========================== */
  function initPriceRanges() {
    qsa('[data-price-range]').forEach(function (w) { priceWidget(w); });
  }
  function initPriceRangesIn(ctx) {
    qsa('[data-price-range]', ctx).forEach(function (w) { priceWidget(w); });
  }
  function priceWidget(wrap) {
    var iMin = qs('[data-price-range-min]', wrap);
    var iMax = qs('[data-price-range-max]', wrap);
    var nMin = qs('[data-price-input-min]', wrap);
    var nMax = qs('[data-price-input-max]', wrap);
    var bar = qs('[data-price-bar]', wrap);
    if (!iMin || !iMax || !bar) return;
    var lo = parseFloat(iMin.min) || 0;
    var hi = parseFloat(iMin.max) || 1000;

    function update() {
      var a = parseFloat(iMin.value), b = parseFloat(iMax.value);
      bar.style.left = ((a - lo) / (hi - lo) * 100) + '%';
      bar.style.width = (((b - a) / (hi - lo)) * 100) + '%';
    }
    iMin.addEventListener('input', function () {
      if (+iMin.value > +iMax.value) iMin.value = iMax.value;
      if (nMin) nMin.value = iMin.value;
      update();
    });
    iMax.addEventListener('input', function () {
      if (+iMax.value < +iMin.value) iMax.value = iMin.value;
      if (nMax) nMax.value = iMax.value;
      update();
    });
    if (nMin) nMin.addEventListener('change', function () {
      var v = Math.max(lo, Math.min(+nMin.value || lo, +iMax.value));
      nMin.value = v; iMin.value = v; update();
    });
    if (nMax) nMax.addEventListener('change', function () {
      var v = Math.min(hi, Math.max(+nMax.value || hi, +iMin.value));
      nMax.value = v; iMax.value = v; update();
    });
    update();
  }

  /* ==========================
     DRAWER
     ========================== */
  function openDrawer() {
    var d = qs('[data-filter-drawer]');
    var o = qs('[data-filter-drawer-overlay]');
    if (d) d.classList.add('is-open');
    if (o) o.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    var d = qs('[data-filter-drawer]');
    var o = qs('[data-filter-drawer-overlay]');
    if (d) d.classList.remove('is-open');
    if (o) o.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function initDrawer() {
    var toggle = qs('[data-filter-drawer-toggle]');
    var close = qs('[data-filter-drawer-close]');
    var overlay = qs('[data-filter-drawer-overlay]');
    if (toggle) toggle.addEventListener('click', openDrawer);
    if (close) close.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ==========================
     SORT
     ========================== */
  function initSort() {
    var sel = qs('[data-sort-select]');
    if (!sel) return;
    sel.addEventListener('change', function () {
      var u = new URL(window.location.href);
      u.searchParams.set('sort_by', sel.value);
      u.searchParams.delete('page');
      window.location.href = u.toString();
    });
  }

  /* ==========================
     SEARCH (native-filter collections only; JS filters use search inside initJsFilters)
     ========================== */
  function initSearchSimple() {
    var input = qs('[data-collection-search]');
    var clear = qs('[data-search-clear]');
    if (!input) return;

    function run() {
      var q = input.value.trim().toLowerCase();
      var gridItems = qsa('.collection-grid-simple__item');
      var noRes = qs('[data-no-search-results]');
      var vis = 0;

      if (clear) clear.classList.toggle('is-visible', q.length > 0);

      gridItems.forEach(function (item) {
        if (!q) {
          item.style.display = '';
          vis++;
          return;
        }
        var title = item.getAttribute('data-product-title') || '';
        var tags = item.getAttribute('data-product-tags') || '';
        var pType = item.getAttribute('data-product-type') || '';
        var vendor = item.getAttribute('data-product-vendor') || '';
        var handle = item.getAttribute('data-product-handle') || '';
        var cat = getCategory(title, tags, pType);
        var hints = categorySearchHints(cat);
        var card = item.querySelector('.product-card-simple__title');
        var cardText = card ? card.textContent : '';
        var s = [title, cardText, tags, pType, vendor, handle, cat, hints]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .replace(/[-_]+/g, ' ');
        var match = haystackMatchesSearchQuery(q, s);
        item.style.display = match ? '' : 'none';
        if (match) vis++;
      });

      if (noRes) noRes.style.display = q.length > 0 && vis === 0 ? '' : 'none';
      var countEl = qs('[data-product-count]');
      if (countEl) countEl.textContent = vis + (vis === 1 ? ' product' : ' products');
    }

    input.addEventListener('input', run);
    if (clear) clear.addEventListener('click', function () { input.value = ''; run(); input.focus(); });
  }

  /* ==========================
     NATIVE FILTERS (if available)
     ========================== */
  function initNativeFilters() {
    var form = qs('[data-collection-filters-form]');
    if (!form) return;
    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-filter-checkbox]')) form.submit();
    });
    var drawerBody = qs('[data-filter-drawer-body]');
    if (drawerBody && drawerBody.children.length === 0) {
      var clone = form.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-d'; });
      clone.querySelectorAll('[for]').forEach(function (el) { el.setAttribute('for', el.getAttribute('for') + '-d'); });
      drawerBody.appendChild(clone);
      initPriceRangesIn(clone);
      clone.addEventListener('change', function (e) { if (e.target.matches('[data-filter-checkbox]')) clone.submit(); });
    }
  }

  /* ==========================
     INIT
     ========================== */
  function init() {
    initDrawer();
    initSort();
    if (qs('[data-collection-filters-form]')) initNativeFilters();
    if (qs('[data-js-filter-groups]')) {
      initJsFilters();
    } else {
      initSearchSimple();
    }
    initPriceRanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
