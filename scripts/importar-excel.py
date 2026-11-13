"""Importa el Excel de bebidas del local a data/bebidas.js (y data/bebidas.json).

Uso:  python scripts/importar-excel.py RUTA/Carta_Avenue_paginas_2_a_5.xlsm

- Lee la tabla «CartaAvenue» (Página PDF, Categoría, Producto, Tarde, Noche, Observaciones)
  sin dependencias: el .xlsm es un zip con XML.
- Corrige erratas evidentes de marca (NOMBRES) y añade la traducción al inglés.
  Un producto que no esté en NOMBRES se publica tal cual y el script lo avisa.
- El orden de las secciones lo fija SECCIONES (agrupado por familias para el índice).
  Una categoría del Excel que no esté en SECCIONES hace fallar el script: no se pierde nada.
"""

import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT = Path(__file__).resolve().parent.parent

# Familias del índice y secciones en orden. Clave = categoría tal cual viene en el Excel.
SECCIONES = [
    ("cervezas-vinos", {"es": "Cervezas y vinos", "en": "Beer & wine"}, [
        ("Cerveza", {"es": "Cervezas", "en": "Beer"}),
        ("Sangría y agua de Valencia", {"es": "Sangría y Agua de Valencia", "en": "Sangria & Agua de Valencia"}),
        ("Vino", {"es": "Vinos", "en": "Wine"}),
        ("Vermut", {"es": "Vermut", "en": "Vermouth"}),
    ]),
    ("champagne", {"es": "Champagne", "en": "Champagne"}, [
        ("Champagne", {"es": "Champagne", "en": "Champagne"}),
    ]),
    ("copas", {"es": "Copas", "en": "Spirits"}, [
        ("Ginebras", {"es": "Ginebras", "en": "Gin"}),
        ("Ginebras premium", {"es": "Ginebras premium", "en": "Premium gin"}),
        ("Ron", {"es": "Ron", "en": "Rum"}),
        ("Ron premium", {"es": "Ron premium", "en": "Premium rum"}),
        ("Whiskey", {"es": "Whiskey", "en": "Whiskey"}),
        ("Whiskey premium", {"es": "Whiskey premium", "en": "Premium whiskey"}),
        ("Vodka", {"es": "Vodka", "en": "Vodka"}),
        ("Vodka premium", {"es": "Vodka premium", "en": "Premium vodka"}),
        ("Tequila", {"es": "Tequila", "en": "Tequila"}),
        ("Cognac", {"es": "Cognac", "en": "Cognac"}),
    ]),
    ("licores", {"es": "Licores y chupitos", "en": "Liqueurs & shots"}, [
        ("Licores", {"es": "Licores", "en": "Liqueurs"}),
        ("Chupitos", {"es": "Chupitos", "en": "Shots"}),
    ]),
    ("refrescos", {"es": "Refrescos y zumos", "en": "Soft drinks"}, [
        ("Refrescos", {"es": "Refrescos", "en": "Soft drinks"}),
        ("Zumos", {"es": "Zumos", "en": "Juices"}),
    ]),
]

# Observaciones del Excel → nota de sección o de producto.
OBSERVACIONES = {
    "Por copa": {"es": "Precio por copa", "en": "Price per glass"},
    "Por botella": {"es": "Precio por botella", "en": "Price per bottle"},
    "Consultar": {"es": "Consultar al personal", "en": "Ask our staff"},
}

