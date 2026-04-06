/**
 * Shop gym equipment — scroll-trigger style entrance (GSAP-like):
 * fires only when the section is well inside the viewport (“safe” visible area).
 * Mobile + carousel: scroll-snap, dot indicators, and sync (≤767px).
 */
(function () {
  'use strict';

  /** Minimum visible fraction of the section (ratio) or height in px — whichever applies first */
  var MIN_INTERSECTION_RATIO = 0.26;
  var MIN_VISIBLE_HEIGHT_PX = 340;
  var MQ_MOBILE = '(max-width: 767px)';

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

  /**
   * @returns {function} teardown
   */
  function initMobileCarousel(root) {
    if (root.dataset.mobileLayout !== 'carousel') {
      return function () {};
    }

    var grid = root.querySelector('.shop-gym-ativa__grid--mobile-carousel');
    var ui = root.querySelector('[data-shop-gym-carousel-ui]');
    var dots = root.querySelector('[data-shop-gym-dots]');
    if (!grid || !ui || !dots) {
      return function () {};
    }

    var mq = window.matchMedia(MQ_MOBILE);
    var scrollHandler = null;
    var rafId = 0;

    function syncDotsActive(index) {
      var btns = dots.querySelectorAll('.shop-gym-ativa__dot');
      btns.forEach(function (b, i) {
        if (i === index) {
          b.setAttribute('aria-current', 'true');
        } else {
          b.removeAttribute('aria-current');
        }
      });
    }

    function getActiveIndex() {
      var items = grid.querySelectorAll('.shop-gym-ativa__item');
      if (!items.length) return 0;
      var gRect = grid.getBoundingClientRect();
      var centerX = gRect.left + gRect.width / 2;
      var best = 0;
      var bestDist = Infinity;
      items.forEach(function (li, i) {
        var r = li.getBoundingClientRect();
        var c = r.left + r.width / 2;
        var d = Math.abs(c - centerX);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    }

    function onScroll() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        syncDotsActive(getActiveIndex());
      });
    }

    function buildDots() {
      dots.innerHTML = '';
      var items = grid.querySelectorAll('.shop-gym-ativa__item');
      var n = items.length;
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'shop-gym-ativa__dot';
          btn.setAttribute('aria-label', 'Slide ' + (idx + 1));
          if (idx === 0) btn.setAttribute('aria-current', 'true');
          btn.addEventListener('click', function () {
            items[idx].scrollIntoView({
              behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              inline: 'center',
              block: 'nearest'
            });
          });
          dots.appendChild(btn);
        })(i);
      }
    }

    function teardownScroll() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (scrollHandler) {
        grid.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
      }
    }

    function applyForMq() {
      teardownScroll();
      if (!mq.matches) {
        ui.setAttribute('hidden', '');
        dots.innerHTML = '';
        return;
      }
      ui.removeAttribute('hidden');
      buildDots();
      scrollHandler = onScroll;
      grid.addEventListener('scroll', scrollHandler, { passive: true });
      onScroll();
    }

    function onMqChange() {
      applyForMq();
    }

    mq.addEventListener('change', onMqChange);
    applyForMq();

    return function destroyCarousel() {
      mq.removeEventListener('change', onMqChange);
      teardownScroll();
      ui.setAttribute('hidden', '');
      dots.innerHTML = '';
    };
  }

  function init(root) {
    if (!root || root.dataset.shopGymAtivaReady === '1') return;
    root.dataset.shopGymAtivaReady = '1';

    var destroyCarousel = initMobileCarousel(root);
    root._shopGymCarouselDestroy = destroyCarousel;

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
    if (root._shopGymCarouselDestroy) {
      root._shopGymCarouselDestroy();
      root._shopGymCarouselDestroy = null;
    }
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
