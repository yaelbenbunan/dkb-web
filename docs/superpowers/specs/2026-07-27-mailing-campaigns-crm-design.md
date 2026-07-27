# Mailing / Campañas desde el CRM — Diseño

Fecha: 2026-07-27

## Objetivo

Una sección nueva en `/panel` para **componer y enviar campañas de email** usando el
CRM (`imagina_leads`) como base de datos de destinatarios. Flujo de 4 pasos:
concepto → propuesta visual editable (IA) → remitente/asunto/destinatarios + prueba →
envío por lotes vía Resend, con **consentimiento** y **baja** integrados y
**trazabilidad por campaña**.

## Decisiones tomadas (brainstorming)

- **Email por bloques** (no plantilla rígida): el email es una lista ordenada de
  bloques email-safe. La IA propone bloques + contenido como **datos estructurados
  (JSON)**, no HTML suelto → seguro, consistente, a prueba de clientes de correo.
- **Edición híbrida**: controles directos (texto/color/tamaño/enlace, instantáneos)
  + caja de instrucciones IA para cambios grandes (añadir/quitar/reordenar/reescribir
  bloques).
- **Biblioteca de plantillas que crece**: se arranca con 1-2 plantillas base de marca;
  un diseño aprobado se puede **"Guardar como plantilla"** y reutilizar.
- **Consentimiento estructurado + baja** obligatorios (LSSI/RGPD).
- **Alcance: MVP completo** de los 4 pasos. Imágenes generadas por IA, programación de
  envíos, A/B y dashboard de métricas quedan para fase 2.
- **IA**: OpenAI ya integrado (`openai-client.ts`); salida estructurada JSON; modelo
  más capaz que `gpt-4o-mini` para calidad de copy/estructura.

## Estado actual reutilizable

- `openai-client.ts` (`getOpenAIClient`) + patrón de `preview-generate-action.ts`.
- `resend` v6 (soporta `resend.batch.send`, hasta 100/llamada).
- Webhook de Resend `/api/resend/webhook` + `resend-webhook.ts` (firma Svix) →
  hoy actualiza `imagina_leads.email_status` por `message_id`. Se **extiende** para
  actualizar también `campaign_recipients` por `message_id`.
- Patrón de token firmado (`promo-token.ts`) → se reutiliza para el enlace de baja.
- Panel: `LeadsTable.tsx`, filtros por estado/campaña/canal, selección con checkboxes,
  acciones server en `actions.ts`, auth por `proxy.ts` (`/panel/:path*`).
- Emails email-safe de referencia: `kit-digital-2026-email.ts` (tabla + inline CSS).

## Modelo de datos (Supabase — SQL que corre el usuario)

```sql
-- Consentimiento estructurado en el lead.
alter table imagina_leads
  add column if not exists consent boolean;

-- Campañas (borrador o enviada).
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,                 -- nombre interno
  subject text,              -- asunto del email
  from_email text,           -- remitente (validado contra dominios permitidos)
  status text not null default 'draft',  -- draft | sending | sent | failed
  template_id uuid,          -- plantilla base usada (nullable)
  blocks jsonb not null default '[]',     -- definición de bloques (contenido)
  concept text,              -- lo que se quería comunicar (input del paso 1)
  sent_at timestamptz,
  recipients_total int default 0
);

-- Un destinatario por campaña (trazabilidad por lead).
create table if not exists campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null,
  email text not null,
  message_id text,           -- id de Resend para casar eventos del webhook
  status text not null default 'pending', -- pending|sent|delivered|bounced|complained|failed
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index if not exists campaign_recipients_message_id_idx
  on campaign_recipients (message_id);

-- Biblioteca de plantillas (base sembradas + guardadas por el usuario).
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  blocks jsonb not null,     -- arreglo de bloques + estilos
  is_builtin boolean not null default false
);
```

## Modelo de bloques

Un bloque es `{ id, type, props }`. Tipos MVP (todos renderizan a tabla + inline CSS):
- `hero` — `{ eyebrow?, title, body?, accent? }`
- `paragraph` — `{ text, align?, size? }`
- `checklist` — `{ label?, items: string[], accent? }`
- `button` — `{ label, url, accent? }`
- `image` — `{ src, alt?, href? }`  (src = URL; subida de imágenes → fase 2)
- `divider` — `{}`
- `footer` — `{ orgLine, unsubscribe: true }`  (obligatorio; incluye baja + identidad)

Estilo global de campaña: `{ accentHex, fontStack }` (por defecto marca dinkbit).

**Renderer** `renderCampaignEmail(blocks, style, ctx)` → `{ html, text }` email-safe,
donde `ctx` inyecta el enlace de baja personalizado por destinatario y el preheader.
Mismo enfoque table-based + inline styles que `kit-digital-2026-email.ts`.

## Componentes / archivos (alto nivel)

### Librería (server)
- `src/lib/campaign-blocks.ts` — tipos de bloque + defaults + validación (Zod).
- `src/lib/campaign-render.ts` — `renderCampaignEmail(blocks, style, ctx)` → html/text.
- `src/lib/campaign-ai.ts` — `generateCampaignBlocks(concept, refs, templateBlocks?)` y
  `editCampaignBlocks(blocks, instruction)` vía OpenAI con **salida estructurada** (JSON
  validado con Zod; reintento si no valida).
- `src/lib/campaigns.ts` — CRUD Supabase de `campaigns` / `campaign_recipients` /
  `email_templates` (crear borrador, guardar bloques, listar plantillas, guardar
  plantilla, crear recipients, marcar estado…). Best-effort + service role.
