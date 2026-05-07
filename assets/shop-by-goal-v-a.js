/* Shop By Goal — tab list, deferred panel hydration, drag-to-scroll.
   Initializes every [data-shop-by-goal] section on the page. */
(function () {
  'use strict';

  function initSection(root) {
    if (!root || root.dataset.hgShopByGoalInit === '1') return;
    root.dataset.hgShopByGoalInit = '1';

    var tablist = root.querySelector('[role="tablist"]');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    function panelFor(tab) {
      var id = tab.getAttribute('aria-controls');
      return id ? root.querySelector('#' + CSS.escape(id)) : null;
    }

    function hydrate(panel) {
      if (!panel || !panel.hasAttribute('data-shop-goal-deferred')) return;
      var tpl = panel.querySelector('template[data-shop-goal-template]');
      if (!tpl) return;
      var frag = tpl.content.cloneNode(true);
      tpl.replaceWith(frag);
      panel.removeAttribute('data-shop-goal-deferred');
    }

    function activate(tab, setFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', selected ? 'true' : 'false');
        t.setAttribute('tabindex', selected ? '0' : '-1');
        var p = panelFor(t);
        if (p) {
          if (selected) {
            hydrate(p);
            p.removeAttribute('hidden');
          } else {
            p.setAttribute('hidden', '');
          }
        }
      });
      if (setFocus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { activate(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var idx = tabs.indexOf(tab);
        var next = null;
        switch (e.key) {
          case 'ArrowRight': next = tabs[(idx + 1) % tabs.length]; break;
          case 'ArrowLeft':  next = tabs[(idx - 1 + tabs.length) % tabs.length]; break;
          case 'Home':       next = tabs[0]; break;
          case 'End':        next = tabs[tabs.length - 1]; break;
        }
        if (next) { e.preventDefault(); activate(next, true); }
      });
    });

    /* ===== Drag to scroll (mouse support) ===== */
    var DRAG_THRESHOLD = 6;
    var isPointerDown = false;
    var isDragging = false;
    var startX = 0;
    var startScrollLeft = 0;
    var activePointerId = null;
    var suppressNextClick = false;

    function isOverflowing() {
      return tablist.scrollWidth - tablist.clientWidth > 1;
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!isOverflowing()) return;
      isPointerDown = true;
      isDragging = false;
      startX = e.clientX;
      startScrollLeft = tablist.scrollLeft;
      activePointerId = e.pointerId;
    }

    function onPointerMove(e) {
      if (!isPointerDown || e.pointerId !== activePointerId) return;
      var dx = e.clientX - startX;
      if (!isDragging && Math.abs(dx) > DRAG_THRESHOLD) {
        isDragging = true;
        tablist.classList.add('is-dragging');
        try { tablist.setPointerCapture(activePointerId); } catch (err) {}
      }
      if (isDragging) {
        e.preventDefault();
        tablist.scrollLeft = startScrollLeft - dx;
      }
    }

    function onPointerEnd(e) {
      if (!isPointerDown) return;
      if (e.pointerId !== activePointerId && e.type !== 'pointercancel') return;
      if (isDragging) {
        suppressNextClick = true;
        setTimeout(function () { suppressNextClick = false; }, 0);
      }
      try { tablist.releasePointerCapture(activePointerId); } catch (err) {}
      tablist.classList.remove('is-dragging');
      isPointerDown = false;
      isDragging = false;
      activePointerId = null;
    }

    tablist.addEventListener('pointerdown', onPointerDown);
    tablist.addEventListener('pointermove', onPointerMove);
    tablist.addEventListener('pointerup', onPointerEnd);
    tablist.addEventListener('pointercancel', onPointerEnd);
    tablist.addEventListener('pointerleave', onPointerEnd);

    tablist.addEventListener('click', function (e) {
      if (suppressNextClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      }
    }, true);

    tablist.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function initAll() {
    document.querySelectorAll('[data-shop-by-goal]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  /* Theme editor support */
  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target.querySelector('[data-shop-by-goal]');
    if (root) initSection(root);
  });
})();
