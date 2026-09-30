from PIL import Image, ImageDraw, ImageFont

NEGRO=(11,11,14); AZUL=(11,58,231); BLANCO=(255,255,255); GRIS=(150,155,170)
W,H=1600,900
FUENTE="/System/Library/Fonts/Avenir Next.ttc"

def f(px, idx):
    return ImageFont.truetype(FUENTE, px, index=idx)

PORTADAS = [
    ("cover-precio-web.webp",    "PRECIOS",     "299€",           "+125€ al año de dominio y alojamiento"),
    ("cover-plazos-web.webp",    "PLAZOS",      "2 semanas",      "de la primera llamada a verla publicada"),
    ("cover-seo-geo.webp",       "VISIBILIDAD", "SEO y GEO",      "de una lista de diez a una respuesta de tres"),
    ("cover-anuncios-ia.webp",   "PUBLICIDAD",  "Anuncios en IA", "poca competencia, y se puede medir"),
    ("cover-estrategia.webp",    "ESTRATEGIA",  "7 preguntas",    "antes de decidir dónde invertir"),
    ("cover-equipo.webp",        "EQUIPO",      "Desde 2010",     "un equipo propio en Madrid"),
]

for nombre, antetitulo, titular, sub in PORTADAS:
    im = Image.new("RGB", (W,H), NEGRO)
    d = ImageDraw.Draw(im)

    # Halo azul difuso arriba a la izquierda: el mismo recurso que usa la landing.
    halo = Image.new("RGB", (W,H), NEGRO)
    hd = ImageDraw.Draw(halo)
    hd.ellipse([-350,-420, 760, 560], fill=AZUL)
    halo = halo.filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(190))
    im = Image.blend(im, halo, 0.30)
    d = ImageDraw.Draw(im)

    SEGURO = 285          # deja ~85px de aire dentro del recorte 4:3
    x, y = SEGURO, 330
    # Antetítulo en azul claro sobre el negro (el azul puro no se leería).
    ft = f(30, 2)
    d.text((x, y-70), antetitulo, font=ft, fill=(150,180,255))

    # Titular: se ajusta el cuerpo para que quepa siempre en el ancho útil.
    px = 210
    while px > 70:
        fb = f(px, 8)
        if d.textlength(titular, font=fb) <= W - 2*SEGURO: break
        px -= 6
    d.text((x, y), titular, font=fb, fill=BLANCO)
    alto = d.textbbox((x,y), titular, font=fb)[3] - y

    d.text((x, y+alto+46), sub, font=f(36, 7), fill=GRIS)
    # Regla azul de cierre.
    d.rectangle([x, y+alto+130, x+150, y+alto+138], fill=AZUL)

    im.save(f"public/img/blog/{nombre}", "WEBP", quality=88)
    print(f"{nombre:28} {W}x{H}  «{titular}»")

# Uso: python3 scripts/generar-portadas-blog.py
#
# Genera las portadas tipográficas del blog en public/img/blog/. Se guarda en el
# repo —y no como script de un uso— porque el texto de una portada se va a querer
# cambiar, y regenerarla a mano con la misma composición es imposible de acertar.
# Requiere Pillow y la tipografía Avenir Next, que viene con macOS.
