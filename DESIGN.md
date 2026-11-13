---
name: Caribbean's Avenue · Carta
description: Carta de una página para el QR de mesa, en noche de avenida, con el acento que cambia con la tarifa de la hora.
colors:
  navy-900: "#10142a"
  navy-850: "#161b36"
  navy-800: "#1d2344"
  ivory-50: "#f5efe6"
  ivory-300: "#c2c5d8"
  ivory-500: "#9499b5"
  sunset-400: "#f6a85e"
  moon-300: "#b6beff"
  line: "rgb(245 239 230 / 0.12)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Avenir Next Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.375rem, 10.5vw, 3.25rem)"
    fontWeight: 760
    lineHeight: 0.95
    letterSpacing: "-0.012em"
    fontVariation: "'opsz' 96, 'wdth' 75"
  headline:
    fontFamily: "Bricolage Grotesque, Avenir Next Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 8.6vw, 2.5rem)"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.01em"
    fontVariation: "'opsz' 96, 'wdth' 75"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 680
    lineHeight: 1.15
    fontVariation: "'opsz' 32, 'wdth' 88"
  item:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 640
    lineHeight: 1.25
    fontVariation: "'wdth' 92"
  body:
    fontFamily: "Bricolage Grotesque, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'opsz' 16"
  price:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 650
    lineHeight: 1.25
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
  rail:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(0.6875rem, 1.55svh, 0.75rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 88"
rounded:
  tick: "2px"
  focus: "6px"
  control: "9px"
  group: "12px"
  bubble: "16px"
  banner: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  row: "14px"
  gutter: "16px"
  md: "20px"
  lg: "24px"
  section: "36px"
  family: "48px"
components:
  header-bar:
    backgroundColor: "{colors.navy-900}"
    height: "58px"
    padding: "0 16px"
  lang-toggle:
    backgroundColor: "{colors.navy-850}"
    rounded: "{rounded.group}"
    padding: "3px"
  lang-toggle-button:
    textColor: "{colors.ivory-500}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    size: "44px"
  lang-toggle-button-active:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.ivory-50}"
  tarifa-now:
    textColor: "{colors.sunset-400}"
    typography: "{typography.label}"
  tarifa-now-noche:
    textColor: "{colors.moon-300}"
  top-banner:
    backgroundColor: "{colors.navy-850}"
    rounded: "{rounded.banner}"
    height: "clamp(272px, 42svh, 360px)"
    padding: "24px 0 52px 22px"
  cocktail-row:
    textColor: "{colors.ivory-50}"
    typography: "{typography.item}"
    padding: "14px 10px 14px 0"
  price-row:
    textColor: "{colors.ivory-500}"
    typography: "{typography.body}"
    padding: "7px 0"
  price-row-current:
    textColor: "{colors.ivory-50}"
  price-band:
    backgroundColor: "{colors.navy-850}"
    rounded: "{rounded.group}"
    width: "4.4rem"
  rail:
    width: "44px"
    typography: "{typography.rail}"
  rail-tick-active:
    backgroundColor: "{colors.sunset-400}"
    rounded: "{rounded.tick}"
    width: "12px"
    height: "3px"
  scrub-bubble:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.ivory-50}"
    rounded: "{rounded.bubble}"
    padding: "12px 18px 14px"
    typography: "{typography.headline}"
---

# Design System: Caribbean's Avenue · Carta

## Overview

**Creative North Star: "La avenida a las diez y media"**

La carta es una noche de avenida azul tinta en la que la única luz que cambia es la de la hora. Hasta las 22:30 el acento es el ámbar de un atardecer en la Avenida de Francia; desde las 22:30 pasa a un azul luna frío. Todo lo demás se queda quieto: el fondo, el marfil del texto y la tipografía. El cliente lee la tarifa vigente sin que nadie se la explique, porque la carta entera ha cambiado de luz.

La página es una sola columna seguida que se recorre con el pulgar. El mapa no está arriba en pestañas sino en el borde derecho: un índice vertical fijo con el nombre de cada familia girado y una marca por sección. Las copas aparecen como objetos recortados apoyados en una barra, con un charco de luz del color del cóctel debajo, nunca dentro de tarjetas o marcos. Las bebidas siguen el código de carta de bar impresa: nombre, puntos guía y dos columnas de precio, tarde y noche, con la vigente iluminada.

La densidad es de lectura con poca luz: cuerpo de 16 px como mínimo, objetivos de 44 px, contraste alto y una sola familia tipográfica variable que da toda la jerarquía con ancho, tamaño óptico y peso.

