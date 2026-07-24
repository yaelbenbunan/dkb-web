# CRM — Estado de email, Reenviar y Editar campos — Diseño

Fecha: 2026-07-24

## Objetivo

En el panel `/panel` (CRM sobre `imagina_leads`):
1. **Rastrear el estado real del email** de marca que se manda a los leads del Kit
   Digital (enviado / entregado / rebotado / spam), capturando los **rebotes**
   asíncronos vía webhook de Resend.
2. **Reenviar** ese email a mano desde el panel (útil cuando rebota y se corrige
   la dirección, o cuando no localizamos al lead por otra vía).
3. **Editar los campos de contacto** (nombre, email, teléfono) de un lead.

Motivación: leads de Meta con emails inválidos rebotan; hoy no hay forma de verlo
en el panel ni de corregir el email y reintentar.

## Estado actual (punto de partida)

- `handleKitDigital2026MetaLead` (`src/lib/kit-digital-2026-meta.ts`) inserta el lead
  y manda el email de marca vía Resend, pero **ignora el `message_id`** y no persiste
  ningún estado de envío.
- El panel (`src/app/(site)/panel/`) ya edita inline algunos campos vía
  `updateLeadField` (`account_manager`, `notes`, `followup`, `channel`, `campaign`)
  y `updateLeadStatus`. Los campos de contacto (name/email/phone) **no** son editables.
- `listLeads` hace `select("*")`, así que columnas nuevas aparecen sin cambios ahí.
- No existe ningún endpoint que reciba eventos de Resend.

## Arquitectura

Dos entradas de datos hacia las nuevas columnas de `imagina_leads`:
- **Al enviar** (handler de Meta + acción Reenviar) → guardamos `email_message_id`
  + `email_status='sent'`.
- **Webhook de Resend** (`POST /api/resend/webhook`) → al llegar un evento, casamos
  por `email_message_id` y actualizamos `email_status` (delivered/bounced/complained).

El panel lee esas columnas y pinta un badge + el botón Reenviar.

## Migración de esquema (Supabase — la corre el usuario)

`imagina_leads` es una tabla con RLS sin políticas; se accede con el service role.
Añadir columnas requiere `ALTER TABLE` (el usuario lo ejecuta en el SQL editor de
Supabase; el MCP de Supabase requiere auth no disponible en esta sesión):

```sql
alter table imagina_leads
  add column if not exists email_status text,
  add column if not exists email_message_id text,
  add column if not exists email_updated_at timestamptz;

-- Para casar rápido los eventos del webhook por message_id.
create index if not exists imagina_leads_email_message_id_idx
  on imagina_leads (email_message_id);
```

Valores de `email_status`: `sent` | `delivered` | `bounced` | `complained` | `null`
(nunca enviado). Etiquetas en el panel: Enviado / Entregado / Rebotado / Spam / —.

## Piezas nuevas / modificadas

### `src/lib/lead-status.ts` (o un nuevo `src/lib/email-status.ts`)
- `EMAIL_STATUS_LABELS` y `EMAIL_STATUS_COLORS` (client-safe) para el badge:
  - `sent` → "Enviado" (azul/gris), `delivered` → "Entregado" (verde),
    `bounced` → "Rebotado" (rojo), `complained` → "Spam" (ámbar), `null` → "—".

### `src/lib/imagina-leads.ts`
- Añadir a `LeadRow` los campos `email_status`, `email_message_id`, `email_updated_at`.
- `setLeadEmailSent(leadId, messageId)` — set `email_status='sent'`,
  `email_message_id=messageId`, `email_updated_at=now()`.
- `setLeadEmailStatusByMessageId(messageId, status)` — update `email_status=status` +
  `email_updated_at=now()` donde `email_message_id=messageId`. Devuelve nº de filas
  actualizadas (0 si no casa ninguna → evento de un email que no rastreamos).
- Ampliar el set de campos permitidos de `updateLeadField` para incluir
  `name`, `email`, `phone` (además de los actuales).

### `src/lib/kit-digital-2026-meta.ts`
- Tras enviar el email, si Resend devuelve `data.id`, llamar a
  `setLeadEmailSent(leadId, data.id)`. (El envío sigue siendo best-effort; el guardado
  del estado también — un fallo aquí no rompe nada.)

### `src/lib/kit-digital-2026-resend.ts` (nuevo — reutilizable)
- `sendKitDigital2026Email({ leadId, name, email }): Promise<{ ok; messageId?; error? }>`
  — construye `buildKitDigital2026Email({ name, email })`, lo manda con Resend, y si
  hay `data.id` persiste `setLeadEmailSent`. Lo usan el handler de Meta y la acción
  Reenviar (DRY). (El handler de Meta pasa a usar este helper.)

