/**
 * Article Inline Cards
 *
 * Única ação: no texto do post, escrever "Product Card <handle>" ou "Add Card Membership".
 * O script busca o produto em /products/<handle>.js e monta o card. Nada mais para configurar.
 *
 * Triggers:
 *   "Add Card Membership"   -> membership card
 *   Product Card <handle>  -> product card (fetch /products/<handle>.js)
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
            '<p class="article-inline-card__membership-subhead">Become an AtivaPeople member and unlock extra discount NOW!</p>' +
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

    var priceHTML = '<span class="article-inline-card__price-current">' + formatMoney(v.price) + "</span>";
    if (v.compare_at_price && v.compare_at_price > v.price) {
      priceHTML =
        '<span class="article-inline-card__price-compare">' +
        formatMoney(v.compare_at_price) + "</span>" +
        ' <span class="article-inline-card__price-current">' + formatMoney(v.price) + "</span>";
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
            '<p class="article-inline-card__product-title">' + product.title + "</p>" +
            (descRaw ? '<p class="article-inline-card__product-desc">' + descRaw + "</p>" : "") +
            '<p class="article-inline-card__product-price">' + priceHTML + "</p>" +
            // article-inline-card__product-promo (desativado): Save extra 10% + extended warranty
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
    var url = "/products/" + encodeURIComponent(handle) + ".js";
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (text) {
        var data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("invalid json");
        }
        if (!data || !data.id || !data.variants || !data.variants.length) throw new Error("invalid product");
        return data;
      });
  }

  function getProduct(keyword) {
    var k = (keyword || "").trim();
    var handle = toHandle(k);
    if (!handle) return Promise.resolve(null);
    return fetchProductByHandle(handle)
      .catch(function () {
        return fetch("/search/suggest.json?q=" + encodeURIComponent(handle) + "&resources[type]=product&resources[limit]=5", {
          headers: { Accept: "application/json" },
          credentials: "same-origin"
        })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            var products = data && data.resources && data.resources.results && data.resources.results.products;
            if (products && products.length > 0) {
              return fetchProductByHandle(products[0].handle);
            }
            return null;
          });
      })
      .catch(function () { return null; });
  }

  function processContent() {
    var container = findContainer();
    if (!container) return;

    var html = container.innerHTML;
    var matches = [];
    var quoteClass = "[" + QUOTE_CHARS + "]";

    // 1) Membership: "Add Card Membership" (com aspas)
    var reMembership = new RegExp(quoteClass + "Add\\s*Card\\s+Membership" + quoteClass, "gi");
    html = html.replace(reMembership, function (fullMatch) {
      var idx = matches.length;
      matches.push({ keyword: "Membership" });
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    });

    // 2) Product com aspas: "Add Card <handle>" (só quando handle = só a-z0-9-)
    var reAddCardHandle = new RegExp(quoteClass + "Add\\s*Card\\s+([a-z0-9-]+)" + quoteClass, "gi");
    html = html.replace(reAddCardHandle, function (fullMatch, handle) {
      if (!handle) return fullMatch;
      var idx = matches.length;
      matches.push({ keyword: handle });
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    });

    // 3) Product sem aspas: "Product Card " + (opcional: tags) + handle
    var reProduct = /Product\s+Card\s+(?:<[^>]*>\s*)*([a-z0-9-]+)/gi;
    html = html.replace(reProduct, function (fullMatch, handle) {
      var idx = matches.length;
      var h = (handle || "").trim();
      matches.push({ keyword: h });
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    });

    if (matches.length === 0) return;

    container.innerHTML = html;

    var placeholders = container.querySelectorAll ? [] : null;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.textContent.indexOf(PLACEHOLDER_PREFIX) !== -1) {
        textNodes.push(node);
      }
    }

    var promises = matches.map(function (m) {
      if (/^membership$/i.test(m.keyword)) {
        m.html = buildMembershipCard();
        return Promise.resolve(m);
      }
      return getProduct(m.keyword)
        .then(function (product) {
          m.html = product ? buildProductCard(product) : null;
          return m;
        })
        .catch(function () {
          m.html = null;
          return m;
        });
    });

    Promise.all(promises).then(function (results) {
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
