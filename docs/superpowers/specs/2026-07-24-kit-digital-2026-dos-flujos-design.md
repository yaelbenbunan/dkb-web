# Kit Digital 2026 — Dos flujos de lead (orgánico + Meta) — Diseño

Fecha: 2026-07-24

## Objetivo

Reemplazar el email de confirmación al lead orgánico por un **success message**, y
reutilizar el estilo de ese email para un **segundo flujo de leads que llegan desde
la campaña de Meta Lead Ads**. Los leads de Meta se integran al CRM, reciben un email
de marca ("casi has terminado, solo falta un paso más") con un botón a la landing para
aportar datos adicionales, y al completar la landing se **enriquece la misma fila del
CRM** (match por email) sin duplicar.

## Estado actual (punto de partida)

- **Landing orgánica** `/kit-digital-2026` → `KitDigital2026Form` → `requestKitDigital2026`
  (`src/lib/kit-digital-2026-action.ts`): inserta lead al CRM (`campaign: "Kit Digital 2026"`),
  manda email interno al equipo, manda **autoresponder de marca al lead**, y muestra
  success message.
- **Email de marca** `src/lib/kit-digital-2026-email.ts`: `buildKitDigital2026Email`
  → "Gracias — te avisamos cuando el Kit Digital se reactive" + botón CTA.
- **Webhook Meta genérico** `src/app/api/leads/route.ts` → `createWebhookLead`
  (upsert por `id` externo, `channel` por defecto "Meta"). No manda email.
- **CRM** `src/lib/imagina-leads.ts`: `createWebhookLead` deduplica **solo por `id`**.
  No hay matching por email.

## Los dos flujos finales

### Flujo 1 — Orgánico (landing directa)

`KitDigital2026Form` → `requestKitDigital2026`:

1. **Upsert por email** dentro de la campaña `Kit Digital 2026`:
   - Si no existe fila con ese email en esa campaña → **INSERT** fila orgánica
     (`channel: "Web"`, vía builder `kitDigital2026Lead`).
   - Si existe → **enriquecer** esa fila (ver "Reglas de match/enriquecimiento").
