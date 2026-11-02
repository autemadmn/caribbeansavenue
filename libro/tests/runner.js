// Risk-driven tests for the editorial book. Each test loads a fresh book in the iframe and
// drives it with real PointerEvents, then checks what the reader would see (page index,
// open sheet, visible ingredients…), not just that elements exist.

const frame = document.querySelector("#frame");
const list = document.querySelector("#results");
const summary = document.querySelector("#summary");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let win;
let doc;
let lib;

async function load(query = "", { width = 390, height = 844 } = {}) {
  frame.width = width;
  frame.height = height;
  sessionStorage.clear();
  localStorage.removeItem("ed-locale");
  sessionStorage.setItem("ed-cover-seen", "1"); // skip the first-visit intro so gestures start clean
  frame.src = `../index.html?lang=es${query ? `&${query}` : ""}&t=${Date.now()}`;
  await new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
  win = frame.contentWindow;
  doc = frame.contentDocument;
  for (let i = 0; i < 100 && doc.documentElement.dataset.ready !== "true"; i += 1) {
    await wait(30);
  }
  await doc.fonts.ready;
  lib = win.__libro;
  // Automated browsers may run requestAnimationFrame at a few fps when the window isn't in front.
  // Without this, GSAP's lag smoothing would stretch a 0.4 s animation to many seconds.
  win.gsap?.ticker.lagSmoothing(0);
  await settle();
}

async function settle(timeout = 2500) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (!lib.book || lib.book.isIdle()) {
      await wait(60);
      return;
    }
    await wait(30);
  }
  throw new Error(`book never settled (state: ${lib.book.debug.state})`);
}

async function until(condition, timeout = 2500) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (condition()) {
      return true;
    }
    await wait(50);
  }
  return condition();
}

async function goTo(index) {
  lib.book.goTo(index);
  await settle();
  // wait until the page is actually painted, not just selected
  const page = doc.querySelector(`.page[data-page="${index}"]`);
  for (let i = 0; i < 60 && !(page.getBoundingClientRect().width > 0); i += 1) {
    await wait(50);
  }
  await wait(80);
}

/** Pointer helpers. Points are fractions of the visible page: [fx, fy, msToGetThere]. */
function point(fx, fy) {
  const rect = lib.book.debug.pageRect;
  return { x: rect.left + fx * rect.width, y: rect.top + fy * rect.height };
}

function fire(kind, at, { id = 1, type = "touch", primary = true } = {}) {
  const target = doc.elementFromPoint(at.x, at.y) || doc.querySelector("#stage");
  target.dispatchEvent(
    new win.PointerEvent(kind, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: at.x,
      clientY: at.y,
      pointerId: id,
      pointerType: type,
      isPrimary: primary,
      button: 0,
      buttons: kind === "pointerup" ? 0 : 1,
    }),
  );
  return target;
}

async function drag(path, { type = "touch", end = "up", clickAfter = true, beforeEnd } = {}) {
  let [fx, fy] = path[0];
  const downTarget = fire("pointerdown", point(fx, fy), { type });
  for (const [tx, ty, ms] of path.slice(1)) {
    const steps = Math.max(1, Math.round(ms / 16));
    const sx = fx;
    const sy = fy;
    for (let i = 1; i <= steps; i += 1) {
      await wait(16);
      fire("pointermove", point(sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps), { type });
    }
    fx = tx;
    fy = ty;
  }
  await beforeEnd?.();
  if (end === "up") {
    const upTarget = fire("pointerup", point(fx, fy), { type });
    // Browsers still send a click when press and release land on the same element.
    if (clickAfter && upTarget === downTarget) {
      upTarget.click();
    }
  } else if (end === "cancel") {
    fire("pointercancel", point(fx, fy), { type });
  }
  await wait(40);
  await settle();
}

async function tap(element) {
  const rect = element.getBoundingClientRect();
  const at = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  fire("pointerdown", at);
  await wait(60);
  fire("pointerup", at);
  element.click();
  await wait(30);
}

const visible = (element) => element && win.getComputedStyle(element).opacity === "1" && element.getBoundingClientRect().height > 0;

/* ---------- Tests ---------- */

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

