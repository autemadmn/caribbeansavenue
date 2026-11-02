// MenuDataAdapter · turns the restaurant's data file into what the pages and the detail view need.
// The engine never reads the raw data shape directly, so another restaurant's data
// only needs a different adapter, not different components.

const UI_STRINGS = {
  es: {
    classic: "Carta clásica",
    prev: "Anterior",
    next: "Siguiente",
    back: "Volver a la carta",
    ingredients: "Ingredientes",
    allergens: "Alérgenos",
    replay: "Ver de nuevo",
    contents: "La carta",
    topSellers: "Top ventas",
    topSellersLede: "Lo más pedido de la casa.",
    page: "Página",
    pageOf: (current, total) => `${current} de ${total}`,
    cover: "Portada",
    backCover: "Contraportada",
    openHint: "Desliza la página para abrir",
    allergensUnknown: "Aún no tenemos el detalle de alérgenos de este cóctel. Pregunta a nuestro personal antes de pedir.",
    inMenu: (category, page) => `${category} · página ${page}`,
    goToPage: (title, page) => `${title}, página ${page}`,
  },
  en: {
    classic: "Classic menu",
    prev: "Previous",
    next: "Next",
    back: "Back to the menu",
    ingredients: "Ingredients",
    allergens: "Allergens",
    replay: "Watch again",
    contents: "The menu",
    topSellers: "Best sellers",
    topSellersLede: "The house favourites.",
    page: "Page",
    pageOf: (current, total) => `${current} of ${total}`,
    cover: "Cover",
    backCover: "Back cover",
    openHint: "Swipe the page to open",
    allergensUnknown: "We don't have the allergen details for this cocktail yet. Please ask our staff before ordering.",
    inMenu: (category, page) => `${category} · page ${page}`,
    goToPage: (title, page) => `${title}, page ${page}`,
  },
};

export function createMenu(raw, config) {
  const locales = raw.locales?.length ? raw.locales : ["es"];
  const pick = (field, locale) => (field && typeof field === "object" ? field[locale] ?? field[raw.defaultLocale] ?? "" : field ?? "");

  const photoFor = (photo) => {
    if (!photo?.base) {
      return null;
    }

    const { widths, ext } = config.photos;
    const files = widths.map((width) => `${config.assetsBase}${photo.base}-${width}.${ext}`);
    return {
      src: files[files.length - 1],
      srcset: widths.map((width, index) => `${files[index]} ${width}w`).join(", "),
      alt: photo.alt,
    };
  };

  // Page order is part of the data contract: cover, contents, one page per category, back cover.
  const categories = raw.categories.map((category, index) => ({
    ...category,
    page: index + 2,
    photo: photoFor(category.photo),
  }));

  const products = new Map();
  categories.forEach((category) => {
    category.products.forEach((product) => {
      products.set(product.id, { ...product, category, photo: product.photo ? photoFor(product.photo) : null });
    });
  });

  const topSellers = [...products.values()].filter((product) => product.top).sort((a, b) => a.top - b.top);

  return {
    restaurant: raw.restaurant,
    locales,
    defaultLocale: raw.defaultLocale || locales[0],
    categories,
    products,
    topSellers,
    notes: raw.notes || [],
    pageCount: categories.length + 3,
    t: (locale) => UI_STRINGS[locale] || UI_STRINGS.es,
    text: pick,
    price(value, locale) {
      return new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
        style: "currency",
        currency: raw.currency || "EUR",
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      }).format(value);
    },
  };
}
