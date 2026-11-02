// Caribbean's Avenue · carta digital
// The menu content lives in index.html so it shows even before this script arrives.
// This file adds: lazy backgrounds, page indicator, product sheet, Top ventas,
// the swipe hint, the liquid-crystal highlight and offline caching.

const track = document.querySelector("#menuTrack");
const menuShell = document.querySelector(".menu-shell");
const slides = [...document.querySelectorAll(".slide")];
const pageDots = [...document.querySelectorAll(".page-dot")];
const coverSlide = document.querySelector(".slide-cover");
const productSheet = document.querySelector("#productSheet");
const topSheet = document.querySelector("#topSheet");
const topList = document.querySelector("#topList");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const swipePreviewKey = "swipePreviewShown";

let activeSlideIndex = 0;
let hasShownSwipePreview = getSessionFlag(swipePreviewKey);
let isPreviewingSwipe = false;
let fingerHintTimer = null;
let previewTimer = null;
let coverPointerStart = null;
let lastFocusedElement = null;

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

/* ---------- Backgrounds: load the visible page and its neighbours only ---------- */

function loadSlideImage(slide) {
  const img = slide?.querySelector(".image-layer img");

  if (!img) {
    return;
  }

  const markLoaded = () => img.classList.add("is-loaded");

  if (img.dataset.srcset) {
    img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.srcset;
    delete img.dataset.src;
  }

  if (img.complete && img.naturalWidth) {
    markLoaded();
  } else {
    img.addEventListener("load", markLoaded, { once: true });
  }
}

function loadAround(index) {
  loadSlideImage(slides[index]);
  loadSlideImage(slides[index + 1]);
  loadSlideImage(slides[index - 1]);
}

function prefersLightData() {
  const connection = navigator.connection;
  return Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "")));
}

function warmRemainingImages() {
  if (prefersLightData()) {
    return;
  }

  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1200));
  idle(() => slides.forEach(loadSlideImage));
}

/* ---------- Page state ---------- */

function updateActiveSlide(index) {
  if (index === activeSlideIndex && slides[index]?.classList.contains("is-current")) {
    return;
  }

  activeSlideIndex = index;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-current", slideIndex === index);
  });

  pageDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === index;
    dot.classList.toggle("is-active", isActive);

    if (isActive) {
      dot.setAttribute("aria-current", "page");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  loadAround(index);

  if (index !== 0) {
    cancelSwipePreview();
  }
}

function scrollToSlide(index, behavior = "smooth") {
  const slide = slides[clamp(index, 0, slides.length - 1)];

  if (!slide) {
    return;
  }

  if (behavior === "auto") {
    // "instant" overrides the CSS smooth scrolling so snap can't pull the page back mid-way.
    track.style.scrollSnapType = "none";
    track.scrollTo({ left: slide.offsetLeft, behavior: "instant" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.scrollSnapType = "";
      });
    });
    return;
  }

  track.scrollTo({ left: slide.offsetLeft, behavior: reducedMotionQuery.matches ? "auto" : behavior });
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
    { root: track, threshold: [0.58, 0.72, 0.86] },
  );

  slides.forEach((slide) => observer.observe(slide));
}

function syncInitialPage() {
  const slideParam = Number(new URLSearchParams(window.location.search).get("slide"));
  let index = -1;

  if (Number.isInteger(slideParam) && slideParam >= 1 && slideParam <= slides.length) {
    index = slideParam - 1;
  } else if (window.location.hash) {
    index = slides.findIndex((slide) => slide.id === window.location.hash.slice(1));
  }

  if (index > 0) {
    scrollToSlide(index, "auto");
    updateActiveSlide(index);
  }
}

/* ---------- Sheets ---------- */

function openSheet(sheet) {
  lastFocusedElement = document.activeElement;

  if (typeof sheet.showModal === "function") {
    sheet.showModal();
  } else {
    sheet.setAttribute("open", "");
  }

  sheet.querySelector("[data-close]")?.focus();
}

function closeSheet(sheet, { restoreFocus = true } = {}) {
  if (!sheet.open && !sheet.hasAttribute("open")) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      sheet.classList.remove("is-closing");

      if (typeof sheet.close === "function") {
        sheet.close();
      } else {
        sheet.removeAttribute("open");
      }

      if (restoreFocus) {
        lastFocusedElement?.focus?.({ preventScroll: true });
      }

      resolve();
    };

    if (reducedMotionQuery.matches) {
      finish();
      return;
    }

    sheet.classList.add("is-closing");
    window.setTimeout(finish, 170);
  });
}

