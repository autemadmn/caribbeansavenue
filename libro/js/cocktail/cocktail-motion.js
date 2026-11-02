// CocktailMotion · the signature drinks come alive for an instant, on their own photograph.
// Loaded with import() only when one of them opens (config in motion-config.js).
//
// Why this way: the realism has to come from the photo itself, not from drawn shapes. So every
// effect either moves the photo's own pixels or is lit and coloured from them:
// - ripples and the settling of crushed ice warp the photo pixel by pixel (displacement + the
//   light catching each crest), only where the liquid is, fading to nothing at the glass;
// - what falls is a real piece of crushed ice cut from the mojito photos (made translucent), or a
//   drop whose colour, refraction and highlight come from the drink;
// - drops and bubbles take the colour of the liquid at the point of impact and stay inside the glass;
// - the glass in front is the photo's own highlights, redrawn over whatever falls in, so the ice
//   really goes behind the rim; the same layer catches a sweep of light afterwards.
// No 3D, no physics engine, no video: Canvas 2D at most 2× density, a few dozen particles.
// The scene is a pure function of time (draw(t)); the last frame is exactly the untouched photo.

import { layoutPhoto, placeBackdrop } from "./motion-config.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

function seeded(text) {
  let seed = 2166136261;
  for (const char of text) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().then(() => img);
}

