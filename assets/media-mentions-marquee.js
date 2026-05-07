/* Media Mentions Marquee — strip width sync, deferred init via IntersectionObserver.
   Initializes every [data-media-mentions-marquee] section on the page. */
(function () {
  'use strict';

  function motionReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initSection(root) {
    if (!root || root.dataset.mmInit === '1') return;
    root.dataset.mmInit = '1';

    var track = root.querySelector('[data-media-mentions-track]');
    var strip = root.querySelector('[data-media-mentions-strip]');
    if (!track || !strip) return;
    var initialized = false;
    var resizeDebounce;

    function syncShift() {
      if (motionReduced()) {
        track.classList.remove('media-mentions-marquee__track--ready');
        root.style.removeProperty('--mm-shift');
        return;
      }
      var w = strip.getBoundingClientRect().width;
      if (!w) return;
      root.style.setProperty('--mm-shift', (-w).toFixed(2) + 'px');
      track.classList.add('media-mentions-marquee__track--ready');
    }

    function init() {
      if (initialized) return;
      initialized = true;

      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(syncShift).observe(strip);
      }
      syncShift();
      requestAnimationFrame(syncShift);
      requestAnimationFrame(function () { requestAnimationFrame(syncShift); });

      window.addEventListener('load', syncShift);
      window.addEventListener('resize', function () {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(syncShift, 100);
      });

      strip.querySelectorAll('img').forEach(function (img) {
        if (!img.complete) img.addEventListener('load', syncShift, { once: true });
      });
    }

    /* Defer init until the section is near the viewport — saves layout work
       on the home where the marquee is mid-page. */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { init(); obs.disconnect(); }
        });
      }, { root: null, rootMargin: '320px 0px', threshold: 0 });
      io.observe(root);
    } else {
      init();
    }
  }

  function initAll() {
    document.querySelectorAll('[data-media-mentions-marquee]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || typeof e.target.querySelector !== 'function') return;
    var r = e.target.querySelector('[data-media-mentions-marquee]');
    if (r) initSection(r);
  });
})();
