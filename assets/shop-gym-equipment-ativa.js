/**
 * Shop gym equipment — animação de entrada estilo scroll-trigger (GSAP-like):
 * só dispara quando a section está bem dentro da viewport (área visível “segura”).
 */
(function () {
  'use strict';

  /** Parte mínima da section visível (ratio) ou altura em px — o que ocorrer primeiro */
  var MIN_INTERSECTION_RATIO = 0.26;
  var MIN_VISIBLE_HEIGHT_PX = 340;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function reveal(root) {
    root.classList.add('shop-gym-ativa--visible');
  }

  function isWellInViewport(entry) {
    if (!entry.isIntersecting) return false;
    var ratio = entry.intersectionRatio;
    var visibleH = entry.intersectionRect.height;
    var totalH = entry.boundingClientRect.height;
    var minByRatio = totalH * MIN_INTERSECTION_RATIO;
    if (visibleH >= Math.min(MIN_VISIBLE_HEIGHT_PX, Math.max(minByRatio, 200))) return true;
    if (ratio >= MIN_INTERSECTION_RATIO) return true;
    return false;
  }

  function init(root) {
    if (!root || root.dataset.shopGymAtivaReady === '1') return;
    root.dataset.shopGymAtivaReady = '1';

    if (prefersReducedMotion()) {
      reveal(root);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      reveal(root);
      return;
    }

    var thresholds = [
      0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1
    ];

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!isWellInViewport(entry)) return;
          reveal(root);
          obs.disconnect();
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -22% 0px',
        threshold: thresholds
      }
    );

    observer.observe(root);
  }

  function resetForReinit(root) {
    if (!root) return;
    delete root.dataset.shopGymAtivaReady;
    root.classList.remove('shop-gym-ativa--visible');
  }

  document.querySelectorAll('[data-shop-gym-ativa]').forEach(init);

  document.addEventListener('shopify:section:load', function (event) {
    var target = event.target;
    if (!target || typeof target.querySelector !== 'function') return;
    var root = target.querySelector('[data-shop-gym-ativa]');
    if (root) {
      resetForReinit(root);
      init(root);
    }
  });
})();
