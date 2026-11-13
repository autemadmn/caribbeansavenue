// Caribbean's Avenue · carta de una página.
// Pinta la carta desde los datos (locales o del panel), aplica la tarifa vigente con la hora
// de Valencia y monta el banner de Top ventas y la barra de secciones con buscador.

import { localMenu } from "./source.js";
import { loadRemoteMenu } from "./remote.js";
import { glassSVG } from "./glasses.js";
import { Banner } from "./banner.js";
import { Nav, norm } from "./nav.js";

const CUTOFF_MIN = 22 * 60 + 30; // 22:30
const NIGHT_UNTIL_MIN = 6 * 60; // de madrugada sigue siendo noche

const UI = {
  es: {
    title: "Caribbean's Avenue · Carta",
    tarifa: { tarde: "Tarifa de tarde", noche: "Tarifa de noche" },
    when: { tarde: "hasta las 22:30", noche: "desde las 22:30" },
    col: { tarde: "Tarde", noche: "Noche" },
    top: "Top ventas",
    nav: "Secciones de la carta",
    search: "Buscar en la carta",
    searchPlaceholder: "Buscar bebida o ingrediente",
    close: "Cerrar",
    results: (n) => (n === 1 ? "1 resultado" : `${n} resultados`),
    noResults: (q) => `No hay nada con «${q}».`,
    noResultsHint: "Prueba con otra palabra o pregunta al personal.",
    lang: "Idioma",
    slide: (i, n) => `${i} de ${n}`,
    show: (name) => `Ver ${name}`,
    from: "desde",
    fromNote: "Precio desde. Consulta al personal.",
    prices: "Precios en euros.",
  },
  en: {
    title: "Caribbean's Avenue · Menu",
    tarifa: { tarde: "Day prices", noche: "Night prices" },
    when: { tarde: "until 22:30", noche: "from 22:30" },
    col: { tarde: "Day", noche: "Night" },
    top: "Best sellers",
    nav: "Menu sections",
    search: "Search the menu",
    searchPlaceholder: "Search a drink or ingredient",
    close: "Close",
    results: (n) => (n === 1 ? "1 result" : `${n} results`),
    noResults: (q) => `Nothing matches “${q}”.`,
    noResultsHint: "Try another word or ask our staff.",
    lang: "Language",
    slide: (i, n) => `${i} of ${n}`,
    show: (name) => `Show ${name}`,
    from: "from",
    fromNote: "Starting price. Please ask our staff.",
    prices: "Prices in euros.",
  },
};

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const state = {
  lang: pickLang(),
  tarifa: "tarde",
  menu: localMenu(),
  banner: null,
  nav: null,
};

function pickLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "es" || q === "en") return q;
  try {
    const saved = localStorage.getItem("carta-lang");
    if (saved === "es" || saved === "en") return saved;
  } catch {}
  const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
  return ["es", "ca", "eu", "gl"].includes(nav) ? "es" : "en";
}

const t = (obj) => (obj && typeof obj === "object" ? (obj[state.lang] ?? obj.es ?? "") : (obj ?? ""));
const ui = () => UI[state.lang];

