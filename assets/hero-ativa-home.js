/**
 * Hero Ativa Home — carousel (scroll-snap), autoplay, dots, a11y.
 * Theme editor safe; respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function reveal(root) {
    root.classList.add('hero-ativa-home--visible');
  }

  function initReveal(root) {
    if (prefersReducedMotion()) {
      reveal(root);
      return function () {};
    }
    if (!('IntersectionObserver' in window)) {
      reveal(root);
      return function () {};
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
    return function () {
      observer.disconnect();
    };
  }

  function initCarousel(root) {
    var scroller = root.querySelector('[data-hero-scroller]');
    if (!scroller) return function () {};

    var slides = root.querySelectorAll('[data-hero-slide]');
    var n = slides.length;
    if (n === 0) return function () {};

    if (n === 1) {
      var teardownSingle = initReveal(root);
      var liveOne = root.querySelector('[data-hero-live]');
      if (liveOne && slides[0]) {
        liveOne.textContent = slides[0].getAttribute('aria-label') || '';
      }
      return function () {
        teardownSingle();
      };
    }

    var prevBtn = root.querySelector('[data-hero-prev]');
    var nextBtn = root.querySelector('[data-hero-next]');
    var dotsRoot = root.querySelector('[data-hero-dots]');
    var live = root.querySelector('[data-hero-live]');
    var autoplay = root.getAttribute('data-hero-autoplay') === 'true' && n > 1;
    var intervalMs = parseInt(root.getAttribute('data-hero-autoplay-ms'), 10) || 6000;

    var timer = null;
    var teardownReveal = initReveal(root);
    var onScrollRaf = 0;
    var ro = null;

    function slideWidth() {
      return scroller.clientWidth || 1;
    }

    function clampIndex(i) {
      return ((i % n) + n) % n;
    }

    function goTo(index, smooth) {
      if (n < 1) return;
      var i = clampIndex(index);
      var behavior = smooth === false || prefersReducedMotion() ? 'auto' : 'smooth';
      scroller.scrollTo({ left: i * slideWidth(), behavior: behavior });
      syncDots(i);
      announceSlide(i);
    }

    function currentIndex() {
      var w = slideWidth();
      return clampIndex(Math.round(scroller.scrollLeft / w));
    }

    function syncDots(active) {
      if (!dotsRoot) return;
      var btns = dotsRoot.querySelectorAll('.hero-ativa-home__dot');
      btns.forEach(function (b, j) {
        if (j === active) {
          b.setAttribute('aria-current', 'true');
          b.setAttribute('tabindex', '0');
        } else {
          b.removeAttribute('aria-current');
          b.setAttribute('tabindex', '-1');
        }
      });
    }

    function announceSlide(i) {
      if (!live || !slides[i]) return;
      var label = slides[i].getAttribute('aria-label') || 'Slide ' + (i + 1) + ' of ' + n;
      live.textContent = label;
    }

    function buildDots() {
      if (!dotsRoot || n < 2) return;
      dotsRoot.innerHTML = '';
      for (var i = 0; i < n; i++) {
        (function (idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'hero-ativa-home__dot';
          btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
          btn.setAttribute('aria-controls', slides[idx].id || '');
          if (idx === 0) btn.setAttribute('aria-current', 'true');
          else btn.setAttribute('tabindex', '-1');
          btn.addEventListener('click', function () {
            goTo(idx);
            resetAutoplay();
          });
          dotsRoot.appendChild(btn);
        })(i);
      }
    }

    function clearAutoplay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function resetAutoplay() {
      clearAutoplay();
      if (!autoplay || prefersReducedMotion() || n < 2) return;
      timer = setInterval(function () {
        if (document.hidden) return;
        goTo(currentIndex() + 1);
      }, intervalMs);
    }

    function onScroll() {
      if (onScrollRaf) cancelAnimationFrame(onScrollRaf);
      onScrollRaf = requestAnimationFrame(function () {
        onScrollRaf = 0;
        syncDots(currentIndex());
      });
    }

    function onKeydown(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(currentIndex() - 1);
        resetAutoplay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(currentIndex() + 1);
        resetAutoplay();
      }
    }

    if (n < 2) {
      announceSlide(0);
      return function () {
        clearAutoplay();
        teardownReveal();
      };
    }

    buildDots();
    syncDots(0);
    announceSlide(0);

    scroller.addEventListener('scroll', onScroll, { passive: true });

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goTo(currentIndex() - 1);
        resetAutoplay();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goTo(currentIndex() + 1);
        resetAutoplay();
      });
    }

    scroller.addEventListener('keydown', onKeydown);

    function snapAfterResize() {
      var idx = currentIndex();
      scroller.scrollLeft = idx * slideWidth();
    }
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(snapAfterResize);
      ro.observe(scroller);
    } else {
      window.addEventListener('resize', snapAfterResize);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearAutoplay();
      else resetAutoplay();
    });

    resetAutoplay();

    return function destroy() {
      clearAutoplay();
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', snapAfterResize);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('keydown', onKeydown);
      teardownReveal();
    };
  }

  function init(root) {
    if (!root || root.dataset.heroAtivaHomeReady === '1') return;
    root.dataset.heroAtivaHomeReady = '1';
    var destroyCarousel = initCarousel(root);
    root._heroAtivaDestroy = destroyCarousel;
  }

  function resetForReinit(root) {
    if (!root) return;
    if (typeof root._heroAtivaDestroy === 'function') {
      root._heroAtivaDestroy();
      root._heroAtivaDestroy = null;
    }
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
