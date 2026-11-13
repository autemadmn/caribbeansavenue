// Banner rotatorio de Top ventas (mismo comportamiento que el de Sean O'Brian's):
// gira solo cada 4,5 s, se arrastra con el dedo con inercia y vuelve con un muelle.
// Bucle infinito con tres copias de las diapositivas; las copias no se leen ni se enfocan.
// Con «reducir movimiento» no gira solo y los cambios son instantáneos.

const AUTO_MS = 4500;

export class Banner {
  constructor(root, count, { onChange } = {}) {
    this.root = root;
    this.track = root.querySelector(".banner-track");
    this.slides = [...root.querySelectorAll(".slide")];
    this.steps = [...root.querySelectorAll(".banner-step")];
    this.count = count;
    this.onChange = onChange;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.index = count; // copia central
    this.pos = 0;
    this.vel = 0;
    this.width = 1;
    this.down = false;
    this.dragged = false;
    this.visible = true;
    this.paused = false;
    this.nextAuto = performance.now() + AUTO_MS;
    this.active = -1;

    this.frame = this.frame.bind(this);
    this.measure = this.measure.bind(this);

    if (count < 2) {
      this.measure();
      return;
    }

    this.resizeObs = new ResizeObserver(this.measure);
    this.resizeObs.observe(root);
    this.measure();

    root.addEventListener("pointerdown", (e) => this.pointerDown(e));
    root.addEventListener("pointermove", (e) => this.pointerMove(e));
    root.addEventListener("pointerup", (e) => this.pointerUp(e));
    root.addEventListener("pointercancel", (e) => this.pointerUp(e));
    root.addEventListener("focusin", () => (this.paused = true));
    root.addEventListener("focusout", () => {
      this.paused = false;
      this.nextAuto = performance.now() + AUTO_MS;
    });
    this.steps.forEach((step, i) =>
      step.addEventListener("click", () => {
        const current = ((Math.round(this.pos / this.width) % count) + count) % count;
        this.index = Math.round(this.pos / this.width) + (i - current);
        this.vel = 0;
        this.nextAuto = performance.now() + AUTO_MS * 1.6;
        if (this.reduced) this.pos = this.index * this.width;
      }),
    );
    this.viewObs = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.nextAuto = performance.now() + AUTO_MS;
    });
    this.viewObs.observe(root);

    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  measure() {
    // Ancho exacto (con decimales): clientWidth redondea y el error se acumula diapositiva a diapositiva.
    this.width = this.root.getBoundingClientRect().width || 1;
    this.pos = this.index * this.width;
    this.apply();
  }

  pointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.down = true;
    this.dragged = false;
    this.startX = this.lastX = e.clientX;
    this.lastT = performance.now();
    this.vel = 0;
  }

  pointerMove(e) {
    if (!this.down) return;
    const dx = e.clientX - this.lastX;
    if (!this.dragged && Math.abs(e.clientX - this.startX) > 6) {
      this.dragged = true;
      this.root.setPointerCapture?.(e.pointerId);
      this.root.classList.add("is-dragging");
    }
    if (!this.dragged) return;
    const now = performance.now();
    this.pos -= dx;
    this.vel = (-dx / Math.max(10, now - this.lastT)) * 16.7;
    this.lastX = e.clientX;
    this.lastT = now;
    this.apply();
  }

  pointerUp(e) {
    if (!this.down) return;
    this.down = false;
    this.root.classList.remove("is-dragging");
    if (this.root.hasPointerCapture?.(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    if (this.dragged) {
      const projected = this.pos + this.vel * 10;
      const base = Math.round(this.pos / this.width);
      // Un gesto corto basta para pasar de diapositiva, nunca más de una.
      this.index = Math.max(base - 1, Math.min(base + 1, Math.round(projected / this.width)));
      if (this.reduced) this.pos = this.index * this.width;
    }
    this.nextAuto = performance.now() + AUTO_MS * 1.6;
  }

  destroy() {
    this.dead = true;
    this.resizeObs?.disconnect();
    this.viewObs?.disconnect();
  }

  frame(now) {
    if (this.dead) return;
    const dt = Math.min(48, now - this.last);
    this.last = now;
    if (!this.down) {
      const target = this.index * this.width;
      const k = dt / 16.7;
      this.vel += (target - this.pos) * 0.05 * k;
      this.vel *= Math.pow(0.76, k);
      this.pos += this.vel * k;
      if (Math.abs(target - this.pos) < 0.5 && Math.abs(this.vel) < 0.08) {
        this.pos = target;
        this.vel = 0;
        this.normalize();
        const canAuto = !this.reduced && this.visible && !this.paused && !document.hidden;
        if (canAuto && now >= this.nextAuto) {
          this.index += 1;
          this.nextAuto = now + AUTO_MS;
        } else if (!canAuto) {
          this.nextAuto = Math.max(this.nextAuto, now + 1200);
        }
      }
      this.apply();
    }
    requestAnimationFrame(this.frame);
  }

  normalize() {
    const n = this.count;
    if (this.index >= n * 2 || this.index < n) {
      const shift = this.index >= n * 2 ? -n : n;
      this.index += shift;
      this.pos += shift * this.width;
    }
  }

  apply() {
    // Ajustado al píxel físico para que no asome el borde de la diapositiva vecina.
    const dpr = devicePixelRatio || 1;
    this.track.style.transform = `translate3d(${-Math.round(this.pos * dpr) / dpr}px,0,0)`;
    // Paralaje suave de la copa: se adelanta un poco al texto al deslizar.
    const n = this.count;
    for (let i = 0; i < this.slides.length; i++) {
      const offset = (i * this.width - this.pos) / this.width; // -1..1 alrededor de la visible
      if (Math.abs(offset) < 1.2) this.slides[i].style.setProperty("--o", offset.toFixed(3));
    }
    const active = ((Math.round(this.pos / this.width) % n) + n) % n;
    if (active !== this.active) {
      this.active = active;
      this.steps.forEach((s, i) => {
        s.classList.toggle("is-active", i === active);
        s.setAttribute("aria-current", i === active ? "true" : "false");
      });
      this.onChange?.(active);
    }
  }
}
