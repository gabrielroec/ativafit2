/**
 * Hero Ativa Home — entrada escalonada ao entrar na viewport.
 * Compatível com editor de temas; respeita prefers-reduced-motion.
 */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function reveal(root) {
    root.classList.add('hero-ativa-home--visible');
  }

  function init(root) {
    if (!root || root.dataset.heroAtivaHomeReady === '1') return;
    root.dataset.heroAtivaHomeReady = '1';

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
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );

    observer.observe(root);
  }

  function resetForReinit(root) {
    if (!root) return;
    delete root.dataset.heroAtivaHomeReady;
    root.classList.remove('hero-ativa-home--visible');
  }

  document.querySelectorAll('[data-hero-ativa-home]').forEach(init);

  document.addEventListener('shopify:section:load', function (event) {
    var target = event.target;
    if (!target || typeof target.querySelector !== 'function') return;
    var root = target.querySelector('[data-hero-ativa-home]');
    if (root) {
      resetForReinit(root);
      init(root);
    }
  });
})();
