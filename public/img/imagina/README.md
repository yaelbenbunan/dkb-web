# Fotos por sector — preview "Imagina tu web"

Cada sector tiene su propia subcarpeta con dos subdirectorios y nombres
canónicos:

```
public/img/imagina/
└── <sector>/
    ├── equipo/             ← retratos del equipo (fondo blanco)
    │   ├── profesional-1.png
    │   ├── profesional-2.png
    │   └── …
    └── valor-agregado/     ← fotos de escenario / ambientes
        ├── foto-1.png
        ├── foto-2.png
        └── …
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

- **Formato**: PNG (preferido para retratos sin fondo) o JPG.
- **Peso**: < 300 KB por foto. Optimizar antes de subir.
- **Resolución**: 800–1200 px lado largo.
- **`equipo/profesional-N.png`**:
  - Cuadradas (~800×800 ideal).
  - Fondo blanco (procesar con `rembg` si la original tiene fondo).
  - Sin objetos sector-específicos donde no aplique (sin estetoscopio fuera de
    salud, sin gorro de chef fuera de restauración, etc.).
  - Sin texto, logos ni marcas.
- **`valor-agregado/foto-N.png`**:
  - Horizontales o cuadradas.
  - Iluminación natural / profesional. Espacios limpios.
  - Sin rostros visibles (para no chocar con la sección Equipo).
  - Sin texto ni logos.

## Estado actual

| Sector | `equipo/` | `valor-agregado/` |
|---|---|---|
| salud | ✅ 5 fotos (3♂ + 2♀) | ✅ 4 fotos |
| educacion | ✅ 5 fotos (3♂ + 2♀) | ✅ 3 fotos |
| restauracion | ✅ 6 fotos (2♂ + 4♀) | ✅ 5 fotos |
| moda | ✅ 5 fotos (2♂ + 3♀) | ✅ 4 fotos |
| tecnologia | ✅ 5 fotos (3♂ + 2♀) | ✅ 5 fotos |
| servicios | ✅ 5 fotos (2♂ + 3♀) | ✅ 5 fotos |

## Templates sector-específicos

Por ahora **solo el template de salud** (`SaludInformativaTemplate.tsx`)
consume estas fotos. Los demás sectores caen al template genérico
`InformativaTemplate` hasta que se construya su template sector-específico.

### Distribución por género (referencia)

| Sector | Masculino (índices) | Femenino (índices) |
|---|---|---|
| salud | 1, 4, 5 | 2, 3 |
| educacion | 2, 3, 5 | 1, 4 |
| restauracion | 3, 5 | 1, 2, 4, 6 |
| moda | 4, 5 | 1, 2, 3 |
| tecnologia | 1, 3, 4 | 2, 5 |
| servicios | 3, 5 | 1, 2, 4 |
