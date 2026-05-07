/* Why Dumbbells Stand Out — mobile carousel dots + optional video poster->play.
   Initializes every [data-why-dumbbells] section on the page. */
(function () {
  'use strict';

  var MQ = '(max-width: 767px)';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initCarouselDots(root) {
    var grid = root.querySelector('.why-dumbbells-stand-out__grid');
    var ui = root.querySelector('[data-wds-carousel-ui]');
    var dots = root.querySelector('[data-wds-dots]');
    if (!grid || !ui || !dots) return function () {};

    var mq = window.matchMedia(MQ);
    var scrollHandler = null;
    var rafId = 0;

    function cards() {
      return grid.querySelectorAll(':scope > .why-dumbbells-stand-out__card');
    }

    function syncDotsActive(index) {
      dots.querySelectorAll('.why-dumbbells-stand-out__dot').forEach(function (b, i) {
        if (i === index) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    function getActiveIndex() {
      var items = cards();
      if (!items.length) return 0;
      var gRect = grid.getBoundingClientRect();
      var centerX = gRect.left + gRect.width / 2;
      var best = 0;
      var bestDist = Infinity;
      items.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
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
      var items = cards();
      var n = items.length;
      if (n < 2) return;
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'why-dumbbells-stand-out__dot';
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

    function teardown() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (scrollHandler) {
        grid.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
      }
    }

    function apply() {
      teardown();
      var items = cards();
      if (!mq.matches || items.length < 2) {
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

    mq.addEventListener('change', apply);
    apply();

    return function destroy() {
      mq.removeEventListener('change', apply);
      teardown();
      ui.setAttribute('hidden', '');
      dots.innerHTML = '';
    };
  }

  function initVideoPlay(root) {
    var shell = root.querySelector('.why-dumbbells-stand-out__video-shell');
    if (!shell) return;
    var poster = shell.querySelector('[data-wds-video-poster]');
    var btn = shell.querySelector('[data-wds-video-play]');
    var video = shell.querySelector('[data-wds-video-el]');
    if (!poster || !btn || !video) return;
    btn.addEventListener('click', function () {
      poster.setAttribute('hidden', '');
      video.removeAttribute('hidden');
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });
  }

  function initSection(root) {
    if (!root || root.dataset.wdsInit === '1') return;
    root.dataset.wdsInit = '1';
    initCarouselDots(root);
    initVideoPlay(root);
  }

  function initAll() {
    document.querySelectorAll('[data-why-dumbbells]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || typeof e.target.querySelector !== 'function') return;
    var r = e.target.querySelector('[data-why-dumbbells]');
    if (r) initSection(r);
  });
})();
