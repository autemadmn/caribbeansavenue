// ProductDetail · the editorial product sheet, opened from any product in the book.
// - The book underneath is never touched, so closing returns to the exact same page.
// - Content is written before any animation starts: if motion is off or fails, it is all there.
// - Cocktails with an `experience` get the microscene: it plays every time the sheet opens, and
//   again whenever the drink itself is tapped.
// - The four signature drinks (cocktail/motion-config.js) show their photograph instead, which
//   comes alive for an instant (CocktailMotion). Without motion, the photo simply stays still.

import { DURATION } from "./motion.js";
import { createSharedTransition } from "./shared-transition.js";
import { layoutPhoto, motionFor, photoSource } from "./cocktail/motion-config.js";

const MAX_STEP = 0.05; // s of scene time per frame, at most

export function createProductDetail({ dialog, menu, motion, textMotion, config, getLocale, backdrop, onFallbackFocus }) {
  const surface = dialog.querySelector("#detailSurface");
  const hero = dialog.querySelector("#detailHero");
  const nameEl = dialog.querySelector("#detailName");
  const priceEl = dialog.querySelector("#detailPrice");
  const descriptionEl = dialog.querySelector("#detailDescription");
  const ingredientsEl = dialog.querySelector("#detailIngredients");
  const allergensEl = dialog.querySelector("#detailAllergens");
  const metaEl = dialog.querySelector("#detailMeta");
  const transition = createSharedTransition(motion);

  let state = null; // { product, source, scene, closing }
  let experienceModule = null;
  let drinkModule = null;

  const loadExperience = () => {
    experienceModule ||= import("./cocktail/experience.js").catch((error) => {
      experienceModule = null;
      throw error;
    });
    return experienceModule;
  };

  const loadDrinkMotion = () => {
    drinkModule ||= import("./cocktail/cocktail-motion.js").catch((error) => {
      drinkModule = null;
      throw error;
    });
    return drinkModule;
  };

  /* ---------- Content ---------- */

  function fill(product, locale) {
    const t = menu.t(locale);
    nameEl.textContent = menu.text(product.name, locale);
    priceEl.textContent = menu.price(product.price, locale);
    descriptionEl.textContent = menu.text(product.description, locale);

    ingredientsEl.replaceChildren(
      ...product.ingredients.map((ingredient) => {
        const item = document.createElement("li");
        item.textContent = menu.text(ingredient, locale);
        return item;
      }),
    );
    ingredientsEl.closest(".detail-section").hidden = product.ingredients.length === 0;

    allergensEl.textContent = Array.isArray(product.allergens)
      ? product.allergens.length
        ? product.allergens.map((allergen) => menu.text(allergen, locale)).join(", ")
        : "—"
      : t.allergensUnknown;

    const where = t.inMenu(menu.text(product.category.title, locale), product.category.page + 1);
    metaEl.replaceChildren(document.createTextNode(where));
    if (product.top) {
      const mark = document.createElement("span");
      mark.className = "detail-top";
      mark.textContent = t.topSellers;
      metaEl.append(mark);
    }

    dialog.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = t[element.dataset.i18n];
      if (typeof value === "string") {
        element.textContent = value;
      }
    });
  }

  function heroKind(product) {
    if (config.features.cocktailExperience && motionFor(product.id)) {
      return "drink";
    }
    if (config.features.cocktailExperience && product.experience) {
      return "scene";
    }
    return product.photo ? "photo" : "type";
  }

  const isAnimated = (kind) => kind === "scene" || kind === "drink";

  function buildHero(product, kind, locale) {
    hero.replaceChildren();
    surface.dataset.hero = kind;

    if (kind === "photo") {
      const img = document.createElement("img");
      img.src = product.photo.src;
      img.srcset = product.photo.srcset;
      img.sizes = "100vw";
      img.alt = menu.text(product.photo.alt, locale) || "";
      img.className = "detail-photo";
      hero.append(img);
      return { photo: img };
    }

    if (kind === "drink") {
      // The photograph first: it is the whole sheet if motion is off or the effect can't load.
      const drink = document.createElement("img");
      drink.className = "detail-drink";
      drink.alt = menu.text(product.name, locale);
      drink.decoding = "async";
      hero.append(drink);
      if (!motion.enabled) {
        return { drink };
      }
      const canvas = document.createElement("canvas");
      canvas.className = "detail-scene";
      canvas.setAttribute("aria-hidden", "true");
      const replay = document.createElement("button");
      replay.type = "button";
      replay.className = "detail-replay";
      replay.id = "detailReplay";
      replay.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/></svg><span></span>';
      replay.querySelector("span").textContent = menu.t(locale).replay;
      hero.append(canvas, replay);
      return { drink, canvas };
    }

    if (kind === "scene") {
      const canvas = document.createElement("canvas");
      canvas.className = "detail-scene";
      canvas.setAttribute("aria-hidden", "true");
      hero.append(canvas);
      return { canvas };
    }

    return {};
  }

  /** once the sheet is on screen and the hero has its size: pick the photo and place it */
  function placeDrink(product, drink) {
    const cfg = motionFor(product.id);
    const { width, height } = hero.getBoundingClientRect();
    const box = layoutPhoto(cfg, width, height);
    Object.assign(drink.style, { left: `${box.ix}px`, top: `${box.iy}px`, width: `${box.iw}px`, height: `${box.ih}px` });
    drink.src = photoSource(cfg, box.ih);
  }

  /* ---------- Scene ---------- */

  async function createScene(product, kind, heroParts) {
    if (kind === "drink") {
      const module = await loadDrinkMotion();
      return module.createDrinkScene(heroParts.canvas, heroParts.drink, motionFor(product.id), product);
    }
    const module = await loadExperience();
    const factory = module.EXPERIENCES[product.experience.type];
    return factory ? factory(heroParts.canvas, product) : null;
  }

  async function startScene(product, kind, heroParts, { autoplay }) {
    let scene = null;
    try {
      scene = await createScene(product, kind, heroParts);
    } catch {
      scene = null;
    }

    if (state?.product !== product) {
      scene?.destroy(); // closed or switched while loading
      return;
    }

    if (!scene) {
      // couldn't load: the sheet still has everything (the drinks keep their still photo)
      if (kind === "drink") {
        heroParts.canvas.remove();
        hero.querySelector(".detail-replay")?.remove();
      } else {
        surface.dataset.hero = "type";
        hero.replaceChildren();
      }
      return;
    }

    state.scene = scene;

    // The first callback only reports the size already drawn: rebuilding then (mid-scene) cost a
    // second full setup right while the ice was falling.
    const resize = new ResizeObserver(() => {
      if (scene.resize() && !motion.isRunning("scene")) {
        scene.draw(scene.duration);
      }
    });
    resize.observe(heroParts.canvas);
    state.cleanup = () => resize.disconnect();

    if (autoplay && motion.enabled) {
      // The clock starts once the sheet has opened and the first frame is on screen: building the
      // layers and the canvas' first GPU frame can block a phone for half a second, and that used
      // to happen inside the fall, so the ice appeared already in the glass.
      const opened = (performance.now() - state.openedAt) / 1000;
      playScene(scene, { delay: Math.max(0.12, DURATION.open + 0.06 - opened), withText: true, after: painted() });
    } else {
      scene.draw(scene.duration);
    }
  }

  const painted = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  /**
   * The drink keeps its own clock, driven frame by frame and never advancing more than MAX_STEP
   * per frame: a slow frame slows the drink down for an instant instead of skipping the fall.
   */
  function playScene(scene, { delay = 0, withText = false, after = null } = {}) {
    const timeline = motion.timeline("scene", { paused: true });
    if (!timeline) {
      scene.draw(scene.duration);
      return;
    }

    const clock = { t: 0 };
    scene.draw(0);
    timeline.to(clock, { t: scene.duration, duration: scene.duration, ease: "none", onUpdate: () => scene.draw(clock.t) }, 0);

    if (withText) {
      // Name and ingredients arrive with the drink: name as the ice lands, ingredients as it settles.
      textMotion.sequence([priceEl, descriptionEl], { timeline, at: scene.markers.impact - 0.15, stagger: 0.06, distance: 8 });
      textMotion.sequence([...ingredientsEl.children], { timeline, at: scene.markers.impact + 0.12, stagger: 0.08, distance: 6 });
    }

    const { ticker } = motion.gsap;
    let elapsed = -delay;
    const tick = (time, deltaTime) => {
      if (motion.current("scene") !== timeline) {
        ticker.remove(tick); // finished, closed or replaced
        return;
      }
      elapsed += Math.min(deltaTime / 1000, MAX_STEP);
      timeline.time(Math.min(Math.max(elapsed, 0), timeline.duration()));
      if (elapsed >= timeline.duration()) {
        ticker.remove(tick);
        motion.finish("scene");
      }
    };
    Promise.resolve(after).then(() => {
      if (motion.current("scene") === timeline) {
        ticker.add(tick);
      }
    });
  }

  // Tapping the drink pours it again.
  hero.addEventListener("click", () => {
    if (state?.scene && !state.closing) {
      playScene(state.scene);
    }
  });

  /* ---------- Open / close ---------- */

  function partsFor(product, source, heroParts) {
    const kind = surface.dataset.hero;
    const restForScene = [metaEl, ...dialog.querySelectorAll(".detail-section h3"), allergensEl, dialog.querySelector(".detail-bar")];
    const restDefault = [dialog.querySelector(".detail-bar"), hero, priceEl, descriptionEl, ...dialog.querySelectorAll(".detail-section"), metaEl];
    const scenePlaysText = isAnimated(kind) && motion.enabled;

    return {
      source,
      surface,
      backdrop,
      title: nameEl,
      sourceTitle: source?.querySelector(".dish-name, .top-entry-name") || null,
      photo: heroParts.photo || null,
      sourcePhoto: source?.querySelector("img") || null,
      // only what is painted: GSAP re-parents hidden elements to measure them
      rest: (scenePlaysText ? restForScene : restDefault).filter((element) => element && !element.hidden && element.getClientRects().length > 0),
      scenePlaysText,
    };
  }

  function open(productId, source) {
    const product = menu.products.get(productId);
    if (!product) {
      return;
    }

    // Switching product while a sheet is open or closing: settle everything first.
    if (state) {
      motion.finish("detail");
      motion.finish("scene");
      teardownScene();
    }

    const locale = getLocale();
    fill(product, locale);
    const kind = heroKind(product);
    const heroParts = buildHero(product, kind, locale);

    const wasOpen = dialog.open;
    state = { product, source, scene: null, cleanup: null, openedAt: performance.now() };

    if (!wasOpen) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    }
    surface.scrollTop = 0;
    dialog.querySelector("[data-close]").focus({ preventScroll: true });
    if (heroParts.drink) {
      placeDrink(product, heroParts.drink);
    }

    const parts = partsFor(product, source, heroParts);
    if (!wasOpen) {
      transition.open(parts, motion.timeline("detail"));
    }

    if (heroParts.canvas) {
      startScene(product, kind, heroParts, { autoplay: parts.scenePlaysText });
    }
  }

  function teardownScene() {
    state?.cleanup?.();
    state?.scene?.destroy();
    if (state) {
      state.scene = null;
      state.cleanup = null;
    }
  }

  function finishClose(source) {
    teardownScene();
    state = null;
    hero.replaceChildren();
    surface.removeAttribute("style");
    backdrop.removeAttribute("style");
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    if (source?.isConnected) {
      source.focus({ preventScroll: true });
    } else {
      onFallbackFocus?.();
    }
  }

  function close() {
    if (!state || state.closing) {
      return;
    }
    state.closing = true;
    const { product, source } = state;
    motion.finish("scene");
    motion.finish("detail");

    const parts = partsFor(product, source, {});
    parts.rest = [hero, priceEl, descriptionEl, ...dialog.querySelectorAll(".detail-section"), metaEl].filter(
      (element) => !element.hidden && element.getClientRects().length > 0,
    );
    const timeline = motion.timeline("detail", { onComplete: () => finishClose(source) });
    if (!transition.close(parts, timeline)) {
      finishClose(source);
    }
  }

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) {
      close();
    }
  });

  return {
    open,
    close,
    get isOpen() {
      return Boolean(state);
    },
    get current() {
      return state?.product.id || null;
    },
    /** for review and tests: the scene on screen (draw(t) renders any instant) */
    get scene() {
      return state?.scene || null;
    },
    /** fetch the scene code ahead of time (idle), so the first sheet doesn't wait for it */
    prepare() {
      loadExperience().catch(() => {});
    },
  };
}