### `src/app/api/resend/webhook/route.ts` (nuevo)
- `runtime = "nodejs"`, `POST`.
- **Verificación de firma Svix** (Resend firma con Svix): headers `svix-id`,
  `svix-timestamp`, `svix-signature`; secreto `RESEND_WEBHOOK_SECRET` (formato
  `whsec_<base64>`). Se calcula `HMAC-SHA256(base64decode(secret), "${id}.${ts}.${body}")`
  en base64 y se compara (timing-safe) contra alguna de las firmas del header
  (`v1,<sig>` separadas por espacio). Rechaza 401 si no casa; 500 si falta el secreto.
- Parsea el evento `{ type, data }`. Mapea `type`:
  - `email.delivered` → `delivered`
  - `email.bounced` → `bounced`
  - `email.complained` → `complained`
  - (otros como `email.sent`/`email.delivery_delayed` → se ignoran o se registran).
- Casa por message id: `data.email_id ?? data.id` → `setLeadEmailStatusByMessageId`.
- Responde 200 siempre que la firma sea válida (aunque no case ninguna fila), para
  que Resend no reintente en bucle.
- `GET` health-check.

### `src/app/(site)/panel/actions.ts`
- `setLeadName`, `setLeadEmail`, `setLeadPhone` — como los `setLeadX` actuales, vía
  `updateLeadField`, con `revalidatePath("/panel")`.
- `resendKitDigitalEmailAction(formData)` — lee `id`, carga el lead, y si tiene email
  llama a `sendKitDigital2026Email({ leadId, name, email })`. Solo para leads de la
  campaña `Kit Digital 2026`. Revalida el panel. Devuelve ok/error.

### `src/app/(site)/panel/LeadsTable.tsx`
- Nueva **columna "Email"**: badge con `EMAIL_STATUS_LABELS`/`COLORS`.
- **Nombre/email/teléfono** editables inline (mismo patrón que los campos ya editables).
- Botón **"Reenviar"** en filas de campaña `Kit Digital 2026` que tengan email;
  resaltado (rojo) cuando `email_status === 'bounced'` (o `complained`). Dispara
  `resendKitDigitalEmailAction`.

## Config externa (usuario, con guía)

1. Correr el SQL de la migración en Supabase.
2. En Resend → **Webhooks** → añadir endpoint `https://www.dinkbit.es/api/resend/webhook`,
   seleccionar eventos `email.delivered`, `email.bounced`, `email.complained` (y
   opcionalmente `email.sent`), copiar el **Signing Secret** → ponerlo como
   `RESEND_WEBHOOK_SECRET` en Vercel (Production) y redeploy.

## Errores / robustez

- Persistir estado de email es best-effort (nunca rompe el envío ni el webhook).
- El webhook responde 200 ante eventos que no casan ninguna fila (emails no
  rastreados / históricos) para no provocar reintentos infinitos de Resend.
- La verificación de firma es obligatoria: sin `RESEND_WEBHOOK_SECRET` → 500; firma
  inválida → 401. Nunca se muta el CRM sin firma válida.
- Reenviar solo aplica a leads de `Kit Digital 2026` con email (si no, no-op con
  mensaje claro).

## Testing (TDD)

- `email-status`: labels/colors por estado, incluido `null` → "—".
- `imagina-leads`: `setLeadEmailSent` (set message_id + status + timestamp);
  `setLeadEmailStatusByMessageId` (actualiza por message_id; 0 filas si no casa);
  `updateLeadField` acepta name/email/phone.
- `kit-digital-2026-resend`: manda el email y, con `data.id`, persiste el estado;
  sin email → no envía; fallo de Resend → no persiste 'sent' y devuelve error.
- webhook Resend: firma válida → actualiza estado por message id; firma inválida →
  401; sin secreto → 500; evento sin match → 200 sin tocar nada; mapeo de tipos.
- panel actions: `resendKitDigitalEmailAction` solo para Kit Digital 2026 con email;
  `setLeadEmail`/`Name`/`Phone` invocan updateLeadField.

## Fuera de alcance (YAGNI)

- Solo se rastrea el estado de emails enviados **tras el despliegue** (históricos sin
  `message_id` no se casan; se ven en Resend directamente).
- No se rastrea estado de otros emails del sistema (interno, contacto, promo).
- No se edita nada más allá de los campos de contacto listados.
- No hay reintento automático de reenvío; el reenvío es siempre manual.
