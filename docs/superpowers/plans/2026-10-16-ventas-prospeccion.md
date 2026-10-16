# Prospección dentro de /panel/ventas — Implementation Plan

**Goal:** Mover `/panel/prospeccion` a `/panel/ventas/[slug]/prospeccion` (solo dinkbit, admin y comercial) y que «pasar al embudo» cree el lead en `ventas_leads` de la marca.

**Spec:** `docs/superpowers/specs/2026-10-16-ventas-prospeccion-design.md`

## Global Constraints

- Código e interfaz en español, como `src/lib/ventas`.
- Tests en `src/lib/__tests__/ventas-*.test.ts`, mockeando `@/lib/ventas/db`, `@/lib/ventas/auth` y `next/cache` con `vi.hoisted`.
- SQL solo como fichero en `docs/sql/`; nada se ejecuta contra Supabase. El código funciona sin él.
- El acceso se comprueba en servidor en la página y en cada acción.
- No tocar campañas/mailing. Navegación compartida de ventas: solo añadir la pestaña.

### Task 1: Reglas de acceso
- [ ] Test (`ventas-rutas.test.ts`): `evaluarAccesoMarca(clienta, suMarca, "prospeccion")` → `permiso`; admin/comercial → `ok`; `tieneProspeccion("dinkbit")` true, `"hydrup"` false.
- [ ] Implementar en `src/lib/ventas/rutas.ts`.

### Task 2: Servicio «pasar al embudo»
- [ ] Test (`ventas-prospeccion.test.ts`): alta nueva (crearLeads con origen manual, detalle «Prospección», ciudad), canal/extra después, nota; repetido enlaza; excluido rechaza; fallo de canal no tumba; fallo de alta → error.
- [ ] Implementar `src/lib/ventas/prospeccion.ts`.

### Task 3: Resolver enlaces viejos
- [ ] Test (`ventas-db.test.ts`): `resolverLeadsEnlazados` por id, por id_externo, y tolerando la columna ausente.
- [ ] Implementar en `src/lib/ventas/db.ts`.

### Task 4: Acciones con acceso de ventas
- [ ] Test (`ventas-acciones-prospeccion.test.ts`, sustituye a `prospeccion/__tests__/acciones-sesion.test.ts`): sin permiso no hace nada; marca sin prospección; lista de exportadas; búsqueda, descartar, respondido, plantillas; pasar al embudo por estado y con enlace.
- [ ] Implementar `src/app/(site)/panel/ventas/acciones-prospeccion.ts`; quitar `buscarLeadPorEmail` de `prospeccion/db.ts` y su test.

### Task 5: Página, componentes y navegación
- [ ] `git mv` de los componentes a `(app)/[slug]/prospeccion/`, con `slug` en las acciones y estilos de ventas; «Ver lead» enlaza a la ficha.
- [ ] Página con `requireAccesoMarca(slug, "prospeccion")` y 404 si la marca no tiene prospección.
- [ ] Pestaña en `MarcaCabecera`; redirección en `next.config.ts`; enlace en `PanelShell`.

### Task 6: SQL y verificación
- [ ] `docs/sql/2026-10-16-ventas-prospeccion.sql` (reenlazar `lead_id`, idempotente).
- [ ] `npx tsc --noEmit`, `npx eslint` en lo tocado, `npx vitest run`, `npx next build`.
- [ ] Commits y `git push -u origin feat/ventas-prospeccion`.