test("Arrastre lento que pasa la página (45 % en 1,2 s)", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.7], [0.49, 0.72, 1200]]);
  expect(lib.book.current === 2, `página ${lib.book.current}, esperaba 2`);
});

test("Arrastre lento que se cancela (20 %)", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.7], [0.74, 0.7, 1000]]);
  expect(lib.book.current === 1, `página ${lib.book.current}, esperaba 1`);
});

test("Umbral: 26 % vuelve, 34 % pasa", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.6], [0.68, 0.6, 500]]);
  expect(lib.book.current === 1, `26 %: página ${lib.book.current}`);
  await drag([[0.94, 0.6], [0.6, 0.6, 500]]);
  expect(lib.book.current === 2, `34 %: página ${lib.book.current}`);
});

test("Rápido hasta la mitad y vuelta atrás: cancela", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.45, 0.5, 60], [0.86, 0.5, 700]]);
  expect(lib.book.current === 1, `página ${lib.book.current}`);
  expect(lib.book.debug.lastGesture?.commit === false, "el gesto debía cancelarse");
});

test("Lento y después acelerar: pasa", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.84, 0.5, 900], [0.4, 0.5, 80]]);
  expect(lib.book.current === 2, `página ${lib.book.current}`);
});

test("Rápido y después frenar (posición final 40 %): pasa", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.6, 0.5, 70], [0.54, 0.5, 800]]);
  expect(lib.book.current === 2, `página ${lib.book.current}`);
});

test("Página anterior arrastrando hacia la derecha", async () => {
  await load();
  await goTo(3);
  await drag([[0.08, 0.6], [0.55, 0.6, 700]]);
  expect(lib.book.current === 2, `página ${lib.book.current}, esperaba 2`);
});

test("Cambio de dirección pasando el origen: no gira", async () => {
  await load();
  await goTo(2);
  await drag([[0.9, 0.5], [0.6, 0.5, 300], [0.98, 0.5, 400]]);
  expect(lib.book.current === 2, `página ${lib.book.current}`);
});

test("Un segundo dedo interrumpe y la hoja vuelve", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.4, 0.5, 400]], {
    beforeEnd: async () => {
      fire("pointerdown", point(0.2, 0.2), { id: 2, primary: false });
      await wait(30);
    },
  });
  expect(lib.book.current === 1, `página ${lib.book.current}`);
});

test("Contacto cancelado por el sistema: la hoja vuelve", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.4, 0.5, 400]], { end: "cancel" });
  expect(lib.book.current === 1, `página ${lib.book.current}`);
});

test("Arrastre con ratón", async () => {
  await load();
  await goTo(1);
  await drag([[0.94, 0.5], [0.5, 0.5, 600]], { type: "mouse" });
  expect(lib.book.current === 2, `página ${lib.book.current}`);
});

test("Tocar un cóctel abre su ficha sin pasar página", async () => {
  await load();
  await goTo(2);
  await tap(doc.querySelector('.dish[data-product="porn-star-martini"]'));
  await wait(600);
  expect(lib.detail.isOpen && lib.detail.current === "porn-star-martini", "la ficha no se abrió");
  expect(lib.book.current === 2, `página ${lib.book.current}`);
  doc.querySelector("#detail [data-close]").click();
  await wait(600);
  expect(!lib.detail.isOpen, "la ficha no se cerró");
  expect(lib.book.current === 2, "volvió a otra página");
  expect(doc.activeElement?.dataset.product === "porn-star-martini", "el foco no volvió al cóctel");
});

test("Arrastrar empezando sobre un cóctel pasa página y no abre la ficha", async () => {
  await load();
  await goTo(2);
  const dish = doc.querySelector('.dish[data-product="caribbeans-spritz"]').getBoundingClientRect();
  const page = lib.book.debug.pageRect;
  const fy = (dish.top + dish.height / 2 - page.top) / page.height;
  await drag([[0.9, fy], [0.4, fy, 600]]);
  expect(lib.book.current === 3, `página ${lib.book.current}`);
  expect(!lib.detail.isOpen, "se abrió la ficha");
});

