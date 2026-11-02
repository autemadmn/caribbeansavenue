# Modo editorial «libro» · Caribbean's Avenue

Experiencia alternativa de la carta: un libro que se hojea, fichas editoriales que se abren desde
cada cóctel y una microescena de hielo en los cócteles que se sirven con hielo. La carta clásica
(`/index.html`) sigue siendo la principal y no se ha modificado.

## Ver en local

```bash
node dev-server.mjs            # desde la raíz del repo
# libro:    http://127.0.0.1:4173/libro/
# pruebas:  http://127.0.0.1:4173/libro/tests/
node tests/check-data.mjs      # coherencia datos ↔ carta clásica
```

Parámetros útiles: `?lang=en`, `?data=fixture` (datos de prueba con una foto de producto).

## Intro de marca

`js/intro.js` + estilos críticos en `index.html`. Una vez por sesión.

1. **Montaje (~0,7 s, CSS, desde el primer pintado):** el anillo de la C se dibuja con un barrido
   cónico desde el corte de la C; «aribbean's» sube letra a letra desde una máscara en su línea
   base; AVENUE se descubre de izquierda a derecha; el punto de la i y el apóstrofo caen al final.
2. **Apertura (0,6 s):** el hueco de la C se convierte en la abertura que descubre la portada
   (con un filo de luz dorada que se apaga al abrirse) mientras el logo vuela a su sitio exacto en
   la portada. Al aterrizar se retira la intro y queda el logo real de la portada en el mismo punto.
3. **Sin esperas artificiales:** la apertura empieza cuando el montaje ha terminado y la carta está
   lista (libro construido, foto de portada decodificada, fuentes; con tope de 2,5 s para la foto).
   Si tarda más de 1,7 s aparece «Preparando la carta…». Si en 7 s no ha cargado, se muestra un
   enlace a la carta clásica en vez de una pantalla vacía.
4. Reloj propio (`requestAnimationFrame` + `performance.now`), no GSAP: en un móvil saturado
   termina a su hora en vez de alargarse, y no depende de que GSAP haya llegado.
5. `prefers-reduced-motion`: logo quieto que se funde.

Revisión de diseño: `?intro=debug&at=<ms>` congela el montaje; `&open=<0..1>` pinta un instante
de la apertura. `tests/frame.html?src=<query>` muestra la carta en un iframe de 390×844 para
capturas.

**Logo:** `assets/brand/caribbeans-logo.svg` es el PNG original del local
(`caribbeans-logo-source.png`) vectorizado con potrace por componentes (anillo, 11 piezas de la
palabra, 6 letras de AVENUE): 99,2 % de coincidencia píxel a píxel con el original, sin redibujar
nada. Ravikaa (github.com/1ung07/ravikaa, sin licencia) se estudió solo como referencia de
máscaras y abertura; no se ha usado su código.

## Arquitectura

Sin framework ni build: módulos ES nativos, igual que el resto del proyecto.

| Responsabilidad | Archivo | Qué hace |
|---|---|---|
| ThemeConfiguration | `js/config.js`, `themes/*.css`, `css/tokens.css` | Flags, gesto, movimiento, layout por restaurante. Tokens de color, tipo, espacio, papel, curvas y duraciones. |
| MenuDataAdapter | `js/data-adapter.js` | Convierte `data/carta.js` en lo que necesitan páginas y fichas (ES/EN, precios con `Intl`, fotos responsive, Top ventas). |
| EditorialPage | `js/editorial-pages.js` | Portada, índice con Top ventas, una página por categoría (foto descentrada + lista) y contraportada. Cambiar de idioma reescribe el contenido sin reconstruir el libro. |
| BookEngine | `js/book-engine.js` | StPageFlip + adaptador de gesto propio, botones, teclado, reconstrucción al girar la pantalla conservando la página. |
| ProductDetail | `js/product-detail.js` | Ficha editorial (`<dialog>` accesible), política de reproducción de la escena, carga diferida del motor de cócteles. |
| SharedImageTransition | `js/shared-transition.js` | La fila (o su foto) crece hasta la ficha con `clip-path` y FLIP; el nombre viaja y se enfoca. Cierre inverso o alternativa si el origen ya no existe. |
| TextMotion | `js/text-motion.js` | Revelado por palabras, enfoque desde desenfoque ligero, secuencias. Una vez por sesión. |
| CocktailExperience | `js/cocktail/experience.js` | Escena Canvas 2D de hielo (vaso, líquido, hielo, salpicadura, ondas, burbujas, condensación). Se carga con `import()` solo al abrir un cóctel que la usa. |
| MotionController | `js/motion.js` | Movimiento reducido, intensidad, un canal por animación (nunca dos timelines sobre el mismo elemento), cierre limpio. |

### El gesto de pasar página

StPageFlip decide al soltar con `Flip.stopMove()` → solo gira si el pliegue ha cruzado el lomo
(`pos.x <= 0`). En móvil (una página) eso exige arrastrar ~100 % del ancho. Además
`UI.onTouchStart()` espera 250 ms antes de seguir el dedo y trata lo rápido como «swipe». Por eso
el resultado dependía de la velocidad.

Solución sin fork ni tocar `node_modules`: StPageFlip se crea con `useMouseEvents: false` y
`book-engine.js` gestiona Pointer Events y conduce la librería con sus propios métodos:

