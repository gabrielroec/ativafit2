/**
 * Trust bar — ativa animação escalonada ao entrar na viewport.
 * Respeita prefers-reduced-motion; compatível com editor de temas (shopify:section:load).
 */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function reveal(root) {
    root.classList.add('trust-bar-ativa--visible');
  }

  function init(root) {
    if (!root || root.dataset.trustBarAtivaReady === '1') return;
    root.dataset.trustBarAtivaReady = '1';

    if (prefersReducedMotion()) {
      reveal(root);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      reveal(root);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal(root);
            obs.disconnect();
          }
        });
      },
      { root: null, rootMargin: '24px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(root);
  }

  function resetForReinit(root) {
    if (!root) return;
    delete root.dataset.trustBarAtivaReady;
    root.classList.remove('trust-bar-ativa--visible');
  }

  document.querySelectorAll('[data-trust-bar-ativa]').forEach(init);

  document.addEventListener('shopify:section:load', function (event) {
    var target = event.target;
    if (!target || typeof target.querySelector !== 'function') return;
    var root = target.querySelector('[data-trust-bar-ativa]');
    if (root) {
      resetForReinit(root);
      init(root);
    }
  });
})();
