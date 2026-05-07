/* Trusted by Tech Critics — preconnect YouTube on viewport, hydrate video/iframe on play.
   Initializes every [data-trusted-tech-critics] section on the page. */
(function () {
  'use strict';

  function preconnectYouTube(state) {
    if (state.done) return;
    state.done = true;
    ['https://www.youtube.com', 'https://i.ytimg.com', 'https://www.google.com'].forEach(function (href) {
      var l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = href;
      l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    });
  }

  function initSection(root) {
    if (!root || root.dataset.ttcInit === '1') return;
    root.dataset.ttcInit = '1';

    var ytState = { done: false };

    /* Preconnect to YouTube + ytimg only when the section becomes visible.
       Avoids paying TLS for visitors that never reach this section. */
    if ('IntersectionObserver' in window && root.querySelector('[data-ttc-youtube]')) {
      var pcio = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            preconnectYouTube(ytState);
            obs.disconnect();
          }
        });
      }, { rootMargin: '600px 0px' });
      pcio.observe(root);
    }

    root.querySelectorAll('[data-ttc-play]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var card = btn.closest('.trusted-tech-critics__card');
        if (!card) return;
        var preview = card.querySelector('[data-ttc-preview]');
        var playerWrap = card.querySelector('[data-ttc-player]');
        if (!preview || !playerWrap) return;

        preview.setAttribute('hidden', '');
        playerWrap.removeAttribute('hidden');

        var video = playerWrap.querySelector('video');
        if (video) {
          var p = video.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
          return;
        }

        var iframe = playerWrap.querySelector('[data-ttc-youtube]');
        if (iframe && !iframe.getAttribute('src')) {
          preconnectYouTube(ytState);
          iframe.setAttribute('src', iframe.getAttribute('data-embed') || '');
        }
      });
    });
  }

  function initAll() {
    document.querySelectorAll('[data-trusted-tech-critics]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target || typeof e.target.querySelector !== 'function') return;
    var r = e.target.querySelector('[data-trusted-tech-critics]');
    if (r) initSection(r);
  });
})();
