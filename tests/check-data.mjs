// Comprueba que data/carta.js (modo editorial) y index.html (carta clásica) dicen lo mismo:
// mismos productos, nombres, descripciones, precios y "Top ventas". Sin dependencias.
// Uso: node tests/check-data.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { default: carta } = await import(new URL("../data/carta.js", import.meta.url));
const html = readFileSync(join(root, "clasica.html"), "utf8");

const decode = (text) =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&aacute;/g, "á")
    .replace(/\s+/g, " ")
    .trim();

const classic = new Map();
for (const match of html.matchAll(/<button class="product-card"([^>]*)>([\s\S]*?)<\/button>/g)) {
  const attrs = match[1];
  const body = match[2];
  const id = attrs.match(/data-id="([^"]+)"/)?.[1];
  const top = attrs.match(/data-top="(\d+)"/)?.[1];
  const pick = (cls) => decode(body.match(new RegExp(`class="${cls}">([\\s\\S]*?)</span>`))?.[1] || "");
  classic.set(id, {
    name: pick("product-name"),
    description: pick("product-description"),
    price: Number(pick("product-price").replace(/[^\d.,]/g, "").replace(",", ".")),
    top: top ? Number(top) : undefined,
  });
}

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const editorial = carta.categories.flatMap((category) => category.products);
check(editorial.length === classic.size, `nº de productos: editorial ${editorial.length} vs clásica ${classic.size}`);

for (const product of editorial) {
  const twin = classic.get(product.id);
  if (!twin) {
    failures.push(`${product.id}: no existe en index.html`);
    continue;
  }
  check(twin.name === product.name.es, `${product.id}: nombre "${product.name.es}" ≠ "${twin.name}"`);
  check(twin.description === product.description.es, `${product.id}: descripción distinta`);
  check(twin.price === product.price, `${product.id}: precio ${product.price} ≠ ${twin.price}`);
  check(twin.top === product.top, `${product.id}: Top ventas ${product.top} ≠ ${twin.top}`);
  for (const locale of carta.locales) {
    check(Boolean(product.name[locale]), `${product.id}: falta nombre ${locale}`);
    check(Boolean(product.description[locale]), `${product.id}: falta descripción ${locale}`);
    for (const ingredient of product.ingredients) {
      check(Boolean(ingredient[locale]), `${product.id}: ingrediente sin ${locale}`);
    }
  }
  check(product.allergens === null || Array.isArray(product.allergens), `${product.id}: alérgenos con formato inválido`);
  if (product.experience) {
    check(["highball", "rocks", "wine"].includes(product.experience.glass), `${product.id}: vaso desconocido`);
    check(product.experience.liquid?.length === 2, `${product.id}: líquido necesita 2 colores`);
  }
}

if (failures.length) {
  console.error(`✗ ${failures.length} diferencias:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log(`✓ ${editorial.length} productos coinciden entre data/carta.js e index.html (nombres, descripciones, precios, Top ventas, ES/EN).`);
