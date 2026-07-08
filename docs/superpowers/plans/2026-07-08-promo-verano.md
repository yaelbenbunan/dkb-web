# Promo Verano Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popup sitewide que capta el email para la promo de verano (-50% en web/ecommerce), lo guarda en Supabase + Mailchimp, envía un email automático con la promo y un CTA hacia un cuestionario nuevo donde el interesado describe su negocio.

**Architecture:** Server Actions (patrón del repo) + Zod + honeypot/time-trap anti-spam. El lead se persiste primero en Supabase (crítico), luego Mailchimp y Resend como best-effort. El email del popup y las respuestas del cuestionario se enlazan con un token HMAC firmado (patrón `preview-followup-token.ts`), de modo que el cuestionario actualiza el MISMO lead sin duplicarlo.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Zod 4, Resend 6, `@supabase/supabase-js`, Mailchimp Marketing API v3 (vía `fetch`, sin SDK), Vitest + Testing Library.

## Global Constraints

- TDD siempre: test que falla → implementación mínima → test pasa → commit. `npm test` debe quedar en verde.
- Antes de dar por terminado: `npm run typecheck`, `npm test` y `npm run build` en verde.
- Anti-spam obligatorio en todo formulario: honeypot `website` (`z.string().max(0)`) + time-trap `formLoadedAt` (`.refine(Date.now() - formLoadedAt > 2000)`).
- Orden a prueba de fallos: Supabase primero (crítico), Mailchimp y Resend después (best-effort, nunca lanzan al usuario).
- Emails salientes desde dominio verificado en Resend: `hola@dinkbit.es`.
- Copy en español (es-ES). Fechas con `Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid" })`.
- Secreto de firma: preferir `PROMO_TOKEN_SECRET`, caer a `RESEND_API_KEY`, NUNCA a constante pública.
- Etiqueta de campaña única para reporting: `campaign = "promo-verano-2026"` en todos los leads de la promo.
- Consentimiento obligatorio en el popup (checkbox) como base legal del alta single opt-in.
- Vigencia de la promo: hasta `2026-08-31T23:59:59+02:00`.
- Alias de imports: `@/` → `src/`.

---

### Task 1: Configuración central de la promo (`promo-config.ts`)

Única fuente de verdad de fechas, precios, copy corto, tags y rutas. Todo lo demás la consume.

**Files:**
- Create: `src/lib/promo-config.ts`
- Test: `src/lib/__tests__/promo-config.test.ts`

**Interfaces:**
- Produces:
  - `PROMO` (objeto `as const`) con: `discountPct: 50`, `deadlineISO: "2026-08-31T23:59:59+02:00"`, `mailchimpTag: "promo-verano-2026"`, `channel: "promo-verano"`, `campaign: "promo-verano-2026"`, `fromEmail: "hola@dinkbit.es"`, `siteUrl: "https://www.dinkbit.es"`, `questionnairePath: "/promo-verano/cuestionario"`, `frequencyDays: 7`, `showDelayMs: 8000`.
  - `isPromoActive(now: number): boolean`
  - `promoDeadlineLabel(): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-config.test.ts
import { describe, expect, test } from "vitest";
import { PROMO, isPromoActive, promoDeadlineLabel } from "../promo-config";

describe("promo-config", () => {
  const deadline = Date.parse(PROMO.deadlineISO);

  test("promo is active before the deadline and inactive after", () => {
    expect(isPromoActive(deadline - 1000)).toBe(true);
    expect(isPromoActive(deadline + 1000)).toBe(false);
  });

  test("campaign label is the single reporting tag", () => {
    expect(PROMO.campaign).toBe("promo-verano-2026");
    expect(PROMO.mailchimpTag).toBe("promo-verano-2026");
  });

  test("deadline label is a human Spanish date", () => {
    expect(promoDeadlineLabel()).toContain("agosto");
    expect(promoDeadlineLabel()).toContain("2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-config.test.ts`
Expected: FAIL — cannot find module `../promo-config`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-config.ts
/** Única fuente de verdad de la campaña "Promo Verano -50%". */
export const PROMO = {
  discountPct: 50,
  /** Fin de la promo (hora de Madrid). */
  deadlineISO: "2026-08-31T23:59:59+02:00",
  /** Tag en la audiencia de Mailchimp y campaña en el CRM. */
  mailchimpTag: "promo-verano-2026",
  channel: "promo-verano",
  campaign: "promo-verano-2026",
  /** Remitente verificado en Resend. */
  fromEmail: "hola@dinkbit.es",
  siteUrl: "https://www.dinkbit.es",
  questionnairePath: "/promo-verano/cuestionario",
  /** No volver a mostrar el popup al mismo visitante en N días. */
  frequencyDays: 7,
  /** Retardo antes de mostrar el popup. */
  showDelayMs: 8000,
} as const;

export function isPromoActive(now: number): boolean {
  return now <= Date.parse(PROMO.deadlineISO);
}

