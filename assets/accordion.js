document.addEventListener("DOMContentLoaded", () => {
  // Garante que todos os accordions começem fechados
  document.querySelectorAll(".accordion__content").forEach((content) => {
    content.style.display = "none";
    content.style.height = "0";
    content.style.opacity = "0";
  });

  document.querySelectorAll(".accordion__toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".accordion__item");
      const content = item.querySelector(".accordion__content");

      // Fecha todos os outros accordions
      const allItems = item
        .closest(".accordion")
        .querySelectorAll(".accordion__item");
      allItems.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains("active")) {
          const otherContent = otherItem.querySelector(".accordion__content");
          closeAccordion(otherContent);
          otherItem.classList.remove("active");
        }
      });

      // Toggle do accordion atual
      if (item.classList.contains("active")) {
        closeAccordion(content);
        item.classList.remove("active");
      } else {
        openAccordion(content);
        item.classList.add("active");
      }
    });
  });

  function openAccordion(content) {
    // Primeiro exibe o conteúdo com opacity 0
    content.style.display = "block";
    content.style.padding = "0 1rem";

    // Obtém a altura real do conteúdo
    const height = content.scrollHeight + 16; // adiciona margem extra para evitar corte

    // Define a altura inicial como 0
    content.style.height = "0";
    content.style.opacity = "0";

    // Força um reflow para que a transição funcione
    content.offsetHeight;

    // Aplica a transição
    content.style.transition =
      "height 0.4s ease-out, opacity 0.4s ease-in-out, padding 0.3s ease";
    content.style.height = height + "px";
    content.style.opacity = "1";
    content.style.padding = "1rem";
  }

  function closeAccordion(content) {
    // Primeiro armazena a altura atual
    const height = content.scrollHeight;
    content.style.height = height + "px";

    // Força um reflow
    content.offsetHeight;

    // Inicia a transição para fechar
    content.style.transition =
      "height 0.4s ease-in, opacity 0.3s ease-out, padding 0.3s ease";
    content.style.height = "0";
    content.style.opacity = "0";
    content.style.padding = "0 1rem";

    // Após a transição, esconde o elemento completamente
    content.addEventListener(
      "transitionend",
      function handler(e) {
        if (e.propertyName === "height") {
          content.style.display = "none";
          content.removeEventListener("transitionend", handler);
        }
      },
      { once: false }
    );
  }
});
