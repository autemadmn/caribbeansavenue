# Caribbean's Avenue · carta digital

Carta de una sola página que abre el QR de las mesas: Top ventas, cócteles (Clásicos primero) y
121 bebidas con precio de **tarde** (hasta las 22:30) y de **noche** (desde las 22:30). ES / EN.

- **URL del QR (impresa, no puede cambiar):** https://caribbeansavenue.autemadmn.workers.dev/
- También en GitHub Pages: https://autemadmn.github.io/caribbeansavenue/
- HTML/CSS/JS sin compilar. Un push a `main` publica en los dos sitios: **es producción**.

## Probar en local

```sh
node dev-server.mjs          # http://127.0.0.1:4173
```

- `?lang=en` fuerza inglés, `?tarifa=noche` / `?tarifa=tarde` fuerza la tarifa.
- Sin parámetros: idioma del navegador (o el último elegido) y tarifa según la hora de Valencia.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | La carta. Solo la cabecera; el resto lo pinta `carta/app.js`. |
| `carta/app.js` | Pintado, tarifa por hora, idioma, arranque. |
| `carta/banner.js` | Banner de Top ventas: gira cada 4,5 s, se arrastra con inercia. |
| `carta/nav.js` | Barra de secciones fija (chips que marcan la familia en pantalla) y buscador sin tildes ES/EN. |
| `carta/glasses.js` | Siluetas de copa para los cócteles sin foto. |
| `carta/source.js` | Datos locales (cócteles + bebidas + notas del local). |
| `carta/remote.js` | Datos del panel ADELARES (Supabase). **Vacío por ahora**: devuelve `null`. |
| `data/carta.js` | Los 12 cócteles (lo comparte el modo libro). Top ventas = `top`. |
| `data/bebidas.js` · `.json` | **Generados** desde el Excel. No editar a mano. |
| `sw.js` | Caché sin conexión. |
| `qr/` | QR para imprenta (SVG, PDF 80 mm, PNG 600 ppp). |
| `libro/` | Modo libro (anterior). Sigue funcionando pero ya no se enlaza. |
| `clasica.html` | Carta anterior de 12 cócteles (enlace de `noscript`). |
| `formulario/` | Formulario que rellenó el local (4/11). |

## Cambiar precios de las bebidas

1. Actualiza el Excel del local (`Carta_Avenue_paginas_2_a_5.xlsm`).
2. `python scripts/importar-excel.py RUTA/Carta_Avenue_paginas_2_a_5.xlsm` → reescribe `data/bebidas.*`.
   Avisa de productos sin traducción; falla si aparece una categoría nueva (añádela en `SECCIONES`).
3. `node tests/check-bebidas.mjs RUTA.xlsm` comprueba precio a precio contra el Excel.

## Antes de publicar

- `node tests/check-data.mjs` y `node tests/check-bebidas.mjs` en verde.
- **Sube `VERSION` en `sw.js`** si cambia cualquier archivo de la carta, y el `?v=` de `index.html`
  si cambian `carta.css` o `app.js`; si no, los móviles siguen viendo la carta guardada.
- Revisa en móvil (390 px) y escritorio, ES/EN y las dos tarifas.

## QR

`python scripts/generar-qr.py` regenera `qr/`. Corrección alta (H) y margen de 4 módulos: no recortar
el margen blanco al maquetar.

## Pendiente

- Panel ADELARES: Top ventas, precios tarde/noche y nombres ES/EN desde el panel (`carta/remote.js`).
- Fotos de los 8 cócteles sin foto (se generarán con Antigravity; mismas reglas que `assets/cocktails/*-1200.webp`).
- Preguntar al local: qué whisky es «Bold», qué es «Doble» y si «Sangrías 35 €» es jarra.
