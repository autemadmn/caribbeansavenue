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
const menuShell = document.querySelector(".menu-shell");
const slides = [...document.querySelectorAll(".slide")];
const pageDots = [...document.querySelectorAll(".page-dot")];
const modal = document.querySelector("#productModal");
const modalTitle = document.querySelector("#modalTitle");
const modalPrice = document.querySelector("#modalPrice");
const modalDescription = document.querySelector("#modalDescription");
const modalNote = document.querySelector("#modalNote");
const modalCategory = document.querySelector("#modalCategory");
const coverSlide = document.querySelector(".slide-cover");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const swipePreviewKey = "swipePreviewShown";
let lastFocusedElement = null;
let activeSlideIndex = 0;
let hasShownSwipePreview = getSessionFlag(swipePreviewKey);
let isPreviewingSwipe = false;
let fingerHintTimer = null;
let previewTimer = null;
let coverPointerStart = null;
let crystalCurrent = 0;
let crystalTarget = 0;
let crystalDirection = 1;
let crystalLastLeft = track?.scrollLeft || 0;
let crystalLastTime = performance.now();
let crystalFrame = null;
let crystalSettleTimer = null;

function getSessionFlag(key) {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function setSessionFlag(key) {
  try {
    sessionStorage.setItem(key, "true");
  } catch {
    // Session storage can be disabled in strict browser modes.
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function markSwipePreviewShown() {
  hasShownSwipePreview = true;
  setSessionFlag(swipePreviewKey);
}

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
  activeSlideIndex = index;

  pageDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === index;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (index !== 0) {
    cancelSwipePreview();
  }
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

function setLiquidCrystalState(force) {
  if (!menuShell) {
    return;
  }

  const eased = force * force * (3 - 2 * force);
  const shift = crystalDirection * eased * 6.55;
  const glowShift = crystalDirection * eased * 2.8;
  const sweepShift = -42 + crystalDirection * eased * 58;

  menuShell.style.setProperty("--crystal-shift", `${shift.toFixed(2)}px`);
  menuShell.style.setProperty("--crystal-glow-shift", `${glowShift.toFixed(2)}px`);
  menuShell.style.setProperty("--crystal-sweep-shift", `${sweepShift.toFixed(2)}%`);
  menuShell.style.setProperty("--crystal-rim-opacity", (0.16 + eased * 0.14).toFixed(3));
  menuShell.style.setProperty("--crystal-glow-opacity", (0.075 + eased * 0.06).toFixed(3));
  menuShell.style.setProperty("--crystal-sweep-opacity", (eased * 0.18).toFixed(3));
  menuShell.style.setProperty("--crystal-secondary-opacity", (0.045 + eased * 0.085).toFixed(3));
  menuShell.style.setProperty("--crystal-brightness", (1 + eased * 0.075).toFixed(3));
}

function scheduleLiquidCrystalFrame() {
  if (!crystalFrame) {
    crystalFrame = requestAnimationFrame(animateLiquidCrystal);
  }
}

function animateLiquidCrystal() {
  crystalFrame = null;

  const easing = crystalTarget > crystalCurrent ? 0.24 : 0.07;
  crystalCurrent += (crystalTarget - crystalCurrent) * easing;
  crystalTarget *= 0.96;

  if (crystalCurrent < 0.004 && crystalTarget < 0.004) {
    crystalCurrent = 0;
    crystalTarget = 0;
    setLiquidCrystalState(0);
    return;
  }

  setLiquidCrystalState(clamp(crystalCurrent, 0, 1));
  scheduleLiquidCrystalFrame();
}

function reactLiquidCrystalToScroll() {
  if (!track || reducedMotionQuery.matches) {
    return;
  }

  const now = performance.now();
  const left = track.scrollLeft;
  const delta = left - crystalLastLeft;
  const elapsed = Math.max(16, now - crystalLastTime);

  crystalLastLeft = left;
  crystalLastTime = now;

  if (Math.abs(delta) < 0.2) {
    return;
  }

  crystalDirection = Math.sign(delta) || crystalDirection;

  const velocity = Math.abs(delta) / elapsed;
  const pageWidth = Math.max(track.clientWidth, 1);
  const distanceForce = clamp(Math.abs(delta) / (pageWidth * 0.16), 0, 0.36);
  const velocityForce = clamp(velocity * 0.9, 0, 0.64);
  const nextTarget = clamp(0.12 + distanceForce + velocityForce, 0, 1);

  crystalTarget = Math.max(crystalTarget, nextTarget);
  scheduleLiquidCrystalFrame();

  window.clearTimeout(crystalSettleTimer);
  crystalSettleTimer = window.setTimeout(() => {
    crystalTarget = 0;
    scheduleLiquidCrystalFrame();
  }, 150);
}

function bindLiquidCrystal() {
  if (!track || !menuShell || reducedMotionQuery.matches) {
    return;
  }

  setLiquidCrystalState(0);

  track.addEventListener("scroll", reactLiquidCrystalToScroll, { passive: true });

  window.addEventListener(
    "resize",
    () => {
      crystalLastLeft = track.scrollLeft;
      crystalLastTime = performance.now();
    },
    { passive: true },
  );

  reducedMotionQuery.addEventListener?.("change", (event) => {
    if (!event.matches) {
      return;
    }

    window.clearTimeout(crystalSettleTimer);
    cancelAnimationFrame(crystalFrame);
    crystalFrame = null;
    crystalCurrent = 0;
    crystalTarget = 0;
    setLiquidCrystalState(0);
  });
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

function playFingerHint() {
  if (!coverSlide || reducedMotionQuery.matches || activeSlideIndex !== 0) {
    return;
  }

  window.clearTimeout(fingerHintTimer);
  coverSlide.classList.remove("is-finger-hinting");

  requestAnimationFrame(() => {
    coverSlide.classList.add("is-finger-hinting");
    fingerHintTimer = window.setTimeout(() => {
      coverSlide.classList.remove("is-finger-hinting");
    }, 5000);
  });
}

function cancelSwipePreview(shouldRemember = false) {
  window.clearTimeout(previewTimer);
  track.classList.remove("is-previewing-swipe");
  coverSlide?.classList.remove("is-previewing-swipe");
  isPreviewingSwipe = false;

  if (shouldRemember) {
    markSwipePreviewShown();
  }
}

function previewSwipe() {
  if (reducedMotionQuery.matches || hasShownSwipePreview || isPreviewingSwipe || activeSlideIndex !== 0 || track.scrollLeft > 4) {
    return;
  }

  isPreviewingSwipe = true;
  track.classList.add("is-previewing-swipe");
  coverSlide?.classList.add("is-previewing-swipe");

  previewTimer = window.setTimeout(() => {
    cancelSwipePreview(true);
  }, 900);
}

function isValidCoverTapTarget(target) {
  return Boolean(
    coverSlide?.contains(target)
      && !target.closest("button, a, .page-indicator, .swipe-cue, .product-card, .modal")
      && !target.closest(".venue-mark, h1, .small-caps"),
  );
}

function isCoverInteractionTarget(target) {
  return Boolean(
    coverSlide?.contains(target)
      && !target.closest("button, a, .page-indicator, .product-card, .modal"),
  );
}

function bindSwipeHint() {
  if (!coverSlide || reducedMotionQuery.matches) {
    return;
  }

  coverSlide.addEventListener(
    "pointerdown",
    (event) => {
      if (activeSlideIndex !== 0 || !isCoverInteractionTarget(event.target)) {
        coverPointerStart = null;
        return;
      }

      coverPointerStart = {
        x: event.clientX,
        y: event.clientY,
        cancelled: false,
      };
    },
    { passive: true },
  );

  coverSlide.addEventListener(
    "pointermove",
    (event) => {
      if (!coverPointerStart) {
        return;
      }

      const deltaX = event.clientX - coverPointerStart.x;
      const deltaY = event.clientY - coverPointerStart.y;

      if (Math.abs(deltaX) > 14 || Math.abs(deltaY) > 14) {
        coverPointerStart.cancelled = true;
        cancelSwipePreview(true);
      }
    },
    { passive: true },
  );

  coverSlide.addEventListener(
    "pointerup",
    (event) => {
      if (!coverPointerStart || coverPointerStart.cancelled || !isCoverInteractionTarget(event.target)) {
        coverPointerStart = null;
        return;
      }

      const deltaX = Math.abs(event.clientX - coverPointerStart.x);
      const deltaY = Math.abs(event.clientY - coverPointerStart.y);
      coverPointerStart = null;

      if (deltaX <= 10 && deltaY <= 10) {
        playFingerHint();

        if (!hasShownSwipePreview && isValidCoverTapTarget(event.target)) {
          previewSwipe();
        }
      }
    },
    { passive: true },
  );

  track.addEventListener(
    "scroll",
    () => {
      if (track.scrollLeft > 12) {
        cancelSwipePreview(true);
      }
    },
    { passive: true },
  );
}

function bindEvents() {
  pageDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      cancelSwipePreview(true);
      scrollToSlide(Number(dot.dataset.target));
    });
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
bindSwipeHint();
bindLiquidCrystal();
observeSlides();
requestAnimationFrame(syncInitialPage);
window.addEventListener("load", syncInitialPage);
requestAnimationFrame(playFingerHint);
