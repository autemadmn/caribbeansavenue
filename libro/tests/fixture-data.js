// TEST FIXTURE ONLY — never used by the real menu.
// The real data has no product photos yet; this copy gives one product a photo so the
// photo path of the detail transition can be tested. The photo is a page background, not
// a picture of the drink.
import carta from "../../data/carta.js";

const fixture = structuredClone(carta);
// (not one of the four signature drinks: those show their own photograph, CocktailMotion)
const product = fixture.categories.flatMap((category) => category.products).find((item) => item.id === "margarita");
product.photo = { base: "copa", alt: { es: "Foto de prueba", en: "Test photo" } };

export default fixture;
