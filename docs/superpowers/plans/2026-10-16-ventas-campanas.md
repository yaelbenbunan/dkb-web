# Plan: Campañas como módulo de ventas

Spec: `docs/superpowers/specs/2026-10-16-ventas-campanas-design.md`.
Rama `feat/ventas-campanas`. TDD: test en rojo → código → verde → commit.

### Task 1: SQL
- Create `docs/sql/2026-10-16-ventas-campanas.sql` (columnas `modulos`,
  `campanas_remitentes`, `campaigns.marca_id`, `email_templates.marca_id`,
  relleno con dinkbit, recuentos).
- Commit `feat(ventas): SQL del módulo de campañas por marca`.

### Task 2: reglas puras del módulo
- Create `src/lib/ventas/campanas.ts`: `MODULO_CAMPANAS`, `tieneModulo(marca, modulo)`,
  `campanaEsDeMarca(campana, marca)`, `remitentesDeMarca(marca, global)`.
- `Marca` gana `modulos?` y `campanas_remitentes?` (opcionales: sin migración no vienen).
- `rutas.ts`: `SeccionMarca` gana `campanas` (fuera de `SECCIONES_CLIENTE`).
- Test `src/lib/__tests__/ventas-campanas.test.ts`, ampliar `ventas-rutas.test.ts`.

### Task 3: campañas y plantillas por marca
- `campaigns.ts`: `CampaignRow.marca_id?`; `createCampaign({ marcaId, sinMarcaSiFalta })`,
  `listCampaigns({ marcaId, incluirSinMarca })`, `listEmailTemplates({ marcaId, incluirSinMarca })`,
  `saveEmailTemplate({ marcaId })`, con tolerancia a la columna ausente.
- Test `src/lib/__tests__/campaigns-marca.test.ts`.

### Task 4: envío por la marca de la campaña
- `campaign-send.ts`: `contextoDeEnvio(campaign)` → destinatarios y remitentes
  de la marca; `validateCampaign(c, remitentes?)`; error `modulo_inactivo`.
- Ampliar `campaign-send.test.ts`.

### Task 5: bajas y rebotes de cualquier marca
- `leads-web.ts`: `resolverCampana(id)` (dinkbit por id/id externo, luego
  cualquier marca por uuid) en `setLeadConsent` y
  `setCampaignRecipientStatusByMessageId`.
- Ampliar `ventas-leads-web.test.ts`.

### Task 6: pantallas compartidas
- `git mv` de los componentes del asistente a `src/app/(site)/panel/_campanas/`;
  contexto `AccionesCampana` (rutas y acciones). `/panel/campanas` lo usa con
  sus acciones y filtra a dinkbit.

### Task 7: pantallas y acciones de ventas
- `src/app/(site)/panel/ventas/acciones-campanas.ts`: las mismas acciones con
  `slug` delante; cada una exige acceso `campanas`, módulo y campaña de la marca.
  `actualizarModulosAction` (admin).
- Páginas `[slug]/campanas` y `[slug]/campanas/[id]`; bloque «Módulos» en Condiciones;
  pestaña «Campañas» en `MarcaCabecera` solo si el módulo está activo.
- Test `src/lib/__tests__/ventas-acciones-campanas.test.ts`.

### Task 8: verificación
- `npx tsc --noEmit`, `npx eslint` en lo tocado, `npx vitest run`, `npx next build`; push.