- la hoja sigue al dedo 1:1 desde la esquina (`Flip.fold`), sin salto inicial;
- la decisión se toma **solo al soltar**, con la **posición final** normalizada al recorrido
  efectivo (ancho de página en móvil, doble en pliego): `≥ 30 %` completa, si no, vuelve
  (`Flip.animateFlippingTo`). La velocidad no interviene;
- volver hacia atrás durante el gesto cancela; un segundo dedo o `pointercancel` devuelven la hoja;
- en primera/última página el gesto se bloquea (y se repone el estado interno que `fold()` deja);
- un arrastre que termina sobre un cóctel no abre su ficha.

Métodos internos usados (nombres conservados en el build 2.0.7): `getFlipController()`,
`Flip.fold`, `Flip.getCalculation`, `Flip.animateFlippingTo`, `Flip.setState`. Si se actualiza
StPageFlip hay que volver a pasar `tests/`.

## Repositorios: usados vs. inspiración

| Repositorio | Uso | Licencia |
|---|---|---|
| Nodlik/StPageFlip 2.0.7 | **Incluido** (`vendor/page-flip-2.0.7.browser.js`, sin modificar) | MIT (`vendor/page-flip.LICENSE.txt`) |
| GSAP 3.15.0 | **Incluido** (`vendor/gsap-3.15.0.min.js`, solo el core) | GSAP Standard "no charge" license — ver nota |
| codrops/TooltipTransition | Técnica estudiada (FLIP + revelado); código propio | MIT |
| MiKAZUKi-Luna/interactive-flip-menu | Inspiración | Sin licencia → no se copia nada |
| santiagofslTEC/Gsap_Website (Breeze) | Ritmo y dirección de movimiento | Sin licencia → no se copia nada |
| coooooolpan/motion-text-kit | Comportamiento de FocusBlur / reveal | Sin licencia → no se copia nada |
| DavidHDev/react-bits | Explorado, no usado (React; Commons Clause) | MIT + Commons Clause |
| ibelick/motion-primitives | Explorado, no usado (React) | MIT |
| Animorio · The Cocktail Card | Concepto | Licencia restrictiva para plataformas → implementación 100 % propia |

**Nota GSAP:** la licencia estándar gratuita permite uso comercial, pero excluye productos que
compitan con las herramientas de creación visual de Webflow. Una plataforma de cartas para
restaurantes no debería entrar ahí, pero si Aledares se convierte en un constructor de webs sin
código para terceros, conviene revisarlo: <https://gsap.com/standard-license>.

**Fuentes:** Cormorant Garamond (SIL OFL 1.1), autoalojada y recortada a los caracteres usados.
**Imágenes:** las fotos de categoría son las de la carta del local. Ninguna se presenta como foto
del cóctel. La escena de hielo está dibujada por código.

## Pruebas (`tests/index.html`)

30 pruebas de riesgo con Pointer Events reales en un iframe de móvil: arrastre lento que pasa y
que se cancela, umbral 26 % / 34 %, rápido-y-vuelta, lento-y-acelerar, rápido-y-frenar, página
anterior, cambio de dirección, segundo dedo, `pointercancel`, ratón, tocar cóctel sin pasar
página (con foco devuelto), arrastrar empezando sobre un cóctel, límites del libro, botones y
teclado, índice, Top ventas, títulos revelados, idioma, girar pantalla, cambio rápido de
producto, ficha sin foto, ficha con foto (fixture), reproducción / interrupción / cambio de
producto durante la escena, libro a tamaño completo al abrir, y la intro (aterrizaje, una vez por sesión, salida segura si la carta no carga). Más `node tests/check-data.mjs`.

Verificado en Chrome (escritorio y emulación móvil 375/390 px, tablet apaisada 1180 px,
`prefers-reduced-motion`). **No verificado: Safari iOS ni Chrome en un Android real.** Abre
`/libro/tests/` en esos dispositivos para comprobarlo.

## Limitaciones y pendientes

- **Datos:** el inglés es una traducción de trabajo, pendiente de revisar por el local. No hay
  alérgenos por producto; la ficha remite al personal. No hay fotos de producto.
- **Ingredientes:** solo los que nombra la descripción acordada; Caribbean's Spritz y Matcha
  Mojito no nombran su base, así que no aparece.
- **Escena:** solo el efecto «hielo» (6 cócteles). Cítrico, burbuja, vaho y condensación quedan
  documentados en el registro `EXPERIENCES`, sin implementar a propósito.
- **Sin conexión:** el modo libro no se guarda para uso offline (el service worker lo excluye
  mientras evoluciona).
- **Publicación:** nada se ha subido. `/libro/` quedaría accesible en GitHub Pages solo si se hace
  push; no está enlazado desde la carta clásica.

## Decisiones de diseño

- **Papel marfil sobre la mesa oscura del bar**: une la identidad nocturna y dorada del local con
  la carta física. Cormorant como única voz tipográfica; sans del sistema solo para la interfaz.
- **Movimiento**: dos curvas (`power3.out` para llegar, `power2.in` para irse, también la
  gravedad del hielo) y cuatro duraciones. Un momento por pantalla: el título de portada la
  primera vez, el título de cada categoría al llegar, el nombre al abrir la ficha, la escena del
  cóctel. Nada en bucle.
- **Descartado**: animar todas las filas al pasar página (ruido); WebGL para el líquido (coste sin
  ganancia visible en 1,4 s); instalar React Bits / Motion Text Kit (React, o sin licencia).
- **Escena**: plano cerrado y oscuro para que la ficha marfil de debajo respire; se reproduce sola
  la primera vez por sesión y producto, después muestra el estado final con «Ver de nuevo».
