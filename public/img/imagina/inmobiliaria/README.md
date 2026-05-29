# Fotos — Sector Inmobiliaria

Estructura esperada para el preview de `/imagina-tu-web` cuando el sector elegido sea inmobiliaria.

## Carpetas

- **`equipo/`** — Retratos de asesores inmobiliarios (con fondo, look natural). Mínimo 4–5 fotos.
- **`valor-agregado/`** — Fotos ambientales: interiores de viviendas reformadas, escritorios con planos, fachadas, llaves sobre mesa. 4–5 fotos.
- **`propiedades/`** — Fotos de inmuebles que se usarán como tarjetas de "destacados" (salón, dormitorio, exterior). 4–6 fotos cuadradas o 4:3.

## Notas

- Una vez subidas las fotos, hay que cablear el sector en `src/app/imagina-tu-web/_components/templates/sector-assets.tsx` (entrada `inmobiliaria` dentro de `SECTOR_ASSETS`) y añadirlo a la lista `SUPPORTED_SECTORS`.
- Iconos de servicios sugeridos: casa, llave, lupa, calculadora, contrato, mapa.
- Labels por defecto: navServicesLabel = "Inmuebles", servicesSectionPill = "Cartera", defaultServicesTitle = "Propiedades destacadas".