export function promoDeadlineLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(new Date(Date.parse(PROMO.deadlineISO)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-config.ts src/lib/__tests__/promo-config.test.ts
git commit -m "feat(promo): configuración central de la promo de verano"
```

---

### Task 2: Token firmado del cuestionario (`promo-token.ts`)

HMAC sobre (leadId, email) para que el CTA del email abra el cuestionario ligado al lead correcto sin poder falsificarse.

**Files:**
- Create: `src/lib/promo-token.ts`
- Test: `src/lib/__tests__/promo-token.test.ts`

**Interfaces:**
- Produces:
  - `mintPromoToken(leadId: string, email: string): string` — devuelve `"${expiry}.${hexSig}"` o `""` si no hay secreto.
  - `verifyPromoToken(leadId: string, email: string, token: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-token.test.ts
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mintPromoToken, verifyPromoToken } from "../promo-token";

describe("promo-token", () => {
  beforeEach(() => { process.env.PROMO_TOKEN_SECRET = "test-secret-123"; });
  afterEach(() => { delete process.env.PROMO_TOKEN_SECRET; });

  test("a freshly minted token verifies for the same lead+email", () => {
    const t = mintPromoToken("lead-1", "User@Example.com");
    expect(t).not.toBe("");
    expect(verifyPromoToken("lead-1", "user@example.com", t)).toBe(true);
  });

  test("rejects a token for a different lead or email", () => {
    const t = mintPromoToken("lead-1", "a@example.com");
    expect(verifyPromoToken("lead-2", "a@example.com", t)).toBe(false);
    expect(verifyPromoToken("lead-1", "b@example.com", t)).toBe(false);
  });

  test("rejects garbage and expired tokens", () => {
    expect(verifyPromoToken("lead-1", "a@example.com", "not-a-token")).toBe(false);
    const expired = `${Date.now() - 1000}.deadbeef`;
    expect(verifyPromoToken("lead-1", "a@example.com", expired)).toBe(false);
  });

  test("without a secret configured it refuses to mint", () => {
    delete process.env.PROMO_TOKEN_SECRET;
    const prevResend = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(mintPromoToken("lead-1", "a@example.com")).toBe("");
    if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-token.test.ts`
Expected: FAIL — cannot find module `../promo-token`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-token.ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** El CTA del email abre el cuestionario y actualiza un lead concreto. Firmamos
 *  (leadId, email) con HMAC para que ese enlace no pueda falsificarse ni
 *  reasignarse a otro lead. Token válido 30 días (la promo dura todo el verano). */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.PROMO_TOKEN_SECRET ?? process.env.RESEND_API_KEY ?? null;
}

function sign(payload: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function mintPromoToken(leadId: string, email: string): string {
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (!sig) {
    console.warn("[promo-token] no signing secret configured — token disabled");
    return "";
  }
  return `${expiry}.${sig}`;
}

export function verifyPromoToken(leadId: string, email: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expiry = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(`${leadId}.${email.trim().toLowerCase()}.${expiry}`);
  if (!expected || sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-token.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-token.ts src/lib/__tests__/promo-token.test.ts
git commit -m "feat(promo): token HMAC para enlazar email y cuestionario"
```

---

### Task 3: Builder de origen del lead (`promoVeranoLead`)

Añade el mapeo del lead de la promo a `web-lead-origin.ts`, junto a los builders existentes.

**Files:**
- Modify: `src/lib/web-lead-origin.ts` (añadir función al final)
- Test: `src/lib/__tests__/web-lead-origin.test.ts` (añadir un `describe`)

**Interfaces:**
- Consumes: `attribution`, `UtmInput`, `WebhookLeadInput` (ya en el módulo).
- Produces: `promoVeranoLead(d: { email: string; consentAt: string }, utm?: UtmInput): WebhookLeadInput`

- [ ] **Step 1: Write the failing test** (añadir al final de `web-lead-origin.test.ts`; añade `promoVeranoLead` al import de la línea 2)

```ts
describe("promoVeranoLead", () => {
  test("organic visit → channel promo-verano, fixed campaign, consent recorded", () => {
    const row = promoVeranoLead({ email: "lead@example.com", consentAt: "2026-07-08T10:00:00.000Z" });
    expect(row.email).toBe("lead@example.com");
    expect(row.channel).toBe("promo-verano");
    expect(row.campaign).toBe("promo-verano-2026");
    expect(row.notes).toContain("Promo Verano");
    expect(row.notes).toContain("Consentimiento");
    expect(row.notes).toContain("2026-07-08T10:00:00.000Z");
  });

  test("ad traffic sets the channel from UTMs but keeps the promo campaign", () => {
    const row = promoVeranoLead(
      { email: "lead@example.com", consentAt: "2026-07-08T10:00:00.000Z" },
      { utmSource: "google", utmCampaign: "verano-search" },
    );
    expect(row.channel).toBe("google ads");
    expect(row.campaign).toBe("promo-verano-2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/web-lead-origin.test.ts`
Expected: FAIL — `promoVeranoLead is not exported` / not a function.

- [ ] **Step 3: Write minimal implementation** (añadir al final de `web-lead-origin.ts`)

```ts
export function promoVeranoLead(
  d: { email: string; consentAt: string },
  utm?: UtmInput,
): WebhookLeadInput {
  // El canal refleja el origen del tráfico (organic → "promo-verano"), pero la
  // campaña se fija SIEMPRE a la de la promo para poder filtrar todos sus leads
  // juntos en el CRM, venga el visitante de donde venga.
  const { channel } = attribution(utm, { channel: "promo-verano", campaign: null });
  return {
    email: d.email,
    channel,
    campaign: "promo-verano-2026",
    notes: `Origen: popup Promo Verano -50% · Consentimiento comunicaciones comerciales: ${d.consentAt}`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/web-lead-origin.test.ts`
Expected: PASS (todos los `describe`, incluido el nuevo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/web-lead-origin.ts src/lib/__tests__/web-lead-origin.test.ts
git commit -m "feat(promo): builder de origen para leads de la promo de verano"
```

---

### Task 4: Cliente de Mailchimp (`mailchimp.ts`)

Alta/actualización idempotente de un email en la audiencia (single opt-in) + tag, vía API v3 con `fetch`. Best-effort: nunca lanza.

**Files:**
- Create: `src/lib/mailchimp.ts`
- Test: `src/lib/__tests__/mailchimp.test.ts`

**Interfaces:**
- Produces:
  - `subscriberHash(email: string): string` — MD5 del email en minúsculas.
  - `addOrUpdateMember(email: string, tags?: string[]): Promise<{ ok: boolean; skipped?: boolean; error?: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/mailchimp.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { addOrUpdateMember, subscriberHash } from "../mailchimp";

describe("mailchimp", () => {
  beforeEach(() => {
    process.env.MAILCHIMP_API_KEY = "key-abc";
    process.env.MAILCHIMP_AUDIENCE_ID = "aud123";
    process.env.MAILCHIMP_SERVER_PREFIX = "us21";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MAILCHIMP_API_KEY;
    delete process.env.MAILCHIMP_AUDIENCE_ID;
    delete process.env.MAILCHIMP_SERVER_PREFIX;
  });

  test("subscriberHash is the md5 of the lowercased email", () => {
    // md5("user@example.com")
    expect(subscriberHash("User@Example.com")).toBe("b58996c504c5638798eb6b511e6f49af");
  });

  test("PUTs the member to the right URL as subscribed, then POSTs the tag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await addOrUpdateMember("user@example.com", ["promo-verano-2026"]);

    expect(res.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://us21.api.mailchimp.com/3.0/lists/aud123/members/b58996c504c5638798eb6b511e6f49af",
    );
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body);
    expect(body.email_address).toBe("user@example.com");
    expect(body.status_if_new).toBe("subscribed");
    // segunda llamada: tags
    const [tagUrl, tagInit] = fetchMock.mock.calls[1];
    expect(tagUrl).toContain("/tags");
    expect(JSON.parse(tagInit.body).tags[0]).toEqual({ name: "promo-verano-2026", status: "active" });
  });

  test("skips (does not throw) when env is not configured", async () => {
    delete process.env.MAILCHIMP_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await addOrUpdateMember("user@example.com");
    expect(res).toEqual({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns ok:false on network error without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const res = await addOrUpdateMember("user@example.com");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/mailchimp.test.ts`
Expected: FAIL — cannot find module `../mailchimp`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/mailchimp.ts
import "server-only";
import { createHash } from "node:crypto";

/** Mailchimp identifica a cada miembro por el MD5 del email en minúsculas. */
export function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

interface MailchimpEnv { apiKey: string; audienceId: string; server: string; }

function readEnv(): MailchimpEnv | null {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const server = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !audienceId || !server) return null;
  return { apiKey, audienceId, server };
}

/** Alta/actualización idempotente (upsert por hash) como `subscribed` (single
 *  opt-in) + tag opcional. Best-effort: si no hay config o falla la red, no
 *  lanza — el lead ya está guardado en Supabase. */
export async function addOrUpdateMember(
  email: string,
  tags: string[] = [],
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const env = readEnv();
  if (!env) {
    console.warn("[mailchimp] not configured — skipping");
    return { ok: false, skipped: true };
  }
  const clean = email.trim().toLowerCase();
  const base = `https://${env.server}.api.mailchimp.com/3.0/lists/${env.audienceId}/members/${subscriberHash(clean)}`;
  const auth = "Basic " + Buffer.from(`any:${env.apiKey}`).toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };
  try {
    const res = await fetch(base, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email_address: clean,
        status_if_new: "subscribed",
        status: "subscribed",
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[mailchimp] member upsert failed:", res.status, detail);
      return { ok: false, error: `status_${res.status}` };
    }
    if (tags.length) {
      const tagRes = await fetch(`${base}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tags: tags.map((name) => ({ name, status: "active" })) }),
      });
      if (!tagRes.ok) console.error("[mailchimp] tag failed:", tagRes.status);
    }
    return { ok: true };
  } catch (e) {
    console.error("[mailchimp] network error:", (e as Error).message);
    return { ok: false, error: "network" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/mailchimp.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mailchimp.ts src/lib/__tests__/mailchimp.test.ts
git commit -m "feat(promo): cliente Mailchimp para alta single opt-in + tag"
```

---

### Task 5: Email de la promo (`promo-email.ts`)

HTML branded (tabla + estilos inline, patrón de `preview-offer-email.ts`) con la info de la promo y el CTA al cuestionario con el token.

**Files:**
- Create: `src/lib/promo-email.ts`
- Test: `src/lib/__tests__/promo-email.test.ts`

**Interfaces:**
- Consumes: `PROMO`, `promoDeadlineLabel` (Task 1).
- Produces: `buildPromoEmail(input: { email: string; leadId: string; token: string }): { subject: string; html: string; text: string }` — el CTA lleva `?t=<token>&lid=<leadId>&em=<email>` para que el server pueda verificar el token contra (leadId, email).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-email.test.ts
import { describe, expect, test } from "vitest";
import { buildPromoEmail } from "../promo-email";
import { PROMO } from "../promo-config";

describe("buildPromoEmail", () => {
  const out = buildPromoEmail({ email: "lead@example.com", leadId: "lead-9", token: "tok-123" });

  test("subject mentions the 50% summer offer", () => {
    expect(out.subject).toContain("50");
    expect(out.subject.toLowerCase()).toContain("verano");
  });

  test("CTA links to the questionnaire with token, leadId and email", () => {
    const href = `${PROMO.siteUrl}${PROMO.questionnairePath}?t=tok-123&lid=lead-9&em=lead%40example.com`;
    expect(out.html).toContain(href);
    expect(out.text).toContain(href);
  });

  test("includes the deadline and a commercial-comms disclaimer", () => {
    expect(out.html).toContain("agosto");
    expect(out.html.toLowerCase()).toContain("comunicaciones comerciales");
  });

  test("url-encodes the token", () => {
    const dirty = buildPromoEmail({ email: "a@b.com", leadId: "l1", token: "a b&c" });
    expect(dirty.html).toContain("t=a%20b%26c");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-email.test.ts`
Expected: FAIL — cannot find module `../promo-email`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-email.ts
// Email de bienvenida a la promo de verano (-50%). Table-based + inline styles
// para compatibilidad con clientes de correo. Se envía AL usuario (marketing),
// por eso incluye disclaimer de comunicaciones comerciales y baja.
import { PROMO, promoDeadlineLabel } from "./promo-config";

const FONT_STACK = "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";
const ACCENT = "#187bef";

export function buildPromoEmail(input: { email: string; leadId: string; token: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const ctaHref =
    `${PROMO.siteUrl}${PROMO.questionnairePath}` +
    `?t=${encodeURIComponent(input.token)}` +
    `&lid=${encodeURIComponent(input.leadId)}` +
    `&em=${encodeURIComponent(input.email)}`;
  const deadline = promoDeadlineLabel();
  const subject = `Tu web o ecommerce al ${PROMO.discountPct}% este verano 🌴`;
  const preheader = `Solo hasta el ${deadline}. Cuéntanos sobre tu negocio y ponemos tu web en marcha con ${PROMO.discountPct}% de descuento.`;

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT_STACK};color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border-top:6px solid ${ACCENT};">
  <tr><td style="padding:30px 36px 6px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:${ACCENT};text-transform:uppercase;">Promo Verano · -${PROMO.discountPct}%</div>
    <h1 style="margin:12px 0 0;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-0.5px;">
      Este verano, tu web o ecommerce al ${PROMO.discountPct}% 🌴
    </h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:#475569;">
      Gracias por tu interés. Durante este verano lanzamos todas nuestras webs y
      tiendas online con un <strong style="color:${ACCENT};">${PROMO.discountPct}% de descuento</strong>.
      Oferta válida hasta el <strong>${deadline}</strong>.
    </p>
  </td></tr>
  <tr><td style="padding:24px 36px 8px;text-align:center;">
    <a href="${ctaHref}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:17px 34px;border-radius:12px;">Cuéntanos sobre tu negocio →</a>
    <p style="margin:14px 0 0;font-size:13px;color:#64748b;">Nos dices a qué te dedicas y empezamos a diseñar tu web.</p>
  </td></tr>
  <tr><td style="padding:20px 36px 28px;border-top:1px solid #eef2f7;">
    <p style="margin:0 0 10px;font-size:11px;line-height:1.6;color:#94a3b8;">
      Recibes este correo porque solicitaste información sobre nuestra promoción de
      verano y aceptaste recibir comunicaciones comerciales de dinkbit. Puedes darte
      de baja respondiendo a este correo. Más info en nuestra
      <a href="${PROMO.siteUrl}/privacidad" style="color:${ACCENT};">política de privacidad</a>.
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">dinkbit · <a href="${PROMO.siteUrl}" style="color:${ACCENT};text-decoration:none;">www.dinkbit.es</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Este verano, tu web o ecommerce al ${PROMO.discountPct}%.`,
    "",
    `Durante este verano lanzamos todas nuestras webs y tiendas online con un ${PROMO.discountPct}% de descuento. Válido hasta el ${deadline}.`,
    "",
    `Cuéntanos sobre tu negocio y empezamos: ${ctaHref}`,
    "",
    "Recibes este correo porque solicitaste información sobre nuestra promoción de verano y aceptaste recibir comunicaciones comerciales de dinkbit. Puedes darte de baja respondiendo a este correo.",
  ].join("\n");

  return { subject, html, text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-email.ts src/lib/__tests__/promo-email.test.ts
git commit -m "feat(promo): email de bienvenida con CTA al cuestionario"
```

---

### Task 6: Server action del popup (`promo-subscribe-action.ts`)

Valida, persiste el lead (Supabase, crítico), alta en Mailchimp y envía el email (best-effort). Devuelve un resultado que el popup usa para su estado de éxito/error.

**Files:**
- Create: `src/lib/promo-subscribe-action.ts`
- Test: `src/lib/__tests__/promo-subscribe-action.test.ts`

**Interfaces:**
- Consumes: `createWebhookLead` (`imagina-leads`), `promoVeranoLead` + `utmFromFormData` (`web-lead-origin`), `addOrUpdateMember` (`mailchimp`), `mintPromoToken` (`promo-token`), `buildPromoEmail` (`promo-email`), `PROMO` (`promo-config`), `Resend`.
- Produces: `subscribePromo(formData: FormData): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-subscribe-action.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, createWebhookLeadMock, addOrUpdateMemberMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createWebhookLeadMock: vi.fn(),
  addOrUpdateMemberMock: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send: sendMock }; } }));
vi.mock("../imagina-leads", () => ({ createWebhookLead: createWebhookLeadMock }));
vi.mock("../mailchimp", () => ({ addOrUpdateMember: addOrUpdateMemberMock }));

import { subscribePromo } from "../promo-subscribe-action";

function formFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = () => formFor({
  email: "lead@example.com",
  consent: "on",
  website: "",
  formLoadedAt: String(Date.now() - 5000),
});

describe("subscribePromo", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "lead-1" });
    addOrUpdateMemberMock.mockReset().mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "test-key";
    process.env.PROMO_TOKEN_SECRET = "sec";
  });

  test("persists lead, subscribes to Mailchimp and emails the user", async () => {
    const res = await subscribePromo(valid());
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(createWebhookLeadMock.mock.calls[0][0].campaign).toBe("promo-verano-2026");
    expect(addOrUpdateMemberMock).toHaveBeenCalledWith("lead@example.com", ["promo-verano-2026"]);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("lead@example.com");
  });

  test("rejects without consent and does not persist", async () => {
    const res = await subscribePromo(formFor({
      email: "lead@example.com", consent: "", website: "", formLoadedAt: String(Date.now() - 5000),
    }));
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("rejects the honeypot", async () => {
    const res = await subscribePromo(formFor({
      email: "lead@example.com", consent: "on", website: "bot", formLoadedAt: String(Date.now() - 5000),
    }));
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("still succeeds if Mailchimp and Resend fail (lead already saved)", async () => {
    addOrUpdateMemberMock.mockResolvedValue({ ok: false, error: "network" });
    sendMock.mockResolvedValue({ error: { message: "down" } });
    const res = await subscribePromo(valid());
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-subscribe-action.test.ts`
Expected: FAIL — cannot find module `../promo-subscribe-action`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-subscribe-action.ts
"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { promoVeranoLead, utmFromFormData } from "./web-lead-origin";
import { addOrUpdateMember } from "./mailchimp";
import { mintPromoToken } from "./promo-token";
import { buildPromoEmail } from "./promo-email";
import { PROMO } from "./promo-config";

const schema = z
  .object({
    email: z.email("Email inválido"),
    // El checkbox sólo llega ("on") si el usuario lo marca; ausente ⇒ null ⇒ falla.
    consent: z.literal("on", { message: "Debes aceptar para continuar" }),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export async function subscribePromo(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    consent: formData.get("consent"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa el email y acepta las condiciones." };
  }
  const email = parsed.data.email.trim().toLowerCase();

  // 1) CRÍTICO: guardar el lead antes que nada (nunca se pierde).
  const consentAt = new Date().toISOString();
  const lead = await createWebhookLead(
    promoVeranoLead({ email, consentAt }, utmFromFormData(formData)),
  );
  const leadId = lead.id ?? email;

  // 2) BEST-EFFORT: alta en Mailchimp (single opt-in) + tag.
  await addOrUpdateMember(email, [PROMO.mailchimpTag]);

  // 3) BEST-EFFORT: email de bienvenida con CTA al cuestionario.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const token = mintPromoToken(leadId, email);
    const { subject, html, text } = buildPromoEmail({ email, leadId, token });
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: PROMO.fromEmail,
      to: email,
      subject,
      html,
      text,
    });
    if (error) console.error("[promo] Resend error:", error);
  } else {
    console.error("[promo] Missing RESEND_API_KEY — welcome email not sent");
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-subscribe-action.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-subscribe-action.ts src/lib/__tests__/promo-subscribe-action.test.ts
git commit -m "feat(promo): server action de alta desde el popup"
```

---

### Task 7: Persistencia del cuestionario (`promo-questionnaire.ts` + helpers CRM)

Mapeo puro de las respuestas del cuestionario a la fila del CRM + helpers de persistencia (actualizar lead, subir logo). El logo va al bucket existente; su ruta y los campos sin columna propia se serializan en `notes` preservando la nota de consentimiento.

**Files:**
- Create: `src/lib/promo-questionnaire.ts` (tipos + mapeo puro)
- Modify: `src/lib/imagina-leads.ts` (añadir `getLeadNotes`, `uploadPromoLogo`, `savePromoQuestionnaire`)
- Test: `src/lib/__tests__/promo-questionnaire.test.ts`

**Interfaces:**
- Produces (en `promo-questionnaire.ts`):
  - `interface PromoQuestionnaireInput` con: `leadId: string; email: string; name: string; businessName: string; phone?: string; activity: string; sector: string; services: string; need: string; currentWebsite?: string; style: string; colors: string; typography: string; references?: string; social?: string; logoPath?: string | null; extra?: string;`
  - `promoQuestionnaireFields(input: PromoQuestionnaireInput): { id: string; name: string; email: string; phone?: string; sector: string; businessName: string; businessType: string; style: string; palette: string; valueProp: string; currentWebsite?: string }` — mapea a los nombres de `SaveLeadInput`.
  - `formatQuestionnaireNotes(input: PromoQuestionnaireInput): string` — bloque de texto con lo que no tiene columna (services, typography, references, social, logo, extra).
- Produces (en `imagina-leads.ts`):
  - `getLeadNotes(leadId: string): Promise<string>` (cadena vacía si no hay).
  - `uploadPromoLogo(leadId: string, file: File): Promise<string | null>` — sube a `promo/${leadId}-logo.<ext>`, devuelve la ruta.
  - `savePromoQuestionnaire(input: PromoQuestionnaireInput): Promise<void>` — `saveLead(...)` con los campos mapeados + `updateLeadField("notes", <consent> + <bloque cuestionario>)`.

- [ ] **Step 1: Write the failing test** (sólo el mapeo puro; la parte DB se verifica en typecheck/build y en el paso E2E de la Task 12)

```ts
// src/lib/__tests__/promo-questionnaire.test.ts
import { describe, expect, test } from "vitest";
import {
  promoQuestionnaireFields,
  formatQuestionnaireNotes,
  type PromoQuestionnaireInput,
} from "../promo-questionnaire";

const base: PromoQuestionnaireInput = {
  leadId: "lead-1",
  email: "lead@example.com",
  name: "Marta Ruiz",
  businessName: "La Tostadora",
  phone: "600111222",
  activity: "Cafetería de especialidad",
  sector: "Hostelería",
  services: "Café de especialidad, brunch, catering",
  need: "Web",
  currentWebsite: "https://latostadora.example",
  style: "Minimalista y cálido",
  colors: "Tierra y crema",
  typography: "Serif elegante",
  references: "https://ref.example",
  social: "@latostadora en Instagram",
  logoPath: "promo/lead-1-logo.png",
  extra: "Abrimos un segundo local en septiembre",
};

describe("promoQuestionnaireFields", () => {
  test("maps questionnaire answers to CRM column names", () => {
    const f = promoQuestionnaireFields(base);
    expect(f.id).toBe("lead-1");
    expect(f.email).toBe("lead@example.com");
    expect(f.name).toBe("Marta Ruiz");
    expect(f.businessName).toBe("La Tostadora");
    expect(f.sector).toBe("Hostelería");
    expect(f.businessType).toBe("Web");
    expect(f.style).toBe("Minimalista y cálido");
    expect(f.palette).toBe("Tierra y crema");
    expect(f.valueProp).toBe("Cafetería de especialidad");
    expect(f.currentWebsite).toBe("https://latostadora.example");
  });
});

describe("formatQuestionnaireNotes", () => {
  test("serializes fields that have no dedicated column", () => {
    const n = formatQuestionnaireNotes(base);
    expect(n).toContain("Servicios: Café de especialidad, brunch, catering");
    expect(n).toContain("Tipografía: Serif elegante");
    expect(n).toContain("Referencias: https://ref.example");
    expect(n).toContain("Redes/presencia: @latostadora en Instagram");
    expect(n).toContain("Logo: promo/lead-1-logo.png");
    expect(n).toContain("Otros: Abrimos un segundo local en septiembre");
  });

  test("omits empty optional fields cleanly", () => {
    const n = formatQuestionnaireNotes({ ...base, references: "", social: "", logoPath: null, extra: "" });
    expect(n).not.toContain("Referencias:");
    expect(n).not.toContain("Redes/presencia:");
    expect(n).not.toContain("Logo:");
    expect(n).not.toContain("Otros:");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-questionnaire.test.ts`
Expected: FAIL — cannot find module `../promo-questionnaire`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-questionnaire.ts
export interface PromoQuestionnaireInput {
  leadId: string;
  email: string;
  name: string;
  businessName: string;
  phone?: string;
  /** A qué se dedica (descripción libre). */
  activity: string;
  sector: string;
  /** Servicios/productos principales. */
  services: string;
  /** Qué necesita: "Web" | "Ecommerce" | "No lo tengo claro". */
  need: string;
  currentWebsite?: string;
  style: string;
  colors: string;
  typography: string;
  references?: string;
  /** Redes / presencia actual. */
  social?: string;
  /** Ruta del logo ya subido al bucket (o null). */
  logoPath?: string | null;
  extra?: string;
}

/** Mapea a los nombres de campo que espera `saveLead` (SaveLeadInput). */
export function promoQuestionnaireFields(input: PromoQuestionnaireInput) {
  return {
    id: input.leadId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    sector: input.sector,
    businessName: input.businessName,
    businessType: input.need,
    style: input.style,
    palette: input.colors,
    valueProp: input.activity,
    currentWebsite: input.currentWebsite,
  };
}

/** Serializa en texto lo que no tiene columna propia en `imagina_leads`. */
export function formatQuestionnaireNotes(input: PromoQuestionnaireInput): string {
  const lines = [`Servicios: ${input.services}`, `Tipografía: ${input.typography}`];
  if (input.references?.trim()) lines.push(`Referencias: ${input.references.trim()}`);
  if (input.social?.trim()) lines.push(`Redes/presencia: ${input.social.trim()}`);
  if (input.logoPath) lines.push(`Logo: ${input.logoPath}`);
  if (input.extra?.trim()) lines.push(`Otros: ${input.extra.trim()}`);
  return lines.join("\n");
}
```

Luego añade a `src/lib/imagina-leads.ts` (usa `TABLE` y `BUCKET` ya definidos arriba en el fichero):

```ts
import type { PromoQuestionnaireInput } from "./promo-questionnaire";
import { promoQuestionnaireFields, formatQuestionnaireNotes } from "./promo-questionnaire";

/** Notas actuales del lead (para no pisar la marca de consentimiento). */
export async function getLeadNotes(leadId: string): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) return "";
  const { data } = await sb.from(TABLE).select("notes").eq("id", leadId).maybeSingle();
  return (data?.notes as string | null) ?? "";
}

/** Sube el logo que aporta el cliente al bucket privado; devuelve su ruta. */
export async function uploadPromoLogo(leadId: string, file: File): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `promo/${leadId}-logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/png", upsert: true });
  if (error) {
    console.error("[imagina-leads] uploadPromoLogo error:", error.message);
    return null;
  }
  return path;
}

/** Persiste las respuestas del cuestionario sobre el lead existente, sin pisar
 *  la nota de consentimiento (se antepone al bloque del cuestionario). */
export async function savePromoQuestionnaire(input: PromoQuestionnaireInput): Promise<void> {
  await saveLead(promoQuestionnaireFields(input));
  const prev = await getLeadNotes(input.leadId);
  const block = formatQuestionnaireNotes(input);
  const combined = prev ? `${prev}\n\n— Cuestionario —\n${block}` : block;
  await updateLeadField(input.leadId, "notes", combined);
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/lib/__tests__/promo-questionnaire.test.ts && npm run typecheck`
Expected: tests PASS (3), typecheck sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-questionnaire.ts src/lib/imagina-leads.ts src/lib/__tests__/promo-questionnaire.test.ts
git commit -m "feat(promo): mapeo y persistencia de las respuestas del cuestionario"
```

---

### Task 8: Server action del cuestionario (`promo-questionnaire-action.ts`)

Verifica el token, sube el logo si viene, y persiste. Sin token válido no se ata a ningún lead: crea uno nuevo con el email tecleado (no bloquea al usuario).

**Files:**
- Create: `src/lib/promo-questionnaire-action.ts`
- Test: `src/lib/__tests__/promo-questionnaire-action.test.ts`

**Interfaces:**
- Consumes: `verifyPromoToken` (`promo-token`), `savePromoQuestionnaire` + `uploadPromoLogo` (`imagina-leads`), `createWebhookLead` (`imagina-leads`), `PromoQuestionnaireInput` (`promo-questionnaire`).
- Produces: `submitPromoQuestionnaire(formData: FormData): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-questionnaire-action.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { verifyMock, saveMock, uploadMock, createMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  saveMock: vi.fn(),
  uploadMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("../promo-token", () => ({ verifyPromoToken: verifyMock }));
vi.mock("../imagina-leads", () => ({
  savePromoQuestionnaire: saveMock,
  uploadPromoLogo: uploadMock,
  createWebhookLead: createMock,
}));

import { submitPromoQuestionnaire } from "../promo-questionnaire-action";

function formFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const answers = () => formFor({
  token: "tok", leadId: "lead-1", email: "lead@example.com",
  name: "Marta", businessName: "La Tostadora", phone: "600111222",
  activity: "Cafetería", sector: "Hostelería", services: "Café",
  need: "Web", currentWebsite: "", style: "Minimalista", colors: "Tierra",
  typography: "Serif", references: "", social: "@lt", extra: "",
  website: "", formLoadedAt: String(Date.now() - 5000),
});

describe("submitPromoQuestionnaire", () => {
  beforeEach(() => {
    verifyMock.mockReset().mockReturnValue(true);
    saveMock.mockReset().mockResolvedValue(undefined);
    uploadMock.mockReset().mockResolvedValue(null);
    createMock.mockReset().mockResolvedValue({ ok: true, id: "new-lead" });
    process.env.PROMO_TOKEN_SECRET = "sec";
  });

  test("saves the questionnaire against the token's lead", async () => {
    const res = await submitPromoQuestionnaire(answers());
    expect(res.ok).toBe(true);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0].leadId).toBe("lead-1");
    expect(saveMock.mock.calls[0][0].sector).toBe("Hostelería");
  });

  test("with an invalid token, creates a fresh lead and still saves", async () => {
    verifyMock.mockReturnValue(false);
    const res = await submitPromoQuestionnaire(answers());
    expect(res.ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0].leadId).toBe("new-lead");
  });

  test("rejects the honeypot without saving", async () => {
    const fd = answers();
    fd.set("website", "bot");
    const res = await submitPromoQuestionnaire(fd);
    expect(res.ok).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-questionnaire-action.test.ts`
Expected: FAIL — cannot find module `../promo-questionnaire-action`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-questionnaire-action.ts
"use server";

import { z } from "zod";
import { verifyPromoToken } from "./promo-token";
import {
  savePromoQuestionnaire,
  uploadPromoLogo,
  createWebhookLead,
} from "./imagina-leads";
import type { PromoQuestionnaireInput } from "./promo-questionnaire";

const schema = z
  .object({
    token: z.string().default(""),
    leadId: z.string().default(""),
    email: z.email("Email inválido"),
    name: z.string().min(2, "Falta tu nombre"),
    businessName: z.string().min(1, "Falta el nombre del negocio"),
    phone: z.string().optional().default(""),
    activity: z.string().min(2, "Cuéntanos a qué te dedicas"),
    sector: z.string().min(1, "Elige un sector"),
    services: z.string().min(2, "Indica tus servicios"),
    need: z.string().min(1, "Elige qué necesitas"),
    currentWebsite: z.string().optional().default(""),
    style: z.string().min(1, "Elige un estilo"),
    colors: z.string().min(1, "Indica los colores"),
    typography: z.string().min(1, "Indica la tipografía"),
    references: z.string().optional().default(""),
    social: z.string().optional().default(""),
    extra: z.string().optional().default(""),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export async function submitPromoQuestionnaire(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse({ ...raw, formLoadedAt: Number(formData.get("formLoadedAt")) });
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos obligatorios." };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  // Determina el lead a actualizar: el del token si verifica; si no, uno nuevo.
  let leadId = d.leadId;
  const tokenOk = d.token && d.leadId && verifyPromoToken(d.leadId, email, d.token);
  if (!tokenOk) {
    const fresh = await createWebhookLead({
      email,
      name: d.name,
      phone: d.phone || null,
      channel: "promo-verano",
      campaign: "promo-verano-2026",
      notes: "Origen: cuestionario Promo Verano (sin token válido)",
    });
    leadId = fresh.id ?? email;
  }

  // Logo (best-effort): sólo si el usuario adjuntó un fichero real.
  let logoPath: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    logoPath = await uploadPromoLogo(leadId, logo);
  }

  const input: PromoQuestionnaireInput = {
    leadId,
    email,
    name: d.name,
    businessName: d.businessName,
    phone: d.phone || undefined,
    activity: d.activity,
    sector: d.sector,
    services: d.services,
    need: d.need,
    currentWebsite: d.currentWebsite || undefined,
    style: d.style,
    colors: d.colors,
    typography: d.typography,
    references: d.references || undefined,
    social: d.social || undefined,
    logoPath,
    extra: d.extra || undefined,
  };
  await savePromoQuestionnaire(input);
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-questionnaire-action.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-questionnaire-action.ts src/lib/__tests__/promo-questionnaire-action.test.ts
git commit -m "feat(promo): server action del cuestionario con verificación de token"
```

---

### Task 9: Control de frecuencia del popup (`promo-popup-storage.ts`)

Lógica pura (con `now` y `storage` inyectados) de "no volver a mostrar en N días". Testeable sin DOM.

**Files:**
- Create: `src/lib/promo-popup-storage.ts`
- Test: `src/lib/__tests__/promo-popup-storage.test.ts`

**Interfaces:**
- Produces:
  - `shouldShowPopup(now: number, frequencyDays: number, storage: Pick<Storage, "getItem">): boolean`
  - `markPopupSeen(now: number, storage: Pick<Storage, "setItem">): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/promo-popup-storage.test.ts
import { describe, expect, test } from "vitest";
import { shouldShowPopup, markPopupSeen } from "../promo-popup-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

const DAY = 864e5;

describe("promo popup frequency", () => {
  test("shows when never seen", () => {
    expect(shouldShowPopup(Date.now(), 7, fakeStorage())).toBe(true);
  });

  test("hides within the frequency window, shows after it", () => {
    const s = fakeStorage();
    const t0 = 1_700_000_000_000;
    markPopupSeen(t0, s);
    expect(shouldShowPopup(t0 + 3 * DAY, 7, s)).toBe(false);
    expect(shouldShowPopup(t0 + 8 * DAY, 7, s)).toBe(true);
  });

  test("shows again if the stored value is corrupt", () => {
    expect(shouldShowPopup(Date.now(), 7, fakeStorage({ dkb_promo_verano: "xxx" }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/promo-popup-storage.test.ts`
Expected: FAIL — cannot find module `../promo-popup-storage`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/promo-popup-storage.ts
const KEY = "dkb_promo_verano";

export function shouldShowPopup(
  now: number,
  frequencyDays: number,
  storage: Pick<Storage, "getItem">,
): boolean {
  const raw = storage.getItem(KEY);
  if (!raw) return true;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return true;
  return now - ts > frequencyDays * 864e5;
}

export function markPopupSeen(now: number, storage: Pick<Storage, "setItem">): void {
  storage.setItem(KEY, String(now));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/promo-popup-storage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/promo-popup-storage.ts src/lib/__tests__/promo-popup-storage.test.ts
git commit -m "feat(promo): control de frecuencia del popup (localStorage)"
```

---

### Task 10: Componente del popup (`PromoPopup.tsx`)

Modal centrado client, mostrado sitewide tras `PROMO.showDelayMs` si la promo está activa, la frecuencia lo permite y no estamos en la ruta del cuestionario. Consentimiento obligatorio (botón deshabilitado sin marcar). Estados: formulario / éxito / error.

**Files:**
- Create: `src/components/promo/PromoPopup.tsx`
- Test: `src/components/promo/__tests__/PromoPopup.test.tsx`

**Interfaces:**
- Consumes: `subscribePromo` (`@/lib/promo-subscribe-action`), `shouldShowPopup` + `markPopupSeen` (`@/lib/promo-popup-storage`), `isPromoActive` + `PROMO` (`@/lib/promo-config`), `usePathname` (`next/navigation`).
- Produces: `export function PromoPopup(): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/promo/__tests__/PromoPopup.test.tsx
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const { subscribeMock } = vi.hoisted(() => ({ subscribeMock: vi.fn() }));
vi.mock("@/lib/promo-subscribe-action", () => ({ subscribePromo: subscribeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { PromoPopup } from "@/components/promo/PromoPopup";

describe("PromoPopup", () => {
  beforeEach(() => {
    subscribeMock.mockReset().mockResolvedValue({ ok: true });
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  function showPopup() {
    render(<PromoPopup />);
    vi.advanceTimersByTime(9000); // pasa el showDelayMs
  }

  test("submit is disabled until consent is checked", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    const submit = screen.getByRole("button", { name: /quiero la info/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/acepto/i));
    expect(submit).toBeEnabled();
  });

  test("submitting a valid email calls the action and shows success", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "lead@example.com" } });
    fireEvent.click(screen.getByLabelText(/acepto/i));
    fireEvent.click(screen.getByRole("button", { name: /quiero la info/i }));
    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/promo/__tests__/PromoPopup.test.tsx`
Expected: FAIL — cannot find module `@/components/promo/PromoPopup`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/promo/PromoPopup.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { subscribePromo } from "@/lib/promo-subscribe-action";
import { shouldShowPopup, markPopupSeen } from "@/lib/promo-popup-storage";
import { PROMO, isPromoActive } from "@/lib/promo-config";

type View = "hidden" | "form" | "success";

export function PromoPopup() {
  const pathname = usePathname();
  const [view, setView] = useState<View>("hidden");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadedAt = useRef(0);

  useEffect(() => {
    // No mostrar en la ruta del cuestionario, ni fuera de la ventana de promo,
    // ni si la frecuencia lo impide.
    if (pathname?.startsWith(PROMO.questionnairePath)) return;
    if (!isPromoActive(Date.now())) return;
    if (!shouldShowPopup(Date.now(), PROMO.frequencyDays, window.localStorage)) return;
    const id = window.setTimeout(() => {
      loadedAt.current = Date.now();
      setView("form");
    }, PROMO.showDelayMs);
    return () => window.clearTimeout(id);
  }, [pathname]);

  if (view === "hidden") return null;

  const dismiss = () => {
    markPopupSeen(Date.now(), window.localStorage);
    setView("hidden");
  };

  const onSubmit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    startTransition(async () => {
      const res = await subscribePromo(formData);
      if (res.ok) {
        markPopupSeen(Date.now(), window.localStorage);
        setView("success");
      } else {
        setError(res.error ?? "No se pudo completar. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promoción de verano"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md rounded-2xl border border-border-strong/80 bg-bg-elevated p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:p-8">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-fg-muted hover:text-fg"
        >
          ✕
        </button>

        {view === "success" ? (
          <div className="text-center">
            <p className="text-2xl">📩</p>
            <h2 className="mt-2 text-xl font-bold text-fg">¡Listo!</h2>
            <p className="mt-2 text-sm text-fg-muted">
              Revisa tu correo: te hemos enviado los detalles de la promoción de verano.
            </p>
            <button
              type="button"
              onClick={() => setView("hidden")}
              className="mt-5 h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form action={onSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                Promo Verano · -{PROMO.discountPct}%
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-fg">
                Este verano, tu web o ecommerce al {PROMO.discountPct}% 🌴
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Déjanos tu email y te enviamos toda la info de la promoción.
              </p>
            </div>

            {/* Honeypot: invisible para humanos */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <input
              type="email"
              name="email"
              required
              placeholder="Tu email"
              className="h-11 rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
            />

            <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                He leído y acepto la{" "}
                <Link href="/privacidad" className="font-semibold text-accent hover:underline">
                  política de privacidad
                </Link>{" "}
                y el envío de comunicaciones comerciales.
              </span>
            </label>

            {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={!consent || pending}
              className="h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Quiero la info"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/promo/__tests__/PromoPopup.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/promo/PromoPopup.tsx src/components/promo/__tests__/PromoPopup.test.tsx
git commit -m "feat(promo): componente del popup con consentimiento obligatorio"
```

---

### Task 11: Página y wizard del cuestionario (`/promo-verano/cuestionario`)

Página que lee el token (`?t=`) y renderiza el wizard multipaso. El wizard mantiene el estado en un único objeto + contador de paso (patrón `PreviewWizard.tsx`) y envía todo a `submitPromoQuestionnaire`. El logo se envía como `File` (input `type=file`).

**Files:**
- Create: `src/app/(site)/promo-verano/cuestionario/page.tsx` (Server Component; parsea `searchParams`, `export const metadata`)
- Create: `src/app/(site)/promo-verano/cuestionario/_components/PromoWizard.tsx` (client)
- Test: `src/app/(site)/promo-verano/cuestionario/_components/__tests__/PromoWizard.test.tsx`

**Interfaces:**
- Consumes: `submitPromoQuestionnaire` (`@/lib/promo-questionnaire-action`).
- `page.tsx` produce el default export (async) que lee `searchParams: Promise<{ t?: string }>` (Next 16: `searchParams` es Promise) y pasa `token` a `<PromoWizard token={token} />`.
- `PromoWizard` produce `export function PromoWizard({ token }: { token: string }): JSX.Element`.

Preguntas (15) → nombres de campo del form:
`name, businessName, phone, activity, sector, services, need, currentWebsite, style, colors, typography, logo (file), references, social, extra`. El wizard emite además `token`, `leadId` (vacío por ahora; el server usa el token), honeypot `website` y `formLoadedAt`.

> Nota: el token está atado a (leadId, email) y el server verifica `verifyPromoToken(leadId, email, token)`. Por eso el CTA del email (Task 5) ya lleva `?t=<token>&lid=<leadId>&em=<email>`, y `page.tsx` lee los tres. No hay que tocar `buildPromoEmail` aquí: su firma e enlace ya se definieron completos en la Task 5.

- [ ] **Step 1: Write the failing test** (smoke test del flujo de pasos y envío)

```tsx
// .../_components/__tests__/PromoWizard.test.tsx
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const { submitMock } = vi.hoisted(() => ({ submitMock: vi.fn() }));
vi.mock("@/lib/promo-questionnaire-action", () => ({ submitPromoQuestionnaire: submitMock }));

import { PromoWizard } from "../PromoWizard";

describe("PromoWizard", () => {
  beforeEach(() => { submitMock.mockReset().mockResolvedValue({ ok: true }); });
  afterEach(cleanup);

  test("renders the first question and can advance", () => {
    render(<PromoWizard token="tok" leadId="lead-1" email="lead@example.com" />);
    expect(screen.getByText(/tu nombre|cómo te llamas/i)).toBeInTheDocument();
    // el botón de avanzar existe
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  test("shows a thank-you state after a successful submit", async () => {
    render(<PromoWizard token="tok" leadId="lead-1" email="lead@example.com" />);
    // Salta al final rellenando lo mínimo vía el botón "enviar" simulado:
    // el wizard expone un submit final; forzamos el envío del form.
    const form = screen.getByTestId("promo-wizard-form");
    fireEvent.submit(form);
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(await screen.findByText(/gracias/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/(site)/promo-verano/cuestionario/_components/__tests__/PromoWizard.test.tsx"`
Expected: FAIL — cannot find module `../PromoWizard`.

- [ ] **Step 3: Write minimal implementation**

`page.tsx`:

```tsx
// src/app/(site)/promo-verano/cuestionario/page.tsx
import type { Metadata } from "next";
import { PromoWizard } from "./_components/PromoWizard";

export const metadata: Metadata = {
  title: "Cuéntanos sobre tu negocio · Promo Verano -50% | dinkbit",
  description: "Responde unas preguntas y ponemos en marcha tu web o ecommerce con el 50% de descuento de verano.",
  robots: { index: false, follow: false },
};

export default async function PromoQuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; lid?: string; em?: string }>;
}) {
  const { t = "", lid = "", em = "" } = await searchParams;
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <PromoWizard token={t} leadId={lid} email={em} />
    </section>
  );
}
```

`PromoWizard.tsx` (patrón single-state + step counter; cada paso es un fragmento; el `<form>` contiene TODOS los campos como `hidden`/inputs para que el server action reciba el FormData completo; los pasos visibles editan el estado y sincronizan los inputs ocultos). Implementación mínima que satisface el test y cubre las 15 preguntas:

```tsx
// src/app/(site)/promo-verano/cuestionario/_components/PromoWizard.tsx
"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { submitPromoQuestionnaire } from "@/lib/promo-questionnaire-action";

interface State {
  name: string; businessName: string; phone: string;
  activity: string; sector: string; services: string; need: string; currentWebsite: string;
  style: string; colors: string; typography: string; references: string; social: string; extra: string;
}

const EMPTY: State = {
  name: "", businessName: "", phone: "", activity: "", sector: "", services: "",
  need: "", currentWebsite: "", style: "", colors: "", typography: "", references: "",
  social: "", extra: "",
};

const SECTORS = ["Hostelería", "Salud", "Retail / Tienda", "Servicios", "Belleza", "Educación", "Otro"];
const NEEDS = ["Web", "Ecommerce", "No lo tengo claro"];
const STYLES = ["Moderno", "Minimalista", "Elegante", "Atrevido", "Cercano"];

interface WizardStep {
  label: string;
  field: keyof State | "logo";
  required: boolean;
  area?: boolean;
  options?: string[];
  file?: boolean;
}

export function PromoWizard({ token, leadId, email }: { token: string; leadId: string; email: string }) {
  const [state, setState] = useState<State>(EMPTY);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadedAt = useRef(Date.now());
  const logoRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof State) => (v: string) => setState((s) => ({ ...s, [k]: v }));

  // Definición de pasos (1 pregunta o grupo por paso).
  const steps = useMemo<WizardStep[]>(
    () => [
      { label: "¿Cómo te llamas?", field: "name", required: true },
      { label: "Nombre de tu negocio o marca", field: "businessName", required: true },
      { label: "Teléfono (opcional)", field: "phone", required: false },
      { label: "¿A qué se dedica tu negocio?", field: "activity", required: true, area: true },
      { label: "Sector", field: "sector", required: true, options: SECTORS },
      { label: "¿Qué servicios o productos ofreces?", field: "services", required: true, area: true },
      { label: "¿Qué necesitas?", field: "need", required: true, options: NEEDS },
      { label: "¿Tienes web actual? (URL, opcional)", field: "currentWebsite", required: false },
      { label: "Estilo gráfico", field: "style", required: true, options: STYLES },
      { label: "Colores de marca (o 'ayúdame')", field: "colors", required: true },
      { label: "Tipografía (o 'que la elijáis vosotros')", field: "typography", required: true },
      { label: "Sube tu logo (opcional)", field: "logo", required: false, file: true },
      { label: "Webs de referencia que te gusten (opcional)", field: "references", required: false, area: true },
      { label: "Redes / presencia actual (opcional)", field: "social", required: false },
      { label: "¿Algo más que debamos saber? (opcional)", field: "extra", required: true, area: true },
    ],
    [],
  );

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const value = current.file ? "" : (state as Record<string, string>)[current.field] ?? "";
  const canAdvance = !current.required || current.file || Boolean(value.trim());

  const submit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    startTransition(async () => {
      const res = await submitPromoQuestionnaire(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "No se pudo enviar. Revisa los campos.");
    });
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="mt-3 text-2xl font-black text-fg">¡Gracias!</h1>
        <p className="mt-2 text-fg-muted">
          Hemos recibido tu información. Nuestro equipo se pondrá en contacto contigo muy pronto
          para arrancar tu web con el 50% de descuento.
        </p>
      </div>
    );
  }

  return (
    <form
      action={submit}
      data-testid="promo-wizard-form"
      encType="multipart/form-data"
      className="flex flex-col gap-6"
    >
      {/* Identidad del lead + anti-spam (ocultos) */}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="email" value={email} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {/* Todas las respuestas van como hidden para enviar el FormData completo */}
      {Object.entries(state).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {/* El logo es el único input real de tipo file */}
      <input ref={logoRef} type="file" name="logo" accept="image/*" className={current.file ? "" : "hidden"} />

      <div>
        <p className="text-xs font-semibold text-fg-muted">Paso {step + 1} de {steps.length}</p>
        <h1 className="mt-2 text-xl font-bold text-fg">{current.label}</h1>

        {!current.file && current.options && (
          <div className="mt-4 flex flex-wrap gap-2">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set(current.field as keyof State)(opt)}
                className={`h-10 rounded-lg border px-4 text-sm ${
                  (state as Record<string, string>)[current.field] === opt
                    ? "border-accent bg-accent text-white"
                    : "border-border-strong text-fg hover:bg-bg-subtle"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {!current.file && !current.options && current.area && (
          <textarea
            value={value}
            onChange={(e) => set(current.field as keyof State)(e.target.value)}
            rows={4}
            className="mt-4 w-full rounded-lg border border-border-strong bg-bg-subtle p-3 text-sm text-fg outline-none focus:border-accent"
          />
        )}

        {!current.file && !current.options && !current.area && (
          <input
            type="text"
            value={value}
            onChange={(e) => set(current.field as keyof State)(e.target.value)}
            className="mt-4 h-11 w-full rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
          />
        )}
      </div>

      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-11 rounded-lg border border-border-strong px-5 text-sm font-semibold text-fg disabled:opacity-40"
        >
          Atrás
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={pending || !canAdvance}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={!canAdvance}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Siguiente
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run "src/app/(site)/promo-verano" && npm run typecheck`
Expected: PASS (wizard 2 tests), typecheck sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(site)/promo-verano"
git commit -m "feat(promo): página y wizard del cuestionario"
```

---

### Task 12: Montaje, env y verificación end-to-end

Monta el popup en el layout del sitio, documenta las env nuevas y verifica el flujo completo.

**Files:**
- Modify: `src/app/(site)/layout.tsx` (montar `<PromoPopup />`)
- Modify: `.env.example` (añadir claves)

**Interfaces:**
- Consumes: `PromoPopup` (`@/components/promo/PromoPopup`).

- [ ] **Step 1: Montar el popup en el layout**

En `src/app/(site)/layout.tsx`, importa y renderiza el popup junto a `WhatsAppBubble`:

```tsx
import { PromoPopup } from "@/components/promo/PromoPopup";
// ...
      <Footer />
      <WhatsAppBubble />
      <PromoPopup />
    </>
```

- [ ] **Step 2: Documentar env nuevas** en `.env.example` (añadir al final):

```bash
# Mailchimp — alta de emails de la promo en la audiencia (single opt-in)
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
MAILCHIMP_SERVER_PREFIX=us21
# Firma HMAC de los tokens del cuestionario de la promo. Si falta, cae a RESEND_API_KEY.
PROMO_TOKEN_SECRET=
```

- [ ] **Step 3: Suite completa**

Run: `npm test && npm run typecheck`
Expected: TODO en verde, incluyendo los tests nuevos de las Tasks 1–11 y los ya existentes.

- [ ] **Step 4: Build de producción**

Run: `npm run build`
Expected: build correcto; la ruta `/promo-verano/cuestionario` aparece en el listado de rutas.

- [ ] **Step 5: Verificación funcional (skill `verify` o `run`)**

Arranca `npm run dev` y comprueba en el navegador:
1. En la home, tras ~8 s, aparece el popup. El botón "Quiero la info" está deshabilitado hasta marcar el consentimiento.
2. Enviar un email de prueba → estado "Revisa tu correo" y (con envs configuradas) el lead aparece en `/panel` con `campaign = promo-verano-2026`.
3. Abrir `/promo-verano/cuestionario?t=x&lid=y&em=z` → el wizard renderiza los 15 pasos; el popup NO aparece en esta ruta.
4. Completar el wizard → estado "¡Gracias!" y el lead se actualiza con los datos en `/panel`.
5. Recargar la home → el popup NO reaparece (control de frecuencia).

> Sin claves de Mailchimp/Resend el flujo sigue funcionando: el lead se guarda en Supabase y en consola se ven los avisos best-effort ("[mailchimp] not configured", "[promo] Missing RESEND_API_KEY").

- [ ] **Step 6: Commit**

```bash
git add "src/app/(site)/layout.tsx" .env.example
git commit -m "feat(promo): monta el popup sitewide y documenta las env"
```

---

## Notas de despliegue (fuera del código)

- Configurar en Vercel las envs: `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX`, `PROMO_TOKEN_SECRET`.
- Verificar que `hola@dinkbit.es` está como remitente verificado en Resend (ya se usa en la oferta del preview).
- El copy exacto de la promo (qué incluye el 50%, letra pequeña) puede refinarse en `promo-config.ts` / `promo-email.ts` sin tocar la lógica.

## Fuera de alcance (YAGNI)

- Drip/cron de emails (los correos son transaccionales, al enviar).
- Doble opt-in.
- Columnas nuevas en `imagina_leads` para el cuestionario (se serializa en `notes`; el logo va al bucket y su ruta queda en `notes`). Si el equipo lo pide, se evalúa una migración + render en el panel en un plan aparte.
- Reutilización del wizard de `/imagina-tu-web`.
