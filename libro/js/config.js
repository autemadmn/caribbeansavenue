// ThemeConfiguration · everything that changes per restaurant, nothing that changes the engine.
// A new restaurant = a new data file + a new theme CSS + a copy of this object.

export const config = {
  restaurant: "caribbeans-avenue",
  data: "../../data/carta.js",          // MenuDataAdapter source (ES module, default export)
  assetsBase: "../assets/img/",          // where category photos live, relative to /libro/

  features: {
    editorial: true,                      // editorial page compositions
    flipbook: true,                       // false = plain vertical pages, same content
    textMotion: true,                     // cover / heading / name reveals
    cocktailExperience: true,             // microscene in product detail when a product enables it
    topSellers: true,                     // "Top ventas" block on the index page + marks
  },

  motion: {
    intensity: 1,                         // 0 = static, 1 = designed motion (prefers-reduced-motion forces 0)
    flippingTime: 760,                    // ms for a full page turn (shorter drags animate proportionally)
  },

  gesture: {
    threshold: 0.3,                       // share of the effective page travel to commit a turn on release
    slop: 8,                              // px before a press becomes a drag
    verticalBias: 1.2,                    // |dx| must exceed |dy| * this to count as a page drag
    peekOnce: true,                       // show the page corner lifting once, on the cover
  },

  layout: {
    spreadMinWidth: 900,                  // two facing pages from this stage width…
    spreadMinAspect: 1.15,                // …and when the stage is at least this landscape
  },

  photos: {
    // category photo base name -> responsive files in assetsBase
    widths: [540, 828],
    ext: "webp",
  },
};
