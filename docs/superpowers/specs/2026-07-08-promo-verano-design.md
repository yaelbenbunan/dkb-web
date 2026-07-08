# Promo Verano — Popup + Captación + Cuestionario

**Fecha:** 2026-07-08
**Estado:** Aprobado (pendiente de plan de implementación)

## Objetivo

Campaña de verano "tu web o ecommerce al 50%". Un popup en todo el sitio capta el
email del interesado, lo da de alta en la BBDD (Supabase + Mailchimp) y le envía un
email automático con la información de la promo y un CTA hacia un cuestionario nuevo
donde nos cuenta sobre su negocio para poder arrancar su web.

## Flujo general

```
┌─ Popup (todo el sitio, delay + control de frecuencia) ──┐
│  "Este verano, tu web o ecommerce al 50%"                │
│  [ email ]  ☑ Acepto política + info comercial           │
│  [ Quiero la info ]                                      │
└──────────────────┬───────────────────────────────────────┘
                   │ server action: subscribePromo(email, consent)
                   ▼
        ┌───────────────────────────────────────┐
        │ 1. Guarda lead → Supabase (crítico)    │  imagina_leads, channel="promo-verano"
        │ 2. Alta en Mailchimp (best-effort)     │  audience, single opt-in, tag "promo-verano-2026"
        │ 3. Envía email (Resend, best-effort)   │  promo + CTA con token firmado
        └──────────────┬────────────────────────┘
                       │ CTA "Cuéntanos sobre tu negocio →"
                       ▼
        ┌───────────────────────────────────────────┐
        │  /promo-verano/cuestionario?t=<token>      │
        │  Wizard nuevo a medida (15 preguntas)      │
        │  Actualiza el MISMO lead en Supabase       │
        │  Sube logo → bucket imagina-previews       │
        └───────────────────────────────────────────┘
```

**Idea clave:** el email del popup y las respuestas del cuestionario se unen mediante un
**token firmado** (mismo patrón que `preview-followup-token.ts`). El cuestionario sabe qué
lead actualizar sin volver a pedir el email → sin leads duplicados.

## Decisiones tomadas

- **BBDD de emails:** ambos — Supabase (CRM/panel) **y** Mailchimp (campañas).
- **Cuestionario:** sección **nueva a medida** (no se reutiliza `/imagina-tu-web`).
- **Popup:** en **todo el sitio** tras un delay, con control de frecuencia (1 vez cada N días por visitante vía localStorage).
- **Opt-in Mailchimp:** **single opt-in** (`status: "subscribed"`), con checkbox de consentimiento obligatorio como base legal.
- **Vigencia promo:** hasta **31 de agosto de 2026**.

## Componentes y ficheros

### Popup
- `src/components/promo/PromoPopup.tsx` — modal client. Trigger tras delay + control de
  frecuencia (localStorage). Montado en el layout de `(site)`. No existe ningún modal
  reutilizable en el repo: se construye desde cero (referencia de patrón overlay:
  `src/components/legal/CookieBanner.tsx`). Honeypot + time-trap anti-spam.
- `src/lib/promo-subscribe-action.ts` — server action. Valida (Zod + honeypot + consentimiento),
  guarda en Supabase, da de alta en Mailchimp, envía email. Orden a prueba de fallos.

### Mailchimp
- `src/lib/mailchimp.ts` — cliente ligero vía `fetch` a la API v3 (sin SDK).
  `addOrUpdateMember(email, tags)`. Maneja "ya suscrito" (PUT idempotente sobre el hash MD5
  del email) y errores de red sin romper el flujo.
- Env nuevas: `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX`
  (p.ej. `us21`). Añadir a `.env.example`.

### Email
- `src/lib/promo-email.ts` — HTML branded (tabla + estilos inline, patrón de
  `preview-offer-email.ts`). Contenido: promo 50%, vigencia hasta 31/08/2026, CTA con enlace
  a `/promo-verano/cuestionario?t=<token>`. From: `hola@dinkbit.es`.

### Cuestionario
- `src/app/(site)/promo-verano/cuestionario/page.tsx` — lee `?t=` (token), renderiza el wizard.
- `src/app/(site)/promo-verano/cuestionario/_components/PromoWizard.tsx` (+ pasos) — wizard con
  estado en un único objeto + contador de paso (patrón `PreviewWizard.tsx`). Honeypot + time-trap.
