/**
 * Article Inline Cards
 *
 * Única ação: no texto do post, escrever "Product Card <handle>" ou "Add Card Membership".
 * O script busca o produto em /products/<handle>.js e monta o card. Nada mais para configurar.
 *
 * Triggers:
 *   "Add Card Membership"                                    -> membership card
 *   Product Card <handle>                                    -> product card (fetch /products/<handle>.js)
 *   Product Card <handle> "Custom description"               -> descrição custom (override por post)
 *   Product Card <handle> "Custom description" "Buy now"     -> descrição + CTA custom (override por post)
 *   Product Card <handle> "" "Buy now"                       -> só CTA custom (mantém descrição fallback)
 *   "Add Card <handle>" "Custom description" "Buy now"       -> idem, variante entre aspas
 *
 * Notas:
 * - Override por post: tanto a descrição quanto o texto do CTA ficam escritos no corpo do post.
 * - Tags HTML são removidas da descrição/CTA; aspas podem ser retas (") ou tipográficas (“ ” „ « »).
 * - Se a descrição custom for vazia/ausente, usa-se o fallback (product.description até 80 chars).
 * - Se o CTA custom for vazio/ausente, usa-se o texto padrão "View product".
 *
 * Promo opcional por produto (continua igual): metafield (padrão custom.article_inline_promo),
 * exposto via template alternativo product.card-promo + sections/product-article-inline-promo.liquid.
 */