**Key Characteristics:**
- Fondo azul tinta plano con escalones tonales de la misma noche, sin texturas ni degradados de pantalla.
- Un único acento vivo, ligado a la tarifa de la hora (ámbar o luna), nunca los dos a la vez.
- Bricolage Grotesque como única familia: titulares estrechos y pesados, cuerpo a ancho normal.
- Precios en cifras tabulares alineados a la derecha; puntos guía hasta la primera columna.
- Índice al pulgar en el borde derecho, con rótulo grande mientras se arrastra.
- Copas como recortes sobre una línea de barra, con el tono del cóctel como luz.

## Colors

Una noche azul tinta de tres escalones, texto marfil cálido con dos grises lavanda para la jerarquía, y un acento que alterna con la hora.

### Primary
- **Ámbar de atardecer** (sunset-400): el acento de la tarifa de tarde. Pinta el nombre de la tarifa en la cabecera, la etiqueta de la columna vigente, la familia y la marca actuales del índice, el anillo de foco y la mención «Top ventas» dentro de la fila de cóctel. Es el valor por defecto de `--accent`.

### Secondary
- **Azul luna** (moon-300): el mismo papel que el ámbar, en tarifa de noche (`data-tarifa="noche"` en la raíz). Sustituye al ámbar en todos sus usos a la vez, con una transición de color de 0,6 s.

### Neutral
- **Noche de avenida** (navy-900): el suelo de toda la página, la cabecera fija y el color de tema del navegador.
- **Noche alzada** (navy-850): primer escalón. Fondo del banner de Top ventas, del selector de idioma y de la banda que ilumina la columna de precio vigente.
- **Noche alta** (navy-800): segundo escalón. Botón de idioma activo y rótulo flotante del índice.
- **Marfil cálido** (ivory-50): texto principal, nombres, precios vigentes, barrita activa del banner.
- **Niebla lavanda** (ivory-300): texto secundario: la línea de cada cóctel, la hora de la tarifa, notas de sección y notas legales.
- **Lavanda apagada** (ivory-500): texto terciario: precios de la tarifa no vigente, etiquetas de columna en reposo, nombres del índice, idioma inactivo, lema del pie (contraste 6,5:1 sobre el suelo).
- **Hilo marfil** (line): separadores entre cócteles, línea del pie y la línea de la cabecera al desplazarse. Los puntos guía y las marcas del índice usan el mismo marfil a 0,2 y 0,32 de opacidad.

### Named Rules
**La Regla del Reloj.** El acento lo decide la hora de Valencia, no el diseño: ámbar en tarifa de tarde, luna en tarifa de noche. Los dos nunca conviven en pantalla, y ningún elemento nuevo lleva un color de acento propio; todo lo que deba destacar usa `--accent`.

**La Regla del Escalón Nocturno.** Lo que se ilumina o se eleva sube un escalón de la propia noche (navy-850, navy-800), nunca un tinte del acento sobre el azul: el ámbar al 10 % sobre navy sale marrón.

## Typography

**Display Font:** Bricolage Grotesque (con Avenir Next Condensed, Arial Narrow)
**Body Font:** Bricolage Grotesque (con system-ui, -apple-system, Segoe UI)

**Character:** Una sola grotesca variable que hace de cartel y de carta: estrechada al 75 % y a tamaño óptico 96 para los titulares, con el aire de rótulo de bar; a ancho normal y tamaño óptico 16 para leer líneas y precios con poca luz.

### Hierarchy
- **Display** (760, clamp 2,375–3,25 rem, 0,95): títulos de familia (Top ventas, Cócteles, Cervezas, Copas…). Ancho 75 %, equilibrado en varias líneas.
- **Headline** (760, clamp 1,875–2,5 rem, 0,98): nombre del cóctel en el banner y rótulo flotante del índice (1,875 rem fijo).
- **Title** (680, 1,375 rem, 1,15): títulos de sección dentro de una familia (Clásicos, Ginebras…). Ancho 88 %.
- **Item** (640, 1,125 rem, 1,25): nombre de cada cóctel. Ancho 92 %.
- **Body** (400, 1 rem, 1,5; 1,4 en líneas de cóctel y del banner): descripción del cóctel, nombre de bebida, notas legales. La línea del banner se limita a 22ch y las notas del pie a 46ch.
- **Price** (650, 1,0625 rem, cifras tabulares): precio del cóctel. Variantes del mismo papel: 1,5 rem en el banner; 1 rem a 450 para la tarifa no vigente y 650 para la vigente en las filas de bebidas.
- **Label** (600, 0,8125 rem, +0,02em): botones ES/EN, etiquetas de columna Tarde/Noche, hora de la tarifa (a 400). El nombre de la tarifa sube a 0,875 rem y 650.
- **Rail** (600, 0,6875–0,75 rem, vertical): nombre de familia girado en el índice, ancho 88 %.

