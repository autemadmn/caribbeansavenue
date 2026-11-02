// ProductDetail · the editorial product sheet, opened from any product in the book.
// - The book underneath is never touched, so closing returns to the exact same page.
// - Content is written before any animation starts: if motion is off or fails, it is all there.
// - Cocktails with an `experience` get the microscene; it plays by itself the first time a product
//   is opened in a session, after that it shows its final frame and offers "Ver de nuevo".

import { createSharedTransition } from "./shared-transition.js";

const SEEN_KEY = "ed-scene-seen:";

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // private mode: the scene will simply autoplay again
  }
}

export function createProductDetail({ dialog, menu, motion, textMotion, config, getLocale, backdrop, onFallbackFocus }) {
  const surface = dialog.querySelector("#detailSurface");
  const hero = dialog.querySelector("#detailHero");
  const nameEl = dialog.querySelector("#detailName");
  const priceEl = dialog.querySelector("#detailPrice");
  const descriptionEl = dialog.querySelector("#detailDescription");
  const ingredientsEl = dialog.querySelector("#detailIngredients");
  const allergensEl = dialog.querySelector("#detailAllergens");
  const metaEl = dialog.querySelector("#detailMeta");
  const replayButton = dialog.querySelector("#detailReplay");
  const transition = createSharedTransition(motion);

  let state = null; // { product, source, scene, closing }
  let experienceModule = null;

  const loadExperience = () => {
    experienceModule ||= import("./cocktail/experience.js").catch((error) => {
      experienceModule = null;
      throw error;
    });
    return experienceModule;
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
    if (config.features.cocktailExperience && product.experience) {
      return "scene";
    }
    return product.photo ? "photo" : "type";
  }

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

    if (kind === "scene") {
      const canvas = document.createElement("canvas");
      canvas.className = "detail-scene";
      canvas.setAttribute("aria-hidden", "true");
      hero.append(canvas);
      return { canvas };
    }

    return {};
  }

  /* ---------- Scene ---------- */

  async function startScene(product, canvas, { autoplay }) {
    let module;
    try {
      module = await loadExperience();
    } catch {
      surface.dataset.hero = "type"; // couldn't load: the sheet still has everything
      hero.replaceChildren();
      return;
    }

    if (state?.product !== product) {
      return; // closed or switched while loading
    }

    const factory = module.EXPERIENCES[product.experience.type];
    if (!factory) {
      surface.dataset.hero = "type";
      hero.replaceChildren();
      return;
    }

    const scene = factory(canvas, product);
    state.scene = scene;
    replayButton.hidden = !motion.enabled; // nothing to replay when motion is reduced

    const resize = new ResizeObserver(() => {
      scene.resize();
      if (!motion.isRunning("scene")) {
        scene.draw(scene.duration);
      }
    });
    resize.observe(canvas);
    state.cleanup = () => resize.disconnect();

    if (autoplay && motion.enabled) {
      sessionSet(SEEN_KEY + product.id);
      playScene(scene, { delay: 0.18, withText: true });
    } else {
      scene.draw(scene.duration);
    }
  }

  function playScene(scene, { delay = 0, withText = false } = {}) {
    const timeline = motion.timeline("scene", { delay });
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
  }

  replayButton.addEventListener("click", () => {
    if (state?.scene) {
      playScene(state.scene);
    }
  });

  /* ---------- Open / close ---------- */

  function partsFor(product, source, heroParts) {
    const kind = surface.dataset.hero;
    const restForScene = [metaEl, replayButton, ...dialog.querySelectorAll(".detail-section h3"), allergensEl, dialog.querySelector(".detail-bar")];
    const restDefault = [dialog.querySelector(".detail-bar"), hero, priceEl, descriptionEl, ...dialog.querySelectorAll(".detail-section"), metaEl];
    const scenePlaysText = kind === "scene" && !sessionGet(SEEN_KEY + product.id) && motion.enabled;

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
    replayButton.hidden = true;

    const wasOpen = dialog.open;
    state = { product, source, scene: null, cleanup: null };

    if (!wasOpen) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    }
    surface.scrollTop = 0;
    dialog.querySelector("[data-close]").focus({ preventScroll: true });

    const parts = partsFor(product, source, heroParts);
    if (!wasOpen) {
      transition.open(parts, motion.timeline("detail"));
    }

    if (kind === "scene") {
      startScene(product, heroParts.canvas, { autoplay: parts.scenePlaysText });
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
    parts.rest = [hero, priceEl, descriptionEl, ...dialog.querySelectorAll(".detail-section"), metaEl, replayButton].filter(
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
  };
}
