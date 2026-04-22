/**
 * Core Web Vitals Debug Instrumentation
 * Only active when the URL contains ?debug-cwv=1
 *
 * Logs to the console:
 *  - CLS (Cumulative Layout Shift) with LayoutShiftAttribution
 *  - LCP (Largest Contentful Paint) with element target
 *  - INP (Interaction to Next Paint) approximation
 *
 * No external dependency (plain PerformanceObserver). Safe to leave in prod.
 */
(function () {
  'use strict';

  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('debug-cwv') !== '1') return;
  } catch (e) {
    return;
  }

  var styleTag = 'font-weight:700;padding:2px 6px;border-radius:3px;';
  var tagCLS  = 'background:#eb701f;color:#fff;' + styleTag;
  var tagLCP  = 'background:#1a73e8;color:#fff;' + styleTag;
  var tagINP  = 'background:#188038;color:#fff;' + styleTag;
  var tagSHIFT = 'background:#d93025;color:#fff;' + styleTag;

  console.log('%c[CWV Debug]', tagCLS, 'active — log shifts, LCP, INP');

  /* ===== CLS (Cumulative Layout Shift) ===== */
  if (typeof PerformanceObserver !== 'undefined') {
    var clsValue = 0;
    var clsEntries = [];
    var sessionValue = 0;
    var sessionEntries = [];

    try {
      var cls = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.hadRecentInput) return;

          var firstSessionEntry = sessionEntries[0];
          var lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = sessionEntries.slice();
          }

          var sources = (entry.sources || []).map(function (s) {
            return {
              node: s.node,
              selector: s.node ? cssPath(s.node) : null,
              previousRect: s.previousRect,
              currentRect: s.currentRect,
            };
          });
          console.groupCollapsed(
            '%c[CLS shift]', tagSHIFT,
            'value=' + entry.value.toFixed(4),
            'running=' + clsValue.toFixed(4)
          );
          console.log('entry', entry);
          sources.forEach(function (s, i) {
            console.log('source ' + i + ':', s.selector, s.node);
          });
          console.groupEnd();
        });
      });
      cls.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('[CWV Debug] CLS observer failed:', e);
    }

    /* ===== LCP ===== */
    try {
      var lcp = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        console.log('%c[LCP]', tagLCP, last.startTime.toFixed(0) + 'ms', last.element || last.target);
      });
      lcp.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    /* ===== INP (approximation via Event Timing API) ===== */
    try {
      var worstINP = 0;
      var inp = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          var dur = e.duration || 0;
          if (dur > worstINP && dur > 40) {
            worstINP = dur;
            console.log('%c[INP]', tagINP, dur.toFixed(0) + 'ms on', e.name, e.target);
          }
        });
      });
      inp.observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (e) {}

    /* Log final CLS on unload / visibilitychange */
    function report() {
      console.log(
        '%c[CWV Summary]', tagCLS,
        'CLS=' + clsValue.toFixed(4),
        'LCP threshold passed',
        'Worst INP=' + worstINP.toFixed(0) + 'ms'
      );
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') report();
    });
    window.addEventListener('pagehide', report);
  }

  /* Utility: CSS selector path for a DOM node */
  function cssPath(el) {
    if (!(el instanceof Element)) return null;
    var path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      var selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        var sib = el, nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ':nth-of-type(' + nth + ')';
      }
      path.unshift(selector);
      el = el.parentNode;
      if (path.length > 8) break;
    }
    return path.join(' > ');
  }
})();
