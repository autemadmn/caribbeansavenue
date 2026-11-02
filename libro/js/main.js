// Aledares editorial menu · bootstrap for one restaurant.
// Wires: data → adapter → pages → book → detail, plus language, folio and first-visit motion.

import { config } from "./config.js";
import { createMenu } from "./data-adapter.js";
import { createMotion } from "./motion.js";
import { createTextMotion } from "./text-motion.js";
import { createPages } from "./editorial-pages.js";
import { createBookEngine } from "./book-engine.js";
import { createProductDetail } from "./product-detail.js";

const LOCALE_KEY = "ed-locale";
const COVER_KEY = "ed-cover-seen";

const stage = document.querySelector("#stage");
const app = document.querySelector("#app");
const folio = document.querySelector("#folio");
const prevButton = document.querySelector('[data-turn="prev"]');
const nextButton = document.querySelector('[data-turn="next"]');

const storage = {
  get(key, area = localStorage) {
    try {
      return area.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value, area = localStorage) {
    try {
      area.setItem(key, value);
    } catch {
      // storage disabled: preferences just won't persist
    }
  },
};

const params = new URLSearchParams(location.search);
const dataUrl = params.get("data") === "fixture" ? "../tests/fixture-data.js" : config.data;
const { default: raw } = await import(dataUrl);
const menu = createMenu(raw, config);
const motion = createMotion(config);
const textMotion = createTextMotion(motion);
const pages = createPages(menu);

let locale = params.get("lang") || storage.get(LOCALE_KEY) || menu.defaultLocale;
if (!menu.locales.includes(locale)) {
  locale = menu.defaultLocale;
}

/* ---------- Chrome (folio, turn buttons, language) ---------- */

function updateChrome(index) {
  const t = menu.t(locale);
  const label = pages.label(index, locale);
  folio.textContent = `${label} · ${t.pageOf(index + 1, menu.pageCount)}`;
  prevButton.disabled = index <= 0;
  nextButton.disabled = book ? index >= book.count - (book.spread && index > 0 ? 2 : 1) : true;
}

function applyLocaleToChrome() {
  const t = menu.t(locale);
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = t[element.dataset.i18n];
    if (typeof value === "string") {
      element.textContent = value;
    }
  });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === locale));
  });
}

function setLocale(next) {
  if (next === locale || !menu.locales.includes(next)) {
    return;
  }
  locale = next;
  storage.set(LOCALE_KEY, locale);
  pages.render(locale); // same page elements, new words: the book stays where it is
  applyLocaleToChrome();
  const index = book?.current ?? 0;
  pages.loadAround(index);
  updateChrome(index);
}

/* ---------- Motion moments ---------- */

const revealedPages = new Set();

function revealHeading(index, attempt = 0) {
  if (!config.features.textMotion || revealedPages.has(index)) {
    return;
  }
  const visible = book?.spread && index > 0 ? [index, index + 1] : [index];
  const headings = visible.map((pageIndex) => pages.elements[pageIndex]?.querySelector('[data-reveal="heading"]')).filter(Boolean);

  // Only animate once the page is painted: GSAP measures transforms of hidden elements by
  // temporarily re-parenting them, which reorders the word spans and eats the spaces.
  if (headings.some((heading) => heading.getClientRects().length === 0)) {
    if (attempt < 30) {
      requestAnimationFrame(() => revealHeading(index, attempt + 1));
    }
    return;
  }

  revealedPages.add(index);
  headings.forEach((heading, offset) => {
    textMotion.words(heading, { key: `heading-${visible[offset]}`, stagger: 0.06 });
  });
}

function onPageChange(index) {
  pages.loadAround(index);
  updateChrome(index);
  revealHeading(index);
  storage.set("ed-page", String(index), sessionStorage);
}

/* ---------- Book ---------- */

pages.render(locale);
applyLocaleToChrome();

let book = null;
if (config.features.flipbook && window.St?.PageFlip) {
  book = createBookEngine({ stage, pages, config, motion, onChange: onPageChange });
} else {
  // No flipbook (disabled or library missing): the same pages, one after another.
  stage.classList.add("is-scroll");
  pages.elements.forEach((element) => stage.append(element));
  pages.loadAround(0, pages.elements.length);
}

const detail = createProductDetail({
  dialog: document.querySelector("#detail"),
  menu,
  motion,
  textMotion,
  config,
  getLocale: () => locale,
  backdrop: app,
  onFallbackFocus: () => stage.focus?.({ preventScroll: true }),
});

stage.addEventListener("click", (event) => {
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    book?.goTo(Number(goto.dataset.goto));
    return;
  }
  const product = event.target.closest("[data-product]");
  if (product) {
    detail.open(product.dataset.product, product);
  }
});

prevButton.addEventListener("click", () => book?.prev());
nextButton.addEventListener("click", () => book?.next());
document.querySelectorAll("[data-locale]").forEach((button) => {
  button.addEventListener("click", () => setLocale(button.dataset.locale));
});

/* ---------- First open ---------- */

const restorePage = Number(storage.get("ed-page", sessionStorage));
if (book && restorePage > 0 && restorePage < book.count) {
  book.goTo(restorePage);
}
onPageChange(book?.current ?? 0);

const firstVisit = !storage.get(COVER_KEY, sessionStorage);
storage.set(COVER_KEY, "1", sessionStorage);
if (firstVisit && book?.current === 0 && config.features.textMotion) {
  const cover = pages.elements[0];
  const tl = textMotion.words(cover.querySelector('[data-reveal="cover"]'), { key: "cover", stagger: 0.08 });
  textMotion.sequence([...cover.querySelectorAll(".cover-sub, .cover-tagline, .cover-hint")], { timeline: tl, at: 0.45, stagger: 0.1 });
  if (config.gesture.peekOnce) {
    window.setTimeout(() => book?.peek(), motion.enabled ? 1500 : 600);
  }
}

// Read-only handle for tests/index.html.
window.__libro = { book, detail, menu, motion, get locale() { return locale; }, setLocale };
document.documentElement.dataset.ready = "true";
