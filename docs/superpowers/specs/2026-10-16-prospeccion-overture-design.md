# Prospección: negocios de Overture Maps Places

Fecha: 2026-10-16 · Estado: diseño para revisión

Contexto: `2026-10-07-prospeccion-design.md` (la pestaña) y
`2026-10-16-ventas-prospeccion-design.md` (su sitio en `/panel/ventas`).

## Para qué

La búsqueda en OpenStreetMap da pocos negocios. Overture Maps Places tiene
muchos más en España (en una caja de Madrid capital: ~2.000 clínicas dentales,
99 % con teléfono, 89 % con web y 58 % con email) y su licencia permite
guardarlos y reutilizarlos citando la fuente. Google Places sigue descartado por
la cláusula 3.3.2 de sus condiciones del EEE.

Éxito: buscar «Clínicas dentales · Madrid» devuelve cientos de negocios, la
mayoría con teléfono; la pantalla cita Overture; si la tabla de Overture no
existe o no tiene ese municipio, la pestaña funciona como hoy (OSM).

## Lo comprobado en la documentación oficial (2026-10-16)

- **Versión vigente**: `2026-09-23.1` (esquema v2.0.0, publicada el 25-09-2026).
  Siguiente prevista: `2026-10-21.0`. Ruta:
  `s3://overturemaps-us-west-2/release/<versión>/theme=places/type=place/*`.
  Fuente: https://docs.overturemaps.org/release-calendar/
- **Licencia de places** (https://docs.overturemaps.org/attribution/): CDLA
  Permissive 2.0 para Meta, Microsoft, PinMeTo, Krick, RenderSEO, DAC y
  BrightQuery; Apache 2.0 para Foursquare («Copyright 2024 Foursquare Labs,
  Inc.», con NOTICE.txt); CC0 1.0 para AllThePlaces. No hay un texto único
  obligatorio para places: cada fuente lleva su línea («Data from Meta.
  Available under CDLA Permissive 2.0.»). La cita general que propone Overture
  es «Overture Maps Foundation, overturemaps.org».
- **Esquema**: `categories` **ya no existe** desde la versión de septiembre de
  2026; lo sustituyen `taxonomy` (`primary`, `hierarchy`, `alternates`) y
  `basic_category`. El resto, como se esperaba: `names.primary`, `phones`,
  `websites`, `emails`, `socials`, `addresses[]` (`freeform`, `locality`,
  `postcode`, `region`, `country`), `confidence` (0–1), `operating_status`,
  `bbox` (`xmin`, `xmax`, `ymin`, `ymax`), `sources[]` (`dataset`, `license`,
  `record_id`, …). Comprobado también leyendo el Parquet con DuckDB.
- **Taxonomía**: la documentación no publica una lista descargable; los nodos
  usados abajo se han sacado de los datos reales de Madrid (`taxonomy.hierarchy`).
- En España `addresses[].region` casi nunca viene (95 % nulo en Madrid): la
  provincia se deduce de los dos primeros dígitos del código postal.

## Decisiones

- **Importación local, no consulta en cada búsqueda.** Overture no tiene API y
  leer S3 desde una función de Vercel sería lento. `scripts/prospeccion/
  importar-overture.ts` (DuckDB, `@duckdb/node-api` como devDependency) lee los
  lugares de España de las categorías de Prospección y los sube a
  `prospect_lugares` (upsert por id de Overture). Se reejecuta con cada release
  mensual; `--borrar-antiguos` quita lo que no vino en el release importado.
  Admite `--dry-run`, `--salida archivo.json`, `--provincia`, `--confianza`.
- **España**: `addresses[1].country = 'ES'` más la caja de la Península,
  Baleares, Ceuta, Melilla y Canarias (la caja deja a DuckDB saltarse los
  ficheros del resto del mundo).
- **Categorías**: cada categoría de `categorias.ts` gana sus nodos de Overture.
  Un lugar entra si alguno está en su `taxonomy.hierarchy` o en sus
  `alternates`, o si su `primary` es una de las `exactas` (nodos genéricos como
  `real_estate_service`, cuyos hijos no queremos todos). Un lugar puede caer en
  varias (bar y restaurante): `categorias text[]`.
- **Fuera**: `operating_status = 'permanently_closed'`, sin nombre, y
  `confidence` por debajo de 0,5 (configurable).
- **Búsqueda**: categoría + municipio (normalizado sin tildes ni mayúsculas); si
  no hay ninguno con ese municipio, se prueba como provincia («Bizkaia»,
  «Vizcaya»). Orden: confianza. Se descartan los que ya son prospectos (mismo id
  de Overture) y los duplicados de OSM: **mismo teléfono normalizado, o misma
  web en el mismo municipio** (la web sola no basta: las cadenas comparten
  dominio entre sedes). Se guardan hasta 200 por búsqueda; repetir la búsqueda
  trae los siguientes. El mismo filtro se aplica a lo que llega de OSM.
- **Respaldo**: si la tabla no existe, falla o no tiene nada para esa búsqueda,
  se busca en OSM como hoy. La migración la ejecuta Yael a mano.
- **Prospectos**: `source = 'overture'` (se amplían los CHECK de `prospects` y
  `prospect_searches`). El email que trae Overture se usa sin leer la web, como
  ya se hacía con el de OSM.
- **Atribución** en el pie del buscador: Overture Maps Foundation, fuentes y
  licencias, con enlace a la página de atribución; se mantiene la de OSM.
- **Llamadas como canal principal**: el teléfono pasa a ser un enlace `tel:`
  destacado en cada fila. El envío de correos no se toca (decisión de Yael).

## Piezas

| Pieza | Qué |
|---|---|
| `src/lib/prospeccion/contacto.ts` | Puro: web propia, teléfono normalizado, clave de texto, filtro de duplicados. |
| `src/lib/prospeccion/provincias.ts` | Puro: código postal → provincia; texto → provincia. |
| `src/lib/prospeccion/overture.ts` | Puro: categorías de un lugar, fila de `prospect_lugares`, fila → prospecto, SQL de DuckDB, atribución. |
| `src/lib/prospeccion/lugares-db.ts` | Lecturas de `prospect_lugares` y huellas de los prospectos. |
| `src/lib/prospeccion/busqueda.ts` | Overture con respaldo OSM y sin duplicados. |
| `scripts/prospeccion/importar-overture.ts` | La importación. |
| `docs/sql/2026-10-16-prospeccion-overture.sql` | Tabla, índices, RLS, CHECK. |

## Pruebas

Transformación pura (categorías, dirección, provincia, web/redes, cierre,
confianza), duplicados, provincias, la búsqueda con la base simulada (Overture,
respaldo por tabla ausente y por cero resultados, duplicados fuera, tope), las
acciones y el pie. Prueba real del script en `--dry-run` con una provincia
pequeña.
