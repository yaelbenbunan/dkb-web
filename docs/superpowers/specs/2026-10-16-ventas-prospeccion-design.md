# Unificación del CRM, proyecto 3: Prospección dentro de /panel/ventas

Fecha: 2026-10-16 · Estado: diseño para revisión

Contexto: `2026-10-15-crm-unificacion-leads-fases-design.md` (proyecto 1, ya en
main) y `2026-10-07-prospeccion-design.md` (la pestaña tal como es hoy).

## Para qué

La pestaña de Prospección sigue en el `/panel` viejo, con su contraseña
compartida, y su «Convertir en lead» pasa por `createManualLead` (la capa de
compatibilidad de `imagina-leads`). Con el CRM unificado, tiene que ser una
pestaña más de la marca en ventas, con su login y sus roles, y el prospecto que
responde tiene que entrar directamente en el embudo de esa marca.

Éxito:
- `/panel/ventas/dinkbit/prospeccion` hace todo lo que hacía `/panel/prospeccion`:
  buscar en OpenStreetMap, revisar webs, plantillas, envío 1:1, descartar,
  «respondió», pasar al embudo.
- Solo la ven admin y comercial. La clienta, no (ni la pestaña ni la página ni
  las acciones).
- «Pasar al embudo» crea el lead en `ventas_leads` de la marca, o enlaza con el
  que ya existe por email o teléfono. Nada se escribe en `imagina_leads`.
- Los prospectos, búsquedas, plantillas y bajas ya guardados siguen ahí.
- `/panel/prospeccion` redirige a la nueva ruta.

## Decisiones

- **Fuente: OpenStreetMap**, igual que hoy. (El spec del proyecto 1 mencionaba
  Overture Maps; no se cambia de fuente en este proyecto. Google Places sigue
  descartado por sus condiciones.)
- **Roles: admin y comercial.** Nueva sección `prospeccion` en `SeccionMarca`,
  fuera de `SECCIONES_CLIENTE`. Gasta cupo de envío y escribe en nombre de
  dinkbit: no es para la clienta. Se comprueba en la página y en cada acción
  (`requireAccesoMarca` / `accesoMarcaAccion`).
- **Marcas: solo dinkbit por ahora** (`MARCAS_CON_PROSPECCION` en
  `src/lib/ventas/rutas.ts`). Motivo: todo el envío habla en nombre de dinkbit
  —remitentes `PROSPECT_SENDERS`, `Reply-To`, pie legal («Le escribe dinkbit»),
  página de baja— y las tablas `prospect_*` no tienen marca. Abrirla a otra
  marca exige remitente, pie y baja por marca y un `marca_id` en las tablas; es
  un proyecto aparte. En otra marca la pestaña no aparece y la página da 404.
  El código de «pasar al embudo» ya recibe la marca, no la supone.
- **Tablas sin cambios.** Siguen siendo globales (`prospects`,
  `prospect_searches`, `prospect_templates`, `prospect_suppressions`). Así no
  hay que migrar los prospectos guardados.
- **El lead nuevo:** `origen = 'manual'`, `origen_detalle = 'Prospección'`,
  ciudad, web, email y teléfono del prospecto, sin asignar (como el alta
  manual), `consentimiento` sin definir (contestar a un correo no es
  consentimiento para campañas). Con la migración del proyecto 1 hecha, además
  `canal = 'Prospección'` y en `extra` el sector y el id del prospecto. Se apunta
  una nota en el historial: de qué búsqueda viene y cuándo se le escribió.
  - Se usa `ventas_crear_leads` (la RPC de siempre, que guarda la ciudad y quién
    lo creó), no `ventas_crear_lead`. Canal y `extra` se escriben después, sin
    que su fallo tumbe el alta.
  - Si ya hay lead de la marca con ese email o teléfono, se enlaza con él y se
    apunta la nota allí. No se duplica.
  - Si el contacto está en la lista de exclusión de la marca (ya es cliente),
    no se crea y se dice.
- **Enlaces viejos.** Los prospectos convertidos antes guardan en `lead_id` un
  id de `imagina_leads`. La página los resuelve a su lead de ventas por `id` o
  por `id_externo` (lo deja la migración de datos del proyecto 1) para enlazar
  «Ver lead». El SQL de este proyecto reescribe además `lead_id` al id de
  ventas, para no depender de esa traducción; el código funciona con y sin él.
- **Redirección:** `/panel/prospeccion` → `/panel/ventas/dinkbit/prospeccion` en
  `next.config.ts` (temporal, 307), que se aplica antes del proxy: quien no
  tiene sesión del panel viejo no pasa por su login. La pestaña del `PanelShell`
  apunta ya a la ruta nueva. La retirada del `/panel` es el proyecto 4.
- **Sin tocar:** campañas y mailing (otro proyecto en paralelo), la ruta de baja
  `/api/prospeccion/baja` y el webhook de Resend, que no dependen de la ruta.

## Piezas

| Pieza | Cambio |
|---|---|
| `src/lib/ventas/rutas.ts` | Sección `prospeccion`; `MARCAS_CON_PROSPECCION` y `tieneProspeccion(slug)`. |
| `src/lib/ventas/prospeccion.ts` (nuevo) | `pasarProspectoAlEmbudo({ marca, usuaria, prospecto })` → `{ ok, leadId, existia }`. |
| `src/lib/ventas/db.ts` | `resolverLeadsEnlazados(marcaId, ids)`: id viejo o nuevo → id de ventas. |
| `src/app/(site)/panel/ventas/acciones-prospeccion.ts` (nuevo) | Las acciones de hoy, con `slug` y acceso de ventas. |
| `src/app/(site)/panel/ventas/(app)/[slug]/prospeccion/` | Página y componentes, movidos desde `/panel/prospeccion`. |
| `MarcaCabecera.tsx` | Pestaña «Prospección», solo en marcas con prospección y para el equipo. |
| `src/lib/prospeccion/db.ts` | Fuera `buscarLeadPorEmail` (lo sustituye el alta de ventas). |
| `next.config.ts`, `PanelShell.tsx` | Redirección y enlace. |
| `docs/sql/2026-10-16-ventas-prospeccion.sql` | Reenlazar `prospects.lead_id` a ids de ventas. Idempotente, opcional. |

## Errores

- Sin permiso (clienta, rol desconocido, otra marca): la página redirige como el
  resto de ventas; la acción devuelve «No tienes permiso para esto.» sin tocar
  nada.
- Marca sin prospección: página 404; acción «Esta marca no tiene prospección.»
- Alta en ventas fallida: «No se pudo crear el lead.»; el prospecto no cambia.
- Lead creado pero no localizable después (carrera rara): mismo error; el lead
  existe y el siguiente intento enlaza con él.

## Pruebas

- `rutas`: la clienta no ve `prospeccion` ni en su marca; admin y comercial sí;
  `tieneProspeccion` solo para dinkbit.
- `prospeccion` (servicio): alta nueva con origen y ciudad; repetido por email
  enlaza y no crea; excluido no crea; canal y `extra` sin migración no tumban el
  alta; nota en el historial.
- Acciones: todas piden la sección `prospeccion` de la marca del slug y no
  hacen nada sin permiso o en una marca sin prospección; la lista de acciones
  exportadas cuadra; pasar al embudo solo desde enviado/respondido y enlaza el
  prospecto con el id de ventas.
- `resolverLeadsEnlazados`: por id, por `id_externo`, y sin la columna.
- Typecheck, lint, build y la suite completa.
