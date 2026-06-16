(function () {
  function initCarousel(el) {
    var grid = el.querySelector('[data-sg-track]');
    var dotsWrap = el.querySelector('[data-sg-dots]');
    var items = el.querySelectorAll('[data-sg-item]');
    if (!grid || !dotsWrap || items.length < 2) return;

    var mq = window.matchMedia('(max-width: 767px)');
    var rafId = 0;
    var onScroll = null;

    function getActiveIndex() {
      var gRect = grid.getBoundingClientRect();
      var centerX = gRect.left + gRect.width / 2;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - centerX);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    }

    function syncDots(active) {
      var dots = dotsWrap.querySelectorAll('button');
      for (var i = 0; i < dots.length; i++) {
        if (i === active) dots[i].setAttribute('aria-current', 'true');
        else dots[i].removeAttribute('aria-current');
      }
    }

    function buildDots() {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < items.length; i++) {
        (function (idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sg-dot';
          btn.setAttribute('aria-label', 'Slide ' + (idx + 1));
          if (idx === 0) btn.setAttribute('aria-current', 'true');
          btn.addEventListener('click', function () {
            items[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          });
          dotsWrap.appendChild(btn);
        })(i);
      }
    }

    function teardown() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (onScroll) { grid.removeEventListener('scroll', onScroll); onScroll = null; }
    }

    function apply() {
      teardown();
      if (!mq.matches) {
        dotsWrap.parentElement.setAttribute('hidden', '');
        dotsWrap.innerHTML = '';
        return;
      }
      dotsWrap.parentElement.removeAttribute('hidden');
      buildDots();
      onScroll = function () {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () { rafId = 0; syncDots(getActiveIndex()); });
      };
      grid.addEventListener('scroll', onScroll, { passive: true });
    }

    mq.addEventListener('change', apply);
    apply();
  }

  function initAll() {
    document.querySelectorAll('[data-shop-gym]:not([data-init])').forEach(function (el) {
      el.setAttribute('data-init', '');
      initCarousel(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (window.Shopify && Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (e) {
      var el = e.target.querySelector('[data-shop-gym]');
      if (el) { el.removeAttribute('data-init'); initCarousel(el); }
    });
  }
})();