(function () {
  var PLACEHOLDER_PREFIX = "___ADD_CARD_";
  var PLACEHOLDER_SUFFIX = "___";
  var QUOTE_CHARS = '"\\u201C\\u201D\\u201E\\u00AB\\u00BB';
  var PROMO_VIEW = "card-promo";
  var DEFAULT_CTA = "View product";

  // Ratings hardcoded por produto. Handle -> { rating, count }.
  // Se o handle não estiver aqui, usa DEFAULT_RATING.
  var DEFAULT_RATING = { rating: "4.95", count: "200+ reviews" };
  var PRODUCT_RATINGS = {
    // Exemplos — ajuste conforme os handles reais:
    // '27-5-lbs-adjustable-weight-dumbbell': { rating: '4.95', count: '200+ reviews' },
    // '50lb-adjustable-weight-dumbbell':     { rating: '4.95', count: '200+ reviews' },
    // '66lb-adjustable-weight-dumbbell':     { rating: '4.95', count: '200+ reviews' }
  };

  // Estrelinha amarela (inline SVG) — cor fixa p/ não depender do --aj-accent
  var STAR_SVG =
    '<svg class="article-inline-card__stars" viewBox="0 0 24 24" width="14" height="14" ' +
    'fill="#FACC15" aria-hidden="true" focusable="false">' +
    '<path d="M12 17.3 6.18 21l1.55-6.64L2 9.76l6.82-.59L12 3l3.18 6.17 6.82.59-5.73 4.6L17.82 21z"/>' +
    "</svg>";

  function formatMoney(cents) {
    return "$" + (cents / 100).toFixed(2);
  }

  function shopifyRoot() {
    if (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) {
      var r = window.Shopify.routes.root;
      return r.charAt(r.length - 1) === "/" ? r : r + "/";
    }
    return "/";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Metafields não vêm em /products/{handle}.js.
   * Buscamos o HTML da página do template alternativo product.card-promo (?view=card-promo)
   * e lemos o <script data-article-inline-promo-json> gerado pela section.
   * (A Section Rendering API ?sections=... com view costuma ser instável; HTML completo é confiável.)
   */
  function parsePromoJsonScript(inner) {
    if (inner == null) return null;
    try {
      var v = JSON.parse(String(inner).trim());
      if (v === null || v === undefined) return null;
      if (typeof v === "string" && v.trim()) return v.trim();
      return null;
    } catch (e) {
      return null;
    }
  }

  function extractPromoFromProductPromoPageHtml(html) {
    if (!html || typeof html !== "string") return null;
    var doc = new DOMParser().parseFromString(html, "text/html");
    var el = doc.querySelector("script[data-article-inline-promo-json]");
    if (el && el.textContent != null) {
      var parsed = parsePromoJsonScript(el.textContent);
      if (parsed) return parsed;
    }
    var m = html.match(/<script[^>]*\bdata-article-inline-promo-json\b[^>]*>([\s\S]*?)<\/script>/i);
    if (m && m[1]) {
      return parsePromoJsonScript(m[1]);
    }
    return null;
  }

  function fetchArticleInlinePromo(handle) {
    if (!handle) return Promise.resolve(null);
    var url =
      shopifyRoot() +
      "products/" +
      encodeURIComponent(handle) +
      "?view=" +
      encodeURIComponent(PROMO_VIEW);
    return fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "text/html", "X-Requested-With": "XMLHttpRequest" }
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.text();
      })
      .then(function (html) {
        return extractPromoFromProductPromoPageHtml(html);
      })
      .catch(function () {
        return null;
      });
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

  function buildProductCard(product, promoText, descOverride, ctaOverride) {
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

    // Description: per-post override (inline na matéria) > product.description truncado em 80 chars
    var descHtml = "";
    var overrideClean = stripTags(descOverride || "").trim();
    if (overrideClean) {
      descHtml = '<p class="article-inline-card__product-desc">' + escapeHtml(overrideClean) + "</p>";
    } else if (product.description) {
      var descRaw = product.description.replace(/<[^>]*>/g, "").substring(0, 80);
      if (product.description.replace(/<[^>]*>/g, "").length > 80) {
        descRaw += "\u2026";
      }
      if (descRaw) {
        descHtml = '<p class="article-inline-card__product-desc">' + descRaw + "</p>";
      }
    }

    var promoHtml = "";
    if (promoText) {
      promoHtml =
        '<p class="article-inline-card__product-promo">' + escapeHtml(promoText) + "</p>";
    }

    // CTA: per-post override (inline na matéria) > texto padrão "View product"
    var ctaClean = stripTags(ctaOverride || "").trim();
    var ctaText = ctaClean || DEFAULT_CTA;

    // Rating: per-handle map (PRODUCT_RATINGS) > DEFAULT_RATING
    var r = PRODUCT_RATINGS[product.handle] || DEFAULT_RATING;
    var ratingHtml =
      '<p class="article-inline-card__product-rating">' +
        STAR_SVG +
        ' <span class="article-inline-card__rating-value">' + escapeHtml(r.rating) + "</span>" +
        ' <span class="article-inline-card__rating-sep" aria-hidden="true">·</span> ' +
        '<span class="article-inline-card__rating-count">' + escapeHtml(r.count) + "</span>" +
      "</p>";

    return (
      '<div class="article-inline-card article-inline-card--product">' +
        '<a href="/products/' + product.handle + '" class="article-inline-card__product-link">' +
          '<div class="article-inline-card__product-image">' + imgTag + "</div>" +
          '<div class="article-inline-card__product-info">' +
            '<p class="article-inline-card__product-title">' + product.title + "</p>" +
            ratingHtml +
            descHtml +
            '<p class="article-inline-card__product-price">' + priceHTML + "</p>" +
            promoHtml +
            '<span class="article-inline-card__product-cta">' + escapeHtml(ctaText) + "</span>" +
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
    // separador permitido entre handle e textos opcionais (espaços, &nbsp; ou tags HTML)
    var sep = "(?:\\s|&nbsp;|<[^>]*>)*";
    // conteúdo dentro de aspas: consome tags HTML inteiras (<...>) OU caracteres que não sejam aspas.
    // Isso evita que aspas DENTRO de atributos (ex.: <span data-x="default">) quebrem o match quando o
    // editor do Shopify embrulha o texto em spans com atributos.
    var notQuote = "[^" + QUOTE_CHARS + "]";
    var innerQuoted = "(?:<[^>]*>|" + notQuote + ")*?";
    // trecho opcional entre aspas (aceita aspas retas/tipográficas, pode ser vazio)
    var quotedPart = "(?:" + sep + quoteClass + "(" + innerQuoted + ")" + quoteClass + ")?";
    // dois trechos opcionais em sequência: 1º = descrição, 2º = CTA
    var descAndCtaParts = quotedPart + quotedPart;

    // 1) Membership: "Add Card Membership" (com aspas)
    var reMembership = new RegExp(quoteClass + "Add\\s*Card\\s+Membership" + quoteClass, "gi");
    html = html.replace(reMembership, function (fullMatch) {
      var idx = matches.length;
      matches.push({ keyword: "Membership" });
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    });

    // 2) Product com aspas: "Add Card <handle>" + (opcional) "Custom description" + (opcional) "CTA"
    var reAddCardHandle = new RegExp(
      quoteClass + "Add\\s*Card\\s+([a-z0-9-]+)" + quoteClass + descAndCtaParts,
      "gi"
    );
    html = html.replace(reAddCardHandle, function (fullMatch, handle, desc, cta) {
      if (!handle) return fullMatch;
      var idx = matches.length;
      matches.push({ keyword: handle, desc: desc || "", cta: cta || "" });
      return PLACEHOLDER_PREFIX + idx + PLACEHOLDER_SUFFIX;
    });

    // 3) Product sem aspas: Product Card <handle> + (opcional) "Custom description" + (opcional) "CTA"
    var reProduct = new RegExp(
      "Product\\s+Card\\s+(?:<[^>]*>\\s*)*([a-z0-9-]+)" + descAndCtaParts,
      "gi"
    );
    html = html.replace(reProduct, function (fullMatch, handle, desc, cta) {
      var idx = matches.length;
      var h = (handle || "").trim();
      matches.push({ keyword: h, desc: desc || "", cta: cta || "" });
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
          if (!product) {
            m.html = null;
            return m;
          }
          var h = product.handle || m.keyword;
          return fetchArticleInlinePromo(h).then(function (promo) {
            m.html = buildProductCard(product, promo, m.desc, m.cta);
            return m;
          });
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
