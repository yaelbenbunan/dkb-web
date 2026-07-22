# Landing de captación — Vuelta del Kit Digital 2026

**Fecha:** 2026-07-22
**Ruta:** `/kit-digital-2026`
**Objetivo:** captación de clientes potenciales (top-of-funnel) ante la reactivación de fondos del Kit Digital.

## Contexto y decisión de contenido

La investigación oficial (Orden TDF/39/2026, BOE 29 ene 2026; Red.es; Acelera pyme)
confirma que:

- El plazo general del Kit Digital **cerró el 31/10/2025**.
- La Orden TDF/39/2026 **reactiva los fondos remanentes y elimina la fecha de
  cierre fija** ("hasta agotar fondos"), reinvirtiendo remanentes en el programa.
- **NO está confirmada oficialmente** una nueva convocatoria pública abierta con
  plazo para solicitar ahora, ni nuevos segmentos/importes/ampliación explícita a
  autónomos. Pendiente de instrucciones operativas de Acelera pyme/Red.es.

**Decisión de tono (aprobada):** honesto — "El Kit Digital vuelve en 2026,
prepárate y te avisamos". Enfoque lista de espera + diagnóstico previo. **Sin
cifras de importes** en la página (ni por segmento ni por categoría), para evitar
imprecisiones hasta que se publique el catálogo definitivo.

## Alcance

Landing nueva e independiente. La `/kit-digital` actual (fulfillment de
ordenador: pide nº de bono, NIF, dirección) queda **intacta**.

## Estructura de página (`src/app/(site)/kit-digital-2026/page.tsx`, server component)

Reutiliza los patrones visuales de la landing existente: `Container`, `Reveal`,
clases `surface`/`surface-elevated`/`surface-input`, tokens de marca
(`accent`, `fg`, `fg-muted`, `bg-subtle`), `spotlight-accent`, `bg-grid`.

1. **Hero** — badge "Kit Digital 2026", titular honesto ("El Kit Digital vuelve
   en 2026"), subtítulo (fondos reactivados por ley; ayudas para digitalizar tu
   negocio), CTA que baja al formulario. Formulario visible a la derecha en
   desktop (grid `lg:grid-cols-[1.1fr_0.9fr]`).
2. **Qué cubre** — 4 tarjetas visuales sin importes: Web, SEO, Redes sociales,
   Puesto de trabajo (ordenador).
3. **Cómo funciona** — 3-4 pasos (diagnóstico de madurez digital → elegir
   soluciones → tramitamos tu solicitud → lo implementamos).
4. **Formulario de captación** (client component).
5. **Nota legal honesta** al pie: fondos reactivados (Orden TDF/39/2026);
   convocatoria pendiente de instrucciones oficiales; te avisamos y preparamos tu
   diagnóstico. Sin prometer plazo.

Metadata SEO propia (`title`, `description`, `alternates.canonical`, `openGraph`).

## Formulario (`KitDigital2026Form.tsx`, client component)

Mismo patrón que los formularios existentes: `useTransition`, honeypot `website`,
time-trap `formLoadedAt` (>2s), `appendUtms(fd)`, estado de éxito propio.

Campos:

- **Nombre** (texto, requerido)
- **Teléfono** — placeholder "Tu mejor teléfono" (tel, requerido)
- **Email** — placeholder "Tu mejor email" (email, requerido)
- **Servicios de interés** (checkboxes, multi, ≥1 requerido): Web · SEO ·
  Redes sociales · Ordenador / puesto de trabajo · No lo sé, asesoradme
- **¿Pyme o autónomo?** (radio, requerido) → condicional:
  - Pyme → **nº de empleados** (select requerido: 1-2 · 3-9 · 10-49 · 50 o más)
  - Autónomo → **antigüedad de alta** (radio requerido: menos de 6 meses ·
    más de 6 meses)
- **Sector** (checkboxes, multi, opcional — "más para nosotros"): Hostelería/
  restauración · Comercio/retail · Salud/clínicas · Servicios profesionales ·
  Belleza/estética · Deporte/fitness · Construcción/reformas · Inmobiliaria ·
  Educación/formación · Otro
- **Consentimiento** (checkbox requerido) → política de privacidad
- Honeypot `website` + `formLoadedAt`

Estado de éxito: mensaje de agradecimiento en la propia tarjeta.

## Backend

### `requestKitDigital2026(formData)` — `src/lib/kit-digital-2026-action.ts` (server action)

- Validación Zod: name (≥2), phone (≥6), email, `services` (array no vacío),
  `businessType` ("pyme" | "autonomo"), condicionales (`employees` requerido si
  pyme; `seniority` requerido si autónomo), `sectors` (array opcional), `consent`
  (true), honeypot vacío, time-trap >2s.
- `services`, `sectors` llegan como múltiples entradas del FormData
  (`formData.getAll`).
- Persiste el lead en CRM (best-effort, nunca lanza) vía `createWebhookLead(...)`
  usando el builder `kitDigital2026Lead()`.
- Envía **dos** emails vía Resend:
  1. **Aviso interno** a `CONTACT_EMAIL_TO` con todos los campos.
  2. **Autoresponder al lead** (`to: email`) — plantilla por defecto con el
     nombre personalizado. Copy: gracias por dejar tus datos; en cuanto se abra el
     plazo tramitamos tu solicitud; si falta info te contactamos; mientras tanto
     preparamos tu diagnóstico. `from` = `CONTACT_EMAIL_FROM`. El fallo del
     autoresponder no debe invalidar el envío (el interno es el crítico).
- Devuelve `{ ok, error? }`.

### `kitDigital2026Lead()` — nuevo builder en `src/lib/web-lead-origin.ts`

- `channel`/`campaign` vía `attribution(utm, { channel: "Web", campaign: "Kit Digital 2026" })`.
- Mapea a `WebhookLeadInput` extendido: `name`, `email`, `phone`, `channel`,
  `campaign`, **`sector`** (unión de sectores o null), **`businessType`**
  (pyme/autónomo + detalle empleados/antigüedad legible), `notes` (origen +
  servicios de interés + tipo/empleados/antigüedad + sectores).

### Extensión de `WebhookLeadInput` / `createWebhookLead` — `src/lib/imagina-leads.ts`

- Añadir a `WebhookLeadInput` dos campos **opcionales**: `sector?: string | null`,
  `businessType?: string | null`.
- `createWebhookLead` escribe `sector` y `business_type` (columnas ya existentes
  en `imagina_leads`, usadas por `saveLead`). Retrocompatible: null cuando no se
  aportan. No cambia el comportamiento de los llamadores existentes.

## Tests (TDD, Vitest — como el resto del repo)

- `web-lead-origin.test.ts`: `kitDigital2026Lead()` — campaña por defecto "Kit
  Digital 2026", atribución por UTMs, sector/businessType poblados, notas con
  servicios y detalle, sectores vacíos → sector null.
- `kit-digital-2026-action.test.ts`: validación (rechaza honeypot, envío rápido,
  services vacío, falta employees si pyme, falta seniority si autónomo, consent
  false); camino feliz llama a `createWebhookLead` y envía los dos emails (mock de
  Resend e imagina-leads). Autoresponder no bloquea el resultado ok.
- Cobertura existente sigue verde.

## Verificación

`npm test`, typecheck y `npm run build` en verde antes de dar por terminado.
Ping sonoro al finalizar (preferencia del usuario).

## Fuera de alcance (YAGNI)

- No se toca `/kit-digital` existente.
- Sin cifras/importes en la página.
- Sin popup ni integración con Mailchimp (solo CRM + Resend).
- Sin subida de archivos.
