// CocktailMotion · configuration of the four signature drinks that come alive on their own photo.
// Keyed by the real product id (data/carta.js). Tiny on purpose: it only says which drinks have a
// motion and how it plays; the engine (cocktail-motion.js) and the photos load when a sheet opens.
//
// Units, so the same numbers work at any screen size:
//   x  → % of the photo's width        y, sizes, speeds → % of the photo's height (per s, per s²)
// Photos: assets/cocktails/<id>-<720|1200>.webp, cropped to the drink. Sprites: real pieces of
// crushed ice cut from the mojito photos and turned translucent (see libro/README.md).

const ASSETS = "../assets/cocktails/";

export const COCKTAIL_MOTION = {
  // A. Ice drop & sparkle: a small piece of ice falls through the mouth of the glass (behind the
  //    front rim), breaks the surface, a contained crown of drops, ripples on the meniscus, bubbles,
  //    the glass catches the light. Ends on the untouched photo.
  "caribbeans-spritz": {
    photo: { base: `${ASSETS}caribbeans-spritz`, aspect: 545 / 1200 },
    duration: 1.3,
    markers: { impact: 0.42, settle: 0.95 },
    // only what is really in front of the falling ice: the front of the rim and the long reflection
    // on the near side of the bowl (the back wall's reflections stay behind it)
    frontGlass: [
      [[17, 2.6], [83, 2.6], [83, 5.4], [50, 6.2], [17, 5.4]],
      [[27, 3.4], [37, 3.4], [36.5, 13], [33, 22], [30, 32], [27, 47], [19, 47], [22, 30], [25, 15]],
    ],
    // inside the bowl, above and around the surface: drops never leave it
    interior: [[21, 3.6], [79, 3.6], [87, 10], [92, 18], [80, 22], [20, 22], [8, 18], [13, 10]],
    surface: [[9, 12.4], [20, 13.1], [30, 13.2], [50, 13.5], [70, 13.0], [88, 12.4]], // the meniscus, measured on the photo
    fall: {
      kind: "ice",
      sprite: `${ASSETS}clear-ice.webp`, // a clear cube (crushed ice is frosted, wrong for a spritz)
      tint: "rgba(255, 170, 100, 0.16)", // the warm light of this photo
      width: 10, // % of height: the size of the cubes already in the glass (measured: ~11 %)
      x: 33, // goes in just behind the glass' long reflection, beside the other cubes
      fromX: 44, // it comes in at a slight angle, well inside the rim
      start: 0.1,
      from: -22,
      to: 8.6, // its centre when it touches the surface
      spin: -0.7,
      after: "plunge",
      depth: 7,
      submergedTint: "rgba(255, 186, 118, 0.6)", // under the surface it takes the drink's colour
    },
    ripple: { cx: 33, cy: 13.1, k: 0.11, amplitude: 1.2, wavelength: 4.4, speed: 30, damping: 0.4, shade: 1.3, region: [8, 9, 84, 8], band: 2.4 },
    // same gravity as the falling ice (a gentle slow motion): drops rise 2–6 % of the glass
    splash: { count: 16, jets: 2, speed: [55, 95], spread: 0.7, size: [0.3, 0.7], sample: [20, 17], gravity: 560 },
    bubbles: { count: 14, region: [24, 15, 18, 11], rise: [7, 13], size: [0.16, 0.36], start: 0.5, life: [0.35, 0.6] },
    glint: { at: 0.46, duration: 0.55, strength: 0.4 },
  },

  // B. Golden drop: no ice in a martini glass. A drop of the drink falls onto the foam, a dimple
  //    and a fine ring run across it, a few flecks of foam jump, a warm light crosses the drink.
  "porn-star-martini": {
    photo: { base: `${ASSETS}porn-star-martini`, aspect: 836 / 1184 },
    duration: 1.15,
    markers: { impact: 0.4, settle: 0.85 },
    interior: [[6, 3.4], [94, 3.4], [94, 11.2], [6, 11.2]], // above the foam, inside the rim
    fall: { kind: "drop", sample: [50, 22], width: 2.8, x: 58, fromX: 58, start: 0.08, from: -14, to: 7.2, spin: 0, after: "absorb" },
    // foam damps everything: a long, low swell rather than sharp rings
    ripple: { ellipse: [50, 7.6, 43, 3.3], cx: 58, cy: 7.4, k: 0.2, amplitude: 0.42, wavelength: 3.4, speed: 16, damping: 0.24, shade: 0.45, shadeLimit: 0.1, region: [5, 3.6, 90, 8.4] },
    splash: { count: 7, jets: 1, speed: [26, 42], spread: 0.7, size: [0.16, 0.3], sample: [50, 7.6], gravity: 560, k: 0.11 },
    sheen: { area: [[9, 12.2], [91, 12.2], [62, 37], [38, 37]], at: 0.5, duration: 0.55, color: "rgba(255, 206, 122, 0.9)", strength: 0.3 },
  },

  // C. Crushed ice & berry splash: a piece of the crushed ice falls on the heap, which gives a
  //    little and settles; a few drops; bubbles rise; the upper mint leaf answers. The
  //    strawberries never move.
  "mojito-frutas": {
    photo: { base: `${ASSETS}mojito-frutas`, aspect: 695 / 1521 },
    duration: 1.45,
    markers: { impact: 0.42, settle: 1 },
    surface: [[8, 19], [92, 19]],
    interior: [[7, 1], [93, 1], [92, 95], [8, 95]],
    fall: { kind: "ice", sprite: `${ASSETS}mojito-frutas-ice.webp`, width: 8, x: 51, fromX: 56, start: 0.1, from: -20, to: 4.2, spin: 0.7, after: "nestle", bounce: 1.6, settle: 2, slide: 0.8 },
    ripple: { mode: "bump", ellipse: [55, 7, 30, 6], cx: 51, cy: 6, k: 0.6, amplitude: 0.5, radius: 7, period: 0.24, damping: 0.25, wavelength: 2, shade: 0.6, region: [22, 0.5, 66, 13] },
    splash: { count: 7, jets: 0, speed: [34, 55], spread: 0.9, size: [0.16, 0.32], sample: [50, 8], gravity: 560, k: 0.4 }, // melt water off the ice
    bubbles: { count: 9, region: [22, 24, 52, 44], rise: [5, 9], size: [0.12, 0.24], start: 0.5, life: [0.4, 0.7] },
    nudge: [{ rect: [3, 23, 26, 18], amount: 0.3, angle: 95, delay: 0.1 }],
  },

  // D. Fresh mint & ice: the same gesture, lighter; the leaves move a pixel or two and a drop of
  //    condensation slides down the outside of the glass.
  "mojito-clasico": {
    photo: { base: `${ASSETS}mojito-clasico`, aspect: 669 / 1535 },
    duration: 1.4,
    markers: { impact: 0.42, settle: 1 },
    surface: [[8, 16.5], [92, 16.5]],
    interior: [[7, 1], [93, 1], [92, 95], [8, 95]],
    fall: { kind: "ice", sprite: `${ASSETS}mojito-clasico-ice.webp`, width: 8, x: 48, fromX: 53, start: 0.1, from: -20, to: 4.4, spin: 0.7, after: "nestle", bounce: 1.6, settle: 2, slide: 0.8 },
    ripple: { mode: "bump", ellipse: [52, 7, 30, 6], cx: 48, cy: 6.3, k: 0.6, amplitude: 0.5, radius: 7, period: 0.24, damping: 0.25, wavelength: 2, shade: 0.6, region: [20, 0.5, 64, 13] },
    splash: { count: 7, jets: 0, speed: [34, 55], spread: 0.9, size: [0.16, 0.32], sample: [50, 8], gravity: 560, k: 0.4 }, // melt water off the ice
    bubbles: { count: 10, region: [25, 22, 50, 50], rise: [5, 9], size: [0.12, 0.25], start: 0.5, life: [0.4, 0.7] },
    nudge: [
      { rect: [40, 22, 40, 16], amount: 0.35, angle: 80, delay: 0.05 },
      { rect: [8, 36, 26, 18], amount: 0.3, angle: 100, delay: 0.12 },
      { rect: [32, 52, 44, 18], amount: 0.3, angle: 70, delay: 0.18 },
    ],
    condensation: { x: 12, from: 34, to: 44, start: 0.55, duration: 0.8, size: 0.7 },
  },
};

