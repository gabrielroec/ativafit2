// assets/product-gallery.js
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".product-detail").forEach((section) => {
    const mainImg = section.querySelector(
      ".product-detail__gallery-main-image"
    );
    const thumbs = section.querySelectorAll(".gallery-thumbs .thumb");
    const thumbsContainer = section.querySelector(".gallery-thumbs");

    // Configuração para o slide de thumbnails para mobile
    let isDragging = false;
    let startX, scrollLeft;

    if (thumbsContainer) {
      // Adicionar eventos de touch/mouse para arrastar
      thumbsContainer.addEventListener("mousedown", (e) => {
        if (window.innerWidth <= 768) {
          isDragging = true;
          startX = e.pageX - thumbsContainer.offsetLeft;
          scrollLeft = thumbsContainer.scrollLeft;
          thumbsContainer.style.cursor = "grabbing";
        }
      });

      thumbsContainer.addEventListener("touchstart", (e) => {
        if (window.innerWidth <= 768) {
          isDragging = true;
          startX = e.touches[0].pageX - thumbsContainer.offsetLeft;
          scrollLeft = thumbsContainer.scrollLeft;
        }
      });

      thumbsContainer.addEventListener("mouseleave", () => {
        isDragging = false;
        thumbsContainer.style.cursor = "";
      });

      thumbsContainer.addEventListener("mouseup", () => {
        isDragging = false;
        thumbsContainer.style.cursor = "";
      });

      thumbsContainer.addEventListener("touchend", () => {
        isDragging = false;
      });

      thumbsContainer.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - thumbsContainer.offsetLeft;
        const walk = (x - startX) * 2; // Velocidade do scroll
        thumbsContainer.scrollLeft = scrollLeft - walk;
      });

      thumbsContainer.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - thumbsContainer.offsetLeft;
        const walk = (x - startX) * 2; // Velocidade do scroll
        thumbsContainer.scrollLeft = scrollLeft - walk;
      });
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        mainImg.src = thumb.dataset.src;

        // desativa só as thumbs desta seção
        section
          .querySelectorAll(".thumb.active")
          .forEach((el) => el.classList.remove("active"));
        thumb.classList.add("active");
      });
    });
  });

  document.querySelectorAll(".qty-decrease, .qty-increase").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn
        .closest(".product-info__quantity")
        .querySelector(".qty-input");
      let val = parseInt(input.value, 10);
      if (btn.classList.contains("qty-decrease")) val = Math.max(1, val - 1);
      else val++;
      input.value = val;
    });
  });
});
