(function () {
  function init(el) {
    var track = el.querySelector('[data-slider-track]');
    var slides = el.querySelectorAll('[data-slider-slide]');
    var dots = el.querySelectorAll('[data-slider-dot]');
    var count = slides.length;
    if (!track || count < 2) return;

    var current = 0;
    var timer = null;
    var speed = parseInt(el.dataset.autoplaySpeed) || 5000;
    var auto = el.dataset.autoplay === 'true';

    function go(n) {
      current = ((n % count) + count) % count;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('active', i === current);
      }
    }

    var prev = el.querySelector('[data-slider-prev]');
    var next = el.querySelector('[data-slider-next]');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); go(current - 1); restart(); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); go(current + 1); restart(); });

    for (var d = 0; d < dots.length; d++) {
      (function (idx) {
        dots[idx].addEventListener('click', function (e) { e.stopPropagation(); go(idx); restart(); });
      })(d);
    }

    var x0 = 0;
    el.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].screenX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      var dx = x0 - e.changedTouches[0].screenX;
      if (Math.abs(dx) > 50) { go(current + (dx > 0 ? 1 : -1)); restart(); }
    });

    function start() { if (auto && !timer) timer = setInterval(function () { go(current + 1); }, speed); }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    start();
  }

  function initAll() {
    var els = document.querySelectorAll('[data-hero-slider]:not([data-init])');
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute('data-init', '');
      init(els[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  if (window.Shopify && Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (e) {
      var s = e.target.querySelector('[data-hero-slider]');
      if (s) { s.removeAttribute('data-init'); init(s); }
    });
  }
})();