- `src/lib/promo-questionnaire-action.ts` — server action: actualiza el lead identificado por el token.
- `src/lib/promo-token.ts` — firma/verifica token con caducidad (patrón `preview-followup-token.ts`).
  Env nueva: `PROMO_TOKEN_SECRET`.

### Atribución de origen
- Nuevo builder en `src/lib/web-lead-origin.ts` (p.ej. `promoVeranoLead`) que mapea al
  `WebhookLeadInput` con `channel="promo-verano"`, `campaign="promo-verano-2026"`.

## Preguntas del cuestionario (15)

**Contacto** (el email ya viene del popup vía token)
1. Nombre y apellidos
2. Nombre del negocio / marca
3. Teléfono (opcional)

**Sobre el negocio**
4. ¿A qué se dedica tu negocio? (descripción libre)
5. Sector (selección: hostelería, salud, retail, servicios, etc.)
6. ¿Qué servicios o productos ofreces? (los principales)
7. ¿Qué necesitas? → Web / Ecommerce / No lo tengo claro
8. ¿Tienes web actual? (URL, opcional)

**Identidad visual**
9. Estilo gráfico (moderno, minimalista, elegante, atrevido, cercano…)
10. Colores de marca (o "no tengo, ayúdame")
11. Tipografía (preferencia o "que la elijáis vosotros")
12. Sube tu logo (o "no tengo logo todavía") → bucket `imagina-previews`
13. Webs de referencia que te gusten (opcional)

**Presencia actual**
14. Redes / presencia actual (Instagram, Google Business, etc. — opcional)

**Cierre**
15. Algo más que debamos saber (texto libre)

> Mapeo a columnas de `imagina_leads`: name, business_name, phone, value_prop/sector,
> business_type, current_website, style, palette, notes, pdf_path (logo), etc. Donde no
> haya columna directa, se serializa en `notes`. Se evalúa en el plan si conviene añadir
> columnas nuevas o reutilizar las existentes.

## Legal / consentimiento

- Checkbox **obligatorio** en el popup:
  *"He leído y acepto la [política de privacidad](/privacidad) y el envío de comunicaciones comerciales."*
- Se guarda marca de consentimiento (timestamp) en `notes` del lead.
- Mailchimp: alta como `subscribed` (single opt-in). Base legal = checkbox obligatorio.

## Errores y robustez

- **Orden a prueba de fallos:** primero Supabase (crítico); luego Mailchimp y Resend como
  best-effort. Si Mailchimp o Resend fallan, el lead NO se pierde (patrón existente en las
  demás acciones del repo).
- Popup: fallo de envío → mensaje de error sin cerrar el modal; éxito → estado "Revisa tu correo 📩".
- Cuestionario: token inválido/caducado → se pide el email de nuevo y se continúa (no se bloquea).
- Anti-spam: honeypot (`website` max 0) + time-trap (`formLoadedAt`, >2s) en popup y cuestionario.

## Tests (TDD)

- `promo-token`: firma/verificación, caducidad, manipulación.
- `mailchimp`: construcción de payload, hash del email, manejo de "ya suscrito", errores de red.
- `promo-subscribe-action`: Supabase se llama siempre; Mailchimp/Resend best-effort; rechazo por
  honeypot / falta de consentimiento.
- `web-lead-origin`: builder de origen "promo-verano".
- `promo-questionnaire-action`: actualiza el lead correcto vía token.

## Reutilización vs nuevo

**Reutilizamos:** honeypot + time-trap, `imagina_leads` + `createWebhookLead`, `web-lead-origin`,
patrón HTML de email (`preview-offer-email.ts`), subida de logo al bucket, patrón de wizard
(`PreviewWizard.tsx`), patrón de token (`preview-followup-token.ts`), `useTransition` + `appendUtms`.

**Nuevo (greenfield):** shell de modal/popup, integración Mailchimp, cuestionario a medida,
token de promo, rutas `/promo-verano/*`.

## Fuera de alcance (YAGNI)

- Sistema de drip/cron de emails (los correos son transaccionales, al enviar).
- Doble opt-in (descartado en favor de single opt-in + consentimiento).
- Reutilización del wizard de `/imagina-tu-web`.