test("Límites: no hay página antes de la portada ni después de la contraportada", async () => {
  await load();
  await drag([[0.08, 0.5], [0.7, 0.5, 400]]);
  expect(lib.book.current === 0, `portada → ${lib.book.current}`);
  await goTo(6);
  await drag([[0.94, 0.5], [0.3, 0.5, 400]]);
  expect(lib.book.current === 6, `contraportada → ${lib.book.current}`);
  expect(doc.querySelector('[data-turn="next"]').disabled, "‘Siguiente’ debería estar desactivado al final");
});

test("Botones Siguiente / Anterior y teclado", async () => {
  await load();
  doc.querySelector('[data-turn="next"]').click();
  await settle();
  expect(lib.book.current === 1, `siguiente → ${lib.book.current}`);
  doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await settle();
  expect(lib.book.current === 2, `→ ${lib.book.current}`);
  doc.querySelector('[data-turn="prev"]').click();
  await settle();
  expect(lib.book.current === 1, `anterior → ${lib.book.current}`);
});

test("Índice: tocar una categoría lleva a su página", async () => {
  await load();
  await goTo(1);
  await tap(doc.querySelector('[data-goto="4"]'));
  await settle();
  expect(lib.book.current === 4, `página ${lib.book.current}`);
});

test("Top ventas del índice abre la ficha y vuelve al índice", async () => {
  await load();
  await goTo(1);
  const entries = [...doc.querySelectorAll(".top-entry")].map((entry) => entry.dataset.product);
  expect(entries.join(",") === "caribbeans-spritz,porn-star-martini,mojito-frutas", `orden ${entries}`);
  await tap(doc.querySelector('.top-entry[data-product="porn-star-martini"]'));
  await wait(600);
  expect(lib.detail.current === "porn-star-martini", "no abrió la ficha");
  doc.querySelector("#detail [data-close]").click();
  await wait(600);
  expect(!lib.detail.isOpen && lib.book.current === 1, `página ${lib.book.current}`);
});

test("Los títulos revelados conservan sus espacios", async () => {
  await load();
  await goTo(5);
  await wait(900);
  const title = doc.querySelector('.page[data-page="5"] .cat-title');
  expect(title.textContent.trim() === "Sin alcohol", `“${title.textContent}”`);
  expect(title.getBoundingClientRect().width > 0 && visible(title), "título invisible");
});

test("Cambiar de idioma conserva la página", async () => {
  await load();
  await goTo(3);
  doc.querySelector('[data-locale="en"]').click();
  await wait(100);
  expect(lib.book.current === 3, `página ${lib.book.current}`);
  expect(doc.querySelector('.dish[data-product="mojito-clasico"] .dish-name').textContent === "Classic Mojito", "no se tradujo");
  expect(doc.documentElement.lang === "en", "lang no cambió");
});

test("Girar / redimensionar conserva la página (móvil → tablet apaisada → móvil)", async () => {
  await load();
  await goTo(3);
  frame.width = 1180;
  frame.height = 820;
  for (let i = 0; i < 40 && !lib.book.spread; i += 1) {
    await wait(100);
  }
  await settle();
  expect(lib.book.spread, "en apaisado debería mostrar doble página");
  expect(lib.book.current === 3, `página ${lib.book.current}`);
  frame.width = 390;
  frame.height = 844;
  for (let i = 0; i < 40 && lib.book.spread; i += 1) {
    await wait(100);
  }
  await settle();
  expect(!lib.book.spread, "en vertical debería ser una página");
  expect(lib.book.current === 3, `página ${lib.book.current}`);
});

test("Cambio rápido entre productos", async () => {
  await load();
  await goTo(3);
  await tap(doc.querySelector('.dish[data-product="mojito-clasico"]'));
  await wait(120);
  lib.detail.open("caipiroska", doc.querySelector('.dish[data-product="caipiroska"]'));
  await wait(700);
  expect(lib.detail.current === "caipiroska", `ficha de ${lib.detail.current}`);
  expect(doc.querySelector("#detailName").textContent === "Caipiroska", "título equivocado");
  doc.querySelector("#detail [data-close]").click();
  await until(() => !lib.detail.isOpen);
  expect(!lib.detail.isOpen && lib.book.current === 3, "no volvió a la carta");
});