function release(...canvases) {
  for (const canvas of canvases) {
    if (canvas instanceof HTMLCanvasElement) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

/** piecewise-linear y of a polyline [[x, y], …] at x */
function lineAt(points, x) {
  if (x <= points[0][0]) {
    return points[0][1];
  }
  for (let i = 1; i < points.length; i += 1) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return points[points.length - 1][1];
}

/** sprite tinted with a colour, alpha kept (multiply = seen through the liquid; source-atop = light) */
function tinted(image, color, mode) {
  const canvas = makeCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(image, 0, 0);
  return canvas;
}

export async function createDrinkScene(canvas, photo, config, product) {
  const [sprite] = await Promise.all([
    config.fall?.sprite ? loadImage(config.fall.sprite) : null,
    photo.complete && photo.naturalWidth ? null : photo.decode(),
  ]);

  const ctx = canvas.getContext("2d");
  const { duration, markers } = config;
  const impact = markers.impact;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let L = null; // where the photo sits, css px
  let base = null;
  let ready = false;
  let paths = {};
  let liquid = [230, 110, 30];
  let dropColor = liquid;
  let nudges = [];
  let condensation = null;
  let spec = null; // the glass' own highlights
  let glint = null;
  let ripple = null;
  let fallSprites = null;
  let drops = [];
  let bubbles = [];

  const X = (x) => L.ix + (x / 100) * L.iw;
  const Y = (y) => L.iy + (y / 100) * L.ih;
  const U = (v) => (v / 100) * L.ih;

  function pathOf(points) {
    const path = new Path2D();
    points.forEach(([x, y], index) => (index ? path.lineTo(X(x), Y(y)) : path.moveTo(X(x), Y(y))));
    path.closePath();
    return path;
  }

  function deviceBox(points) {
    const xs = points.map(([x]) => X(x) * dpr);
    const ys = points.map(([, y]) => Y(y) * dpr);
    const x0 = clamp(Math.floor(Math.min(...xs)), 0, canvas.width - 1);
    const y0 = clamp(Math.floor(Math.min(...ys)), 0, canvas.height - 1);
    const x1 = clamp(Math.ceil(Math.max(...xs)), x0 + 1, canvas.width);
    const y1 = clamp(Math.ceil(Math.max(...ys)), y0 + 1, canvas.height);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function sampleColor(data, x, y) {
    const cx = Math.round(X(x) * dpr);
    const cy = Math.round(Y(y) * dpr);
    const sum = [0, 0, 0];
    let n = 0;
    for (let j = -3; j <= 3; j += 1) {
      for (let i = -3; i <= 3; i += 1) {
        const px = clamp(cx + i, 0, data.width - 1);
        const py = clamp(cy + j, 0, data.height - 1);
        const k = (py * data.width + px) * 4;
        if (data.data[k + 3] > 200) {
          sum[0] += data.data[k];
          sum[1] += data.data[k + 1];
          sum[2] += data.data[k + 2];
          n += 1;
        }
      }
    }
    return n ? sum.map((value) => Math.round(value / n)) : liquid;
  }

  /* ---------- setup: everything heavy happens here, before the clock starts ---------- */

  function setup() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    L = layoutPhoto(config, W, H);
    // the <img> underneath (the fallback, and what screen readers skip) sits exactly where we draw
    Object.assign(photo.style, { left: `${L.ix}px`, top: `${L.iy}px`, width: `${L.iw}px`, height: `${L.ih}px` });
    if (photo.parentElement) {
      placeBackdrop(photo.parentElement, L);
    }

    base = makeCanvas(canvas.width, canvas.height);
    const b = base.getContext("2d");
    b.imageSmoothingQuality = "high";
    b.drawImage(photo, L.ix * dpr, L.iy * dpr, L.iw * dpr, L.ih * dpr);
    const data = b.getImageData(0, 0, base.width, base.height); // read back once

    const random = seeded(product.id);
    let front = null;
    if (config.frontGlass) {
      front = new Path2D();
      config.frontGlass.forEach((polygon) => front.addPath(pathOf(polygon)));
    }
    paths = {
      front,
      interior: config.interior ? pathOf(config.interior) : null,
    };
    if (config.splash) {
      liquid = sampleColor(data, ...config.splash.sample);
    }
    dropColor = config.fall?.sample ? sampleColor(data, ...config.fall.sample) : liquid;

    setupSpec(data);
    setupNudges();
    setupCondensation();
    setupRipple(data);
    setupFall();
    setupDrops(random);
    setupBubbles(random);
  }

  // The glass' highlights: bright, colourless pixels of the photo (rim, reflections, the streak).
  function setupSpec(data) {
    spec = null;
    glint = null;
    if (!config.frontGlass) {
      return;
    }
    const box = deviceBox(config.frontGlass.flat());
    const out = new ImageData(box.w, box.h);
    for (let j = 0; j < box.h; j += 1) {
      let k = ((box.y + j) * data.width + box.x) * 4;
      let o = j * box.w * 4;
      for (let i = 0; i < box.w; i += 1, k += 4, o += 4) {
        const r = data.data[k];
        const g = data.data[k + 1];
        const bl = data.data[k + 2];
        const max = Math.max(r, g, bl);
        const min = Math.min(r, g, bl);
        const sat = max ? (max - min) / max : 0;
        const amount = smooth(150, 236, max) * (1 - 0.92 * sat) * (data.data[k + 3] / 255);
        out.data[o] = r;
        out.data[o + 1] = g;
        out.data[o + 2] = bl;
        out.data[o + 3] = Math.round(amount * 255);
      }
    }
    const layer = makeCanvas(box.w, box.h);
    layer.getContext("2d").putImageData(out, 0, 0);
    spec = { canvas: layer, box };
    glint = makeCanvas(box.w, box.h);
  }

  // Ripples: per-pixel displacement of a small region, weighted by an envelope that is 1 on the
  // liquid surface and 0 on glass, ice above the liquid and background.
  function setupRipple(data) {
    ripple = null;
    const R = config.ripple;
    if (!R) {
      return;
    }
    const [rx, ry, rw, rh] = R.region;
    const box = deviceBox([[rx, ry], [rx + rw, ry + rh]]);
    const src = new ImageData(box.w, box.h);
    for (let j = 0; j < box.h; j += 1) {
      const from = ((box.y + j) * data.width + box.x) * 4;
      src.data.set(data.data.subarray(from, from + box.w * 4), j * box.w * 4);
    }
    const envelope = new Float32Array(box.w * box.h);
    const band = R.band ? U(R.band) : 0;
    for (let j = 0; j < box.h; j += 1) {
      for (let i = 0; i < box.w; i += 1) {
        const cssX = (box.x + i) / dpr;
        const cssY = (box.y + j) / dpr;
        const xPct = ((cssX - L.ix) / L.iw) * 100;
        let e;
        if (R.ellipse) {
          const [ex, ey, erx, ery] = R.ellipse;
          const d = Math.hypot((xPct - ex) / erx, (((cssY - L.iy) / L.ih) * 100 - ey) / ery);
          e = 1 - smooth(0.82, 1, d);
        } else {
          const surface = Y(lineAt(config.surface, xPct));
          e = 1 - smooth(band * 0.45, band, Math.abs(cssY - surface));
          // fade out towards the walls
          const ends = config.surface;
          e *= smooth(ends[0][0], ends[0][0] + 6, xPct) * (1 - smooth(ends[ends.length - 1][0] - 6, ends[ends.length - 1][0], xPct));
        }
        envelope[j * box.w + i] = e * (src.data[(j * box.w + i) * 4 + 3] / 255);
      }
    }
    const canvasR = makeCanvas(box.w, box.h);
    ripple = { box, src, dst: new ImageData(box.w, box.h), envelope, canvas: canvasR, ctx: canvasR.getContext("2d") };
  }

  function setupFall() {
    fallSprites = null;
    const F = config.fall;
    if (!F || !sprite) {
      return; // a liquid drop needs no sprite: it is drawn from the drink's colour
    }
    // its silhouette, solid: what it refracts is seen through all of it, not only through its rim
    const silhouette = makeCanvas(sprite.width, sprite.height);
    const s = silhouette.getContext("2d");
    s.filter = "blur(0.6px)";
    for (let pass = 0; pass < 6; pass += 1) {
      s.drawImage(sprite, 0, 0);
    }
    const size = U(F.width) * dpr * 1.2;
    const lens = makeCanvas(size, (size * sprite.height) / sprite.width);
    fallSprites = {
      air: F.tint ? tinted(sprite, F.tint, "source-atop") : sprite,
      under: F.submergedTint ? tinted(sprite, F.submergedTint, "source-atop") : null,
      silhouette,
      lens,
    };
  }

  // A clear cube is seen by what it does to the light behind it: the scene through it appears
  // upside down and smaller, darker towards the edges. Drawn from the photo itself.
  function drawRefraction(x, y, size, rotation, alpha) {
    const { lens, silhouette } = fallSprites;
    const l = lens.getContext("2d");
    const w = lens.width;
    const h = lens.height;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "copy";
    l.translate(w / 2, h / 2);
    l.scale(-0.72, -0.72);
    l.drawImage(base, -x * dpr, -y * dpr);
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "source-atop"; // darken only what is seen through it
    const edge = l.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.55);
    edge.addColorStop(0, "rgba(0, 0, 0, 0.08)");
    edge.addColorStop(1, "rgba(0, 0, 0, 0.7)");
    l.fillStyle = edge;
    l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = "destination-in";
    l.translate(w / 2, h / 2);
    l.rotate(rotation);
    const sw = size * dpr;
    const sh = (sw * silhouette.height) / silhouette.width;
    l.drawImage(silhouette, -sw / 2, -sh / 2, sw, sh);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.drawImage(lens, x - w / 2 / dpr, y - h / 2 / dpr, w / dpr, h / dpr);
    ctx.restore();
  }

  // A contained crown of drops where the ice breaks the surface, then a jet or two from the centre.
  function setupDrops(random) {
    drops = [];
    const S = config.splash;
    if (!S) {
      return;
    }
    const k = S.k ?? config.ripple?.k ?? 0.12;
    const x0 = X(config.fall.x);
    const y0 = Y(config.fall.to);
    for (let i = 0; i < S.count; i += 1) {
      const angle = (i / S.count) * TAU + (random() - 0.5) * 0.5;
      const speed = U(lerp(S.speed[0], S.speed[1], random()));
      const outward = speed * S.spread * (0.55 + random() * 0.45);
      const up = speed * (0.55 + random() * 0.45);
      drops.push({
        x: x0 + Math.cos(angle) * U(0.6),
        y: y0 + Math.sin(angle) * U(0.6) * k,
        vx: Math.cos(angle) * outward,
        vy: -up + Math.sin(angle) * outward * k,
        t0: impact + random() * 0.035,
        size: U(lerp(S.size[0], S.size[1], random() ** 1.6)),
      });
    }
    for (let i = 0; i < (S.jets || 0); i += 1) {
      drops.push({
        x: x0 + (random() - 0.5) * U(0.3),
        y: y0,
        vx: (random() - 0.5) * U(4),
        vy: -U(S.speed[1] * (1.05 + i * 0.18)),
        t0: impact + 0.09 + i * 0.03,
        size: U(S.size[1] * (1.15 - i * 0.2)),
      });
    }
    const g = U(S.gravity);
    drops.forEach((drop) => {
      drop.life = (-2 * drop.vy) / g;
    });
  }

  function setupBubbles(random) {
    bubbles = [];
    const B = config.bubbles;
    if (!B) {
      return;
    }
    const [bx, by, bw, bh] = B.region;
    for (let i = 0; i < B.count; i += 1) {
      bubbles.push({
        x: X(bx + random() * bw),
        y: Y(by + random() * bh),
        rise: U(lerp(B.rise[0], B.rise[1], random())),
        size: U(lerp(B.size[0], B.size[1], random() ** 1.5)),
        t0: B.start + random() * 0.3,
        life: lerp(B.life[0], B.life[1], random()),
        phase: random() * TAU,
      });
    }
  }

  // Mint leaves that answer the impact: a patch of the photo around the leaf moves a pixel or
  // two inside a soft oval mask, so nothing is cut out and no edge shows.
  function setupNudges() {
    nudges = (config.nudge || []).map((N) => {
      const box = deviceBox([[N.rect[0], N.rect[1]], [N.rect[0] + N.rect[2], N.rect[1] + N.rect[3]]]);
      const mask = makeCanvas(box.w, box.h);
      const m = mask.getContext("2d");
      // a circle squeezed into the patch's proportions: an oval, solid in the middle, soft edge
      const oval = m.createRadialGradient(box.w / 2, box.w / 2, 0, box.w / 2, box.w / 2, box.w / 2);
      oval.addColorStop(0, "rgba(0,0,0,1)");
      oval.addColorStop(0.6, "rgba(0,0,0,1)");
      oval.addColorStop(1, "rgba(0,0,0,0)");
      m.setTransform(1, 0, 0, box.h / box.w, 0, 0);
      m.fillStyle = oval;
      m.fillRect(0, 0, box.w, box.w);
      const patch = makeCanvas(box.w, box.h);
      return { ...N, box, mask, patch };
    });
  }

  function drawNudges(t) {
    for (const nudge of nudges) {
      const te = t - impact - (nudge.delay || 0);
      if (te <= 0) {
        continue;
      }
      const offset = U(nudge.amount) * dpr * Math.sin((TAU * te) / 0.5) * Math.exp(-te / 0.32) * tail(t);
      if (Math.abs(offset) < 0.08) {
        continue;
      }
      const angle = (nudge.angle * Math.PI) / 180;
      const { box, patch, mask } = nudge;
      const p = patch.getContext("2d");
      p.globalCompositeOperation = "copy";
      p.drawImage(base, box.x - Math.cos(angle) * offset, box.y - Math.sin(angle) * offset, box.w, box.h, 0, 0, box.w, box.h);
      p.globalCompositeOperation = "destination-in";
      p.drawImage(mask, 0, 0);
      ctx.drawImage(patch, box.x, box.y);
    }
  }

  // A drop of condensation on the outside of the glass lets go and slides a little way down.
  function setupCondensation() {
    const C = config.condensation;
    condensation = C ? { ...C, lens: makeCanvas(U(C.size) * dpr * 3, U(C.size) * dpr * 3) } : null;
  }

  function drawCondensation(t) {
    const C = condensation;
    const tau = t - C?.start;
    if (!C || tau <= 0 || tau >= C.duration) {
      return;
    }
    const u = tau / C.duration;
    // it holds, lets go, slides and brakes as it leaves water behind
    const travel = smooth(0.12, 1, u) ** 1.4;
    const x = X(C.x);
    const y0 = Y(C.from);
    const y = lerp(y0, Y(C.to), travel);
    const r = U(C.size) / 2;
    const alpha = smooth(0, 0.15, u) * (1 - smooth(0.78, 1, u));
    // the wet trail: the glass is a touch clearer where it has passed
    const trail = ctx.createLinearGradient(x, y0, x, y);
    trail.addColorStop(0, "rgba(255, 255, 255, 0)");
    trail.addColorStop(1, "rgba(255, 255, 255, 0.16)");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = trail;
    ctx.lineWidth = r * 0.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y - r);
    ctx.stroke();
    // the drop is a lens: the glass behind it, upside down, rimmed dark, with one hot highlight
    const l = C.lens.getContext("2d");
    const w = C.lens.width;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "copy";
    l.translate(w / 2, w / 2);
    l.scale(-0.6, -0.6);
    l.drawImage(base, -x * dpr, -y * dpr);
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = "destination-in";
    l.beginPath();
    l.ellipse(w / 2, w / 2, r * dpr, r * dpr * 1.15, 0, 0, TAU);
    l.fill();
    ctx.drawImage(C.lens, x - w / 2 / dpr, y - w / 2 / dpr, w / dpr, w / dpr);
    ctx.strokeStyle = "rgba(20, 30, 10, 0.45)";
    ctx.lineWidth = Math.max(0.5, r * 0.28);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.15, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.45, Math.max(0.45, r * 0.3), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // A warm band of light crosses the drink once (the Porn Star's "golden" moment).
  function drawSheen(t) {
    const S = config.sheen;
    if (!S) {
      return;
    }
    const u = (t - S.at) / S.duration;
    if (u <= 0 || u >= 1) {
      return;
    }
    if (!paths.sheen) {
      paths.sheen = pathOf(S.area);
    }
    const x0 = X(Math.min(...S.area.map(([x]) => x)));
    const x1 = X(Math.max(...S.area.map(([x]) => x)));
    const centre = lerp(x0 - (x1 - x0) * 0.3, x1 + (x1 - x0) * 0.3, smooth(0, 1, u));
    const half = (x1 - x0) * 0.22;
    const band = ctx.createLinearGradient(centre - half, 0, centre + half, 0);
    band.addColorStop(0, "rgba(255, 214, 140, 0)");
    band.addColorStop(0.5, S.color);
    band.addColorStop(1, "rgba(255, 214, 140, 0)");
    ctx.save();
    ctx.clip(paths.sheen);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = S.strength * Math.sin(Math.PI * u);
    ctx.fillStyle = band;
    ctx.fillRect(x0, 0, x1 - x0, H);
    ctx.restore();
  }

  /* ---------- frame ---------- */

  // How much of the scene's motion is left: 0 well before the end, so the last frame is the photo.
  const tail = (t) => 1 - smooth(duration - 0.3, duration - 0.04, t);

  function drawRipple(t) {
    const R = config.ripple;
    const te = t - impact;
    if (!ripple || te <= 0) {
      return;
    }
    const amplitude = U(R.amplitude) * dpr * Math.exp(-te / R.damping) * smooth(0, 0.03, te) * tail(t);
    if (amplitude < 0.04) {
      return;
    }
    const { box, src, dst, envelope } = ripple;
    const bump = R.mode === "bump";
    const lambda = U(R.wavelength) * dpr;
    const front = bump ? Infinity : U(R.speed) * dpr * te + lambda * 0.3;
    const cx = X(R.cx) * dpr - box.x;
    const cy = Y(R.cy) * dpr - box.y;
    const k = R.k;
    const limit = R.shadeLimit ?? 0.3;
    // a ring wave dents the centre first; a settling heap (bump) just gives and recovers there
    const crater = bump ? amplitude * Math.sin((TAU * te) / R.period) : amplitude * 1.6 * Math.exp(-te / 0.09);
    const craterR = bump ? U(R.radius) * dpr : lambda * 0.45;
    const s = src.data;
    const d = dst.data;
    const w = box.w;
    const h = box.h;

    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) {
        const index = j * w + i;
        const o = index * 4;
        const e = envelope[index];
        const dx = i - cx;
        const dy = (j - cy) / k;
        const r = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        if (e < 0.01 || r > front + lambda) {
          d[o] = s[o];
          d[o + 1] = s[o + 1];
          d[o + 2] = s[o + 2];
          d[o + 3] = s[o + 3];
          continue;
        }
        // a damped ring travelling out, plus the dimple left where the ice went in
        const reach = bump ? 0 : Math.exp(-r / (lambda * 3.2)) * smooth(front + lambda, front - lambda * 0.2, r);
        const phase = bump ? 0 : (TAU * (r - front)) / lambda;
        const dimple = crater * Math.exp(-(r * r) / (craterR * craterR));
        const height = (amplitude * reach * Math.sin(phase) - dimple) * e;
        const slope = ((amplitude * reach * Math.cos(phase) * TAU) / lambda + (dimple * 2 * r) / (craterR * craterR)) * e;
        // a crest lifts what is behind it and bends the light: sample above/aside, shade by slope
        const sx = clamp(i - slope * (dx / r) * 0.6, 0, w - 1.001);
        const sy = clamp(j - height - slope * 0.4, 0, h - 1.001);
        const x0 = sx | 0;
        const y0 = sy | 0;
        const fx = sx - x0;
        const fy = sy - y0;
        const a = (y0 * w + x0) * 4;
        const bb = a + 4;
        const c = a + w * 4;
        const dd = c + 4;
        const shade = 1 + clamp(slope * R.shade * 0.5, -limit, limit * 1.25);
        for (let ch = 0; ch < 3; ch += 1) {
          const top = s[a + ch] + (s[bb + ch] - s[a + ch]) * fx;
          const bottom = s[c + ch] + (s[dd + ch] - s[c + ch]) * fx;
          d[o + ch] = (top + (bottom - top) * fy) * shade;
        }
        d[o + 3] = s[o + 3];
      }
    }
    ripple.ctx.putImageData(dst, 0, 0);
    ctx.drawImage(ripple.canvas, box.x, box.y);
  }

  function fallState(t) {
    const F = config.fall;
    const tf = impact - F.start;
    const g = (2 * (F.to - F.from)) / (tf * tf);
    if (t < F.start) {
      return null;
    }
    if (t < impact) {
      const u = t - F.start;
      const x = lerp(F.fromX ?? F.x, F.x, u / tf);
      return { x, y: F.from + 0.5 * g * u * u, vy: g * u, rotation: F.spin * u, alpha: 1, falling: true };
    }
    const te = t - impact;
    const rotation = F.spin * tf + F.spin * 0.12 * (1 - Math.exp(-te / 0.12));
    if (F.after === "plunge") {
      // the water brakes it hard; it sinks a little, buoyancy brings it back, and it is lost among
      // the ice and bubbles of the drink
      const v = g * tf;
      const tau = F.depth / (v * 0.45);
      const y = F.to + F.depth * (1 - Math.exp(-te / tau)) - F.depth * 0.4 * smooth(0.12, 0.6, te);
      return { x: F.x, y, vy: 0, rotation, alpha: 1 - smooth(0.25, 0.7, te), falling: false };
    }
    if (F.after === "nestle") {
      // lands on the crushed ice: a small rebound, it settles into a gap and becomes part of it
      const bounce = F.bounce * Math.abs(Math.sin((Math.PI * te) / 0.16)) * Math.exp(-te / 0.11);
      const y = F.to - bounce + F.settle * smooth(0.08, 0.55, te);
      return { x: F.x + F.slide * smooth(0, 0.4, te), y, vy: 0, rotation: rotation + 0.25 * smooth(0, 0.3, te), alpha: 1 - smooth(0.38, 0.8, te), falling: false };
    }
    return null; // "absorb": a drop simply becomes part of the drink
  }

  function drawSprite(image, x, y, size, rotation, alpha) {
    const width = size;
    const height = (size * image.height) / image.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  // A drop of the drink in the air: a small lens, nearly round, lit from above, with the bright
  // spot where it focuses the light underneath; a short smear while it falls fast.
  function drawLiquidDrop(t) {
    const F = config.fall;
    const state = fallState(t);
    if (!state) {
      return;
    }
    const [r, g, b] = dropColor;
    const radius = U(F.width) / 2;
    const x = X(state.x);
    const y = Y(state.y);
    const speed = U(state.vy);
    const stretch = 1 + Math.min(0.45, speed * 0.0006);
    for (let ghost = 3; ghost >= 1; ghost -= 1) {
      ctx.globalAlpha = 0.12 / ghost;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.ellipse(x, y - speed * ghost * 0.007, radius * 0.9, radius * stretch, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const body = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.25, radius * 0.1, x, y, radius * stretch);
    body.addColorStop(0, `rgba(${Math.min(255, r + 70)}, ${Math.min(255, g + 70)}, ${Math.min(255, b + 50)}, 0.96)`);
    body.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.95)`);
    body.addColorStop(1, `rgba(${Math.round(r * 0.45)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.35)}, 0.95)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * stretch, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 238, 190, 0.85)"; // light focused through the drop
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.12, y + radius * stretch * 0.5, radius * 0.38, radius * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.38, y - radius * 0.42 * stretch, Math.max(0.5, radius * 0.24), 0, TAU);
    ctx.fill();
  }

  function drawFall(t) {
    const F = config.fall;
    const state = fallSprites && fallState(t);
    if (!state || state.alpha <= 0.01) {
      return false;
    }
    const x = X(state.x);
    const y = Y(state.y);
    const size = U(F.width);
    const surface = config.surface ? Y(lineAt(config.surface, F.x)) : H;

    // in the air, with the faint smear a fast object leaves on a camera
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, surface);
    ctx.clip();
    if (state.falling) {
      const speed = U(state.vy);
      for (let ghost = 3; ghost >= 1; ghost -= 1) {
        drawSprite(fallSprites.air, x, y - speed * ghost * 0.006, size, state.rotation - ghost * 0.01, 0.16 / ghost);
      }
    }
    drawRefraction(x, y, size, state.rotation, state.alpha);
    drawSprite(fallSprites.air, x, y, size, state.rotation, state.alpha);
    ctx.restore();

    // below the surface: seen through the drink, and shifted where the surface bends the light
    if (fallSprites.under && y + size > surface) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, surface + 0.5, W, H);
      ctx.clip();
      drawRefraction(x + U(0.35), y + U(0.15), size, state.rotation, state.alpha * 0.9);
      drawSprite(fallSprites.under, x + U(0.35), y + U(0.15), size, state.rotation, state.alpha * 0.82);
      ctx.restore();
    }
    return true;
  }

  function drawBubbles(t) {
    if (!bubbles.length) {
      return;
    }
    ctx.save();
    if (paths.interior) {
      ctx.clip(paths.interior);
    }
    for (const bubble of bubbles) {
      const tau = t - bubble.t0;
      if (tau <= 0 || tau >= bubble.life) {
        continue;
      }
      const y = bubble.y - bubble.rise * tau;
      const x = bubble.x + Math.sin(tau * 19 + bubble.phase) * bubble.size * 0.8;
      const surface = config.surface ? Y(lineAt(config.surface, ((x - L.ix) / L.iw) * 100)) : -Infinity;
      if (y < surface + bubble.size) {
        continue; // reached the top: gone
      }
      const alpha = smooth(0, 0.06, tau) * (1 - smooth(bubble.life * 0.65, bubble.life, tau)) * tail(t);
      const r = bubble.size;
      ctx.globalAlpha = alpha;
      const body = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      body.addColorStop(0, "rgba(255, 236, 205, 0.06)");
      body.addColorStop(0.75, "rgba(255, 228, 190, 0.22)");
      body.addColorStop(1, "rgba(255, 245, 225, 0.75)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(x - r * 0.38, y - r * 0.4, Math.max(0.35, r * 0.28), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDrops(t) {
    if (!drops.length) {
      return;
    }
    const g = U(config.splash.gravity);
    const [r, gr, b] = liquid;
    ctx.save();
    if (paths.interior) {
      ctx.clip(paths.interior);
    }
    for (const drop of drops) {
      const tau = t - drop.t0;
      if (tau <= 0 || tau >= drop.life) {
        continue;
      }
      const x = drop.x + drop.vx * tau;
      const y = drop.y + drop.vy * tau + 0.5 * g * tau * tau;
      const vx = drop.vx;
      const vy = drop.vy + g * tau;
      const speed = Math.hypot(vx, vy);
      // what a camera sees of a flying drop: a short streak of the drink's colour, lit through
      const length = clamp(speed * 0.022, drop.size * 1.2, drop.size * 5);
      const angle = Math.atan2(vy, vx);
      const birth = smooth(0, 0.02, tau);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = birth * tail(t);
      const body = ctx.createLinearGradient(-length, 0, length, 0);
      body.addColorStop(0, `rgba(${r}, ${gr}, ${b}, 0)`);
      body.addColorStop(0.55, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, gr + 50)}, ${Math.min(255, b + 30)}, 0.75)`);
      body.addColorStop(1, `rgba(${Math.min(255, r + 70)}, ${Math.min(255, gr + 90)}, ${Math.min(255, b + 70)}, 0.95)`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, length, drop.size * 0.85, 0, 0, TAU);
      ctx.fill();
      // the leading end catches the light
      ctx.fillStyle = "rgba(255, 246, 228, 0.85)";
      ctx.beginPath();
      ctx.arc(length * 0.62, -drop.size * 0.2, Math.max(0.3, drop.size * 0.38), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // The glass in front of what fell in: its own highlights, drawn back on top.
  function drawFrontGlass() {
    if (!spec || !paths.front) {
      return;
    }
    ctx.save();
    ctx.clip(paths.front);
    ctx.drawImage(spec.canvas, spec.box.x / dpr, spec.box.y / dpr, spec.box.w / dpr, spec.box.h / dpr);
    ctx.restore();
  }

  // The highlights of the glass catch a band of light that crosses it once.
  function drawGlint(t) {
    const G = config.glint;
    if (!G || !spec) {
      return;
    }
    const u = (t - G.at) / G.duration;
    if (u <= 0 || u >= 1) {
      return;
    }
    const g = glint.getContext("2d");
    const { w, h } = spec.box;
    g.globalCompositeOperation = "copy";
    g.drawImage(spec.canvas, 0, 0);
    g.globalCompositeOperation = "destination-in";
    const centre = lerp(-0.3, 1.3, u);
    const band = g.createLinearGradient(0, h * 0.15, w, h * 0.55);
    band.addColorStop(clamp(centre - 0.22, 0, 1), "rgba(0,0,0,0)");
    band.addColorStop(clamp(centre, 0, 1), "rgba(0,0,0,1)");
    band.addColorStop(clamp(centre + 0.22, 0, 1), "rgba(0,0,0,0)");
    g.fillStyle = band;
    g.fillRect(0, 0, w, h);
    ctx.save();
    ctx.clip(paths.front);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = G.strength * Math.sin(Math.PI * u);
    ctx.drawImage(glint, spec.box.x / dpr, spec.box.y / dpr, w / dpr, h / dpr);
    ctx.restore();
  }

  function draw(t) {
    if (!base) {
      setup();
    }
    const time = clamp(t, 0, duration);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);

    if (time > 0 && time < duration) {
      drawRipple(time);
      drawNudges(time);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSheen(time);
      drawBubbles(time);
      if (config.fall?.kind === "drop") {
        drawLiquidDrop(time);
      } else if (drawFall(time)) {
        drawFrontGlass();
      }
      drawDrops(time);
      drawCondensation(time);
      drawGlint(time);
    }

    if (!ready) {
      ready = true;
      photo.style.visibility = "hidden"; // the canvas has taken over, pixel for pixel
    }
  }

  return {
    duration,
    markers,
    draw,
    /** true when the canvas really changed size (the next frame then rebuilds the layers) */
    resize() {
      const rect = canvas.getBoundingClientRect();
      if (base && Math.round(rect.width) === Math.round(W) && Math.round(rect.height) === Math.round(H)) {
        return false;
      }
      base = null;
      return true;
    },
    // Every layer is emptied now, not when the garbage collector gets to it: Safari caps the
    // memory all canvases may use, and past it new ones silently stop drawing.
    destroy() {
      photo.style.visibility = "";
      release(
        canvas,
        base,
        spec?.canvas,
        glint,
        ripple?.canvas,
        fallSprites?.lens,
        fallSprites?.silhouette,
        fallSprites?.air,
        fallSprites?.under,
        condensation?.lens,
        ...nudges.flatMap((nudge) => [nudge.patch, nudge.mask]),
      );
      base = null;
      spec = null;
      glint = null;
      ripple = null;
      fallSprites = null;
      condensation = null;
      nudges = [];
    },
  };
}
