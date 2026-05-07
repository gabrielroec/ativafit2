/* Home Gyms Results Marquee — strip width sync, GIF lazy play, deferred init via IntersectionObserver.
   Initializes every [data-home-gyms-marquee] section on the page. */
(function () {
  'use strict';

  function motionReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initSection(root) {
    if (!root || root.dataset.hgmInit === '1') return;
    root.dataset.hgmInit = '1';

    var track = root.querySelector('[data-home-gyms-track]');
    var stripPrimary = root.querySelector('[data-home-gyms-strip]');
    if (!track || !stripPrimary) return;

    var marginPx = parseInt(root.dataset.hgmDeferMargin || '320', 10);
    if (isNaN(marginPx) || marginPx < 0) marginPx = 320;

    function syncShift() {
      if (motionReduced()) {
        track.classList.remove('home-gyms-marquee__track--ready');
        root.style.removeProperty('--hg-shift');
        return;
      }
      var w = stripPrimary.getBoundingClientRect().width;
      if (!w) return;
      root.style.setProperty('--hg-shift', (-w).toFixed(2) + 'px');
      track.classList.add('home-gyms-marquee__track--ready');
    }

    function bindImageLoads() {
      root.querySelectorAll('[data-home-gyms-strip] img').forEach(function (img) {
        if (!img.complete) img.addEventListener('load', syncShift, { once: true });
      });
    }

    function initGifPlay() {
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('.home-gyms-marquee__gif-play');
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        var wrap = btn.closest('[data-home-gyms-gif]');
        if (!wrap || wrap.getAttribute('data-hg-loading') === 'true' || wrap.getAttribute('data-hg-played') === 'true') return;
        var src = wrap.dataset.gifSrc || wrap.getAttribute('data-gif-src');
        if (!src) return;
        wrap.setAttribute('data-hg-loading', 'true');
        btn.disabled = true;
        var poster = wrap.querySelector('.home-gyms-marquee__gif-poster');
        var anim = document.createElement('img');
        anim.className = 'home-gyms-marquee__gif-anim home-gyms-marquee__card-img';
        anim.alt = wrap.getAttribute('data-gif-alt') || '';
        anim.decoding = 'async';
        anim.loading = 'eager';
        anim.setAttribute('fetchpriority', 'high');
        function finishPlay() {
          wrap.setAttribute('data-hg-played', 'true');
          wrap.removeAttribute('data-hg-loading');
          wrap.classList.add('home-gyms-marquee__gif--playing');
          if (poster) poster.style.display = 'none';
          if (btn.parentNode) btn.remove();
          syncShift();
        }
        function onFail() {
          wrap.removeAttribute('data-hg-loading');
          btn.disabled = false;
        }
        anim.onload = function () {
          if (typeof anim.decode === 'function') {
            anim.decode().then(finishPlay).catch(finishPlay);
          } else {
            finishPlay();
          }
        };
        anim.onerror = onFail;
        wrap.insertBefore(anim, btn);
        anim.src = src;
        syncShift();
      });
    }

    var marqueeBooted = false;
    var resizeDebounce;
    function initMarquee() {
      if (marqueeBooted) return;
      marqueeBooted = true;

      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(syncShift).observe(stripPrimary);
      }

      syncShift();
      requestAnimationFrame(syncShift);
      requestAnimationFrame(function () {
        requestAnimationFrame(syncShift);
      });

      window.addEventListener('load', syncShift);
      window.addEventListener('resize', function () {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(syncShift, 100);
      });

      bindImageLoads();
      initGifPlay();
    }

    var rootMarginStr = marginPx > 0 ? marginPx + 'px' : '0px';
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              initMarquee();
              obs.disconnect();
            }
          });
        },
        { root: null, rootMargin: rootMarginStr, threshold: 0 }
      );
      io.observe(root);
    } else {
      initMarquee();
    }
  }

  function initAll() {
    document.querySelectorAll('[data-home-gyms-marquee]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || typeof e.target.querySelector !== 'function') return;
    var r = e.target.querySelector('[data-home-gyms-marquee]');
    if (r) initSection(r);
  });
})();
