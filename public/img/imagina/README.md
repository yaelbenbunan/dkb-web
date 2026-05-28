# Fotos por sector — preview "Imagina tu web"

Esta carpeta agrupa las fotos genéricas que usan los templates sector-específicos
del preview en `/imagina-tu-web`. Cada sector tiene su propia subcarpeta con dos
subdirectorios:

```
public/img/imagina/
├── salud/
│   ├── equipo/             ← retratos del equipo (fondo blanco)
│   │   ├── profesional-1.jpg
│   │   ├── profesional-2.jpg
│   │   └── …
│   └── valor-agregado/     ← fotos de escenario (recepción, consulta, sala)
│       ├── foto-1.jpg
│       ├── foto-2.jpg
│       └── …
├── educacion/
├── restauracion/
├── moda/
├── tecnologia/
└── servicios/
```

## Cómo se usan

- **`valor-agregado/`** alimenta dos zonas del preview: el **fondo del hero**
  (con un overlay de paleta para la legibilidad del texto) y la **imagen de la
  sección "Por qué elegirnos"**. El template elige dos fotos distintas al azar
  por cada preview, así que rota cuando el lead vuelve a generar.
- **`equipo/`** alimenta el carrusel de "Nuestro equipo". Cada miembro inventado
  por la IA recibe una foto del pool según su `gender` (`male`/`female`). El
  template separa el pool en `TEAM_PHOTOS_MALE` y `TEAM_PHOTOS_FEMALE`.

## Convenciones de archivo

- Formato: **JPG** (preferido) o WebP. PNG solo si necesitas transparencia.
- Peso: **< 250 KB** por foto. Optimizar con tools tipo
  [Squoosh](https://squoosh.app) o `mozjpeg`.
- Resolución: **800–1200 px** lado largo (los templates las escalan).
- **`equipo/profesional-N.jpg`**:
  - Cuadradas (800×800 ideal).
  - **Fondo blanco** (procesar con `rembg` si la original tiene fondo).
  - Sin estetoscopios u objetos sector-específicos en sectores donde no aplique
    (estetoscopio solo en sector médico, p. ej.).
  - Sin texto, logos o marcas.
- **`valor-agregado/foto-N.jpg`**:
  - Horizontales o cuadradas.
  - Iluminación natural / profesional. Espacios limpios.
  - Sin rostros visibles (para que no choquen con la sección Equipo).
  - Sin texto ni logos.

## Estado actual

| Sector | `equipo/` | `valor-agregado/` |
|---|---|---|
| salud | ✅ 6 fotos | ✅ 4 fotos |
| educacion | ⏳ vacío | ⏳ vacío |
| restauracion | ⏳ vacío | ⏳ vacío |
| moda | ⏳ vacío | ⏳ vacío |
| tecnologia | ⏳ vacío | ⏳ vacío |
| servicios | ⏳ vacío | ⏳ vacío |

Mientras no haya template sector-específico para un sector, el preview usa el
template genérico (no consume estas fotos). Cuando se cree un template nuevo
(p. ej. `EducacionInformativaTemplate.tsx`), apuntará a `imagina/educacion/`.