- `src/lib/campaign-send.ts` — selección → filtra emailables (consent=true, email no
  nulo, no rebotado/suprimido) → `resend.batch.send` en lotes de 100 → guarda
  `campaign_recipients` con `message_id` → marca campaña `sent`.
- `src/lib/unsubscribe-token.ts` — token firmado (patrón `promo-token.ts`).
- Extender `resend-webhook`/`imagina-leads` con
  `setCampaignRecipientStatusByMessageId(messageId, status)`.

### Rutas / acciones
- `src/app/api/unsubscribe/route.ts` — `GET ?token=…` → valida → `consent=false` →
  página de confirmación. Idempotente.
- `src/app/(site)/panel/campanas/` — nueva subsección del panel (protegida por
  `proxy.ts`, matcher ya cubre `/panel/:path*`):
  - `page.tsx` — lista de campañas + botón "Nueva campaña".
  - Wizard cliente de 4 pasos (`CampaignWizard.tsx`) con:
    - Paso 1: selector de plantilla + textarea de concepto + referencias.
    - Paso 2: preview en **iframe sandbox** a la derecha; panel de bloques + edición
      directa a la izquierda + caja IA. Botón "Guardar como plantilla".
    - Paso 3: remitente/asunto + selector de destinatarios (reutiliza filtros del panel
      + checkboxes, muestra recuento emailable) + "Enviar prueba".
    - Paso 4: confirmación + "Enviar".
  - `actions.ts` de campañas (server actions): generar/editar (IA), guardar borrador,
    guardar plantilla, enviar prueba, enviar campaña.

### Navegación
- Enlace "✉️ Campañas" en el header del panel (junto a "🧮 Calculadora").

## Flujos

### Consentimiento
- Nueva columna `consent` (bool). Los formularios web que ya piden aceptación
  (kit-digital-2026, contacto, promo…) pasan a **persistir `consent=true`**.
- Leads sin `consent` (null) → **no emailables** por defecto (seguro). El usuario puede
  fijar consentimiento a mano en el panel para segmentos que sepa consentidos.
- El envío **siempre** excluye `consent!=true`, `email` nulo, y
  `email_status in ('bounced','complained')`.

### Baja
- Cada email incluye enlace `/api/unsubscribe?token=<firmado lead_id>` en el footer.
- Clic → `consent=false` + página "Te has dado de baja". No expone datos.

### Envío + trazabilidad
- `campaign-send` crea `campaign_recipients` (status `pending`), envía por lotes,
  guarda `message_id` y marca `sent`. El **webhook de Resend** actualiza cada recipient
  (`delivered`/`bounced`/`complained`) por `message_id`. La UI de campaña muestra el
  desglose de estados.

## Seguridad / robustez

- Preview de HTML generado **siempre** en `<iframe sandbox>` (sin scripts) — nunca se
  inyecta en el DOM del panel.
- Salida de IA validada con Zod antes de renderizar; si no valida, se reintenta o se
  cae a un bloque de texto seguro. Nunca se ejecuta HTML de la IA como markup del panel.
- Envío best-effort por lote: un fallo en un lote se registra en los recipients de ese
  lote sin abortar el resto.
- `from_email` validado contra una lista de remitentes permitidos del dominio
  verificado (evita spoofing / dominios no autenticados).
- Selección de destinatarios y envío solo accesibles bajo `/panel` (auth `proxy.ts`).
- Enlace de baja con token firmado (HMAC) — no se puede dar de baja a otro alterando un id.

## Testing (TDD)

- `campaign-blocks`: validación Zod de cada tipo; defaults; rechazo de tipos/props malas.
- `campaign-render`: cada tipo de bloque → HTML email-safe (tabla, inline CSS, escape de
  texto); footer incluye baja; html+text coherentes; inyección del enlace de baja por ctx.
- `campaign-ai`: dado un JSON válido del modelo (mockeado) → bloques validados; JSON
  inválido → reintento/caída controlada. (Se mockea OpenAI, sin red.)
- `campaigns` / `campaign-send`: filtro de emailables (excluye no-consent, sin email,
  rebotados); troceo en lotes de 100; persistencia de `message_id`; marca de estado.
- `unsubscribe-token`: firma/verificación; token manipulado → inválido.
- webhook: un `message_id` de campaña actualiza `campaign_recipients` (y no rompe el
  camino de `imagina_leads`).
- panel acciones: "enviar prueba" no toca el CRM; "enviar" exige campaña con bloques +
  asunto + remitente + ≥1 destinatario emailable.

## Fuera de alcance (YAGNI — fase 2)

- Subida/generación de imágenes por IA (MVP: `image` acepta URL).
- Programación de envíos, recurrencia, A/B testing.
- Dashboard de métricas agregadas (aperturas/clics) — MVP muestra estados de entrega.
- Editor drag-and-drop avanzado (MVP: añadir/quitar/reordenar + edición de props).
- Gestión de audiencias en Resend (usamos el CRM como fuente de verdad).

## Dependencias externas (usuario, con guía)

1. Correr el SQL de migración (columna `consent` + 3 tablas).
2. (Ya hecho) Webhook de Resend — se reutiliza el mismo endpoint.
3. Confirmar `OPENAI_API_KEY` en Vercel (ya usado por imagina-tu-web).
4. Confirmar remitentes permitidos (p.ej. `hola@dinkbit.es`) del dominio verificado.