test("Producto sin foto: ficha tipográfica, alérgenos sin inventar", async () => {
  await load();
  await goTo(4);
  await tap(doc.querySelector('.dish[data-product="margarita"]'));
  await wait(600);
  expect(doc.querySelector("#detailSurface").dataset.hero === "type", "debería ser tipográfica");
  expect(doc.querySelector("#detailAllergens").textContent.includes("personal"), "texto de alérgenos");
  expect(doc.querySelector("#detailPrice").textContent.replace(/\s/g, "") === "12€", `precio ${doc.querySelector("#detailPrice").textContent}`);
});

test("Producto con foto (datos de prueba): la foto viaja a la ficha", async () => {
  await load("data=fixture");
  await goTo(2);
  await tap(doc.querySelector('.dish[data-product="porn-star-martini"]'));
  await wait(700);
  const photo = doc.querySelector("#detailHero img");
  expect(doc.querySelector("#detailSurface").dataset.hero === "photo" && photo, "no hay foto en la ficha");
  expect(photo.getBoundingClientRect().width > 300, "la foto no ocupa la cabecera");
});

test("Cóctel: la escena se reproduce una vez y deja ingredientes visibles", async () => {
  await load();
  await goTo(3);
  await tap(doc.querySelector('.dish[data-product="mojito-clasico"]'));
  await wait(450);
  expect(lib.motion.isRunning("scene"), "la escena no arrancó");
  await wait(1700);
  expect(!lib.motion.isRunning("scene"), "la escena no terminó");
  const items = [...doc.querySelectorAll("#detailIngredients li")];
  expect(items.length === 5 && items.every(visible), "ingredientes no visibles");
  expect(!doc.querySelector("#detailReplay").hidden, "falta ‘Ver de nuevo’");
  doc.querySelector("#detail [data-close]").click();
  await wait(600);
  await tap(doc.querySelector('.dish[data-product="mojito-clasico"]'));
  await wait(500);
  expect(!lib.motion.isRunning("scene"), "no debería repetirse sola");
  doc.querySelector("#detailReplay").click();
  await wait(100);
  expect(lib.motion.isRunning("scene"), "‘Ver de nuevo’ no la reproduce");
});

test("Cóctel: cerrar a mitad de la escena no deja nada oculto", async () => {
  await load();
  await goTo(3);
  await tap(doc.querySelector('.dish[data-product="caipirinha"]'));
  await wait(650);
  doc.querySelector("#detail [data-close]").click();
  await wait(600);
  expect(!lib.detail.isOpen, "no se cerró");
  await tap(doc.querySelector('.dish[data-product="caipirinha"]'));
  await wait(700);
  const items = [...doc.querySelectorAll("#detailIngredients li")];
  expect(items.every(visible), "ingredientes ocultos tras interrumpir");
  expect(visible(doc.querySelector("#detailPrice")), "precio oculto");
});

test("Cóctel: cambiar de producto durante la escena", async () => {
  await load();
  await goTo(3);
  await tap(doc.querySelector('.dish[data-product="mojito-frutas"]'));
  await wait(500);
  lib.detail.open("caipiroska", doc.querySelector('.dish[data-product="caipiroska"]'));
  await wait(1900);
  expect(lib.detail.current === "caipiroska", "producto equivocado");
  expect(!lib.motion.isRunning("scene"), "escena colgada");
  expect([...doc.querySelectorAll("#detailIngredients li")].every(visible), "ingredientes ocultos");
});

/* ---------- Run ---------- */

const results = [];
for (const { name, fn } of tests) {
  const item = document.createElement("li");
  item.textContent = name;
  list.append(item);
  const started = performance.now();
  try {
    await fn();
    item.className = "pass";
    results.push({ name, ok: true });
  } catch (error) {
    item.className = "fail";
    item.textContent += ` — ${error.message}`;
    results.push({ name, ok: false, error: error.message });
  }
  item.title = `${Math.round(performance.now() - started)} ms`;
}

const failed = results.filter((result) => !result.ok).length;
summary.textContent = failed ? `${failed} de ${results.length} fallan` : `${results.length} de ${results.length} correctas`;
window.__results = results;
