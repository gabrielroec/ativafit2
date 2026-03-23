/**
 * Collection Filters — Universal JS
 * Price range slider, mobile drawer, instant search, sort, auto-submit
 */
(function () {
  'use strict';

  /* ---- Price range slider ---- */
  function initPriceRanges() {
    document.querySelectorAll('[data-price-range]').forEach(function (wrap) {
      var inputMin = wrap.querySelector('[data-price-range-min]');
      var inputMax = wrap.querySelector('[data-price-range-max]');
      var numberMin = wrap.querySelector('[data-price-input-min]');
      var numberMax = wrap.querySelector('[data-price-input-max]');
      var bar = wrap.querySelector('[data-price-bar]');
      if (!inputMin || !inputMax || !bar) return;

      var rangeMin = parseFloat(inputMin.min) || 0;
      var rangeMax = parseFloat(inputMin.max) || 1000;

      function updateBar() {
        var minVal = parseFloat(inputMin.value);
        var maxVal = parseFloat(inputMax.value);
        var leftPct = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        var rightPct = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        bar.style.left = leftPct + '%';
        bar.style.width = (rightPct - leftPct) + '%';
      }

      function onMinChange() {
        var minVal = parseFloat(inputMin.value);
        var maxVal = parseFloat(inputMax.value);
        if (minVal > maxVal) inputMin.value = maxVal;
        if (numberMin) numberMin.value = inputMin.value;
        updateBar();
      }

      function onMaxChange() {
        var minVal = parseFloat(inputMin.value);
        var maxVal = parseFloat(inputMax.value);
        if (maxVal < minVal) inputMax.value = minVal;
        if (numberMax) numberMax.value = inputMax.value;
        updateBar();
      }

      inputMin.addEventListener('input', onMinChange);
      inputMax.addEventListener('input', onMaxChange);

      if (numberMin) {
        numberMin.addEventListener('change', function () {
          var v = parseFloat(numberMin.value) || rangeMin;
          v = Math.max(rangeMin, Math.min(v, parseFloat(inputMax.value)));
          numberMin.value = v;
          inputMin.value = v;
          updateBar();
        });
      }
      if (numberMax) {
        numberMax.addEventListener('change', function () {
          var v = parseFloat(numberMax.value) || rangeMax;
          v = Math.min(rangeMax, Math.max(v, parseFloat(inputMin.value)));
          numberMax.value = v;
          inputMax.value = v;
          updateBar();
        });
      }

      updateBar();
    });
  }

  /* ---- Mobile drawer ---- */
  function initDrawer() {
    var toggle = document.querySelector('[data-filter-drawer-toggle]');
    var overlay = document.querySelector('[data-filter-drawer-overlay]');
    var drawer = document.querySelector('[data-filter-drawer]');
    var closeBtn = document.querySelector('[data-filter-drawer-close]');
    if (!toggle || !drawer) return;

    function open() {
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      drawer.querySelector('input, button, [tabindex]')?.focus();
    }
    function close() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      toggle.focus();
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  }

  /* ---- Sort dropdown ---- */
  function initSort() {
    var sortSelect = document.querySelector('[data-sort-select]');
    if (!sortSelect) return;
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  }

  /* ---- Client-side instant search ---- */
  function initSearch() {
    var input = document.querySelector('[data-collection-search]');
    var clearBtn = document.querySelector('[data-search-clear]');
    if (!input) return;

    var debounceTimer;

    function filterCards() {
      var query = input.value.trim().toLowerCase();
      var cards = document.querySelectorAll('[data-product-card-simple]');
      var grid = document.querySelector('[data-collection-grid]');
      var noResults = document.querySelector('[data-no-search-results]');
      var visibleCount = 0;

      if (clearBtn) {
        clearBtn.classList.toggle('is-visible', query.length > 0);
      }

      cards.forEach(function (card) {
        var item = card.closest('.collection-grid-simple__item');
        if (!item) return;

        if (!query) {
          item.style.display = '';
          visibleCount++;
          return;
        }

        var title = (card.querySelector('.product-card-simple__title') || {}).textContent || '';
        var type = card.getAttribute('data-product-type') || '';
        var vendor = card.getAttribute('data-product-vendor') || '';
        var searchable = (title + ' ' + type + ' ' + vendor).toLowerCase();

        if (searchable.indexOf(query) !== -1) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      if (noResults) {
        noResults.style.display = (query && visibleCount === 0) ? '' : 'none';
      }
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(filterCards, 200);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        filterCards();
        input.focus();
      });
    }
  }

  /* ---- Form submit on checkbox change ---- */
  function initAutoSubmit() {
    var form = document.querySelector('[data-collection-filters-form]');
    if (!form) return;

    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-filter-checkbox]')) {
        form.submit();
      }
    });
  }

  /* ---- Mobile drawer: clone sidebar form into drawer ---- */
  function initDrawerClone() {
    var sidebar = document.querySelector('[data-collection-filters-form]');
    var drawerBody = document.querySelector('[data-filter-drawer-body]');
    if (!sidebar || !drawerBody) return;
    if (drawerBody.children.length > 0) return;

    var clone = sidebar.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('data-collection-filters-form-drawer', '');

    clone.querySelectorAll('[id]').forEach(function (el) {
      el.id = el.id + '-drawer';
    });
    clone.querySelectorAll('[for]').forEach(function (el) {
      el.setAttribute('for', el.getAttribute('for') + '-drawer');
    });

    drawerBody.appendChild(clone);

    initPriceRangesIn(clone);

    clone.addEventListener('change', function (e) {
      if (e.target.matches('[data-filter-checkbox]')) {
        clone.submit();
      }
    });
  }

  function initPriceRangesIn(container) {
    container.querySelectorAll('[data-price-range]').forEach(function (wrap) {
      var inputMin = wrap.querySelector('[data-price-range-min]');
      var inputMax = wrap.querySelector('[data-price-range-max]');
      var numberMin = wrap.querySelector('[data-price-input-min]');
      var numberMax = wrap.querySelector('[data-price-input-max]');
      var bar = wrap.querySelector('[data-price-bar]');
      if (!inputMin || !inputMax || !bar) return;

      var rangeMin = parseFloat(inputMin.min) || 0;
      var rangeMax = parseFloat(inputMin.max) || 1000;

      function updateBar() {
        var minVal = parseFloat(inputMin.value);
        var maxVal = parseFloat(inputMax.value);
        var leftPct = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        var rightPct = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        bar.style.left = leftPct + '%';
        bar.style.width = (rightPct - leftPct) + '%';
      }

      inputMin.addEventListener('input', function () {
        if (parseFloat(inputMin.value) > parseFloat(inputMax.value)) inputMin.value = inputMax.value;
        if (numberMin) numberMin.value = inputMin.value;
        updateBar();
      });
      inputMax.addEventListener('input', function () {
        if (parseFloat(inputMax.value) < parseFloat(inputMin.value)) inputMax.value = inputMin.value;
        if (numberMax) numberMax.value = inputMax.value;
        updateBar();
      });

      updateBar();
    });
  }

  /* ---- Init ---- */
  function init() {
    initPriceRanges();
    initDrawer();
    initSort();
    initSearch();
    initAutoSubmit();
    initDrawerClone();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
