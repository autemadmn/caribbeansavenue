// Caribbean's Avenue · datos de la carta (fuente única para el modo editorial /libro/).
//
// Reglas:
// - Precios, nombres y descripciones ES son los acordados con el local (cartel de 12 cócteles).
//   tests/check-data.mjs comprueba que coinciden con la carta clásica (index.html).
// - Ingredientes: solo los que nombra la propia descripción. Sin cantidades ni recetas inventadas.
// - Alérgenos: el local no ha facilitado alérgenos por producto. `allergens: null` = desconocido
//   (la ficha remite al personal). Nunca rellenar con suposiciones.
// - Textos EN: traducción de trabajo, PENDIENTE DE REVISAR por el local.
// - `experience`: microescena opcional de la ficha. Solo bebidas que se sirven con hielo.
//   glass: "highball" | "rocks" | "wine". liquid: [color superficie, color fondo].

const ice = (glass, liquid) => ({ type: "ice", glass, liquid });

export default {
  restaurant: {
    id: "caribbeans-avenue",
    name: "Caribbean's Avenue",
    tagline: { es: "Sunset · Night · Atmosphere", en: "Sunset · Night · Atmosphere" },
    title: { es: "Carta de cócteles", en: "Cocktail menu" },
  },
  locales: ["es", "en"],
  defaultLocale: "es",
  currency: "EUR",
  notes: [
    { es: "Todos nuestros cócteles se preparan al momento.", en: "All our cocktails are made to order." },
    {
      es: "Algunos productos pueden contener lactosa. Consulta los alérgenos a nuestro personal.",
      en: "Some products may contain lactose. Please ask our staff about allergens.",
    },
  ],
  categories: [
    {
      id: "signature",
      title: { es: "Signature", en: "Signature" },
      subtitle: { es: "De la casa", en: "House cocktails" },
      photo: { base: "copa", alt: { es: "", en: "" } },
      products: [
        {
          id: "caribbeans-spritz",
          name: { es: "Caribbean's Spritz", en: "Caribbean's Spritz" },
          description: {
            es: "Nuestro spritz con un toque de maracuyá, lima y ginger beer.",
            en: "Our spritz with a touch of passion fruit, lime and ginger beer.",
          },
          price: 10,
          top: 1,
          ingredients: [
            { es: "Maracuyá", en: "Passion fruit" },
            { es: "Lima", en: "Lime" },
            { es: "Ginger beer", en: "Ginger beer" },
          ],
          allergens: null,
          photo: null,
          experience: ice("wine", ["#f39a45", "#b9420f"]),
        },
        {
          id: "porn-star-martini",
          name: { es: "Porn Star Martini", en: "Porn Star Martini" },
          description: {
            es: "Vodka, maracuyá, vainilla, lima y shot de cava.",
            en: "Vodka, passion fruit, vanilla, lime and a shot of cava.",
          },
          price: 12,
          top: 2,
          ingredients: [
            { es: "Vodka", en: "Vodka" },
            { es: "Maracuyá", en: "Passion fruit" },
            { es: "Vainilla", en: "Vanilla" },
            { es: "Lima", en: "Lime" },
            { es: "Shot de cava", en: "Shot of cava" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
      ],
    },
    {
      id: "mojitos",
      title: { es: "Mojitos & Fresh", en: "Mojitos & Fresh" },
      subtitle: { es: "Menta y lima", en: "Mint & lime" },
      photo: { base: "mojito", alt: { es: "", en: "" } },
      products: [
        {
          id: "mojito-clasico",
          name: { es: "Mojito Clásico", en: "Classic Mojito" },
          description: {
            es: "Ron, hierbabuena, lima, azúcar y soda.",
            en: "Rum, mint, lime, sugar and soda.",
          },
          price: 10,
          ingredients: [
            { es: "Ron", en: "Rum" },
            { es: "Hierbabuena", en: "Mint" },
            { es: "Lima", en: "Lime" },
            { es: "Azúcar", en: "Sugar" },
            { es: "Soda", en: "Soda" },
          ],
          allergens: null,
          photo: null,
          experience: ice("highball", ["#e4ecb4", "#8fa94a"]),
        },
        {
          id: "mojito-frutas",
          name: { es: "Mojito Frutas", en: "Fruit Mojito" },
          description: { es: "El clásico, con frutas.", en: "The classic, with fruit." },
          price: 10,
          top: 3,
          ingredients: [
            { es: "Ron", en: "Rum" },
            { es: "Hierbabuena", en: "Mint" },
            { es: "Lima", en: "Lime" },
            { es: "Azúcar", en: "Sugar" },
            { es: "Soda", en: "Soda" },
            { es: "Frutas", en: "Fruit" },
          ],
          allergens: null,
          photo: null,
          experience: ice("highball", ["#ef7f86", "#8e1f33"]),
        },
        {
          id: "caipirinha",
          name: { es: "Caipirinha", en: "Caipirinha" },
          description: { es: "Cachaza, lima y azúcar.", en: "Cachaça, lime and sugar." },
          price: 10,
          ingredients: [
            { es: "Cachaza", en: "Cachaça" },
            { es: "Lima", en: "Lime" },
            { es: "Azúcar", en: "Sugar" },
          ],
          allergens: null,
          photo: null,
          experience: ice("rocks", ["#f1f2d6", "#bcc47e"]),
        },
        {
          id: "caipiroska",
          name: { es: "Caipiroska", en: "Caipiroska" },
          description: { es: "Vodka, lima y azúcar.", en: "Vodka, lime and sugar." },
          price: 10,
          ingredients: [
            { es: "Vodka", en: "Vodka" },
            { es: "Lima", en: "Lime" },
            { es: "Azúcar", en: "Sugar" },
          ],
          allergens: null,
          photo: null,
          experience: ice("rocks", ["#f4f4e2", "#c6cc96"]),
        },
      ],
    },
    {
      id: "clasicos",
      title: { es: "Clásicos", en: "Classics" },
      subtitle: { es: "Los de siempre", en: "The timeless ones" },
      photo: { base: "portada", alt: { es: "", en: "" } },
      products: [
        {
          id: "pina-colada",
          name: { es: "Piña Colada", en: "Piña Colada" },
          description: { es: "Ron, piña y coco.", en: "Rum, pineapple and coconut." },
          price: 10,
          ingredients: [
            { es: "Ron", en: "Rum" },
            { es: "Piña", en: "Pineapple" },
            { es: "Coco", en: "Coconut" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
        {
          id: "moscow-mule",
          name: { es: "Moscow Mule", en: "Moscow Mule" },
          description: {
            es: "Vodka, lima, azúcar y ginger beer.",
            en: "Vodka, lime, sugar and ginger beer.",
          },
          price: 10,
          ingredients: [
            { es: "Vodka", en: "Vodka" },
            { es: "Lima", en: "Lime" },
            { es: "Azúcar", en: "Sugar" },
            { es: "Ginger beer", en: "Ginger beer" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
        {
          id: "margarita",
          name: { es: "Margarita", en: "Margarita" },
          description: { es: "Tequila, triple sec y lima.", en: "Tequila, triple sec and lime." },
          price: 12,
          ingredients: [
            { es: "Tequila", en: "Tequila" },
            { es: "Triple sec", en: "Triple sec" },
            { es: "Lima", en: "Lime" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
      ],
    },
    {
      id: "sin-alcohol",
      title: { es: "Sin alcohol", en: "Alcohol-free" },
      subtitle: { es: "Mocktails", en: "Mocktails" },
      photo: { base: "playa", alt: { es: "", en: "" } },
      products: [
        {
          id: "matcha-mojito",
          name: { es: "Matcha Mojito", en: "Matcha Mojito" },
          description: {
            es: "Un mojito con el sabor del matcha y ginger beer.",
            en: "A mojito with the flavour of matcha and ginger beer.",
          },
          price: 8,
          ingredients: [
            { es: "Matcha", en: "Matcha" },
            { es: "Ginger beer", en: "Ginger beer" },
          ],
          allergens: null,
          photo: null,
          experience: ice("highball", ["#c3d98a", "#5f7f2a"]),
        },
        {
          id: "pina-colada-sin",
          name: { es: "Piña Colada", en: "Piña Colada" },
          description: { es: "La mezcla perfecta de coco y piña.", en: "The perfect blend of coconut and pineapple." },
          price: 8,
          ingredients: [
            { es: "Coco", en: "Coconut" },
            { es: "Piña", en: "Pineapple" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
        {
          id: "caribeno",
          name: { es: "Caribeño", en: "Caribeño" },
          description: { es: "El sabor del mango y el maracuyá.", en: "The taste of mango and passion fruit." },
          price: 8,
          ingredients: [
            { es: "Mango", en: "Mango" },
            { es: "Maracuyá", en: "Passion fruit" },
          ],
          allergens: null,
          photo: null,
          experience: null,
        },
      ],
    },
  ],
};
