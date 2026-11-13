// Barra de secciones fija arriba, como en las cartas de QR habituales:
// - Chips con cada familia: tocar uno lleva a ella; al bajar leyendo se marca solo el de la
//   familia visible y se desliza para que siempre se vea.
// - Lupa: busca mientras se escribe (sin tildes, en español e inglés, también por ingredientes)
//   y deja en la carta solo lo que coincide, agrupado en sus secciones.
// El scroll normal de la página nunca se intercepta: aquí no hay gestos propios.

// Texto comparable: sin tildes ni mayúsculas, sin apóstrofos («Hendrick's» = «hendricks»)
// y con el resto de signos como espacios.
export const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Nav {
  constructor({ nav, main, strings }) {
    this.nav = nav;
    this.main = main;
    this.strings = strings; // () => textos del idioma actual
    this.chips = nav.querySelector(".chips");
    this.searchBtn = nav.querySelector(".nav-search");
    this.form = nav.querySelector(".search");
    this.input = nav.querySelector(".search-input");
    this.closeBtn = nav.querySelector(".search-close");
    this.status = nav.querySelector(".search-status");
    this.families = [];
    this.current = null;
    this.locked = null;
    this.ticking = false;

    this.chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      e.preventDefault();
      const f = this.families.find((x) => x.chip === chip);
      if (f) this.go(f, { focus: e.detail === 0 });
    });
    this.chips.addEventListener("scroll", () => this.edges(), { passive: true });

    this.searchBtn.addEventListener("click", () => this.openSearch());
    this.closeBtn.addEventListener("click", () => this.closeSearch());
    this.input.addEventListener("input", () => this.filter({ toTop: true }));
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.input.blur(); // baja el teclado para ver los resultados
    });
    this.nav.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.searching) this.closeSearch();
    });

    addEventListener("scroll", () => this.request(), { passive: true });
    addEventListener("resize", () => this.request());
  }

  get searching() {
    return this.nav.classList.contains("is-searching");
  }

  get filtering() {
    return document.documentElement.classList.contains("is-filtering");
  }

  // Tras volver a pintar la carta (idioma, datos del panel) cambian los elementos.
  setFamilies(families) {
    this.families = families; // [{ id, el, chip }]
    this.current = null;
    this.locked = null;
    if (this.searching) this.filter();
    this.spy();
    this.edges();
  }

  go(f, { focus = false } = {}) {
    this.locked = f;
    this.setCurrent(f);
    f.el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    if (focus) f.el.querySelector("h2")?.focus({ preventScroll: true });
    // Mientras dura el desplazamiento suave, la marca no salta por las familias intermedias.
    const release = () => {
      clearTimeout(this.releaseTimer);
      removeEventListener("scrollend", release);
      this.locked = null;
      this.spy();
    };
    addEventListener("scrollend", release, { once: true });
    clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(release, 1200);
  }

  request() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.ticking = false;
      this.stuck();
      if (!this.locked) this.spy();
    });
  }

  stuck() {
    this.nav.classList.toggle("is-stuck", this.nav.getBoundingClientRect().top <= 0.5 && scrollY > 0);
  }

  spy() {
    const visible = this.families.filter((f) => !f.el.hidden);
    if (!visible.length) return;
    const line = this.nav.getBoundingClientRect().bottom + 32;
    let found = visible[0];
    for (const f of visible) {
      if (f.el.getBoundingClientRect().top <= line) found = f;
      else break;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) found = visible[visible.length - 1];
    this.setCurrent(found);
  }

  setCurrent(f) {
    if (f === this.current) return;
    this.current?.chip.removeAttribute("aria-current");
    this.current = f;
    f.chip.setAttribute("aria-current", "true");
    // Centrar el chip vigente dentro de la barra, sin mover la página.
    const c = this.chips;
    const box = c.getBoundingClientRect();
    const chip = f.chip.getBoundingClientRect();
    const left = c.scrollLeft + (chip.left - box.left) - (box.width - chip.width) / 2;
    const max = c.scrollWidth - c.clientWidth;
    c.scrollTo({ left: Math.max(0, Math.min(max, left)), behavior: reduced() ? "auto" : "smooth" });
  }

  // El degradado de los bordes solo aparece donde hay más chips que ver.
  edges() {
    const c = this.chips;
    c.classList.toggle("has-before", c.scrollLeft > 2);
    c.classList.toggle("has-after", c.scrollLeft + c.clientWidth < c.scrollWidth - 2);
  }

  /* ---------- Buscador ---------- */

  openSearch() {
    this.nav.classList.add("is-searching");
    this.form.hidden = false;
    this.searchBtn.setAttribute("aria-expanded", "true");
    this.input.focus();
  }

  closeSearch() {
    this.input.value = "";
    this.filter();
    this.nav.classList.remove("is-searching");
    this.form.hidden = true;
    this.searchBtn.setAttribute("aria-expanded", "false");
    this.searchBtn.focus();
    this.spy();
  }

  filter({ toTop = false } = {}) {
    const words = norm(this.input.value).trim().split(/\s+/).filter(Boolean);
    const on = words.length > 0;
    document.documentElement.classList.toggle("is-filtering", on);

    // Cada palabra se busca de la forma más estricta que tenga sentido en esta carta:
    // - si existe tal cual («gin», «lima»), solo como palabra entera: «gin» no saca el ginger beer;
    // - si no, como principio de palabra («hend» → Hendrick's);
    // - y si tampoco, en cualquier parte («redbull» → Red Bull).
    const items = [...this.main.querySelectorAll("[data-q]")];
    const wordsOf = (item) => item.dataset.q.split(" ");
    const all = new Set(items.flatMap(wordsOf));
    const tests = words.map((w) => {
      if (all.has(w)) return (ws) => ws.includes(w);
      if ([...all].some((x) => x.startsWith(w))) return (ws) => ws.some((x) => x.startsWith(w));
      return (ws, q) => q.includes(w);
    });

    let count = 0;
    for (const item of items) {
      const ws = wordsOf(item);
      const hit = !on || tests.every((test) => test(ws, item.dataset.q));
      item.hidden = !hit;
      if (hit && on) count++;
    }
    for (const sec of this.main.querySelectorAll(".sec")) {
      sec.hidden = on && !sec.querySelector("[data-q]:not([hidden])");
    }
    for (const fam of this.main.querySelectorAll(".family")) {
      fam.hidden = on && (fam.classList.contains("family--top") || !fam.querySelector(".sec:not([hidden])"));
    }

    const s = this.strings();
    let empty = this.main.querySelector(".search-empty");
    if (on && count === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "search-empty";
        this.main.prepend(empty);
      }
      empty.innerHTML = `<p class="search-empty-title"></p><p class="search-empty-hint"></p>`;
      empty.firstChild.textContent = s.noResults(this.input.value.trim());
      empty.lastChild.textContent = s.noResultsHint;
    } else {
      empty?.remove();
    }
    this.status.textContent = on ? s.results(count) : "";

    // Los resultados empiezan justo debajo de la barra, no donde estuviera el scroll.
    if (on && toTop) {
      const top = this.main.getBoundingClientRect().top + scrollY - this.nav.offsetHeight;
      if (scrollY > top + 1 || scrollY < top - 1) scrollTo({ top, behavior: "instant" });
    }
    this.spy();
  }
}