const money = (n) =>
  new Intl.NumberFormat(state.lang === "es" ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

/* ---------- Tarifa según la hora de Valencia ---------- */

function tarifaNow() {
  const forced = new URLSearchParams(location.search).get("tarifa");
  if (forced === "tarde" || forced === "noche") return forced;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour").value);
  const m = Number(parts.find((p) => p.type === "minute").value);
  const mins = h * 60 + m;
  return mins >= CUTOFF_MIN || mins < NIGHT_UNTIL_MIN ? "noche" : "tarde";
}

function applyTarifa() {
  state.tarifa = tarifaNow();
  document.documentElement.dataset.tarifa = state.tarifa;
  $(".tarifa-name").textContent = ui().tarifa[state.tarifa];
  $(".tarifa-when").textContent = ui().when[state.tarifa];
}

/* ---------- Pintado ---------- */

// Medidas reales de los recortes (alto 280 y 720) para reservar su hueco antes de que carguen.
const CUTOUT_W = {
  "caribbeans-spritz": [122, 327],
  "mojito-clasico": [116, 314],
  "mojito-frutas": [122, 329],
  "porn-star-martini": [194, 508],
  caipirinha: [184, 473],
  caipiroska: [183, 470],
  "pina-colada": [130, 334],
  "moscow-mule": [201, 516],
  margarita: [188, 483],
  "matcha-mojito": [123, 317],
  "pina-colada-sin": [131, 336],
  caribeno: [122, 314],
};

function thumb(p, size) {
  if (p.cutout) {
    const large = size === "large";
    const h = large ? 720 : 280;
    const w = CUTOUT_W[p.cutout]?.[large ? 1 : 0];
    const dims = w ? ` width="${w}" height="${h}"` : "";
    return `<img src="assets/cocktails/${p.cutout}-${h}.webp" alt=""${dims} decoding="async" ${large ? "" : 'loading="lazy"'} draggable="false">`;
  }
  return glassSVG(p.glass, p.tint);
}

function slideHTML(p, i, n, clone) {
  return `<article class="slide" style="--tint:${esc(p.tint)}" ${
    clone ? 'aria-hidden="true" inert' : `role="group" aria-roledescription="slide" aria-label="${esc(ui().slide(i + 1, n))}"`
  }>
    <div class="slide-copy">
      <h3 class="slide-name">${esc(t(p.name))}</h3>
      <p class="slide-line">${esc(t(p.line))}</p>
      <p class="slide-price">${esc(money(p.price))}</p>
    </div>
    <div class="slide-glass${p.cutout ? "" : " slide-glass--drawn"}">${thumb(p, "large")}</div>
  </article>`;
}

function topHTML(fam, top) {
  const n = top.length;
  const slides = [0, 1, 2]
    .map((copy) => top.map((p, i) => slideHTML(p, i, n, n > 1 && copy !== 1)).join(""))
    .slice(0, n > 1 ? 3 : 1)
    .join("");
  const steps =
    n > 1
      ? `<div class="banner-steps">${top
          .map((p, i) => `<button type="button" class="banner-step" aria-label="${esc(ui().show(t(p.name)))}"><span></span></button>`)
          .join("")}</div>`
      : "";
  return `<section class="family family--top" id="top-ventas" data-section="top-ventas" aria-labelledby="h-top">
    <h2 class="family-title" id="h-top" tabindex="-1">${esc(ui().top)}</h2>
    <div class="banner" role="region" aria-roledescription="carousel" aria-labelledby="h-top">
      <div class="banner-track">${slides}</div>
      ${steps}
    </div>
  </section>`;
}

// Texto de búsqueda de un producto: nombre, línea y sección en los dos idiomas, sin tildes.
const both = (v) => (v && typeof v === "object" ? `${v.es ?? ""} ${v.en ?? ""}` : (v ?? ""));
// Va también todo junto, para que «redbull» o «pornstar» encuentren «Red Bull» y «Porn Star».
// Y con las otras formas en que la gente lo escribe.
const ALIAS = { whiskey: "whisky", champagne: "champan", cognac: "coñac conac" };
const haystack = (...parts) => {
  const h = norm(parts.map(both).join(" "));
  const extra = Object.entries(ALIAS)
    .filter(([k]) => h.split(" ").includes(k))
    .map(([, v]) => norm(v));
  return esc([h, ...extra, h.replace(/ /g, "")].join(" "));
};

function cocktailHTML(p, sec) {
  return `<li class="cocktail" id="c-${esc(p.id)}" data-q="${haystack(p.name, p.line, sec.title, "coctel cocktail")}">
    <div class="cocktail-thumb">${thumb(p, "small")}</div>
    <div class="cocktail-text">
      <h4 class="cocktail-name">${esc(t(p.name))}</h4>
      <p class="cocktail-line">${p.top ? `<span class="cocktail-top">${esc(ui().top)}</span> · ` : ""}${esc(t(p.line))}</p>
    </div>
    <p class="cocktail-price">${esc(money(p.price))}</p>
  </li>`;
}

function colLabels() {
  return ["tarde", "noche"]
    .map(
      (c) =>
        `<span class="col-label" data-col="${c}">${esc(ui().col[c])}</span>`,
    )
    .join("");
}

function drinkRowHTML(p, sec) {
  const note = p.desde ? ui().fromNote : t(p.note);
  return `<li class="row" data-q="${haystack(p.name, p.note, sec.title)}">
    <span class="row-name"><span class="row-text">${esc(t(p.name))}${note ? `<span class="row-note">${esc(note)}</span>` : ""}</span></span>
    <span class="price" data-col="tarde">${p.desde ? `<span class="price-from">${esc(ui().from)}</span>` : ""}${esc(money(p.tarde))}</span>
    <span class="price" data-col="noche">${p.desde ? `<span class="price-from">${esc(ui().from)}</span>` : ""}${esc(money(p.noche))}</span>
  </li>`;
}

function familyHTML(fam) {
  const h2 = `<h2 class="family-title" id="h-${esc(fam.id)}">${esc(t(fam.title))}</h2>`;
  const sections = fam.sections
    .map((sec, i) => {
      const titled = !(fam.sections.length === 1 && t(sec.title) === t(fam.title));
      const h3 = titled ? `<h3 class="sec-title" tabindex="-1">${esc(t(sec.title))}</h3>` : "";
      if (fam.kind === "cocktails") {
        return `<section class="sec sec--cocktails" id="s-${esc(sec.id)}" data-section="${esc(sec.id)}">
          ${h3}<ul class="cocktails">${sec.products.map((p) => cocktailHTML(p, sec)).join("")}</ul>
        </section>`;
      }
      return `<section class="sec sec--drinks" id="s-${esc(sec.id)}" data-section="${esc(sec.id)}">
        <div class="sec-head">${h3 || `<span class="sec-title sec-title--ghost" aria-hidden="true"></span>`}${colLabels()}</div>
        ${sec.note ? `<p class="sec-note">${esc(t(sec.note))}</p>` : ""}
        <ul class="prices">
          <li class="band" aria-hidden="true"></li>
          ${sec.products.map((p) => drinkRowHTML(p, sec)).join("")}
        </ul>
      </section>`;
    })
    .join("");
  return `<section class="family family--${esc(fam.kind)}" id="f-${esc(fam.id)}" aria-labelledby="h-${esc(fam.id)}">${h2}${sections}</section>`;
}

const famAnchor = (fam) => (fam.kind === "top" ? "top-ventas" : `f-${fam.id}`);

function chipsHTML(menu) {
  return menu.families
    .map((fam) => `<li><a class="chip" href="#${esc(famAnchor(fam))}">${esc(t(fam.title))}</a></li>`)
    .join("");
}

function notesHTML(menu) {
  return `<footer class="closing">
    <ul class="notes">${menu.notes.map((n) => `<li>${esc(t(n))}</li>`).join("")}<li>${esc(ui().prices)}</li></ul>
    <img class="closing-logo" src="assets/brand/caribbeans-logo-white.svg" alt="Caribbean's Avenue" width="220" height="59" loading="lazy">
    <p class="closing-tagline">Sunset · Night · Atmosphere</p>
  </footer>`;
}

function render({ keepPlace = false } = {}) {
  const menu = state.menu;
  const main = $("#carta");
  const navEl = $(".nav");

  // Mantener el sitio al cambiar de idioma: misma familia, mismo desplazamiento.
  let anchor = null;
  if (keepPlace && state.nav?.current) {
    anchor = { id: state.nav.current.id, dy: state.nav.current.el.getBoundingClientRect().top };
  }

  const u = ui();
  document.documentElement.lang = state.lang;
  document.title = u.title;
  $(".lang").setAttribute("aria-label", u.lang);
  for (const b of document.querySelectorAll(".lang button")) b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
  navEl.setAttribute("aria-label", u.nav);
  $(".nav-search").setAttribute("aria-label", u.search);
  $(".search-input").setAttribute("aria-label", u.search);
  $(".search-input").placeholder = u.searchPlaceholder;
  $(".search-close").textContent = u.close;

  state.banner?.destroy();
  main.innerHTML = menu.families
    .map((fam) => (fam.kind === "top" ? topHTML(fam, menu.top) : familyHTML(fam)))
    .join("") + notesHTML(menu);
  $(".chips").innerHTML = chipsHTML(menu);

  const bannerEl = $(".banner", main);
  state.banner = bannerEl ? new Banner(bannerEl, menu.top.length) : null;

  const chips = [...document.querySelectorAll(".chip")];
  const families = menu.families
    .map((fam, i) => ({ id: fam.id, el: document.getElementById(famAnchor(fam)), chip: chips[i] }))
    .filter((f) => f.el && f.chip);
  if (!state.nav) state.nav = new Nav({ nav: navEl, main, strings: ui });
  state.nav.setFamilies(families);

  applyTarifa();

  if (anchor && !state.nav.filtering) {
    const f = families.find((x) => x.id === anchor.id);
    if (f) scrollTo({ top: f.el.getBoundingClientRect().top + scrollY - anchor.dy, behavior: "instant" });
  }
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang;
  try {
    localStorage.setItem("carta-lang", lang);
  } catch {}
  render({ keepPlace: true });
}

/* ---------- Arranque ---------- */

for (const b of document.querySelectorAll(".lang button")) b.addEventListener("click", () => setLang(b.dataset.lang));

render();
setInterval(applyTarifa, 30_000);
document.addEventListener("visibilitychange", () => !document.hidden && applyTarifa());

// Datos del panel: si llegan y cambian algo, se vuelve a pintar manteniendo el sitio.
loadRemoteMenu()
  .then((menu) => {
    if (!menu) return;
    state.menu = menu;
    render({ keepPlace: true });
  })
  .catch(() => {});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