export function motionFor(productId) {
  return COCKTAIL_MOTION[productId] || null;
}

/** the lighter photo unless the screen really needs the sharp one */
export function photoSource(config, cssHeight) {
  const pixels = cssHeight * Math.min(window.devicePixelRatio || 1, 3);
  return `${config.photo.base}-${pixels > 860 ? 1200 : 720}.webp`;
}

// Behind every drink: the bar of the cover photo (already downloaded for the cover), out of focus.
export const BACKDROP = { src: "../assets/img/portada-828.webp", position: "52% 10%" };

/** the bar behind the drink: the photo, and where the counter and the glass' shadow fall */
export function placeBackdrop(hero, box) {
  hero.style.setProperty("--drink-backdrop", `url("${new URL(BACKDROP.src, document.baseURI).href}")`);
  hero.style.setProperty("--drink-backdrop-position", BACKDROP.position);
  hero.style.setProperty("--drink-floor", `${Math.round(box.iy + box.ih * 0.985)}px`);
  hero.style.setProperty("--drink-foot", `${Math.round(box.iw * 0.42)}px`);
}

/** where the drink sits in the hero (css px): the static photo and the canvas use the same box */
export function layoutPhoto(config, width, height) {
  const top = Math.max(height * 0.1, 56); // clear of the «back» button: things fall in from there
  const bottom = height * 0.035;
  const room = height - top - bottom;
  const ih = Math.min(room, (width * 0.9) / config.photo.aspect);
  const iw = ih * config.photo.aspect;
  return { ix: (width - iw) / 2, iy: top + (room - ih) / 2, iw, ih };
}
