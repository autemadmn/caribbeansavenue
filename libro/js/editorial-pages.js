// EditorialPage · builds the book's pages from the adapted menu.
// Page elements are created once and keep their identity; switching language only rewrites
// their content, so the book engine never has to rebuild and the reader stays on the same page.

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const STAR = '<svg class="mark-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.55 5.55 6.05.68-4.5 4.1 1.24 5.97L12 16.48l-5.34 3.02L7.9 13.53l-4.5-4.1 6.05-.68z"/></svg>';

const PALM =
  '<svg class="palm" viewBox="0 0 120 120" aria-hidden="true"><g><path d="M60 92V52"/><path d="M60 55C47 58 41 67 38 76"/><path d="M60 55C73 58 79 67 82 76"/><path d="M60 53C52 46 45 44 37 45"/><path d="M60 53C68 46 75 44 83 45"/><path d="M60 52C57 42 59 35 63 28"/></g></svg>';

function folio(menu, locale, pageIndex) {
  return `<footer class="folio-foot"><span>${escape(menu.restaurant.name)}</span><span class="folio-num">${pageIndex + 1}</span></footer>`;
}

function coverPage(menu, locale) {
  const t = menu.t(locale);
  return `
    <img class="cover-photo" src="../assets/img/portada-828.webp" srcset="../assets/img/portada-540.webp 540w, ../assets/img/portada-828.webp 828w" sizes="(min-width: 900px) 50vw, 100vw" alt="" fetchpriority="high" decoding="async">
    <div class="cover-shade"></div>
    <div class="cover-text">
      <h1 class="cover-title"><img class="cover-logo" src="../assets/brand/caribbeans-logo-white.svg" alt="${escape(menu.restaurant.name)}" width="1042" height="278"></h1>
      <p class="cover-sub">${escape(menu.text(menu.restaurant.title, locale))}</p>
      <p class="cover-tagline">${escape(menu.text(menu.restaurant.tagline, locale))}</p>
    </div>
    <p class="cover-hint"><span>${escape(t.openHint)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></p>`;
}

function contentsPage(menu, locale, pageIndex) {
  const t = menu.t(locale);
  const entries = menu.categories
    .map(
      (category) => `
      <li>
        <button class="contents-entry" type="button" data-goto="${category.page}" aria-label="${escape(t.goToPage(menu.text(category.title, locale), category.page + 1))}">
          <span class="contents-name">${escape(menu.text(category.title, locale))}</span>
          <span class="contents-sub">${escape(menu.text(category.subtitle, locale))}</span>
          <span class="contents-page">${category.page + 1}</span>
        </button>
      </li>`,
    )
    .join("");

  const top = menu.topSellers.length
    ? `
    <section class="contents-top" aria-labelledby="topTitle-${locale}">
      <h3 class="contents-top-title" id="topTitle-${locale}">${STAR}${escape(t.topSellers)}</h3>
      <p class="contents-top-lede">${escape(t.topSellersLede)}</p>
      <ol class="contents-top-list">
        ${menu.topSellers
          .map(
            (product) => `
          <li>
            <button class="top-entry" type="button" data-product="${escape(product.id)}">
              <span class="top-entry-name">${escape(menu.text(product.name, locale))}</span>
              <span class="top-entry-price">${escape(menu.price(product.price, locale))}</span>
            </button>
          </li>`,
          )
          .join("")}
      </ol>
    </section>`
    : "";

  return `
    <div class="page-body">
      <h2 class="contents-title" data-reveal="heading">${escape(t.contents)}</h2>
      <ol class="contents-list">${entries}</ol>
      ${top}
    </div>
    ${folio(menu, locale, pageIndex)}`;
}

function categoryPage(menu, locale, category, order) {
  const t = menu.t(locale);
  const photo = category.photo
    ? `<figure class="cat-photo ${order % 2 ? "cat-photo--right" : "cat-photo--left"}">
        <img data-src="${escape(category.photo.src)}" data-srcset="${escape(category.photo.srcset)}" sizes="(min-width: 900px) 40vw, 85vw" alt="${escape(menu.text(category.photo.alt, locale))}" decoding="async">
      </figure>`
    : "";

  const dishes = category.products
    .map((product) => {
      const name = menu.text(product.name, locale);
      return `
      <li>
        <button class="dish" type="button" data-product="${escape(product.id)}">
          <span class="dish-line">
            <span class="dish-name">${escape(name)}</span>
            <span class="dish-price">${escape(menu.price(product.price, locale))}</span>
          </span>
          <span class="dish-desc">${escape(menu.text(product.description, locale))}</span>
          ${product.top ? `<span class="dish-mark">${STAR}${escape(t.topSellers)}</span>` : ""}
        </button>
      </li>`;
    })
    .join("");

  return `
    ${photo}
    <div class="page-body">
      <header class="cat-head">
        <h2 class="cat-title" data-reveal="heading">${escape(menu.text(category.title, locale))}</h2>
        <p class="cat-sub">${escape(menu.text(category.subtitle, locale))}</p>
      </header>
      <ul class="cat-list" data-count="${category.products.length}">${dishes}</ul>
    </div>
    ${folio(menu, locale, category.page)}`;
}

function backPage(menu, locale) {
  const t = menu.t(locale);
  return `
    <div class="back-body">
      ${PALM}
      <p class="back-thanks">${escape(t.thanks)}</p>
      <ul class="back-notes">
        ${menu.notes.map((note) => `<li>${escape(menu.text(note, locale))}</li>`).join("")}
      </ul>
      <p class="back-venue">${escape(menu.restaurant.name)}</p>
    </div>`;
}

/** Page definitions in book order. */
function pageDefinitions(menu) {
  return [
    { kind: "cover", density: "hard", render: (locale) => coverPage(menu, locale), label: (t) => t.cover },
    { kind: "contents", density: "soft", render: (locale) => contentsPage(menu, locale, 1), label: (t) => t.contents },
    ...menu.categories.map((category, order) => ({
      kind: "category",
      density: "soft",
      category,
      render: (locale) => categoryPage(menu, locale, category, order),
      label: (_t, locale) => menu.text(category.title, locale),
    })),
    { kind: "back", density: "hard", render: (locale) => backPage(menu, locale), label: (t) => t.backCover },
  ];
}

export function createPages(menu) {
  const definitions = pageDefinitions(menu);
  const elements = definitions.map((definition, index) => {
    const element = document.createElement("div");
    element.className = `page page--${definition.kind}${definition.density === "soft" ? " page--paper" : ""}`;
    element.dataset.density = definition.density;
    element.dataset.page = String(index);
    if (definition.category) {
      element.dataset.category = definition.category.id;
    }
    return element;
  });

  return {
    elements,
    definitions,

    render(locale) {
      elements.forEach((element, index) => {
        element.innerHTML = definitions[index].render(locale);
      });
    },

    label(index, locale) {
      const definition = definitions[index];
      return definition ? definition.label(menu.t(locale), locale) : "";
    },

    /** Load photos for a page and its neighbours only (pages are display:none until shown). */
    loadAround(index, radius = 2) {
      for (let i = index - radius; i <= index + radius; i += 1) {
        elements[i]?.querySelectorAll("img[data-src]").forEach((img) => {
          img.srcset = img.dataset.srcset;
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          img.removeAttribute("data-srcset");
          img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
        });
      }
    },
  };
}
