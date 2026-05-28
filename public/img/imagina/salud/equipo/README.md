# Fotos de equipo — sector salud

Esta carpeta contiene los retratos del "equipo" que se usan en el preview de
salud-informativa. El template (`SaludInformativaTemplate.tsx`) consume:

- `profesional-1.jpg` … `profesional-6.jpg` (800×800, fondo blanco)

Las imágenes están procesadas con `rembg` (modelos `u2net_human_seg` y
`birefnet-portrait`) para quitar el fondo y componer sobre blanco, recortando al
sujeto con margen y centrándolo en un canvas cuadrado.

Originales en `_descartadas/` (descartadas) o junto al README (mantienen el
nombre `shutterstock_*.jpg`).

## Reprocesar

Si quieres añadir o regenerar fotos:

1. Sube los originales a esta carpeta como `shutterstock_*.jpg`.
2. Edita `/tmp/rembg-venv/process_team.py` para listar los nombres en `ORDER`.
3. Ejecuta `/tmp/rembg-venv/bin/python /tmp/rembg-venv/process_team.py`.
4. Si alguna sale con halo (objetos del fondo conectados al sujeto), reprocesa
   esa con el modelo `birefnet-portrait` usando `fix_two_v2.py`.

## Convención

- 4-6 retratos sirven. Más se ignoran (el array `TEAM_PHOTOS` define cuántos
  consume el template).
- Sin estetoscopio (las fotos son genéricas para cualquier sector salud:
  dental, estética, fisio, óptica, veterinaria…).
- Sin texto, logos ni marcas en la imagen.
