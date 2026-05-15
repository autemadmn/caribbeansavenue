const menuData = {
  classicOne: {
    label: "Cocktails · Clásicos I",
    products: [
      {
        name: "Bramble",
        price: "10€",
        description: "Ginebra rosa, zumo de frutos rojos, puré de fresa y licor de violetas.",
        image: "assets/products/bramble.jpg",
      },
      {
        name: "Moscow Mule",
        price: "10€",
        description: "Vodka, ginger beer y zumo de lima.",
        image: "assets/products/moscow-mule.jpg",
      },
      {
        name: "Piña Colada",
        price: "10€",
        description: "Ron blanco, puré de coco y zumo de piña.",
        image: "assets/products/pina-colada.jpg",
      },
    ],
  },
  fresh: {
    label: "Mojitos & Fresh · Clásicos II",
    products: [
      {
        name: "Mojito",
        price: "10€",
        description: "Ron blanco, hierbabuena, azúcar moreno, lima y soda.",
        note: "Sin alcohol — 8€.",
        image: "assets/products/mojito.jpg",
      },
      {
        name: "Mojito Fresa",
        price: "10€",
        description: "Ron blanco, hierbabuena, azúcar moreno, lima, fresas y soda.",
        note: "Sin alcohol — 8€.",
        image: "assets/products/mojito-fresa.jpg",
      },
      {
        name: "Caipiriña",
        price: "9€",
        description: "Cachaça, lima, azúcar moreno y soda.",
        image: "assets/products/caipirina.jpg",
      },
      {
        name: "Caipiroska",
        price: "9€",
        description: "Vodka, lima, azúcar moreno y soda.",
        image: "assets/products/caipiroska.jpg",
      },
    ],
  },
  signatures: {
    label: "Spritz & Signatures",
    products: [
      {
        name: "Margarita",
        price: "10€",
        description: "Tequila silver, triple seco y zumo de lima.",
        image: "assets/products/margarita.jpg",
      },
      {
        name: "Aperol Spritz",
        price: "9€",
        description: "Cava, Aperol y soda.",
        image: "assets/products/aperol-spritz.jpg",
      },
      {
        name: "Exotic",
        price: "10€",
        description: "Amaretto, puré de maracuyá, zumo de naranja y una pizca de jengibre.",
        image: "assets/products/exotic.jpg",
      },
    ],
  },
  valencia: {
    label: "Valencia Classics",
    products: [
      {
        name: "Agua de Valencia Copa",
        price: "9€",
        description: "Cava, ron blanco y zumo de naranja.",
        image: "assets/products/agua-valencia-copa.jpg",
      },
      {
        name: "Agua de Valencia Jarra",
        price: "25€",
        description: "Cava, ron blanco y zumo de naranja.",
        note: "Jarra 1L para 4 pax. Solo hasta 23:30h.",
        image: "assets/products/agua-valencia-jarra.jpg",
      },
      {
        name: "Sangría o Tinto de Verano",
        price: "6€ / 8€",
        description: "Copa por la tarde a 6€, por la noche a 8€.",
        image: "assets/products/sangria-tinto-verano.jpg",
      },
    ],
  },
};

const track = document.querySelector("#menuTrack");
const slides = [...document.querySelectorAll(".slide")];
const pageDots = [...document.querySelectorAll(".page-dot")];
const modal = document.querySelector("#productModal");
const modalTitle = document.querySelector("#modalTitle");
const modalPrice = document.querySelector("#modalPrice");
const modalDescription = document.querySelector("#modalDescription");
const modalNote = document.querySelector("#modalNote");
const modalCategory = document.querySelector("#modalCategory");
let lastFocusedElement = null;

function productTemplate(product, categoryLabel) {
  const button = document.createElement("button");
  button.className = "product-card";
  button.type = "button";
  button.dataset.name = product.name;
  button.dataset.price = product.price;
  button.dataset.description = product.description;
  button.dataset.note = product.note || "";
  button.dataset.category = categoryLabel;
  button.dataset.image = product.image || "";
  button.setAttribute("aria-label", `Ver detalle de ${product.name}`);

  button.innerHTML = `
    <span class="product-name">${product.name}</span>
    <span class="product-price">${product.price}</span>
    <span class="product-description">${product.description}</span>
    ${product.note ? `<span class="product-note">${product.note}</span>` : ""}
  `;

  return button;
}

function renderProducts() {
  document.querySelectorAll("[data-category]").forEach((list) => {
    const category = menuData[list.dataset.category];

    if (!category) {
      return;
    }

    category.products.forEach((product) => {
      list.append(productTemplate(product, category.label));
    });
  });
}

function updateActiveSlide(index) {
  pageDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === index;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function scrollToSlide(index, behavior = "smooth") {
  const slide = slides[index];

  if (!slide) {
    return;
  }

  if (behavior === "auto") {
    track.style.scrollSnapType = "none";
    track.scrollLeft = slide.offsetLeft;
    requestAnimationFrame(() => {
      track.style.scrollSnapType = "";
    });
    return;
  }

  track.scrollTo({ left: slide.offsetLeft, behavior });
}

function syncInitialPage() {
  const slideParam = Number(new URLSearchParams(window.location.search).get("slide"));

  if (Number.isInteger(slideParam) && slideParam >= 1 && slideParam <= slides.length) {
    scrollToSlide(slideParam - 1, "auto");
    updateActiveSlide(slideParam - 1);
    return;
  }

  const hash = window.location.hash.slice(1);

  if (!hash) {
    return;
  }

  const slideIndex = slides.findIndex((slide) => slide.id === hash);

  if (slideIndex >= 0) {
    scrollToSlide(slideIndex, "auto");
    updateActiveSlide(slideIndex);
  }
}

function openModalFromProduct(productButton) {
  lastFocusedElement = productButton;
  modalTitle.textContent = productButton.dataset.name;
  modalPrice.textContent = productButton.dataset.price;
  modalDescription.textContent = productButton.dataset.description;
  modalNote.textContent = productButton.dataset.note;
  modalNote.hidden = !productButton.dataset.note;
  modalCategory.textContent = productButton.dataset.category;
  modal.dataset.image = productButton.dataset.image;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lastFocusedElement?.focus();
}

function bindEvents() {
  pageDots.forEach((dot) => {
    dot.addEventListener("click", () => scrollToSlide(Number(dot.dataset.target)));
  });

  document.addEventListener("click", (event) => {
    const productButton = event.target.closest(".product-card");

    if (productButton) {
      openModalFromProduct(productButton);
      return;
    }

    if (event.target.matches("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
}

function observeSlides() {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        updateActiveSlide(Number(visible.target.dataset.slide));
      }
    },
    {
      root: track,
      threshold: [0.58, 0.72, 0.86],
    },
  );

  slides.forEach((slide) => observer.observe(slide));
}

renderProducts();
bindEvents();
observeSlides();
requestAnimationFrame(syncInitialPage);
window.addEventListener("load", syncInitialPage);
