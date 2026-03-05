(function () {
  "use strict";

  function cleanEmptyH1Tags() {
    document.querySelectorAll('.klaviyo-form h1, [data-testid*="klaviyo"] h1, [class*="klaviyo"] h1').forEach(function (h1) {
      var t = h1.textContent.trim();
      if (!t || t === "\u00A0" || t.indexOf("<!--") !== -1) h1.remove();
    });
  }

  function init() {
    cleanEmptyH1Tags();
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && n.querySelector && (n.querySelector('.klaviyo-form') || n.classList.contains('klaviyo-form') || n.querySelector('[class*="klaviyo"]'))) {
            setTimeout(cleanEmptyH1Tags, 150);
            return;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
