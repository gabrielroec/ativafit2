(() => {
  const sectionSelector = "[data-media-coverage-section]";
  const variantSelector = "[data-variant-option]";

  const updateCardFromVariant = (card, option) => {
    const priceEl = card.querySelector("[data-price]");
    const compareEl = card.querySelector("[data-compare-price]");
    const viewProductEl = card.querySelector("[data-view-product]");
    const primaryImageEl = card.querySelector("[data-primary-image]");

    const variantId = option.dataset.variantId;
    const variantPrice = option.dataset.variantPrice;
    const variantComparePrice = option.dataset.variantComparePrice;
    const variantImage = option.dataset.variantImage;

    if (priceEl && variantPrice) {
      priceEl.textContent = variantPrice;
    }

    if (compareEl) {
      if (variantComparePrice) {
        compareEl.textContent = variantComparePrice;
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }

    if (viewProductEl && variantId) {
      const productUrl = viewProductEl.dataset.productUrl || "";
      viewProductEl.href = `${productUrl}?variant=${variantId}`;
    }

    if (primaryImageEl && variantImage) {
      primaryImageEl.src = variantImage;
    }
  };

  const setupCard = (card) => {
    const options = Array.from(card.querySelectorAll(variantSelector));
    if (!options.length) return;

    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((item) => item.classList.remove("is-active"));
        option.classList.add("is-active");
        updateCardFromVariant(card, option);
      });
    });
  };

  const initSection = (section) => {
    const cards = section.querySelectorAll(".media-coverage__card");
    cards.forEach((card) => setupCard(card));
  };

  const init = () => {
    const sections = document.querySelectorAll(sectionSelector);
    sections.forEach((section) => initSection(section));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("shopify:section:load", (event) => {
    const loadedSection = event.target;
    if (!loadedSection) return;

    if (loadedSection.matches(sectionSelector)) {
      initSection(loadedSection);
      return;
    }

    const nestedSection = loadedSection.querySelector(sectionSelector);
    if (nestedSection) {
      initSection(nestedSection);
    }
  });
})();
