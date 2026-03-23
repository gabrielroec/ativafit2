/**
 * Collection Grid Simple — drawer de filtros + ordenação (submit)
 */
(function () {
  'use strict';

  function init(root) {
    var panel = root.querySelector('[data-cgs-facets-root]');
    if (!panel) return;

    var openBtn = root.querySelector('[data-cgs-facets-open]');
    var closeBtns = root.querySelectorAll('[data-cgs-facets-close]');
    var form = root.querySelector('.cgs-facet-form');
    var sortSelect = root.querySelector('[data-cgs-sort-select]');

    function openDrawer() {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cgs-facets-open');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      var firstClose = root.querySelector('[data-cgs-facets-close]');
      if (firstClose) firstClose.focus();
    }

    function closeDrawer() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('cgs-facets-open');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      if (openBtn) openBtn.focus();
    }

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (panel.classList.contains('is-open')) closeDrawer();
        else openDrawer();
      });
    }

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closeDrawer();
    });

    if (sortSelect && form) {
      sortSelect.addEventListener('change', function () {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
      });
    }

    if (form) {
      form.addEventListener('submit', function () {
        closeDrawer();
      });
    }
  }

  document.querySelectorAll('.collection-grid-simple--facets').forEach(init);
})();