# Nombre en el Excel → (nombre ES corregido, nombre EN). Sin entrada = tal cual en los dos.
NOMBRES = {
    "Agua": ("Agua", "Water"),
    "Agua gas": ("Agua con gas", "Sparkling water"),
    "Pepsi": ("Pepsi", "Pepsi"),
    "Pepsi zero": ("Pepsi Zero", "Pepsi Zero"),
    "Schweppes limón": ("Schweppes limón", "Schweppes lemon"),
    "Schweppes naranja": ("Schweppes naranja", "Schweppes orange"),
    "Seven Up": ("Seven Up", "Seven Up"),
    "Schweppes Tonica": ("Schweppes tónica", "Schweppes tonic"),
    "Schweppes Berry": ("Schweppes Berry", "Schweppes Berry"),
    "Schweppes Ginger Ale / Ginger Beer": ("Schweppes Ginger Ale / Ginger Beer", "Schweppes Ginger Ale / Ginger Beer"),
    "Lipton": ("Lipton", "Lipton"),
    "Aquarade Naranja o limón": ("Aquarade naranja o limón", "Aquarade orange or lemon"),
    "Red bull / Redbull sugar free / Sabores": ("Red Bull / Sugarfree / sabores", "Red Bull / Sugarfree / flavours"),
    "Zumo piña / melocotón / naranja": ("Zumo de piña, melocotón o naranja", "Pineapple, peach or orange juice"),
    "Sangría copa": ("Sangría, copa", "Sangria, glass"),
    "Sangrias": ("Sangrías", "Sangrias"),
    "Agua de Valencia Copa": ("Agua de Valencia, copa", "Agua de Valencia, glass"),
    "Estrella galicia 1/3": ("Estrella Galicia ⅓", "Estrella Galicia ⅓"),
    "Estrella galicia 1/3 sin alcohol": ("Estrella Galicia ⅓ sin alcohol", "Estrella Galicia ⅓ alcohol-free"),
    "Heineken": ("Heineken", "Heineken"),
    "Coronita": ("Coronita", "Coronita"),
    "Desperados": ("Desperados", "Desperados"),
    "Radler": ("Radler", "Radler"),
    "Doble": ("Doble", "Doble (large draught)"),
    "Pinta": ("Pinta", "Pint"),
    "Estrella 1906": ("Estrella 1906", "Estrella 1906"),
    "Vermut blanco": ("Vermut blanco", "White vermouth"),
    "Vermut tinto": ("Vermut tinto", "Red vermouth"),
    "Vino blanco Copa": ("Vino blanco, copa", "White wine, glass"),
    "Vino tinto Copa": ("Vino tinto, copa", "Red wine, glass"),
    "Vino blanco Botella": ("Vino blanco, botella", "White wine, bottle"),
    "Vino tinto Botella": ("Vino tinto, botella", "Red wine, bottle"),
    "Cognac": ("Cognac", "Cognac"),
    "Cognac Premium o similar": ("Cognac premium o similar", "Premium cognac or similar"),
    "Baileys": ("Baileys", "Baileys"),
    "Campari": ("Campari", "Campari"),
    "Licor Avellana": ("Licor de avellana", "Hazelnut liqueur"),
    "Tia maria": ("Tia Maria", "Tia Maria"),
    "Jager copa": ("Jägermeister, copa", "Jägermeister, glass"),
    "Jagger + redbull copa": ("Jägermeister + Red Bull, copa", "Jägermeister + Red Bull, glass"),
    "Licor 43": ("Licor 43", "Licor 43"),
    "Malibu": ("Malibu", "Malibu"),
    "Pacharan zoco": ("Pacharán Zoco", "Pacharán Zoco"),
    "Ponche caballero": ("Ponche Caballero", "Ponche Caballero"),
    "Thunder": ("Thunder", "Thunder"),
    "Vodka rojo/azul": ("Vodka rojo / azul", "Red / blue vodka"),
    "Cazalla": ("Cazalla", "Cazalla"),
    "Brugal 1888": ("Brugal 1888", "Brugal 1888"),
    "Flor de caña 12": ("Flor de Caña 12", "Flor de Caña 12"),
    "Zacapa 23": ("Zacapa 23", "Zacapa 23"),
    "Barceló Imperial": ("Barceló Imperial", "Barceló Imperial"),
    "Diplomático": ("Diplomático", "Diplomático"),
    "Tequila": ("Tequila", "Tequila"),
    "Tequila premium": ("Tequila premium", "Premium tequila"),
    "Tequila sabores": ("Tequila de sabores", "Flavoured tequila"),
    "Chupito Don Julio/Patrón": ("Chupito Don Julio / Patrón", "Don Julio / Patrón shot"),
    "Brugal": ("Brugal", "Brugal"),
    "Flor de caña 5 años": ("Flor de Caña 5 años", "Flor de Caña 5 years"),
    "Barceló": ("Barceló", "Barceló"),
    "Abuelo": ("Abuelo", "Abuelo"),
    "Ron blanco Bacardi": ("Bacardí blanco", "Bacardí white rum"),
    "Jb": ("J&B", "J&B"),
    "White Label": ("White Label", "White Label"),
    "Bold": ("Bold", "Bold"),
    "Red Label": ("Red Label", "Red Label"),
    "Dyc": ("DYC", "DYC"),
    "Dyc 8 Años": ("DYC 8 años", "DYC 8 years"),
    "100 Pipers": ("100 Pipers", "100 Pipers"),
    "Flour Roses": ("Four Roses", "Four Roses"),
    "Jim Bean": ("Jim Beam", "Jim Beam"),
    "Jameson": ("Jameson", "Jameson"),
    "Jack Daniels": ("Jack Daniel's", "Jack Daniel's"),
    "Jack Daniels Apple": ("Jack Daniel's Apple", "Jack Daniel's Apple"),
    "Jack Daniels Fire": ("Jack Daniel's Fire", "Jack Daniel's Fire"),
    "Jack Daniels Honney": ("Jack Daniel's Honey", "Jack Daniel's Honey"),
    "Sky": ("Skyy", "Skyy"),
    "Moskovskaya": ("Moskovskaya", "Moskovskaya"),
    "Cardhu 12 Años": ("Cardhu 12 años", "Cardhu 12 years"),
    "Maker's Mark": ("Maker's Mark", "Maker's Mark"),
    "Knockando": ("Knockando", "Knockando"),
    "Lagavulin": ("Lagavulin", "Lagavulin"),
    "Talisker": ("Talisker", "Talisker"),
    "Oban": ("Oban", "Oban"),
    "Bulleit Bourbon": ("Bulleit Bourbon", "Bulleit Bourbon"),
    "Macallan 12 años": ("Macallan 12 años", "Macallan 12 years"),
    "Black Label": ("Black Label", "Black Label"),
    "Glenrothes": ("Glenrothes", "Glenrothes"),
    "Gold Label": ("Gold Label", "Gold Label"),
    "Blue Label": ("Blue Label", "Blue Label"),
    "Ciroc": ("Cîroc", "Cîroc"),
    "Ciroc Sabores": ("Cîroc sabores", "Cîroc flavours"),
    "Bellvedere": ("Belvedere", "Belvedere"),
    "Vodka Premium o similar": ("Vodka premium o similar", "Premium vodka or similar"),
    "Masters": ("Master's", "Master's"),
    "Masters Pink": ("Master's Pink", "Master's Pink"),
    "Larios 12": ("Larios 12", "Larios 12"),
    "Larios Rosé / Larios Pomelo": ("Larios Rosé / Pomelo", "Larios Rosé / Grapefruit"),
    "Puerto De Indias Rosé / Melón": ("Puerto de Indias Rosé / Melón", "Puerto de Indias Rosé / Melon"),
    "Tanqueray": ("Tanqueray", "Tanqueray"),
    "Tanqueray 0,0": ("Tanqueray 0,0", "Tanqueray 0.0"),
    "Möet Imperial Brut": ("Moët Impérial Brut", "Moët Impérial Brut"),
    "Möet Ice": ("Moët Ice Impérial", "Moët Ice Impérial"),
    "Möet Rose": ("Moët Rosé Impérial", "Moët Rosé Impérial"),
    "Möet Nir": ("Moët N.I.R.", "Moët N.I.R."),
    "Dom Perignon": ("Dom Pérignon", "Dom Pérignon"),
    "Dom Perignon Luminous": ("Dom Pérignon Luminous", "Dom Pérignon Luminous"),
    "Gin VLC": ("Gin VLC", "Gin VLC"),
    "Bulldog": ("Bulldog", "Bulldog"),
    "Brockmans": ("Brockmans", "Brockmans"),
    "Jinzu": ("Jinzu", "Jinzu"),
    "Roku": ("Roku", "Roku"),
    "Gvine": ("G'Vine", "G'Vine"),
    "Hendricks": ("Hendrick's", "Hendrick's"),
    "Martin Millers": ("Martin Miller's", "Martin Miller's"),
    "Sipsmith": ("Sipsmith", "Sipsmith"),
    "Nordes": ("Nordés", "Nordés"),
    "Monkey 47": ("Monkey 47", "Monkey 47"),
    "Gin Mare": ("Gin Mare", "Gin Mare"),
    "Chupito Normal (Vodka Azul/Rojo...)": ("Chupito normal (vodka azul, rojo…)", "Regular shot (blue, red vodka…)"),
    "Chupito Especial (Tequila, Jager...)": ("Chupito especial (tequila, Jägermeister…)", "Special shot (tequila, Jägermeister…)"),
    "Chupito Premium desde": ("Chupito premium", "Premium shot"),
}