### Named Rules
**La Regla de Una Familia.** Toda la jerarquía sale de Bricolage Grotesque moviendo ancho, tamaño óptico y peso. No se añade una segunda familia ni una cursiva decorativa.

**La Regla de la Cifra Tabular.** Todo precio va en cifras tabulares y alineado a la derecha, para que las columnas de tarde y noche se lean de un vistazo.

## Layout

Una columna de lectura de 760 px como máximo, centrada, con un margen lateral de 16 px en móvil y 32 px desde 720 px. La rejilla tiene dos pistas: el contenido y, a la derecha, el índice al pulgar (44 px en móvil, 56 px desde 720 px). La cabecera fija mide 58 px más el área segura superior y, en pantallas anchas, se alinea con la columna de la carta en lugar de irse a los bordes.

El ritmo vertical es de carta: 48 px entre familias, 36 px entre secciones, 20 px entre el título de familia y su primera sección, 14 px de relleno vertical por cóctel y 7 px por fila de bebida. El contenido deja 10 px libres a la derecha para no rozar el índice. Las filas de bebidas son una rejilla de nombre flexible más dos columnas de precio de 4,4 rem (5 rem desde 720 px).

El orden es fijo y de arriba abajo: Top ventas, cócteles (Clásicos primero), resto de cócteles, bebidas por familia y el cierre con notas, logo y lema. Todo está visible al bajar; ninguna categoría se pliega.

**La Regla del Borde Derecho.** El borde derecho pertenece al índice. Nada del contenido lo ocupa, y ninguna navegación horizontal (pestañas, chips de categoría) lo sustituye.

## Elevation & Depth

La noche es plana. La profundidad se cuenta con escalones tonales del mismo azul (navy-900, 850, 800) y con la luz del cóctel bajo cada copa. Solo llevan sombra las cosas que de verdad flotan o se apoyan sobre algo.

### Shadow Vocabulary
- **Cabecera al desplazarse** (`box-shadow: 0 1px 0 var(--line), 0 10px 18px -14px rgb(0 0 0 / 0.7)`): aparece en cuanto hay contenido debajo de la cabecera fija.
- **Rótulo flotante** (`box-shadow: 0 14px 34px -10px rgb(0 0 0 / 0.65), 0 2px 6px rgb(0 0 0 / 0.3)`): el rótulo grande que acompaña al pulgar en el índice.
- **Copa recortada** (`filter: drop-shadow(0 14px 14px rgb(0 0 0 / 0.45))`): asienta la foto de la copa sobre la línea de barra del banner.

### Named Rules
**La Regla de la Noche Plana.** Las superficies no llevan sombra en reposo. La sombra se reserva a lo que flota sobre la carta (cabecera desplazada, rótulo del índice) y a las copas apoyadas en la barra.

## Shapes

Esquinas suaves y escalonadas por tamaño: 24 px en el banner, 16 px en el rótulo flotante, 12 px en el selector de idioma y la banda de precio vigente, 9 px en los botones de idioma, 6 px en el anillo de foco y 2 px en barritas y marcas. Los separadores son hilos de 1 px a todo el ancho de la fila; los puntos guía son un borde punteado de 2 px. Las copas no tienen contenedor: su silueta es la forma.

**La Regla del Objeto Recortado.** Una copa es un objeto, no una imagen en una caja: recorte sobre fondo transparente, apoyado en la base, con el tono del cóctel como luz debajo. En el banner se apoya en una línea de barra de 1 px que se desvanece hacia la izquierda.

## Components

### Cabecera fija
Logo a la izquierda (124 px; 148 px desde 720 px), la tarifa vigente en palabras en el centro-derecha y el selector de idioma. Fondo noche de avenida; gana línea y sombra al desplazarse.
- **Tarifa vigente:** dos líneas alineadas a la derecha. El nombre («Tarifa de tarde») en el acento a 650; la hora («hasta las 22:30») en niebla lavanda. Se anuncia con `aria-live`.

### Selector de idioma (ES/EN)
- **Shape:** grupo con esquinas de 12 px y 3 px de relleno; botones de 44 × 44 px con esquinas de 9 px.
- **Reposo:** texto lavanda apagada sobre noche alzada.
- **Activo:** fondo noche alta y texto marfil (`aria-pressed="true"`).
- **Hover (ratón):** el inactivo pasa a niebla lavanda. Transiciones de 0,2 s.

