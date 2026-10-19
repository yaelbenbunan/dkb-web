# Plan: Prospección de empresas nuevas (BORME)

Spec: `docs/superpowers/specs/2026-10-19-prospeccion-borme-design.md`

1. **`src/lib/prospeccion/borme.ts`** (puro, imports relativos con extensión
   para que el script lo cargue con Node): `documentosSeccionA(sumario)`,
   `parsearConstituciones(xml, {provincia, fecha, bormeId, urlPdf})`,
   `constitucionAProspecto(fila)`, `ATRIBUCION_BORME`. Descarta los
   nombramientos. Pruebas con fragmentos reales del BORME del 16-10-2026
   (`__tests__/borme.test.ts`) antes del código.
2. **SQL** `docs/sql/2026-10-19-prospeccion-borme.sql`: tabla `prospect_borme`
   (sin columnas de personas), índices por municipio/provincia y fecha, RLS sin
   políticas. No se ejecuta desde aquí.
3. **Script** `scripts/prospeccion/importar-borme.ts`: `--dias`, `--desde`,
   `--hasta`, `--provincia`, `--dry-run`, `--salida`. Upsert por `id`.
4. **Búsqueda**: `buscarConstituciones` en `lugares-db.ts`-estilo
   (`borme-db.ts`) y `buscarEmpresasNuevas` (pura salvo inyección) que quita
   las que ya son prospecto. Acción `buscarEmpresasNuevasAction`.
   `guardarProspectos` admite un estado inicial (`sin_contacto` con nota).
5. **Pantalla**: tarjeta «Empresas nuevas (BORME)» en `Buscador.tsx`;
   «Preparar carta» en la tabla para `source = 'borme'`; página imprimible
   `prospeccion/carta/[id]`. Texto de la carta en `carta.ts` (puro, probado).
6. **Verificación**: dry-run real de una semana (cifras por día, España y
   Madrid), `tsc`, `eslint` en lo tocado, `vitest` completo, `next build`.
   Commits y push a `feat/prospeccion-borme`; sin merge.