# Productos cuyo precio es «desde».
DESDE = {"Chupito Premium desde"}


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def leer_excel(path):
    with zipfile.ZipFile(path) as z:
        shared = [
            "".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))
            for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
        ]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    filas = []
    for row in sheet.iter(f"{{{NS['m']}}}row"):
        celdas = {}
        for c in row:
            v = c.find("m:v", NS)
            if v is None:
                continue
            col = re.match(r"[A-Z]+", c.get("r")).group()
            celdas[col] = shared[int(v.text)] if c.get("t") == "s" else v.text
        filas.append(celdas)
    return filas


def numero(valor):
    n = float(valor)
    return int(n) if n.is_integer() else n


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    filas = leer_excel(sys.argv[1])
    cabecera = next(i for i, f in enumerate(filas) if f.get("C") == "Producto")
    por_categoria, avisos, notas_pie = {}, [], []
    for f in filas[cabecera + 1:]:
        if "C" in f and "B" in f:
            por_categoria.setdefault(f["B"].strip(), []).append(f)
        elif "A" in f and not f.get("B"):
            notas_pie.append(f["A"].strip())

    conocidas = {cat for _, _, secs in SECCIONES for cat, _ in secs}
    sobrantes = set(por_categoria) - conocidas
    if sobrantes:
        sys.exit(f"Categorías del Excel sin sitio en SECCIONES: {sorted(sobrantes)}")

    familias, total = [], 0
    for fam_id, fam_titulo, secciones in SECCIONES:
        fam = {"id": fam_id, "title": fam_titulo, "sections": []}
        for cat, titulo in secciones:
            filas_cat = por_categoria.get(cat, [])
            if not filas_cat:
                avisos.append(f"Sección vacía: {cat}")
                continue
            obs = {f.get("F", "").strip() for f in filas_cat} - {""}
            nota_seccion = None
            if len(obs) == 1 and all(f.get("F") for f in filas_cat):
                nota_seccion = OBSERVACIONES.get(obs.pop())
            productos = []
            for f in filas_cat:
                original = f["C"].strip()
                es, en = NOMBRES.get(original, (original, original))
                if original not in NOMBRES:
                    avisos.append(f"Sin corrección ni traducción: «{original}»")
                p = {
                    "id": slug(f"{cat}-{es}"),
                    "name": {"es": es, "en": en},
                    "tarde": numero(f["D"]),
                    "noche": numero(f["E"]),
                }
                if original in DESDE:
                    p["desde"] = True
                if not nota_seccion and f.get("F"):
                    p["note"] = OBSERVACIONES.get(f["F"].strip(), {"es": f["F"], "en": f["F"]})
                productos.append(p)
            total += len(productos)
            seccion = {"id": slug(cat), "title": titulo, "products": productos}
            if nota_seccion:
                seccion["note"] = nota_seccion
            fam["sections"].append(seccion)
        familias.append(fam)

    datos = {
        "fuente": Path(sys.argv[1]).name,
        "corte": "22:30",
        "families": familias,
        "notasExcel": notas_pie,
    }
    (ROOT / "data" / "bebidas.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    js = (
        "// GENERADO por scripts/importar-excel.py desde el Excel del local. No editar a mano:\n"
        "// cambia el Excel (o NOMBRES/SECCIONES en el script) y vuelve a ejecutarlo.\n"
        f"export default {json.dumps(datos, ensure_ascii=False, indent=2)};\n"
    )
    (ROOT / "data" / "bebidas.js").write_text(js, encoding="utf-8")
    print(f"{total} bebidas en {sum(len(f['sections']) for f in familias)} secciones.")
    for a in avisos:
        print("AVISO:", a)


if __name__ == "__main__":
    main()