### Banner de Top ventas
Pieza de portada de la carta: copa grande a la derecha, nombre en display, línea y precio a la izquierda.
- **Contenedor:** noche alzada, esquinas de 24 px, alto clamp(272 px, 42svh, 360 px); 380 px desde 720 px.
- **Diapositiva:** charco de luz radial del color del cóctel (`--tint`) donde se apoya la copa y línea de barra de 1 px. Al arrastrar, el texto y la copa se desplazan en paralaje en sentidos opuestos.
- **Comportamiento:** gira solo cada 4,5 s, se arrastra con inercia y vuelve con un muelle; bucle infinito. Se pausa con el foco dentro y fuera de pantalla. Con movimiento reducido no gira solo y los cambios son instantáneos.
- **Pasos:** barritas de 30 × 3 px dentro de objetivos de 44 px; la activa en marfil a escala completa, las demás en marfil al 28 % y al 73 % de ancho.

### Fila de cóctel
- **Estructura:** miniatura de 52 px (64 px desde 720 px) con la copa apoyada abajo, a 68 px de alto (84 px); nombre y una línea de ingredientes; precio a la derecha.
- **Separación:** hilo marfil entre filas, sin tarjeta.
- **Top ventas:** la mención va dentro de la línea, en el acento y a 600, seguida de « · ».

### Fila de bebida con dos tarifas
- **Cabecera de sección:** título y etiquetas Tarde/Noche sobre sus columnas; la etiqueta vigente en el acento.
- **Fila:** nombre con puntos guía hasta la primera columna; notas en lavanda apagada a 0,8125 rem; «desde» en pequeño delante del precio cuando procede.
- **Precio:** el no vigente en lavanda apagada a 450; el vigente en marfil a 650.
- **Banda vigente:** columna de noche alzada con esquinas de 12 px que se desliza de una columna a otra en 0,5 s cuando cambia la tarifa.

### Índice al pulgar (signature)
El mapa de la página en el borde derecho.
- **Estructura:** una entrada por familia con su nombre girado en vertical y una marca por sección; el alto de cada familia es proporcional a su número de secciones.
- **Marcas:** 5 × 2 px en reposo, en marfil al 32 %; la sección visible crece a 12 × 3 px desde el borde y toma el acento. La familia actual pinta su nombre en el acento.
- **Arrastre:** arrastrar el pulgar salta en vivo a cada sección y muestra el rótulo flotante; tocar una marca salta a su sección. Con teclado cada marca es un enlace.
- **Rótulo flotante:** noche alta, esquinas de 16 px, nombre de sección en headline y familia en niebla lavanda debajo. Sigue la altura del dedo; entra con 0,16 s de opacidad y 0,22 s de escala desde 0,96.

### Cierre
Notas legales del local centradas (máximo 46ch) en niebla lavanda, logo a 200 px y el lema «Sunset · Night · Atmosphere» en lavanda apagada con +0,06em de espaciado.

### Copas dibujadas (provisional)
Mientras faltan fotos, los cócteles sin recorte usan una silueta SVG de trazo marfil con el líquido en el tono del cóctel. Es un sustituto temporal: cuando llegue la foto, se usa el recorte.

## Do's and Don'ts

### Do:
- **Do** destacar todo con `--accent` y dejar que la tarifa decida su valor (ámbar de tarde, luna de noche).
- **Do** subir un escalón de la noche (navy-850, navy-800) para iluminar o elevar una superficie.
- **Do** escribir todos los precios en cifras tabulares, alineados a la derecha, con las dos tarifas siempre visibles y la vigente en marfil a 650.
- **Do** mantener cuerpo de 16 px como mínimo y objetivos táctiles de 44 px, también en el índice.
- **Do** presentar las copas como recortes apoyados en la base, con el tono del cóctel como luz debajo.
- **Do** respetar `prefers-reduced-motion`: el banner no gira solo y las transiciones son instantáneas.

### Don't:
- **Don't** sustituir el índice vertical por una barra de pestañas horizontal o un acordeón de categorías.
- **Don't** usar un tinte del acento como fondo sobre el azul tinta.
- **Don't** mostrar el ámbar y el azul luna a la vez, ni introducir un tercer color de acento.
- **Don't** añadir una segunda familia tipográfica.
- **Don't** meter las copas en tarjetas o marcos, ni poner fotos a las bebidas que no son cócteles.
- **Don't** usar rallitas laterales de color ni iconos genéricos para marcar secciones o estados.
- **Don't** poner sombra a superficies en reposo.
