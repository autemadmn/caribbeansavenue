// Índice al pulgar: el borde derecho es el mapa de la carta.
// - Arrastrar el dedo por él salta en vivo a cada sección y enseña su nombre en grande.
// - Tocar una marca salta a esa sección. Con teclado, cada marca es un enlace normal.
// - Mientras se baja leyendo, la marca de la sección visible se enciende.

export class Rail {
  constructor({ rail, bubble, sections, headerOffset, label }) {
    this.rail = rail;
    this.bubble = bubble;
    this.sections = sections; // [{ id, el, tick, family }]
    this.headerOffset = headerOffset;
    this.label = label; // (section) => { title, family }
    this.current = null;
    this.scrubbing = false;
    this.ticking = false;

    rail.addEventListener("pointerdown", (e) => this.down(e));
    rail.addEventListener("pointermove", (e) => this.move(e));
    rail.addEventListener("pointerup", (e) => this.up(e));
    rail.addEventListener("pointercancel", (e) => this.up(e));
    // Los toques los gestiona el arrastre; el clic queda para teclado y lectores de pantalla.
    rail.addEventListener("click", (e) => {
      const link = e.target.closest("a[href^='#']");
      if (!link) return;
      e.preventDefault();
      if (e.detail === 0) {
        const s = this.sections.find((x) => x.tick === link);
        if (s) this.jump(s, { focus: true });
      }
    });

    addEventListener("scroll", () => this.requestSpy(), { passive: true });
    addEventListener("resize", () => this.requestSpy());
    this.spy();
  }

  // Tras volver a pintar la carta (idioma, datos del panel) cambian los elementos.
  setSections(sections) {
    this.sections = sections;
    this.current = null;
    this.scrubbed = null;
    this.spy();
  }

  sectionAt(y) {
    let best = this.sections[0];
    let bestDist = Infinity;
    for (const s of this.sections) {
      const r = s.tick.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) return s;
      const d = Math.min(Math.abs(y - r.top), Math.abs(y - r.bottom));
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  down(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    this.rail.setPointerCapture(e.pointerId);
    this.scrubbing = true;
    this.moved = false;
    this.startY = e.clientY;
    this.rail.classList.add("is-scrubbing");
    this.scrubTo(e.clientY);
  }

  move(e) {
    if (!this.scrubbing) return;
    if (Math.abs(e.clientY - this.startY) > 4) this.moved = true;
    this.scrubTo(e.clientY);
  }

  up(e) {
    if (!this.scrubbing) return;
    this.scrubbing = false;
    if (this.rail.hasPointerCapture(e.pointerId)) this.rail.releasePointerCapture(e.pointerId);
    this.rail.classList.remove("is-scrubbing");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.bubble.classList.remove("is-visible"), this.moved ? 380 : 650);
    this.spy();
  }

  scrubTo(y) {
    const s = this.sectionAt(y);
    const railBox = this.rail.getBoundingClientRect();
    const tickBox = s.tick.getBoundingClientRect();
    const top = Math.max(railBox.top + 8, Math.min(railBox.bottom - 72, tickBox.top + tickBox.height / 2 - 32));
    this.bubble.style.setProperty("--y", `${top}px`);
    if (s !== this.scrubbed) {
      this.scrubbed = s;
      const { title, family } = this.label(s);
      this.bubble.querySelector(".bubble-title").textContent = title;
      this.bubble.querySelector(".bubble-family").textContent = family === title ? "" : family;
      this.bubble.classList.add("is-visible");
      this.jump(s);
      navigator.vibrate?.(4);
    }
  }

  jump(s, { focus = false } = {}) {
    const top = s.el.getBoundingClientRect().top + scrollY - this.headerOffset();
    scrollTo({ top: Math.max(0, top), behavior: "instant" });
    this.setCurrent(s);
    if (focus) {
      s.el.querySelector("h2, h3")?.focus({ preventScroll: true });
    }
  }

  requestSpy() {
    if (this.ticking || this.scrubbing) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.ticking = false;
      this.spy();
    });
  }

  spy() {
    if (this.scrubbing) return;
    const line = this.headerOffset() + 24;
    let found = this.sections[0];
    for (const s of this.sections) {
      if (s.el.getBoundingClientRect().top <= line) found = s;
      else break;
    }
    // Al final de la página, la última sección manda aunque su título no llegue arriba.
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
      found = this.sections[this.sections.length - 1];
    }
    this.setCurrent(found);
  }

  setCurrent(s) {
    if (s === this.current) return;
    this.current?.tick.removeAttribute("aria-current");
    this.current?.tick.closest(".rail-family")?.classList.remove("is-current");
    this.current = s;
    s.tick.setAttribute("aria-current", "location");
    s.tick.closest(".rail-family")?.classList.add("is-current");
  }
}
