// Comprueba que cada precio de data/bebidas.json coincide con el Excel del local.
// Lee el .xlsm por su cuenta (sin pasar por scripts/importar-excel.py) para que un fallo
// del importador no se tape a sí mismo. Sin dependencias.
//
// Uso: node tests/check-bebidas.mjs [RUTA.xlsm]
//      Sin ruta usa ~/Downloads/Carta_Avenue_paginas_2_a_5.xlsm (el Excel no se sube al repo).

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const xlsm = process.argv[2] || join(homedir(), "Downloads", "Carta_Avenue_paginas_2_a_5.xlsm");
if (!existsSync(xlsm)) {
  console.error(`No encuentro el Excel: ${xlsm}\nPásalo como argumento: node tests/check-bebidas.mjs RUTA.xlsm`);
  process.exit(2);
}

/* ---------- Zip mínimo: solo lo justo para sacar dos XML ---------- */

function unzip(buf, wanted) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("El archivo no es un zip válido");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (wanted.includes(name)) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(start, start + size);
      out[name] = (method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const decodeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const files = unzip(readFileSync(xlsm), ["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"]);
const shared = [...files["xl/sharedStrings.xml"].matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
  decodeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
);

const rows = [];
for (const r of files["xl/worksheets/sheet1.xml"].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = {};
  for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, attrs, body = ""] = c;
    const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
    if (/t="s"/.test(attrs) && v != null) cells[col] = shared[Number(v)];
    else if (inline != null) cells[col] = decodeXml(inline);
    else if (v != null) cells[col] = decodeXml(v);
  }
  rows.push(cells);
}

/* ---------- Comparación ---------- */

const slug = (text) =>
  text
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Precio de una celda, o null si no es un número («Tarde» de la cabecera, celdas vacías).
const num = (v) => {
  const s = String(v ?? "").replace(/€/g, "").trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};

// Filas de producto: categoría (B), producto (C) y dos precios numéricos (D, E). Se salta la cabecera.
const excel = new Map();
for (const f of rows) {
  if (!f.B || !f.C || num(f.D) === null || num(f.E) === null) continue;
  const id = slug(f.B.trim());
  if (!excel.has(id)) excel.set(id, []);
  excel.get(id).push({ name: f.C.trim(), tarde: num(f.D), noche: num(f.E) });
}

const json = JSON.parse(readFileSync(new URL("../data/bebidas.json", import.meta.url), "utf8"));
const { default: js } = await import(new URL("../data/bebidas.js", import.meta.url));

const errors = [];
const fail = (msg) => errors.push(msg);

if (JSON.stringify(js) !== JSON.stringify(json)) fail("data/bebidas.js y data/bebidas.json no dicen lo mismo");

let checked = 0;
const seen = new Set();
for (const fam of json.families) {
  for (const sec of fam.sections) {
    seen.add(sec.id);
    const src = excel.get(sec.id);
    if (!src) {
      fail(`La sección «${sec.id}» no existe en el Excel`);
      continue;
    }
    if (src.length !== sec.products.length) {
      fail(`«${sec.id}»: el Excel tiene ${src.length} productos y la carta ${sec.products.length}`);
    }
    sec.products.forEach((p, i) => {
      const x = src[i];
      if (!x) return;
      for (const col of ["tarde", "noche"]) {
        if (p[col] !== x[col]) fail(`«${p.name.es}» (Excel: «${x.name}»): ${col} ${p[col]} en la carta, ${x[col]} en el Excel`);
      }
      checked++;
    });
  }
}
for (const id of excel.keys()) if (!seen.has(id)) fail(`La categoría «${id}» del Excel no sale en la carta`);

const totalExcel = [...excel.values()].reduce((n, l) => n + l.length, 0);
if (totalExcel === 0) fail("No se ha leído ninguna fila del Excel");

if (errors.length) {
  console.error(`✗ ${errors.length} diferencias:\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`✓ ${checked} bebidas: todos los precios de tarde y noche coinciden con ${xlsm.split(/[\\/]/).pop()} (${totalExcel} filas).`);
