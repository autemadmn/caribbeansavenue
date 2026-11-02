// CocktailExperience · "ice": a cube drops into the served drink, splashes, ripples and settles.
// Original implementation (concept inspired by Animorio's "The Cocktail Card"; no code or assets used).
//
// Why Canvas 2D: no product photography exists for these drinks, a pre-rendered video would weigh
// more than the whole menu and could not change glass or colour per cocktail, and WebGL adds
// cost without a visible gain for a 1.4 s scene. Everything here is drawn from code, so each
// cocktail only declares { glass, liquid: [top, bottom] }.
//
// The scene is a pure function of time: draw(t) renders the exact frame for t seconds. GSAP owns
// the clock (and the text that moves with it); reduced motion simply draws the final frame.
// Static layers (backdrop, glass front with condensation, ice sprites) are rendered once; a frame
// only composites them with the moving parts. Loaded with import() only when needed.

export const SCENE_DURATION = 1.4;
export const MARKERS = { light: 0, drop: 0.2, impact: 0.55, settle: 0.9 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const PERSPECTIVE = 0.17; // ellipse height / width: camera slightly above the rim

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

function hexToRgb(hex) {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const rgba = ([r, g, b], alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
const mix = (a, b, t) => a.map((channel, index) => Math.round(lerp(channel, b[index], t)));
const WHITE = [255, 255, 255];

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

function softFilter(ctx, px) {
  if ("filter" in ctx) {
    ctx.filter = px ? `blur(${px}px)` : "none";
  }
}

/* ---------- Glass geometry: a close shot, the glass fills the frame ---------- */

function glassGeometry(type, width, height) {
  const cx = width * 0.5;

  if (type === "wine") {
    const floor = height * 0.97;
    const ry = height * 0.3;
    const rx = Math.min(width * 0.36, ry * 1.06);
    const cy = floor - height * 0.56;
    return {
      type,
      cx,
      floor,
      rimY: cy - ry * 0.64,
      bottomY: cy + ry * 0.95,
      level: cy + ry * 0.12,
      wall: 2.4,
      half(y) {
        const k = clamp((y - cy) / ry, -0.999, 0.999);
        return rx * Math.sqrt(1 - k * k);
      },
      bowl: { cx, cy, rx, ry },
      stem: { top: cy + ry * 0.96, bottom: floor - height * 0.012, width: Math.max(4, rx * 0.07) },
      foot: { rx: rx * 0.72, ry: rx * 0.72 * PERSPECTIVE },
      cube: rx * 0.46,
    };
  }

  const tall = type === "highball";
  const floor = height * (tall ? 0.975 : 0.95);
  const glassHeight = height * (tall ? 0.78 : 0.62);
  const glassWidth = glassHeight * (tall ? 0.43 : 0.98);
  const top = floor - glassHeight;
  const base = glassHeight * (tall ? 0.08 : 0.15);
  return {
    type,
    cx,
    floor,
    rimY: top,
    bottomY: floor - base,
    level: lerp(floor - base, top, tall ? 0.76 : 0.64),
    wall: 3,
    half(y) {
      const t = clamp((y - top) / glassHeight, 0, 1);
      return lerp(glassWidth / 2, (glassWidth / 2) * 0.92, t);
    },
    baseHeight: base,
    cube: glassWidth * (tall ? 0.4 : 0.34),
  };
}

/* ---------- Ice: rounded, clear, with volume (no outlines) ---------- */

function renderIce(size, dpr, random) {
  const s = size * dpr;
  const canvas = makeCanvas(s * 1.75, s * 1.75);
  const ctx = canvas.getContext("2d");
  const x0 = s * 0.16;
  const y0 = s * 0.56;
  const w = s;
  const h = s * 0.92;
  const dx = s * 0.36;
  const dy = -s * 0.32;
  const r = s * 0.16; // melted corners

  const front = () => {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x0, y0, w, h, r) : ctx.rect(x0, y0, w, h);
  };
  const top = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + r * 0.6, y0);
    ctx.lineTo(x0 + w - r * 0.4, y0);
    ctx.quadraticCurveTo(x0 + w + dx * 0.15, y0 + dy * 0.15, x0 + w + dx - r * 0.3, y0 + dy + r * 0.2);
    ctx.lineTo(x0 + dx + r * 0.5, y0 + dy);
    ctx.quadraticCurveTo(x0 + dx * 0.1, y0 + dy * 0.1, x0 + r * 0.6, y0);
    ctx.closePath();
  };
  const side = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + w, y0 + r * 0.5);
    ctx.lineTo(x0 + w + dx - r * 0.2, y0 + dy + r * 0.4);
    ctx.lineTo(x0 + w + dx - r * 0.1, y0 + dy + h - r * 0.6);
    ctx.quadraticCurveTo(x0 + w + dx * 0.4, y0 + h + dy * 0.4, x0 + w, y0 + h - r * 0.6);
    ctx.closePath();
  };

  softFilter(ctx, 0.5 * dpr);

  // faces: clear ice is mostly what's behind it, slightly lifted
  side();
  let gradient = ctx.createLinearGradient(x0 + w, y0, x0 + w + dx, y0 + h);
  gradient.addColorStop(0, "rgba(210, 230, 240, 0.22)");
  gradient.addColorStop(1, "rgba(150, 180, 196, 0.10)");
  ctx.fillStyle = gradient;
  ctx.fill();

  top();
  gradient = ctx.createLinearGradient(x0, y0, x0 + w + dx, y0 + dy);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.50)");
  gradient.addColorStop(1, "rgba(236, 246, 252, 0.26)");
  ctx.fillStyle = gradient;
  ctx.fill();

  front();
  gradient = ctx.createLinearGradient(x0, y0, x0 + w * 0.8, y0 + h);
  gradient.addColorStop(0, "rgba(246, 251, 253, 0.40)");
  gradient.addColorStop(0.5, "rgba(222, 238, 244, 0.20)");
  gradient.addColorStop(1, "rgba(204, 226, 236, 0.26)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // volume: the lower right of the block refracts the dark room
  ctx.save();
  front();
  ctx.clip();
  gradient = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  gradient.addColorStop(0.45, "rgba(10, 16, 22, 0)");
  gradient.addColorStop(1, "rgba(10, 16, 22, 0.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x0, y0, w, h);

  // frosted heart
  const core = ctx.createRadialGradient(x0 + w * 0.46, y0 + h * 0.52, 0, x0 + w * 0.46, y0 + h * 0.52, w * 0.5);
  core.addColorStop(0, "rgba(255, 255, 255, 0.42)");
  core.addColorStop(0.55, "rgba(255, 255, 255, 0.10)");
  core.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = core;
  ctx.fillRect(x0, y0, w, h);

  // trapped air and one fracture plane
  softFilter(ctx, 0);
  for (let i = 0; i < 7; i += 1) {
    const bx = x0 + w * (0.25 + random() * 0.5);
    const by = y0 + h * (0.3 + random() * 0.45);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(bx, by, s * (0.008 + random() * 0.012), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = s * 0.01;
  ctx.beginPath();
  const crackY = y0 + h * (0.36 + random() * 0.22);
  ctx.moveTo(x0 + w * 0.14, crackY);
  ctx.bezierCurveTo(x0 + w * 0.36, crackY - h * 0.14, x0 + w * 0.6, crackY + h * 0.1, x0 + w * 0.84, crackY - h * 0.02);
  ctx.stroke();
  ctx.restore();

  // light on the edges, soft, strongest where the key light hits (top-left)
  softFilter(ctx, 0.8 * dpr);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = s * 0.032;
  ctx.beginPath();
  ctx.moveTo(x0 + r * 0.7, y0 + s * 0.01);
  ctx.lineTo(x0 + w * 0.62, y0 + s * 0.01);
  ctx.moveTo(x0 + s * 0.01, y0 + r * 0.9);
  ctx.lineTo(x0 + s * 0.01, y0 + h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = s * 0.018;
  ctx.beginPath();
  ctx.moveTo(x0 + w, y0 + r);
  ctx.lineTo(x0 + w, y0 + h - r);
  ctx.moveTo(x0 + r, y0 + h);
  ctx.lineTo(x0 + w - r, y0 + h);
  ctx.stroke();

  // specular
  softFilter(ctx, 1.2 * dpr);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.ellipse(x0 + w * 0.22, y0 + h * 0.12, w * 0.12, h * 0.035, -0.3, 0, Math.PI * 2);
  ctx.fill();
  softFilter(ctx, 0);

  return { canvas, size, pivot: { x: (x0 + w / 2) / dpr, y: (y0 + h / 2) / dpr } };
}

/* ---------- Backdrop: dark bar, warm light, out-of-focus lights ---------- */

function renderBackdrop(width, height, dpr, geometry, liquidTop, random) {
  const canvas = makeCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#16110c");
  base.addColorStop(0.7, "#0c0907");
  base.addColorStop(1, "#070504");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const warm = ctx.createRadialGradient(width * 0.3, height * 0.25, 0, width * 0.3, height * 0.25, width * 0.8);
  warm.addColorStop(0, "rgba(214, 150, 82, 0.24)");
  warm.addColorStop(0.5, "rgba(140, 86, 40, 0.07)");
  warm.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 10; i += 1) {
    const x = random() * width;
    const y = random() * height * 0.6;
    const r = (10 + random() * 26) * (height / 380);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = random() > 0.45 ? [232, 176, 104] : mix(liquidTop, WHITE, 0.4);
    glow.addColorStop(0, rgba(tone, 0.14 + random() * 0.12));
    glow.addColorStop(0.7, rgba(tone, 0.05));
    glow.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // bar top
  const barTop = Math.min(geometry.floor - 2, height - 4);
  const bar = ctx.createLinearGradient(0, barTop, 0, height);
  bar.addColorStop(0, "rgba(130, 90, 54, 0.36)");
  bar.addColorStop(0.3, "rgba(40, 28, 18, 0.55)");
  bar.addColorStop(1, "rgba(8, 6, 4, 0.9)");
  ctx.fillStyle = bar;
  ctx.fillRect(0, barTop, width, height - barTop);

  // contact shadow + the drink's colour thrown on the bar
  const footHalf = geometry.type === "wine" ? geometry.foot.rx : geometry.half(geometry.floor);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(geometry.cx, geometry.floor, footHalf * 1.06, footHalf * PERSPECTIVE * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  const caustic = ctx.createRadialGradient(geometry.cx + footHalf * 0.6, geometry.floor + 3, 0, geometry.cx + footHalf * 0.6, geometry.floor + 3, footHalf * 1.5);
  caustic.addColorStop(0, rgba(liquidTop, 0.3));
  caustic.addColorStop(1, rgba(liquidTop, 0));
  ctx.fillStyle = caustic;
  ctx.beginPath();
  ctx.ellipse(geometry.cx + footHalf * 0.6, geometry.floor + 3, footHalf * 1.6, footHalf * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

/* ---------- Glass front: walls, base, highlights, rim, condensation (static) ---------- */

function outlinePath(ctx, g, inset = 0) {
  const steps = 48;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const y = lerp(g.rimY, g.type === "wine" ? g.bottomY : g.floor, i / steps);
    const x = g.cx - Math.max(0.5, g.half(y) - inset);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const y = lerp(g.rimY, g.type === "wine" ? g.bottomY : g.floor, i / steps);
    ctx.lineTo(g.cx + Math.max(0.5, g.half(y) - inset), y);
  }
  ctx.closePath();
}

function renderGlassFront(width, height, dpr, g, liquidTop, random) {
  const canvas = makeCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const rimHalf = g.half(g.rimY);

  // glass thickness: bright, thin, slightly blurred edges
  softFilter(ctx, 0.4);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  outlinePath(ctx, g);
  ctx.stroke();
  softFilter(ctx, 0);

  if (g.type === "wine") {
    const { bowl, stem, foot } = g;
    softFilter(ctx, 1);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = Math.max(2.5, bowl.rx * 0.05);
    ctx.beginPath();
    ctx.ellipse(bowl.cx, bowl.cy, bowl.rx * 0.84, bowl.ry * 0.84, 0, Math.PI * 1.06, Math.PI * 1.32);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bowl.cx, bowl.cy, bowl.rx * 0.9, bowl.ry * 0.9, 0, Math.PI * 1.76, Math.PI * 1.95);
    ctx.stroke();
    softFilter(ctx, 0);

    const stemGradient = ctx.createLinearGradient(g.cx - stem.width, 0, g.cx + stem.width, 0);
    stemGradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    stemGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.55)");
    stemGradient.addColorStop(1, "rgba(255, 255, 255, 0.06)");
    ctx.fillStyle = stemGradient;
    ctx.fillRect(g.cx - stem.width / 2, stem.top, stem.width, stem.bottom - stem.top);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(g.cx, stem.bottom, foot.rx, foot.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const bottom = g.floor;
    const baseTop = bottom - g.baseHeight;

    // thick base refracts the drink
    const baseGradient = ctx.createLinearGradient(0, baseTop, 0, bottom);
    baseGradient.addColorStop(0, rgba(mix(liquidTop, WHITE, 0.25), 0.26));
    baseGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = baseGradient;
    ctx.beginPath();
    ctx.moveTo(g.cx - g.half(baseTop) + 1.5, baseTop);
    ctx.lineTo(g.cx + g.half(baseTop) - 1.5, baseTop);
    ctx.lineTo(g.cx + g.half(bottom) - 1.5, bottom);
    ctx.lineTo(g.cx - g.half(bottom) + 1.5, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(g.cx, bottom, g.half(bottom), g.half(bottom) * PERSPECTIVE, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.ellipse(g.cx, baseTop, g.half(baseTop) - 3, (g.half(baseTop) - 3) * PERSPECTIVE, 0, 0, Math.PI);
    ctx.stroke();

    // long vertical reflections of the room's light
    const left = g.cx - rimHalf;
    const span = rimHalf * 2;
    const strip = (from, fraction, alpha) => {
      const x = left + span * from;
      const stripWidth = span * fraction;
      const gradient = ctx.createLinearGradient(x, 0, x + stripWidth, 0);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, g.rimY + 8, stripWidth, baseTop - g.rimY - 12);
    };
    strip(0.07, 0.1, 0.38);
    strip(0.2, 0.03, 0.16);
    strip(0.82, 0.06, 0.18);

    // condensation below the drink line: the glass is cold
    ctx.save();
    outlinePath(ctx, g, 2);
    ctx.clip();
    const scale = height / 380;
    for (let i = 0; i < 70; i += 1) {
      const y = lerp(g.level + 10, baseTop - 4, random());
      const half = g.half(y) - 4;
      const x = g.cx + (random() * 2 - 1) * half;
      const radius = (0.5 + random() * random() * 2.2) * scale;
      const edge = Math.abs(x - g.cx) / half; // fewer visible at the curved sides
      ctx.globalAlpha = 1 - edge * 0.6;
      ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(x - radius * 0.35, y - radius * 0.4, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    // a couple of drops that have started to run
    for (let i = 0; i < 3; i += 1) {
      const x = g.cx + (random() * 1.4 - 0.7) * g.half(g.level);
      const y = lerp(g.level + 20, baseTop - 30, random());
      const run = (18 + random() * 30) * scale;
      const trail = ctx.createLinearGradient(0, y - run, 0, y);
      trail.addColorStop(0, "rgba(255, 255, 255, 0)");
      trail.addColorStop(1, "rgba(255, 255, 255, 0.22)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(x, y - run);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // rim: the brightest line in the picture
  softFilter(ctx, 0.3);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.rimY, rimHalf, rimHalf * PERSPECTIVE, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.rimY + 1.5, rimHalf - g.wall, (rimHalf - g.wall) * PERSPECTIVE, 0, 0, Math.PI);
  ctx.stroke();
  softFilter(ctx, 0);

  return canvas;
}

/* ---------- The scene ---------- */

export function createIceScene(canvas, product) {
  const ctx = canvas.getContext("2d");
  const experience = product.experience;
  const top = hexToRgb(experience.liquid[0]);
  const bottom = hexToRgb(experience.liquid[1]);
  let width = 0;
  let height = 0;
  let dpr = 1;
  let geometry = null;
  let backdrop = null;
  let front = null;
  let ice = null;
  let restingIce = [];
  let droplets = [];
  let spokes = [];
  let bubbles = [];
  let scale = 1;

  function setup() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = height / 380;

    const random = seeded(product.id); // fixed per product: every replay is identical
    geometry = glassGeometry(experience.glass, width, height);
    backdrop = renderBackdrop(width, height, dpr, geometry, top, random);
    front = renderGlassFront(width, height, dpr, geometry, top, random);
    ice = renderIce(geometry.cube, dpr, random);

    const surfaceHalf = geometry.half(geometry.level) - geometry.wall;
    restingIce = [
      { sprite: renderIce(geometry.cube * 0.94, dpr, random), x: geometry.cx - surfaceHalf * 0.36, y: geometry.level - geometry.cube * 0.06, rotation: -0.16 },
      { sprite: renderIce(geometry.cube * 0.88, dpr, random), x: geometry.cx + surfaceHalf * 0.22, y: geometry.level + geometry.cube * 0.04, rotation: 0.22 },
    ];

    droplets = Array.from({ length: 18 }, () => {
      const angle = (-158 + random() * 136) * (Math.PI / 180);
      const speed = (0.4 + random() * 0.45) * height;
      return { vx: Math.cos(angle) * speed * 0.6, vy: Math.sin(angle) * speed, radius: (1.6 + random() * 2.6) * scale, delay: random() * 0.05 };
    });
    spokes = Array.from({ length: 22 }, (_, index) => ({ angle: (index / 22) * Math.PI * 2 + random() * 0.2, reach: 0.5 + random() * 0.7 }));
    bubbles = Array.from({ length: 10 }, () => ({ dx: (random() - 0.5) * 0.8, delay: 0.03 + random() * 0.3, radius: (1 + random() * 1.8) * scale, speed: (0.16 + random() * 0.14) * height, phase: random() * 6 }));
  }

  /* --- where things are at time t --- */

  function cubeState(t) {
    const g = geometry;
    const s = g.cube;
    const impactY = g.level - s * 0.42;
    const restY = g.level - s * 0.1;
    const startY = -s * 1.3;

    if (t < MARKERS.drop) {
      return { y: startY, rotation: -0.26, visible: false };
    }
    if (t < MARKERS.impact) {
      const u = (t - MARKERS.drop) / (MARKERS.impact - MARKERS.drop);
      return { y: lerp(startY, impactY, u * u), rotation: lerp(-0.26, -0.12, u), visible: true }; // gravity
    }
    const te = t - MARKERS.impact;
    const plunge = s * 0.34 * Math.exp(-te / 0.2) * Math.sin(((Math.PI * 2) / 0.46) * te);
    const approach = (impactY - restY) * Math.exp(-te / 0.07);
    return {
      y: restY + approach + plunge,
      rotation: -0.12 * Math.exp(-te / 0.3) + 0.05 * Math.exp(-te / 0.35) * Math.sin(te * 14),
      visible: true,
    };
  }

  function surfaceY(t) {
    if (t < MARKERS.impact) {
      return geometry.level;
    }
    const te = t - MARKERS.impact;
    const rise = 2.6 * scale * (1 - Math.exp(-te / 0.12)); // displaced volume
    const wobble = 1.8 * scale * Math.exp(-te / 0.22) * Math.sin(((Math.PI * 2) / 0.17) * te);
    return geometry.level - rise + wobble;
  }

  /* --- paths --- */

  function liquidRegion(levelY) {
    const g = geometry;
    const half = g.half(levelY) - g.wall;
    ctx.beginPath();
    ctx.ellipse(g.cx, levelY, half, half * PERSPECTIVE, 0, 0, Math.PI * 2);
    const steps = 24;
    for (let i = 0; i <= steps; i += 1) {
      const y = lerp(levelY, g.bottomY, i / steps);
      const x = g.cx - Math.max(0.5, g.half(y) - g.wall);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const y = lerp(levelY, g.bottomY, i / steps);
      ctx.lineTo(g.cx + Math.max(0.5, g.half(y) - g.wall), y);
    }
    ctx.closePath();
  }

  function drawCube(sprite, x, y, rotation, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(sprite.canvas, -sprite.pivot.x, -sprite.pivot.y, sprite.canvas.width / dpr, sprite.canvas.height / dpr);
    ctx.restore();
  }

  /* --- frame --- */

  function draw(t) {
    if (!geometry) {
      setup();
    }
    const g = geometry;
    const time = clamp(t, 0, SCENE_DURATION);
    const level = surfaceY(time);
    const cube = cubeState(time);
    const half = g.half(level) - g.wall;
    const impactX = g.cx + half * 0.05;
    const cubes = [...restingIce, ...(cube.visible ? [{ sprite: ice, x: impactX, y: cube.y, rotation: cube.rotation }] : [])];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(backdrop, 0, 0, width, height);

    // glass back: faint body and the far half of the rim
    const rimHalf = g.half(g.rimY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    outlinePath(ctx, g, g.wall);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(g.cx, g.rimY, rimHalf, rimHalf * PERSPECTIVE, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // 1. ice below the surface, seen through the drink
    ctx.save();
    liquidRegion(level);
    ctx.clip();
    cubes.forEach((item) => drawCube(item.sprite, item.x, item.y, item.rotation, 0.85));
    ctx.restore();

    // 2. the drink: colour depth, darker at the curved walls, lit from behind
    ctx.save();
    liquidRegion(level);
    ctx.clip();
    const areaTop = level - half;
    const areaHeight = g.bottomY - areaTop;
    const body = ctx.createLinearGradient(0, level, 0, g.bottomY);
    body.addColorStop(0, rgba(top, 0.62));
    body.addColorStop(1, rgba(bottom, 0.9));
    ctx.fillStyle = body;
    ctx.fillRect(g.cx - half - 4, areaTop, half * 2 + 8, areaHeight);
    const walls = ctx.createLinearGradient(g.cx - half, 0, g.cx + half, 0);
    walls.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    walls.addColorStop(0.24, "rgba(0, 0, 0, 0)");
    walls.addColorStop(0.72, "rgba(0, 0, 0, 0)");
    walls.addColorStop(1, "rgba(0, 0, 0, 0.46)");
    ctx.fillStyle = walls;
    ctx.fillRect(g.cx - half, areaTop, half * 2, areaHeight);
    const glowY = lerp(level, g.bottomY, 0.5);
    const backlight = ctx.createRadialGradient(g.cx - half * 0.25, glowY, 0, g.cx - half * 0.25, glowY, half * 1.15);
    backlight.addColorStop(0, rgba(mix(top, WHITE, 0.5), 0.36));
    backlight.addColorStop(1, rgba(top, 0));
    ctx.fillStyle = backlight;
    ctx.fillRect(g.cx - half, areaTop, half * 2, areaHeight);
    // refracted light lines inside the drink
    ctx.strokeStyle = rgba(mix(top, WHITE, 0.6), 0.16);
    ctx.lineWidth = 2 * scale;
    for (let i = 0; i < 3; i += 1) {
      const x = g.cx - half * 0.55 + i * half * 0.22;
      ctx.beginPath();
      ctx.moveTo(x, level + half * PERSPECTIVE + 6);
      ctx.lineTo(x + half * 0.08, g.bottomY - 4);
      ctx.stroke();
    }

    // bubbles shaken loose by the new cube
    if (time > MARKERS.impact) {
      const te = time - MARKERS.impact;
      bubbles.forEach((bubble) => {
        const life = te - bubble.delay;
        if (life <= 0) {
          return;
        }
        const y = cube.y + g.cube * 0.45 - life * bubble.speed;
        if (y < level + 2) {
          return;
        }
        const x = impactX + bubble.dx * g.cube + Math.sin(life * 18 + bubble.phase) * 1.6;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * (1 - life / 1.1)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, bubble.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.restore();

    // 3. surface: lighter skin, meniscus, ripples
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(g.cx, level, half, half * PERSPECTIVE, 0, 0, Math.PI * 2);
    ctx.clip();
    const skin = ctx.createLinearGradient(0, level - half * PERSPECTIVE, 0, level + half * PERSPECTIVE);
    skin.addColorStop(0, rgba(mix(top, WHITE, 0.4), 0.66));
    skin.addColorStop(1, rgba(top, 0.5));
    ctx.fillStyle = skin;
    ctx.fillRect(g.cx - half, level - half * PERSPECTIVE, half * 2, half * PERSPECTIVE * 2);
    if (time > MARKERS.impact) {
      const te = time - MARKERS.impact;
      [0, 0.08, 0.18].forEach((delay) => {
        const life = te - delay;
        if (life <= 0 || life > 0.85) {
          return;
        }
        const radius = g.cube * 0.48 + life * half * 1.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - life / 0.85)})`;
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.ellipse(impactX, level, radius, radius * PERSPECTIVE, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(g.cx, level, half, half * PERSPECTIVE, 0, 0, Math.PI);
    ctx.stroke();

    // 4. ice above the surface, with a wet line where it meets the drink
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, level);
    ctx.clip();
    cubes.forEach((item) => drawCube(item.sprite, item.x, item.y, item.rotation));
    ctx.restore();
    cubes.forEach((item) => {
      const reach = item.sprite.size * 0.6;
      if (item.y - reach < level && item.y + reach > level) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(item.x + item.sprite.size * 0.14, level, item.sprite.size * 0.64, item.sprite.size * 0.64 * PERSPECTIVE, 0, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
    });

    // 5. splash: a brief crown and droplets thrown up by the impact
    if (time > MARKERS.impact) {
      const te = time - MARKERS.impact;
      const crownLife = 0.26;
      if (te < crownLife) {
        const rise = Math.sin((Math.PI * te) / crownLife);
        const radius = g.cube * 0.52 + te * g.cube * 1.7;
        spokes.forEach((spoke) => {
          const ex = impactX + Math.cos(spoke.angle) * radius;
          const ey = level + Math.sin(spoke.angle) * radius * PERSPECTIVE;
          const tipY = ey - g.cube * 0.68 * spoke.reach * rise;
          const sheet = ctx.createLinearGradient(0, ey, 0, tipY);
          sheet.addColorStop(0, rgba(top, 0));
          sheet.addColorStop(1, `rgba(255, 255, 255, ${0.6 * (1 - te / crownLife)})`);
          ctx.strokeStyle = sheet;
          ctx.lineWidth = 1.8 * scale;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex, tipY);
          ctx.stroke();
          ctx.fillStyle = rgba(mix(top, WHITE, 0.6), 0.85 * (1 - te / crownLife));
          ctx.beginPath();
          ctx.arc(ex, tipY, 1.7 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      const gravity = height * 2.3;
      droplets.forEach((drop) => {
        const life = te - drop.delay;
        if (life <= 0) {
          return;
        }
        const x = impactX + drop.vx * life;
        const y = level - g.cube * 0.1 + drop.vy * life + 0.5 * gravity * life * life;
        const vy = drop.vy + gravity * life;
        if (y > level + 1 && vy > 0) {
          return; // back in the drink
        }
        const fade = clamp(1 - life / 0.7, 0, 1);
        const stretch = clamp(Math.hypot(drop.vx, vy) / height, 0.7, 2.2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(vy, drop.vx));
        const dropGradient = ctx.createRadialGradient(-drop.radius * 0.3, -drop.radius * 0.3, 0, 0, 0, drop.radius * stretch);
        dropGradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
        dropGradient.addColorStop(0.5, rgba(mix(top, WHITE, 0.55), 0.85 * fade));
        dropGradient.addColorStop(1, rgba(top, 0.5 * fade));
        ctx.fillStyle = dropGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, drop.radius * stretch, drop.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 6. glass front (pre-rendered) + the glint that crosses it as the drink settles
    ctx.drawImage(front, 0, 0, width, height);
    const glint = time > MARKERS.impact ? Math.exp(-Math.pow((time - 0.98) / 0.16, 2)) : 0;
    if (glint > 0.02) {
      const x = g.cx - g.half(g.rimY) * (0.95 - glint * 0.5);
      const gradient = ctx.createLinearGradient(x - 12 * scale, 0, x + 12 * scale, 0);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.32 * glint})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 12 * scale, g.rimY + 6, 24 * scale, (g.type === "wine" ? g.bottomY : g.floor) - g.rimY - 12);
    }

    // light comes up at the start
    const light = easeOut(clamp(time / MARKERS.drop, 0, 1));
    if (light < 1) {
      ctx.fillStyle = `rgba(6, 5, 4, ${0.55 * (1 - light)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return {
    duration: SCENE_DURATION,
    markers: MARKERS,
    draw,
    resize() {
      geometry = null;
    },
    destroy() {
      backdrop = null;
      front = null;
      ice = null;
      restingIce = [];
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/**
 * Registry: one entry per effect type. Documented future entries (not implemented on purpose —
 * one excellent effect first): "citrus" (a wheel drops and settles), "bubbles" (a single bubble
 * column for sparkling drinks), "mist" (cold vapour over the rim), "condensation" (a drop runs
 * down the glass), "swirl" (subtle liquid motion). Each would reuse geometry, backdrop and glass.
 */
export const EXPERIENCES = {
  ice: createIceScene,
};