2. Email interno al equipo (**se mantiene**, sigue siendo crítico).
3. **Se elimina** el autoresponder al lead.
4. Success message al usuario (se conserva el actual, copy: "ya tenemos tus datos,
   te avisaremos cuando el Kit Digital se reactive").

### Flujo 2 — Meta (Lead Ads → Zapier)

Nuevo endpoint `POST /api/leads/kit-digital-2026` (protegido con el mismo
`LEADS_WEBHOOK_SECRET`, mismo patrón de auth timing-safe que `/api/leads`):

1. **INSERT** al CRM vía `createWebhookLead`: `channel: "Meta"`,
   `campaign: "Kit Digital 2026"`, idempotente por `leadgen_id`/`id` externo.
2. **Resend**: email de marca **"Casi has terminado, solo falta un paso más"** con
   botón CTA → `/kit-digital-2026?email=<email-del-lead>` (best-effort: un fallo de
   email no invalida el guardado del lead). Si el lead no trae email, se guarda igual
   pero no se manda email.
3. El lead abre la landing (email prefilled) y completa el formulario →
   `requestKitDigital2026` **matchea por email** dentro de campaña `Kit Digital 2026`
   → **UPDATE** de la fila de Meta con los datos adicionales. **No se duplica.**

## Piezas nuevas / modificadas

### `src/lib/imagina-leads.ts`
- `findKitDigital2026LeadByEmail(email): Promise<string | null>` — devuelve el `id` de
  la fila más reciente cuyo `email` (case-insensitive) coincide **y** `campaign =
  "Kit Digital 2026"`, o `null`. Best-effort (nunca lanza).
- `upsertKitDigital2026Lead(input, opts?)` — o una función equivalente que:
  - Busca match por email en la campaña.
  - Si existe → UPDATE (enriquecimiento, ver reglas).
  - Si no → INSERT (fila orgánica).
  - Devuelve `{ ok, id, matched: boolean }`.

### `src/lib/kit-digital-2026-email.ts`
- Reescribir `buildKitDigital2026Email` (mismo shell visual table-based + estilos
  inline) para el email **"casi has terminado"**:
  - Subject: p.ej. "Casi está — solo falta un paso para tu Kit Digital".
  - Copy: agradecimiento + "solo falta un paso más: cuéntanos qué necesitas".
  - CTA → `KD_EMAIL.landingUrl` con `?email=` del lead (la función acepta `email`).
  - Se conserva paleta de acento, logo, footer.
- `text/html/subject` como hoy.

### `src/lib/kit-digital-2026-action.ts`
- Sustituir el `createWebhookLead(...)` directo por `upsertKitDigital2026Lead(...)`
  (match por email → enriquecer o crear).
- **Eliminar** el bloque del autoresponder al lead (`buildKitDigital2026Email` +
  `resend.emails.send` al `d.email`).
- Mantener el email interno al equipo.

### `src/app/(site)/kit-digital-2026/page.tsx` + `KitDigital2026Form.tsx`
- `page.tsx`: leer `searchParams.email` y pasarlo como `initialEmail` al form.
- `KitDigital2026Form.tsx`: `defaultValue={initialEmail}` en el input de email.
  Prefill **solo email** (suficiente para el match; nombre/teléfono no).

### `src/app/api/leads/kit-digital-2026/route.ts` (nuevo)
- Auth: `providedSecret` + `secretMatches` (reutilizar patrón de `/api/leads`;
  extraer helpers compartidos si conviene, sin sobre-refactorizar).
- Parseo tolerante de `name`/`email`/`phone`/`id` (como `/api/leads`).
- INSERT vía `createWebhookLead` con `channel: "Meta"`, `campaign: "Kit Digital 2026"`.
- Si hay email → mandar email de marca vía Resend (best-effort).
- `GET` health-check.

## Reglas de match / enriquecimiento

- **Scope del match**: email (case-insensitive, trim) **+** `campaign = "Kit Digital 2026"`.
  Nunca se hace match global entre campañas.
- **Al enriquecer una fila existente** (típicamente lead de Meta que completa la landing):
  - **Conservar** `channel` (Meta) y `campaign` — no se pisan con "Web".
  - **Rellenar** `name`/`phone` solo si estaban vacíos (no pisar dato bueno con vacío).
  - **Set** `sector` y `business_type` con lo aportado en la landing.
  - **Appendear** a `notes` el bloque de detalle de la landing (servicios, tipo,
    empleados/antigüedad, sectores) sin borrar lo previo.
  - No cambiar `status` (se respeta el que tenga).
- **Resubmit orgánico**: si el mismo email completa la landing dos veces sin Meta,
  el segundo submit hace match con su propia fila → enriquece, no duplica. (Efecto
  colateral deseable.)

## Errores / robustez

- Persistencia al CRM primero, best-effort (nunca lanza al usuario), igual que hoy.
- Endpoint Meta: guardar lead es lo crítico; el email es best-effort (log si falla).
- Webhook auth: 401 si secret no coincide; 500 si `LEADS_WEBHOOK_SECRET` no está.
- Landing: email interno al equipo sigue siendo el paso "crítico" que devuelve error
  al usuario si Resend falla; el upsert al CRM va antes y es best-effort.

## Testing (TDD)

- `imagina-leads`: match por email en campaña (encuentra / no encuentra / distinta
  campaña no matchea); enriquecimiento (conserva channel Meta, appende notas, no pisa
  name/phone con vacío); insert cuando no hay match.
- `kit-digital-2026-email`: subject/copy nuevos, CTA contiene `?email=`, escape HTML.
- `kit-digital-2026-action`: ya no manda autoresponder al lead; sigue mandando email
  interno; llama a upsert; enriquece si existe fila.
- Endpoint `/api/leads/kit-digital-2026`: 401 sin secret, inserta con channel/campaign
  correctos, manda email cuando hay email, health-check GET.

## Fuera de alcance (YAGNI)

- No se toca el webhook genérico `/api/leads` (otros orígenes Meta siguen igual).
- No se prefilla nombre/teléfono en la landing.
- No se cambia el esquema de la tabla `imagina_leads`.
- No se implementa matching por teléfono (solo email, como pidió el usuario).
