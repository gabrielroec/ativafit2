/**
 * Bundler Mix & Match — Carousel
 * Desktop/tablet: faixa horizontal + setas + arrastar com mouse.
 * Mobile: setas ocultas via CSS — só swipe/scroll horizontal para maximizar largura.
 */
(function () {
  'use strict';

  function initBundlerCarousel() {
    var productsContainer = document.querySelector('.bndlr-mnm-available-products');
    if (!productsContainer) return;

    var wrapper = productsContainer.closest('.bndlr-inner-products-container');
    if (!wrapper) wrapper = productsContainer.parentElement;

    var cards = productsContainer.querySelectorAll('.bndlr-product.bndlr-mix-and-match');
    if (cards.length <= 1) return;

    wrapper.style.position = 'relative';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'bndlr-carousel-nav bndlr-carousel-nav--prev';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'bndlr-carousel-nav bndlr-carousel-nav--next';
    nextBtn.setAttribute('aria-label', 'Next');
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"></polyline></svg>';

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(nextBtn);

    function getScrollStep() {
      var card = cards[0];
      if (!card) return 300;
      var style = window.getComputedStyle(productsContainer);
      var gap = parseInt(style.gap || style.columnGap || '12', 10) || 12;
      return card.offsetWidth + gap;
    }

    function updateArrows() {
      var sl = productsContainer.scrollLeft;
      var maxScroll = productsContainer.scrollWidth - productsContainer.clientWidth;
      prevBtn.disabled = sl <= 2;
      nextBtn.disabled = sl >= maxScroll - 2;
    }

    prevBtn.addEventListener('click', function () {
      productsContainer.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
      productsContainer.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    productsContainer.addEventListener('scroll', function () {
      requestAnimationFrame(updateArrows);
    }, { passive: true });

    /* Drag on desktop */
    var isDragging = false;
    var startX = 0;
    var scrollStart = 0;
    var hasMoved = false;

    productsContainer.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.pageX;
      scrollStart = productsContainer.scrollLeft;
      productsContainer.style.cursor = 'grabbing';
      productsContainer.style.scrollBehavior = 'auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var dx = e.pageX - startX;
      if (Math.abs(dx) > 5) hasMoved = true;
      productsContainer.scrollLeft = scrollStart - dx;
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      productsContainer.style.cursor = 'grab';
      productsContainer.style.scrollBehavior = 'smooth';
      updateArrows();
    });

    productsContainer.addEventListener('click', function (e) {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    productsContainer.style.setProperty('display', 'flex', 'important');
    productsContainer.style.setProperty('flex-wrap', 'nowrap', 'important');
    productsContainer.style.setProperty('flex-direction', 'row', 'important');
    productsContainer.style.setProperty('justify-content', 'flex-start', 'important');
    productsContainer.style.setProperty('align-items', 'stretch', 'important');
    productsContainer.style.setProperty('overflow-x', 'auto', 'important');
    productsContainer.style.setProperty('overflow-y', 'visible', 'important');
    productsContainer.style.cursor = 'grab';
    productsContainer.style.scrollbarWidth = 'none';
    productsContainer.style.msOverflowStyle = 'none';
    productsContainer.style.touchAction = 'pan-x pinch-zoom';
    productsContainer.style.setProperty('scroll-snap-type', 'none', 'important');

    cards.forEach(function(card) {
      card.style.setProperty('flex-shrink', '0', 'important');
      card.style.setProperty('flex-grow', '0', 'important');
      card.style.setProperty('scroll-snap-align', 'none', 'important');
    });

    var styleTag = document.createElement('style');
    styleTag.textContent = '.bndlr-mnm-available-products::-webkit-scrollbar{display:none}' +
      '.bndlr-mnm-available-products{display:flex!important;flex-wrap:nowrap!important;flex-direction:row!important;justify-content:flex-start!important;align-items:stretch!important;overflow-x:auto!important;overflow-y:visible!important;scroll-snap-type:none!important;touch-action:pan-x pinch-zoom}' +
      '.bndlr-inner-products-container,.bndlr-products-container{overflow:visible!important}';
    document.head.appendChild(styleTag);

    /* Garante início do scroll no primeiro card (evita estado “centralizado” herdado do app) */
    function resetScrollStart() {
      productsContainer.scrollLeft = 0;
    }
    resetScrollStart();
    requestAnimationFrame(function () {
      resetScrollStart();
      updateArrows();
    });
    window.addEventListener('load', resetScrollStart, { passive: true });

    updateArrows();
    window.addEventListener('resize', updateArrows, { passive: true });
  }

  function waitForBundler(attempts) {
    if (attempts <= 0) return;
    var el = document.querySelector('.bndlr-mnm-available-products');
    if (el && el.children.length > 0) {
      initBundlerCarousel();
    } else {
      setTimeout(function () { waitForBundler(attempts - 1); }, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { waitForBundler(30); });
  } else {
    waitForBundler(30);
  }
})();
