// Siluetas de copa para los cócteles que todavía no tienen foto recortada.
// Mismo trazo para todas; el líquido toma el color (`tint`) del cóctel.
// viewBox 0 0 64 100: la copa se apoya siempre en y = 94, como las fotos sobre la barra.

const SHAPES = {
  highball: {
    glass: "M19 14h26l-2.4 79a2 2 0 0 1-2 1.9H23.4a2 2 0 0 1-2-1.9Z",
    liquid: "M20.1 34h23.8l-1.8 58.6H21.9Z",
    extra: '<path d="M38 6 33 60" class="g-straw"/>',
  },
  rocks: {
    glass: "M14 46h36l-2.6 46a2.4 2.4 0 0 1-2.4 2.3H19a2.4 2.4 0 0 1-2.4-2.3Z",
    liquid: "M15.4 58h33.2l-1.8 33H17.2Z",
    extra: '<rect x="20" y="52" width="11" height="11" rx="2" class="g-ice"/><rect x="31" y="60" width="10" height="10" rx="2" class="g-ice"/>',
  },
  wine: {
    glass: "M17 16h30c0 17-5.6 30-15 31.5C22.6 46 17 33 17 16Z M32 47.5V88 M21 94c3-3.4 19-3.4 22 0",
    liquid: "M18.6 28h26.8c-1.6 9.4-6 17-13.4 17.6C24.6 45 20.2 37.4 18.6 28Z",
    extra: "",
  },
  coupe: {
    glass: "M9 30h46c-1.2 10.4-10.6 17.6-23 17.6S10.2 40.4 9 30Z M32 47.6V88 M21 94c3-3.4 19-3.4 22 0",
    liquid: "M11.4 33h41.2c-2 7.6-9.8 12.4-20.6 12.4S13.4 40.6 11.4 33Z",
    extra: "",
  },
  margarita: {
    glass: "M8 24h48c-.8 8-8.4 12-15.6 12.8-1.6 4.4-4.4 7.2-8.4 7.6-4-.4-6.8-3.2-8.4-7.6C16.4 36 8.8 32 8 24Z M32 44.4V88 M21 94c3-3.4 19-3.4 22 0",
    liquid: "M10.6 27h42.8c-1.8 4.6-7.2 7-13.8 7.6-1.6 4-4 6.6-7.6 7-3.6-.4-6-3-7.6-7C17.8 34 12.4 31.6 10.6 27Z",
    extra: '<path d="M8 24h48" class="g-rim"/>',
  },
  hurricane: {
    glass: "M20 10h24c0 12-5 16-5 30 0 9 6 14 6 26 0 10-6 16-13 16s-13-6-13-16c0-12 6-17 6-26 0-14-5-18-5-30Z M32 82v6 M22 94c3-3.4 17-3.4 20 0",
    liquid: "M24.4 30h15.2c-.8 3.2-1.6 6-1.6 10 0 9 6 14 6 26 0 9-5.2 14.4-12 14.4S20 75 20 66c0-12 6-17 6-26 0-4-.8-6.8-1.6-10Z",
    extra: "",
  },
  mug: {
    glass: "M14 34h30v54a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6Z M44 46h4.5a6.5 6.5 0 0 1 6.5 6.5v17a6.5 6.5 0 0 1-6.5 6.5H44",
    liquid: "M15.6 42h26.8v45.6a4.4 4.4 0 0 1-4.4 4.4H20a4.4 4.4 0 0 1-4.4-4.4Z",
    extra: "",
    metal: true,
  },
};

export function glassSVG(kind, tint) {
  const s = SHAPES[kind] || SHAPES.highball;
  return `<svg class="glass${s.metal ? " glass--metal" : ""}" viewBox="0 0 64 100" aria-hidden="true" focusable="false">
    <path d="${s.liquid}" class="g-liquid" style="fill:${tint}"/>
    ${s.extra}
    <path d="${s.glass}" class="g-line"/>
  </svg>`;
}
