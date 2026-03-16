/**
 * Article Inline Cards
 *
 * Replaces "Add Card ..." triggers in article HTML with membership or product cards.
 * Handles triggers that contain HTML in the middle (e.g. <meta> from editor).
 *
 * Triggers: "Add Card Membership" | "Add Card <product-handle>"
 */
(function () {
  var PLACEHOLDER_PREFIX = "___ADD_CARD_";
  var PLACEHOLDER_SUFFIX = "___";
  var QUOTE_CHARS = '"\\u201C\\u201D\\u201E\\u00AB\\u00BB';

  function formatMoney(cents) {
    return "$" + (cents / 100).toFixed(2);
  }

  function buildMembershipCard() {
    return (
      '<div class="article-inline-card article-inline-card--membership">' +
        '<div class="article-inline-card__membership-inner">' +
          '<div class="article-inline-card__membership-text">' +
            '<h3 class="article-inline-card__membership-headline">Love These Workouts?</h3>' +
            '<p class="article-inline-card__membership-subhead">Become an AtivaPeople member and unlock 10% off &amp; pro workouts NOW!</p>' +
            '<a href="/pages/membership" class="article-inline-card__membership-cta">Join AtivaPeople Today</a>' +
          "</div>" +
          '<div class="article-inline-card__membership-benefits">' +
            '<div class="article-inline-card__benefit"><span class="article-inline-card__benefit-icon" aria-hidden="true">🏅</span><span class="article-inline-card__benefit-label">Extended Warranty</span></div>' +
            '<div class="article-inline-card__benefit"><span class="article-inline-card__benefit-icon" aria-hidden="true">🎫</span><span class="article-inline-card__benefit-label">Coupon</span></div>' +
            '<div class="article-inline-card__benefit"><span class="article-inline-card__benefit-icon" aria-hidden="true">📋</span><span class="article-inline-card__benefit-label">Workout Guidance</span></div>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function buildProductCard(product) {
    var v = product.variants[0];
    var img = v.featured_image ? v.featured_image.src : product.featured_image;
    var imgTag = img
      ? '<img src="' +
        img.replace(/\.([a-z]+)(\?|$)/, "_400x.$1$2") +
        '" alt="' + product.title.replace(/"/g, "&quot;") +
        '" class="article-inline-card__product-img" loading="lazy">'
      : "";

    var priceHTML =
      '<span class="article-inline-card__price-current">' + formatMoney(v.price) + "</span>";
    if (v.compare_at_price && v.compare_at_price > v.price) {
      priceHTML +=
        ' <span class="article-inline-card__price-compare">' +
        formatMoney(v.compare_at_price) + "</span>";
    }

    var descRaw = product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 80)
      : "";
    if (product.description && product.description.replace(/<[^>]*>/g, "").length > 80) {
      descRaw += "\u2026";
    }

    return (
      '<div class="article-inline-card article-inline-card--product">' +
        '<a href="/products/' + product.handle + '" class="article-inline-card__product-link">' +
          '<div class="article-inline-card__product-image">' + imgTag + "</div>" +
          '<div class="article-inline-card__product-info">' +
            '<h3 class="article-inline-card__product-title">' + product.title + "</h3>" +
            (descRaw ? '<p class="article-inline-card__product-desc">' + descRaw + "</p>" : "") +
            '<p class="article-inline-card__product-price">' + priceHTML + "</p>" +
            '<p class="article-inline-card__product-promo">Save extra 10% + get an extended warranty :)</p>' +
            '<span class="article-inline-card__product-cta">View product</span>' +
          "</div>" +
        "</a>" +
      "</div>"
    );
  }

  function findContainer() {
    return (
      document.getElementById("article-journal-content") ||
      document.querySelector(".article-journal__content") ||
      document.querySelector(".article-journal__main .rte")
    );
  }

  function stripTags(str) {
    return (str || "").replace(/<[^>]*>/g, "").trim();
  }

  function toHandle(keyword) {
    return keyword
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function fetchProductByHandle(handle) {
    if (!handle) return Promise.resolve(null);
    var url = "/products/" + handle + ".js";
    console.log("[AddCard] fetchProductByHandle:", url);
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    })
      .then(function (res) {
        console.log("[AddCard] fetch response:", url, "status:", res.status, "content-type:", res.headers.get("content-type"));
        if (!res.ok) throw new Error(res.status);
        var ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.indexOf("application/json") === -1) throw new Error("not json");
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.id || !data.variants) throw new Error("invalid product");
        console.log("[AddCard] product loaded:", data.title, "handle:", data.handle);
        return data;
      });
  }

  function getProduct(keyword) {
    var k = (keyword || "").trim();
    var handle = toHandle(k);
    console.log("[AddCard] getProduct keyword:", JSON.stringify(k), "-> handle:", JSON.stringify(handle));
    if (!handle) return Promise.resolve(null);
    return fetchProductByHandle(handle)
      .catch(function (err) {
        console.log("[AddCard] fetchProductByHandle failed:", err.message, "- trying suggest");
        return fetch("/search/suggest.json?q=" + encodeURIComponent(k) + "&resources[type]=product&resources[limit]=5", {
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            var products = data && data.resources && data.resources.results && data.resources.results.products;
            console.log("[AddCard] suggest results:", products ? products.length : 0, products && products[0] ? products[0].handle : "-");
            if (products && products.length > 0) {
              return fetchProductByHandle(products[0].handle);
            }
            return null;
          });
      })
      .catch(function (err) {
        console.log("[AddCard] suggest failed:", err.message);
        return null;
      });
  }

  function processContent() {
    var container = findContainer();
    if (!container) return;

    var html = container.innerHTML;
    var quoteClass = "[" + QUOTE_CHARS + "]";
    // Middle part can contain tags (e.g. <meta charset="utf-8">); only stop at the closing quote (not attribute quotes)
    // \x22 = straight quote: match non-quote OR quote that is part of attr value (quote followed by [^"]*">)
    var regex = new RegExp(
      quoteClass + "Add\\s*Card\\s+((?:[^\\x22]|\\x22(?=[^\\x22]*\\x22>))*)" + quoteClass,
      "gi"
    );

    var matches = [];
    var replacer = function (fullMatch, inner) {
      var keyword = stripTags(inner).trim();
      var idx = matches.length;
      matches.push({ keyword: keyword });
      console.log("[AddCard] match #" + idx + " fullMatch:", JSON.stringify(fullMatch.substring(0, 60)) + (fullMatch.length > 60 ? "..." : ""), "keyword:", JSON.stringify(keyword));
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    };

    var newHtml = html.replace(regex, replacer);
    console.log("[AddCard] total matches:", matches.length, "placeholders in HTML:", (newHtml.match(new RegExp(PLACEHOLDER_PREFIX + "\\d+" + PLACEHOLDER_SUFFIX, "g")) || []).length);
    if (matches.length === 0) return;

    container.innerHTML = newHtml;

    var placeholders = container.querySelectorAll ? [] : null;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.textContent.indexOf(PLACEHOLDER_PREFIX) !== -1) {
        textNodes.push(node);
      }
    }

    var promises = matches.map(function (m, idx) {
      if (/^membership$/i.test(m.keyword)) {
        console.log("[AddCard] slot", idx, "-> membership card");
        m.html = buildMembershipCard();
        return Promise.resolve(m);
      }
      return getProduct(m.keyword)
        .then(function (product) {
          m.html = product ? buildProductCard(product) : null;
          console.log("[AddCard] slot", idx, "-> product card:", product ? product.title : "null");
          return m;
        })
        .catch(function (err) {
          console.log("[AddCard] slot", idx, "-> error:", err);
          m.html = null;
          return m;
        });
    });

    Promise.all(promises).then(function (results) {
      console.log("[AddCard] results:", results.map(function (r, i) { return i + ":" + (r.html ? "html" : "null"); }).join(" "));
      var placeholderRegex = new RegExp(
        PLACEHOLDER_PREFIX + "(\\d+)" + PLACEHOLDER_SUFFIX,
        "g"
      );

      var walker2 = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      var toReplace = [];
      while (walker2.nextNode()) {
        if (walker2.currentNode.textContent.indexOf(PLACEHOLDER_PREFIX) !== -1) {
          toReplace.push(walker2.currentNode);
        }
      }

      toReplace.forEach(function (node) {
        var text = node.textContent;
        var parent = node.parentNode;
        if (!parent) return;

        var fragment = document.createDocumentFragment();
        var lastIndex = 0;
        var match;
        placeholderRegex.lastIndex = 0;

        while ((match = placeholderRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          var slot = parseInt(match[1], 10);
          console.log("[AddCard] replacing placeholder slot", slot, "hasHtml:", !!(results[slot] && results[slot].html));
          if (results[slot] && results[slot].html) {
            var wrap = document.createElement("div");
            wrap.innerHTML = results[slot].html;
            fragment.appendChild(wrap.firstElementChild);
          }
          lastIndex = placeholderRegex.lastIndex;
        }
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent.replaceChild(fragment, node);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processContent);
  } else {
    processContent();
  }
})();