function bindSheet(sheet) {
  sheet.addEventListener("click", (event) => {
    // A click on the dialog itself (not the panel) is a click on the backdrop.
    if (event.target === sheet || event.target.closest("[data-close]")) {
      closeSheet(sheet);
    }
  });

  sheet.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSheet(sheet);
  });
}

function sectionNameFor(element) {
  const slide = element.closest(".slide");
  const title = slide?.querySelector(".title-main");
  return title ? title.textContent.replace(/\s+/g, " ").trim() : "";
}

function readProduct(card) {
  return {
    id: card.dataset.id,
    name: card.querySelector(".product-name")?.textContent.trim() || "",
    price: card.querySelector(".product-price")?.textContent.trim() || "",
    description: card.querySelector(".product-description")?.textContent.trim() || "",
    section: sectionNameFor(card),
  };
}

function openProduct(card) {
  const product = readProduct(card);
  productSheet.querySelector("#productTitle").textContent = product.name;
  productSheet.querySelector("#productPrice").textContent = product.price;
  productSheet.querySelector("#productDescription").textContent = product.description;
  productSheet.querySelector("#productSection").textContent = product.section ? `En la carta: ${product.section}` : "";
  openSheet(productSheet);
}

/* ---------- Top ventas ---------- */

function buildTopList() {
  const featured = [...document.querySelectorAll(".product-card[data-top]")].sort(
    (a, b) => Number(a.dataset.top) - Number(b.dataset.top),
  );

  if (!featured.length) {
    return false;
  }

  featured.forEach((card) => {
    const product = readProduct(card);
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "top-item";
    button.type = "button";
    button.dataset.goto = product.id;

    const name = document.createElement("span");
    name.className = "top-item-name";
    name.textContent = product.name;

    const price = document.createElement("span");
    price.className = "top-item-price";
    price.textContent = product.price;

    const description = document.createElement("span");
    description.className = "top-item-description";
    description.textContent = product.description;

    button.append(name, price, description);
    item.append(button);
    topList.append(item);
  });

  return true;
}

function spotlight(card) {
  card.classList.remove("is-spotlit");
  // Restart the animation if the same drink is chosen twice.
  void card.offsetWidth;
  card.classList.add("is-spotlit");
  window.setTimeout(() => card.classList.remove("is-spotlit"), 3000);
}

async function goToProduct(id) {
  const card = document.querySelector(`.product-card[data-id="${CSS.escape(id)}"]`);

  if (!card) {
    return;
  }

  await closeSheet(topSheet, { restoreFocus: false });
  const slideIndex = Number(card.closest(".slide").dataset.slide);
  scrollToSlide(slideIndex);
  card.focus({ preventScroll: true });

  // On very short screens the page may scroll vertically: bring the drink into view there only.
  const content = card.closest(".menu-content");
  if (content && content.scrollHeight > content.clientHeight) {
    content.scrollTop = Math.max(0, card.offsetTop - content.clientHeight / 3);
  }

  spotlight(card);
}

/* ---------- Swipe hint on the cover ---------- */

function markSwipePreviewShown() {
  hasShownSwipePreview = true;
  setSessionFlag(swipePreviewKey);
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
  previewTimer = window.setTimeout(() => cancelSwipePreview(true), 900);
}

function isCoverInteractionTarget(target) {
  return Boolean(coverSlide?.contains(target) && !target.closest("button, a"));
}

function isValidCoverTapTarget(target) {
  return isCoverInteractionTarget(target) && !target.closest(".swipe-cue, .venue-mark, h1, .tagline");
}

