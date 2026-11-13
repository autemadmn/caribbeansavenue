// De dónde salen los datos de la carta.
// 1) Copia local (data/carta.js + data/bebidas.js): siempre disponible, también sin conexión.
// 2) Panel ADELARES (Supabase): si está configurado y responde a tiempo, manda sobre la copia local.
//    Ver carta/remote.js. Si falla o tarda, la carta se queda con la copia local sin avisar al cliente.

import carta from "../data/carta.js";
import bebidas from "../data/bebidas.js";

// Orden pedido por el local: Clásicos primero, luego el resto de cócteles.
const COCKTAIL_ORDER = ["clasicos", "signature", "mojitos", "sin-alcohol"];

export const NOTES = [
  {
    es: "Consultar precios especiales para grupos cerrados. Precios por botella a consultar a nuestro personal.",
    en: "Ask about special prices for private groups. Bottle prices available from our staff.",
  },
  {
    es: "Los precios de tarde no son aplicables a días con actividades contratadas: afterwork, tardeos, conciertos y sesiones de baile.",
    en: "Day prices don't apply on days with booked events: afterwork, tardeos, concerts and dance sessions.",
  },
  {
    es: "Algunos productos pueden contener lactosa. Consulta al personal por los alérgenos.",
    en: "Some products may contain lactose. Please ask our staff about allergens.",
  },
];

const RAIL = {
  top: { es: "Top", en: "Top" },
  cocteles: { es: "Cócteles", en: "Cocktails" },
  "cervezas-vinos": { es: "Cervezas", en: "Beer" },
  champagne: { es: "Champagne", en: "Champagne" },
  copas: { es: "Copas", en: "Spirits" },
  licores: { es: "Licores", en: "Liqueurs" },
  refrescos: { es: "Refrescos", en: "Softs" },
};

function cocktailFrom(p) {
  return {
    id: p.id,
    name: p.name,
    line: p.description,
    price: p.price,
    glass: p.glass,
    tint: p.tint,
    cutout: p.cutout,
    top: p.top || 0,
  };
}

export function buildMenu({ cocktailCategories, drinkFamilies }) {
  const cocktails = COCKTAIL_ORDER.map((id) => cocktailCategories.find((c) => c.id === id))
    .filter(Boolean)
    .concat(cocktailCategories.filter((c) => !COCKTAIL_ORDER.includes(c.id)));

  const top = cocktails
    .flatMap((c) => c.products)
    .filter((p) => p.top > 0)
    .sort((a, b) => a.top - b.top);

  const families = [];
  if (top.length) {
    families.push({
      id: "top",
      kind: "top",
      title: { es: "Top ventas", en: "Best sellers" },
      sections: [{ id: "top-ventas", title: { es: "Top ventas", en: "Best sellers" } }],
    });
  }
  families.push({
    id: "cocteles",
    kind: "cocktails",
    title: { es: "Cócteles", en: "Cocktails" },
    sections: cocktails,
  });
  for (const fam of drinkFamilies) families.push({ ...fam, kind: "drinks" });
  for (const fam of families) fam.rail = RAIL[fam.id] || fam.title;
  return { families, top, notes: NOTES };
}

export function localMenu() {
  return buildMenu({
    cocktailCategories: carta.categories.map((c) => ({
      id: c.id,
      title: c.title,
      products: c.products.map(cocktailFrom),
    })),
    drinkFamilies: bebidas.families,
  });
}
