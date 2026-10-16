# Prospección con Overture Maps Places — Implementation Plan

**Goal:** Que Prospección busque en una tabla `prospect_lugares` importada de Overture Maps Places, con respaldo en OpenStreetMap.

**Spec:** `docs/superpowers/specs/2026-10-16-prospeccion-overture-design.md`

## Global Constraints

- Código e interfaz en español. Módulos puros sin `server-only` y con imports relativos con extensión `.ts`, para que el script los cargue con Node sin compilar.
- SQL solo como fichero; nada contra Supabase. El código funciona sin la migración.
- No tocar el envío de correos.

### Task 1: Piezas puras
- [ ] Tests `contacto.test.ts`, `provincias.test.ts`, `overture.test.ts`.
- [ ] `contacto.ts` (sacando `webPropia` de `osm.ts`), `provincias.ts`, `overture.ts`; nodos de Overture en `categorias.ts`.

### Task 2: Lectura y búsqueda
- [ ] Test `busqueda.test.ts` con `lugares-db` y `osm` simulados.
- [ ] `lugares-db.ts`, `busqueda.ts`; `FuenteProspecto` con `overture`.

### Task 3: Acciones y pantalla
- [ ] Actualizar `ventas-acciones-prospeccion.test.ts` (la búsqueda pasa por `buscarNegocios` y guarda la fuente).
- [ ] `acciones-prospeccion.ts`, pie de atribución en `Buscador.tsx`, teléfono `tel:` en `TablaProspectos.tsx`.

### Task 4: Script e SQL
- [ ] `scripts/prospeccion/importar-overture.ts` con `--dry-run`, `--salida`, `--provincia`, `--confianza`, `--release`, `--borrar-antiguos`.
- [ ] `docs/sql/2026-10-16-prospeccion-overture.sql`.
- [ ] Prueba real en dry-run con una provincia pequeña.

### Task 5: Verificación
- [ ] `npx tsc --noEmit`, eslint en lo tocado, `npx vitest run`, `npx next build`; commits y push de `feat/prospeccion-overture`.