function bindSwipeHint() {
  if (!coverSlide || reducedMotionQuery.matches) {
    return;
  }

  coverSlide.addEventListener(
    "pointerdown",
    (event) => {
      coverPointerStart =
        activeSlideIndex === 0 && isCoverInteractionTarget(event.target)
          ? { x: event.clientX, y: event.clientY, cancelled: false }
          : null;
    },
    { passive: true },
  );

  coverSlide.addEventListener(
    "pointermove",
    (event) => {
      if (!coverPointerStart) {
        return;
      }

      if (Math.abs(event.clientX - coverPointerStart.x) > 14 || Math.abs(event.clientY - coverPointerStart.y) > 14) {
        coverPointerStart.cancelled = true;
        cancelSwipePreview(true);
      }
    },
    { passive: true },
  );

  coverSlide.addEventListener(
    "pointerup",
    (event) => {
      const start = coverPointerStart;
      coverPointerStart = null;

      if (!start || start.cancelled || !isCoverInteractionTarget(event.target)) {
        return;
      }

      if (Math.abs(event.clientX - start.x) <= 10 && Math.abs(event.clientY - start.y) <= 10) {
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

/* ---------- Liquid crystal: the glass rim answers the swipe ---------- */

let crystalCurrent = 0;
let crystalTarget = 0;
let crystalDirection = 1;
let crystalLastLeft = 0;
let crystalLastTime = performance.now();
let crystalFrame = null;
let crystalSettleTimer = null;

function setLiquidCrystalState(force) {
  const eased = force * force * (3 - 2 * force);
  const style = menuShell.style;
  style.setProperty("--crystal-shift", `${(crystalDirection * eased * 6.55).toFixed(2)}px`);
  style.setProperty("--crystal-glow-shift", `${(crystalDirection * eased * 2.8).toFixed(2)}px`);
  style.setProperty("--crystal-sweep-shift", `${(-42 + crystalDirection * eased * 58).toFixed(2)}%`);
  style.setProperty("--crystal-rim-opacity", (0.16 + eased * 0.14).toFixed(3));
  style.setProperty("--crystal-glow-opacity", (0.075 + eased * 0.06).toFixed(3));
  style.setProperty("--crystal-sweep-opacity", (eased * 0.18).toFixed(3));
  style.setProperty("--crystal-secondary-opacity", (0.045 + eased * 0.085).toFixed(3));
  style.setProperty("--crystal-brightness", (1 + eased * 0.075).toFixed(3));
}

function animateLiquidCrystal() {
  crystalFrame = null;
  crystalCurrent += (crystalTarget - crystalCurrent) * (crystalTarget > crystalCurrent ? 0.24 : 0.07);
  crystalTarget *= 0.96;

  if (crystalCurrent < 0.004 && crystalTarget < 0.004) {
    crystalCurrent = 0;
    crystalTarget = 0;
    setLiquidCrystalState(0);
    return;
  }

  setLiquidCrystalState(clamp(crystalCurrent, 0, 1));
  crystalFrame = requestAnimationFrame(animateLiquidCrystal);
}

function reactLiquidCrystalToScroll() {
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
  const pageWidth = Math.max(track.clientWidth, 1);
  const distanceForce = clamp(Math.abs(delta) / (pageWidth * 0.16), 0, 0.36);
  const velocityForce = clamp((Math.abs(delta) / elapsed) * 0.9, 0, 0.64);
  crystalTarget = Math.max(crystalTarget, clamp(0.12 + distanceForce + velocityForce, 0, 1));

  if (!crystalFrame) {
    crystalFrame = requestAnimationFrame(animateLiquidCrystal);
  }

  window.clearTimeout(crystalSettleTimer);
  crystalSettleTimer = window.setTimeout(() => {
    crystalTarget = 0;
  }, 150);
}

function bindLiquidCrystal() {
  if (reducedMotionQuery.matches) {
    return;
  }

  crystalLastLeft = track.scrollLeft;
  track.addEventListener("scroll", reactLiquidCrystalToScroll, { passive: true });
}

/* ---------- Events ---------- */

function bindEvents() {
  pageDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      cancelSwipePreview(true);
      scrollToSlide(Number(dot.dataset.target));
    });
  });

  track.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");

    if (card) {
      openProduct(card);
    }
  });

  document.querySelectorAll("[data-open-top]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      cancelSwipePreview(true);
      openSheet(topSheet);
    });
  });

  topList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-goto]");

    if (item) {
      goToProduct(item.dataset.goto);
    }
  });

  bindSheet(productSheet);
  bindSheet(topSheet);

  document.addEventListener("keydown", (event) => {
    if (productSheet.open || topSheet.open) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      scrollToSlide(activeSlideIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      scrollToSlide(activeSlideIndex - 1);
    }
  });
}

/* ---------- Offline: keep the menu on the phone once it has loaded ---------- */

function registerServiceWorker() {
  const isLocalDev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw\b/.test(location.search);

  if (!("serviceWorker" in navigator) || location.protocol === "file:" || isLocalDev) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // The menu works without it; caching is a bonus.
    });
  });
}

/* ---------- Start ---------- */

const hasTop = buildTopList();

if (!hasTop) {
  document.querySelectorAll("[data-open-top]").forEach((button) => button.remove());
}

bindEvents();
bindSwipeHint();
bindLiquidCrystal();
observeSlides();
loadAround(0);
syncInitialPage();
requestAnimationFrame(playFingerHint);
window.addEventListener("load", warmRemainingImages, { once: true });
registerServiceWorker();
