"""QR de la carta para imprenta: SVG y PDF vectoriales y PNG grande.

Uso:  python scripts/generar-qr.py
Sale en qr/. Apunta a la URL de workers.dev, que es la que va impresa y no puede cambiar.

- Corrección de errores alta (H): aguanta manchas, arañazos y pegatinas gastadas en mesa.
- Margen blanco de 4 módulos (el mínimo del estándar): no recortarlo al maquetar.
- Azul noche de la carta sobre blanco; si la imprenta lo prefiere, el negro puro también vale.
"""

from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

URL = "https://caribbeansavenue.autemadmn.workers.dev/"
TINTA = "#10142a"
NOMBRE = "caribbeans-avenue-qr"
LADO_PDF_MM = 80  # tamaño del PDF; al ser vectorial se puede escalar sin perder calidad
PNG_PX = 3000

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qr"


def matriz():
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=4, box_size=1)
    qr.add_data(URL)
    qr.make(fit=True)
    return qr, qr.get_matrix()  # incluye el margen


def svg(m):
    n = len(m)
    # Un solo path con un rectángulo por módulo oscuro, unidos por filas para que pese poco.
    trozos = []
    for y, fila in enumerate(m):
        x = 0
        while x < n:
            if fila[x]:
                inicio = x
                while x < n and fila[x]:
                    x += 1
                trozos.append(f"M{inicio} {y}h{x - inicio}v1h-{x - inicio}z")
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" width="{n * 10}" height="{n * 10}" '
        f'shape-rendering="crispEdges">\n'
        f"  <title>Carta de Caribbean's Avenue · {URL}</title>\n"
        f'  <rect width="{n}" height="{n}" fill="#ffffff"/>\n'
        f'  <path fill="{TINTA}" d="{"".join(trozos)}"/>\n'
        f"</svg>\n"
    )


def pdf(m, ruta):
    n = len(m)
    lado = LADO_PDF_MM * mm
    modulo = lado / n
    c = canvas.Canvas(str(ruta), pagesize=(lado, lado))
    c.setTitle("Caribbean's Avenue · QR de la carta")
    c.setSubject(URL)
    c.setFillColor(white)
    c.rect(0, 0, lado, lado, stroke=0, fill=1)
    c.setFillColor(HexColor(TINTA))
    for y, fila in enumerate(m):
        x = 0
        while x < n:
            if fila[x]:
                inicio = x
                while x < n and fila[x]:
                    x += 1
                # PDF cuenta desde abajo.
                c.rect(inicio * modulo, lado - (y + 1) * modulo, (x - inicio) * modulo, modulo, stroke=0, fill=1)
            else:
                x += 1
    c.showPage()
    c.save()


def png(qr, ruta):
    n = len(qr.get_matrix())
    caja = max(1, PNG_PX // n)
    grande = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=4, box_size=caja)
    grande.add_data(URL)
    grande.make(fit=True)
    img = grande.make_image(fill_color=TINTA, back_color="white").convert("RGB")
    img.save(ruta, dpi=(600, 600))
    return img.size


def main():
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(exist_ok=True)
    qr, m = matriz()
    (OUT / f"{NOMBRE}.svg").write_text(svg(m), encoding="utf-8")
    pdf(m, OUT / f"{NOMBRE}.pdf")
    tam = png(qr, OUT / f"{NOMBRE}.png")
    print(f"QR versión {qr.version}, {len(m)}×{len(m)} módulos con margen → {URL}")
    print(f"qr/{NOMBRE}.svg · qr/{NOMBRE}.pdf ({LADO_PDF_MM} mm) · qr/{NOMBRE}.png ({tam[0]}×{tam[1]} px, 600 ppp)")


if __name__ == "__main__":
    main()
