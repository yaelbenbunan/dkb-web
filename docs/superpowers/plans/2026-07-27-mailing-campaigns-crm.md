# Mailing / Campañas desde el CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Sección `/panel/campanas` para componer campañas de email por bloques (generadas/editadas con IA), elegir destinatarios desde el CRM con consentimiento, y enviarlas por lotes vía Resend con baja y trazabilidad por campaña.

**Architecture:** Email = lista ordenada de bloques email-safe. IA devuelve/edita bloques como JSON validado con Zod. Render a HTML table-based + inline CSS. Datos en Supabase (`campaigns`, `campaign_recipients`, `email_templates`, columna `consent`). Envío por `resend.batch.send`; estado por destinatario vía el webhook de Resend existente. Baja con token HMAC.

**Tech Stack:** Next.js App Router (server actions + route handlers, runtime nodejs), Supabase (service role), OpenAI (`gpt-4o` structured JSON), Resend v6 batch, Zod, Vitest, `node:crypto`.

## Global Constraints

- **Emailable = `consent === true` AND `email` no nulo AND `email_status NOT IN ('bounced','complained')`.** El envío excluye el resto SIEMPRE.
- Todo email incluye **footer con baja** (`/api/unsubscribe?token=…`) e identidad dinkbit. El bloque `footer` es obligatorio y no eliminable.
- HTML generado por IA/editor se previsualiza **solo en `<iframe sandbox>`** (sin scripts); nunca se inyecta como markup del panel.
- Salida de IA **validada con Zod** antes de usarse; si no valida → reintento (1) y luego error controlado. Nunca se ejecuta como HTML del panel.
- Render email-safe: tablas + estilos inline, escape de todo texto de usuario (mismo enfoque que `src/lib/kit-digital-2026-email.ts`).
- `from_email` validado contra `ALLOWED_SENDERS` (por defecto `["hola@dinkbit.es"]`).
- Persistencia best-effort (service role); nunca lanza al usuario.
- Lote de envío Resend: máx **100** destinatarios por llamada `resend.batch.send`.
- Todo bajo `/panel` (auth por `src/proxy.ts`, matcher `/panel/:path*` ya cubre subrutas).
- Comandos: tests `npx vitest run`, tipos `npx tsc --noEmit`, build `npm run build`.

## Prerequisito (migración SQL — la corre el usuario)

```sql
alter table imagina_leads add column if not exists consent boolean;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text, subject text, from_email text,
  status text not null default 'draft',
  template_id uuid, blocks jsonb not null default '[]',
  concept text, sent_at timestamptz, recipients_total int default 0
);
create table if not exists campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  lead_id uuid not null, email text not null, message_id text,
  status text not null default 'pending',
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index if not exists campaign_recipients_message_id_idx on campaign_recipients (message_id);
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null, description text,
  blocks jsonb not null, is_builtin boolean not null default false
);
```

Los tests mockean Supabase; la migración es necesaria en producción.

---

## PHASE A — Primitivas de dominio (backend, testable)

### Task 1: `campaign-blocks.ts` — tipos + esquemas Zod

**Files:** Create `src/lib/campaign-blocks.ts`; Test `src/lib/__tests__/campaign-blocks.test.ts`

**Interfaces (Produces):**
- `Block` union type + `blockSchema` (Zod), `blocksSchema = z.array(blockSchema)`.
- `campaignStyleSchema` → `{ accentHex: string; fontStack?: string }`.
- `DEFAULT_STYLE`, `DEFAULT_FOOTER_BLOCK`, `newBlock(type)` factory.

- [ ] **Step 1: Test que falla**

```ts
import { describe, expect, test } from "vitest";
import { blocksSchema, newBlock, DEFAULT_STYLE } from "../campaign-blocks";

describe("campaign-blocks", () => {
  test("valida un arreglo de bloques correcto", () => {
    const blocks = [
      { id: "a", type: "hero", props: { title: "Hola" } },
      { id: "b", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "c", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
    ];
    expect(blocksSchema.safeParse(blocks).success).toBe(true);
  });
  test("rechaza tipo desconocido", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "nope", props: {} }]).success).toBe(false);
  });
  test("rechaza button sin url", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "button", props: { label: "Ir" } }]).success).toBe(false);
  });
  test("newBlock genera bloque válido con id", () => {
    const b = newBlock("paragraph");
    expect(b.type).toBe("paragraph");
    expect(typeof b.id).toBe("string");
    expect(blocksSchema.safeParse([b]).success).toBe(true);
  });
  test("DEFAULT_STYLE trae accent de marca", () => {
    expect(DEFAULT_STYLE.accentHex).toMatch(/^#?[0-9a-fA-F]{6}$/);
  });
});
```

- [ ] **Step 2: Correr → falla** `npx vitest run src/lib/__tests__/campaign-blocks.test.ts`

- [ ] **Step 3: Implementar**

```ts
import { z } from "zod";

const hero = z.object({ eyebrow: z.string().optional(), title: z.string(), body: z.string().optional(), accent: z.string().optional() });
const paragraph = z.object({ text: z.string(), align: z.enum(["left","center"]).optional(), size: z.enum(["sm","md","lg"]).optional() });
const checklist = z.object({ label: z.string().optional(), items: z.array(z.string()).min(1), accent: z.string().optional() });
const button = z.object({ label: z.string(), url: z.string().url(), accent: z.string().optional() });
const image = z.object({ src: z.string().url(), alt: z.string().optional(), href: z.string().url().optional() });
const divider = z.object({});
const footer = z.object({ orgLine: z.string(), unsubscribe: z.literal(true) });

const propsByType = { hero, paragraph, checklist, button, image, divider, footer } as const;
export type BlockType = keyof typeof propsByType;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), props: hero }),
  z.object({ id: z.string(), type: z.literal("paragraph"), props: paragraph }),
  z.object({ id: z.string(), type: z.literal("checklist"), props: checklist }),
  z.object({ id: z.string(), type: z.literal("button"), props: button }),
  z.object({ id: z.string(), type: z.literal("image"), props: image }),
  z.object({ id: z.string(), type: z.literal("divider"), props: divider }),
  z.object({ id: z.string(), type: z.literal("footer"), props: footer }),
]);
export type Block = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema);

export const campaignStyleSchema = z.object({
  accentHex: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  fontStack: z.string().optional(),
});
export type CampaignStyle = z.infer<typeof campaignStyleSchema>;

export const DEFAULT_STYLE: CampaignStyle = {
  accentHex: "#187bef",
  fontStack: "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif",
};
export const DEFAULT_FOOTER_BLOCK: Block = {
  id: "footer", type: "footer", props: { orgLine: "dinkbit · www.dinkbit.es · hola@dinkbit.es", unsubscribe: true },
};

// id sin Date.now()/random prohibidos en workflows, pero aquí (app) sí valen.
export function newBlock(type: BlockType): Block {
  const id = `b_${Math.random().toString(36).slice(2, 9)}`;
  const defaults: Record<BlockType, unknown> = {
    hero: { title: "Título", body: "" },
    paragraph: { text: "Texto…" },
    checklist: { items: ["Punto 1"] },
    button: { label: "Botón", url: "https://www.dinkbit.es" },
    image: { src: "https://www.dinkbit.es/img/logo/dinkbit-email.png" },
    divider: {},
    footer: DEFAULT_FOOTER_BLOCK.props,
  };
  return blockSchema.parse({ id, type, props: defaults[type] });
}
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(campanas): tipos y validación Zod de bloques de email`

---

### Task 2: `campaign-render.ts` — render a HTML email-safe

**Files:** Create `src/lib/campaign-render.ts`; Test `src/lib/__tests__/campaign-render.test.ts`

**Interfaces:**
- Consumes: `Block`, `CampaignStyle`, `DEFAULT_STYLE` (Task 1).
- Produces: `renderCampaignEmail(blocks: Block[], style: CampaignStyle, ctx: { preheader?: string; unsubscribeUrl: string }): { html: string; text: string }`.

- [ ] **Step 1: Test que falla**

```ts
import { describe, expect, test } from "vitest";
import { renderCampaignEmail } from "../campaign-render";
import { DEFAULT_STYLE } from "../campaign-blocks";

const ctx = { preheader: "Hola", unsubscribeUrl: "https://www.dinkbit.es/api/unsubscribe?token=T" };

describe("renderCampaignEmail", () => {
  test("renderiza hero + button + footer con baja", () => {
    const { html, text } = renderCampaignEmail([
      { id: "1", type: "hero", props: { title: "Bienvenido", body: "Cuerpo" } },
      { id: "2", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "3", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).toContain("Bienvenido");
    expect(html).toContain("https://x.com");
    expect(html).toContain(ctx.unsubscribeUrl);
    expect(html.toLowerCase()).toContain("baja");
    expect(html).toContain("<table"); // email-safe table-based
    expect(text).toContain("Bienvenido");
  });
  test("escapa HTML del texto (anti-inyección)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "paragraph", props: { text: "<script>alert(1)</script>" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
  test("la url del botón se sanea (solo http/https)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "button", props: { label: "x", url: "javascript:alert(1)" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("javascript:");
  });
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar** (mismo estilo table-based que `kit-digital-2026-email.ts`):

```ts
import type { Block, CampaignStyle } from "./campaign-blocks";

function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function safeUrl(raw: string): string {
  try { const u = new URL(raw); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : "#"; }
  catch { return "#"; }
}
const SIZE: Record<string,string> = { sm: "14px", md: "16px", lg: "20px" };

export function renderCampaignEmail(
  blocks: Block[],
  style: CampaignStyle,
  ctx: { preheader?: string; unsubscribeUrl: string },
): { html: string; text: string } {
  const accent = style.accentHex.startsWith("#") ? style.accentHex : `#${style.accentHex}`;
  const font = style.fontStack ?? "Helvetica,Arial,sans-serif";
  const textLines: string[] = [];

  const blockHtml = (b: Block): string => {
    switch (b.type) {
      case "hero": {
        const a = b.props.accent ?? accent;
        textLines.push(b.props.title, b.props.body ?? "");
        return `<tr><td style="padding:24px 36px 6px;">
          ${b.props.eyebrow ? `<p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${a};text-transform:uppercase;">${esc(b.props.eyebrow)}</p>` : ""}
          <h1 style="margin:0;font-size:28px;line-height:1.15;color:#0f172a;font-weight:900;">${esc(b.props.title)}</h1>
          ${b.props.body ? `<p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#475569;">${esc(b.props.body)}</p>` : ""}
        </td></tr>`;
      }
      case "paragraph": {
        textLines.push(b.props.text);
        return `<tr><td style="padding:10px 36px;font-size:${SIZE[b.props.size ?? "md"]};line-height:1.55;color:#334155;text-align:${b.props.align ?? "left"};">${esc(b.props.text)}</td></tr>`;
      }
      case "checklist": {
        const a = b.props.accent ?? accent;
        b.props.items.forEach((i) => textLines.push(`· ${i}`));
        const rows = b.props.items.map((i) => `<tr><td style="padding:6px 0;font-size:15px;color:#334155;">✓ ${esc(i)}</td></tr>`).join("");
        return `<tr><td style="padding:10px 36px;">${b.props.label ? `<p style="margin:0 0 6px;font-size:12px;font-weight:800;color:${a};text-transform:uppercase;">${esc(b.props.label)}</p>` : ""}<table role="presentation" width="100%">${rows}</table></td></tr>`;
      }
      case "button": {
        const a = b.props.accent ?? accent;
        const url = safeUrl(b.props.url);
        textLines.push(`${b.props.label}: ${url}`);
        return `<tr><td style="padding:20px 36px;text-align:center;"><a href="${url}" style="display:inline-block;background:${a};color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:14px 30px;border-radius:12px;">${esc(b.props.label)}</a></td></tr>`;
      }
      case "image": {
        const src = safeUrl(b.props.src);
        const img = `<img src="${src}" alt="${esc(b.props.alt ?? "")}" style="display:block;max-width:100%;border:0;" />`;
        return `<tr><td style="padding:10px 36px;text-align:center;">${b.props.href ? `<a href="${safeUrl(b.props.href)}">${img}</a>` : img}</td></tr>`;
      }
      case "divider":
        return `<tr><td style="padding:8px 36px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>`;
      case "footer":
        textLines.push("", b.props.orgLine, `Darse de baja: ${ctx.unsubscribeUrl}`);
        return `<tr><td style="padding:22px 36px 28px;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;">
          <p style="margin:0 0 6px;">${esc(b.props.orgLine)}</p>
          <p style="margin:0;"><a href="${esc(ctx.unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Darse de baja</a></p>
        </td></tr>`;
    }
  };

  const body = blocks.map(blockHtml).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${font};">
${ctx.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(ctx.preheader)}</div>` : ""}
<table role="presentation" width="100%" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" style="width:600px;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border-top:6px solid ${accent};">
${body}
</table></td></tr></table></body></html>`;
  return { html, text: textLines.filter((l) => l !== undefined).join("\n") };
}
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(campanas): render de bloques a HTML email-safe`

---

### Task 3: baja — `unsubscribe-token.ts` + `/api/unsubscribe`

**Files:** Create `src/lib/unsubscribe-token.ts`, `src/app/api/unsubscribe/route.ts`; Test `src/lib/__tests__/unsubscribe-token.test.ts`. Modify `src/lib/imagina-leads.ts` (añadir `setLeadConsent`).

**Interfaces:**
- `mintUnsubscribeToken(leadId): string`, `verifyUnsubscribeToken(leadId, token): boolean` (patrón HMAC de `promo-token.ts`, TTL largo p.ej. 180 días).
- `setLeadConsent(leadId: string, consent: boolean): Promise<void>` en `imagina-leads.ts`.

- [ ] **Step 1: Test del token (falla)** — firma válida ✓, token manipulado ✗, otro leadId ✗, expirado ✗. (Copia el estilo de un test HMAC: setea `process.env.PROMO_TOKEN_SECRET="k"` en beforeEach.)

```ts
import { beforeEach, describe, expect, test } from "vitest";
import { mintUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token";
beforeEach(() => { process.env.PROMO_TOKEN_SECRET = "test-secret"; });
describe("unsubscribe-token", () => {
  test("válido para el mismo lead", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-1", t)).toBe(true);
  });
  test("inválido para otro lead", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-2", t)).toBe(false);
  });
  test("token manipulado → inválido", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-1", t + "x")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar `unsubscribe-token.ts`** (adaptado de `promo-token.ts`, firma `${leadId}.${expiry}`):

```ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
const TTL_MS = 180 * 24 * 60 * 60 * 1000;
function secret(): string | null { return process.env.PROMO_TOKEN_SECRET ?? process.env.RESEND_API_KEY ?? null; }
function sign(payload: string): string | null { const k = secret(); return k ? createHmac("sha256", k).update(payload).digest("hex") : null; }
export function mintUnsubscribeToken(leadId: string): string {
  const expiry = Date.now() + TTL_MS; const sig = sign(`${leadId}.${expiry}`);
  return sig ? `${expiry}.${sig}` : "";
}
export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const dot = token.indexOf("."); if (dot < 0) return false;
  const expiry = Number(token.slice(0, dot)); const sig = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  const expected = sign(`${leadId}.${expiry}`);
  if (!expected || sig.length !== expected.length) return false;
  try { return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")); } catch { return false; }
}
```

- [ ] **Step 4: Añadir `setLeadConsent` a `imagina-leads.ts`:**

```ts
export async function setLeadConsent(leadId: string, consent: boolean): Promise<void> {
  const sb = getSupabaseAdmin(); if (!sb) return;
  const { error } = await sb.from(TABLE).update({ consent }).eq("id", leadId);
  if (error) console.error("[imagina-leads] setLeadConsent error:", error.message);
}
```

- [ ] **Step 5: Ruta `/api/unsubscribe/route.ts`:**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { setLeadConsent } from "@/lib/imagina-leads";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function page(msg: string) {
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;text-align:center;padding:64px 20px;"><h1 style="font-size:22px;">${msg}</h1><p><a href="https://www.dinkbit.es" style="color:#187bef;">Volver a dinkbit.es</a></p></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!id || !verifyUnsubscribeToken(id, token)) return page("Enlace de baja no válido o caducado.");
  await setLeadConsent(id, false);
  return page("Te has dado de baja. No recibirás más comunicaciones. 👋");
}
```

Nota: el enlace de baja se construye como `/api/unsubscribe?id=<leadId>&token=<token>`; el render inyecta esa URL por `ctx.unsubscribeUrl`.

- [ ] **Step 6: Correr token test → pasa; `npx tsc --noEmit` limpio.** **Step 7: Commit** `feat(campanas): baja con token firmado + endpoint /api/unsubscribe`

---

### Task 4: capa Supabase de campañas — `campaigns.ts`

**Files:** Create `src/lib/campaigns.ts`; Test `src/lib/__tests__/campaigns.test.ts`. Modify `src/lib/imagina-leads.ts` (`setCampaignRecipientStatusByMessageId`).

**Interfaces (Produces en `campaigns.ts`):**
- `createCampaign(input): Promise<{id}|null>`, `updateCampaign(id, patch): Promise<void>`, `getCampaign(id)`, `listCampaigns()`.
- `listEmailTemplates()`, `saveEmailTemplate({name, description, blocks}): Promise<{id}|null>`, `getBuiltinTemplates()` (sembradas en código si la tabla está vacía).
- `insertCampaignRecipients(rows): Promise<void>`, `setRecipientMessageId(...)`, `setCampaignStatus(id, status)`.
- En `imagina-leads.ts`: `setCampaignRecipientStatusByMessageId(messageId, status): Promise<number>` (update por `message_id` en tabla `campaign_recipients`) y `listEmailableLeads(filter)` (consulta leads con `consent=true`, email no nulo, `email_status` no en bounced/complained, + filtros opcionales de status/campaign/channel).

Los tests usan el fake client de Supabase (patrón de `imagina-leads-email.test.ts`) para verificar payloads y filtros clave. Detalle de implementación: todas las funciones `getSupabaseAdmin()`-guarded, best-effort.

- [ ] **Step 1-5:** TDD por función. Tests mínimos:
  - `listEmailableLeads` construye el filtro correcto (`.eq("consent", true)`, excluye email nulo y estados rebotados) — verificar con fake client que registra los `.eq()/.not()` aplicados.
  - `insertCampaignRecipients` inserta las filas con `status:"pending"`.
  - `setCampaignRecipientStatusByMessageId` actualiza por `message_id` y devuelve nº filas.
  - `saveEmailTemplate` inserta con `is_builtin:false`.

(La implementación sigue el patrón exacto de `createWebhookLead`/`setLeadEmailStatusByMessageId`. El implementador escribe el fake client como en `imagina-leads-email.test.ts`.)

- [ ] **Commit** `feat(campanas): capa Supabase de campañas, destinatarios y plantillas`

---

## PHASE B — IA + envío

### Task 5: `campaign-ai.ts` — generación/edición con IA (structured)

**Files:** Create `src/lib/campaign-ai.ts`; Test `src/lib/__tests__/campaign-ai.test.ts`

**Interfaces:**
- `generateCampaignBlocks(input: { concept: string; refs?: string; templateBlocks?: Block[] }): Promise<Block[] | null>`
- `editCampaignBlocks(blocks: Block[], instruction: string): Promise<Block[] | null>`
Ambas: OpenAI `chat.completions` con `response_format: { type: "json_object" }`, prompt que exige el **esquema de bloques**, `JSON.parse` → `blocksSchema.safeParse`; si falla, **1 reintento**; si vuelve a fallar → `null`. Siempre garantizan que el último bloque es `footer` (lo añaden si la IA lo omitió).

- [ ] **Step 1: Test (mock OpenAI)** — igual patrón que otros: `vi.mock("./openai-client")` devolviendo un cliente cuyo `chat.completions.create` resuelve un JSON de bloques válido; assert que devuelve bloques validados y que **fuerza footer**. Segundo test: JSON inválido las 2 veces → `null`.

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("../openai-client", () => ({ getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }) }));
import { generateCampaignBlocks } from "../campaign-ai";

const validJson = JSON.stringify({ blocks: [
  { id: "1", type: "hero", props: { title: "Hola", body: "b" } },
  { id: "2", type: "button", props: { label: "Ir", url: "https://x.com" } },
]});
describe("generateCampaignBlocks", () => {
  beforeEach(() => createMock.mockReset());
  test("devuelve bloques validados y fuerza footer al final", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: validJson } }] });
    const blocks = await generateCampaignBlocks({ concept: "Novedades" });
    expect(blocks).not.toBeNull();
    expect(blocks!.at(-1)!.type).toBe("footer");
  });
  test("JSON inválido 2 veces → null", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "no json" } }] });
    expect(await generateCampaignBlocks({ concept: "x" })).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2-4:** Implementar con modelo `"gpt-4o"` (mejor que mini para estructura/copy), system prompt que describe los tipos de bloque y pide `{ "blocks": [...] }`, validación Zod, reintento, y `ensureFooter(blocks)`.

- [ ] **Commit** `feat(campanas): generación y edición de bloques con IA (OpenAI + Zod)`

---

### Task 6: `campaign-send.ts` — filtro emailable + envío por lotes

**Files:** Create `src/lib/campaign-send.ts`; Test `src/lib/__tests__/campaign-send.test.ts`

**Interfaces:**
- `sendCampaign(campaignId: string, leadIds: string[]): Promise<{ ok; sent: number; skipped: number; error? }>`:
  1. Carga campaña (asunto, from_email, blocks). Valida `from_email ∈ ALLOWED_SENDERS`, asunto no vacío, blocks no vacío.
  2. Carga leads por id, filtra **emailables** (consent, email, no rebotado).
  3. Por cada emailable: render con `unsubscribeUrl` propio (token) → construye payload.
  4. `resend.batch.send` en lotes de 100. Guarda `campaign_recipients` (message_id + status `sent`).
  5. Marca campaña `sent`, `recipients_total`, `sent_at`.
- `sendCampaignTest(campaign, toEmails: string[]): Promise<{ ok; error? }>` — render con un unsubscribeUrl dummy y envío directo (no toca CRM ni recipients).

- [ ] **Step 1: Test (mock resend + campaigns + imagina-leads)** — verifica: excluye no-emailables; trocea >100 en 2 lotes; persiste message_id; `from_email` no permitido → error sin enviar.

- [ ] **Step 2-4:** Implementar. `ALLOWED_SENDERS = (process.env.CAMPAIGN_SENDERS ?? "hola@dinkbit.es").split(",")`.

- [ ] **Commit** `feat(campanas): envío por lotes con filtro de consentimiento + prueba`

---

### Task 7: extender el webhook de Resend a campañas

**Files:** Modify `src/app/api/resend/webhook/route.ts`; Test `src/lib/__tests__/resend-webhook.test.ts` (añadir) o cubrir la función nueva en `campaigns.test.ts`.

- [ ] En el handler, tras `setLeadEmailStatusByMessageId(messageId, status)`, llamar **también** `setCampaignRecipientStatusByMessageId(messageId, status)`. Como los `message_id` son únicos, solo una casa. Mantener 200 siempre con firma válida.

- [ ] Test: un evento con message_id de campaña actualiza `campaign_recipients`; el de un lead sigue funcionando. **Commit** `feat(campanas): webhook de Resend actualiza estado por destinatario de campaña`

---

## PHASE C — Panel (UI + acciones)

> UI sin tests unitarios (convención del repo). Gate: `tsc` + `build` + E2E Playwright en Task 12. Seguir el estilo inline de `LeadsTable.tsx`.

### Task 8: acciones server de campañas + consentimiento en el panel

**Files:** Create `src/app/(site)/panel/campanas/actions.ts`; Modify `src/app/(site)/panel/actions.ts` (+`setLeadConsentAction`, `bulkSetConsentAction`), `src/app/(site)/panel/LeadsTable.tsx` (columna/switch de consentimiento + acción en lote).

**Interfaces (`campanas/actions.ts`, todas `"use server"`):**
- `createDraftAction()`, `generateAction(campaignId, concept, refs, templateId?)`, `editAction(campaignId, instruction)`, `saveBlocksAction(campaignId, blocksJson, style)`, `saveAsTemplateAction(campaignId, name, description)`, `sendTestAction(campaignId, toEmails)`, `sendCampaignAction(campaignId, leadIds)`, `setCampaignMetaAction(campaignId, {name,subject,from_email})`. Cada una valida y revalida `/panel/campanas`.

- [ ] Implementar cableando las libs de Fases A/B. Consentimiento: `setLeadConsentAction(id, bool)` vía `setLeadConsent`; `bulkSetConsentAction(ids, bool)`. En `LeadsTable`, añadir columna "Consent" con toggle y una acción en lote "Marcar consentimiento" (para leads históricos consentidos). `tsc` limpio. **Commit** `feat(campanas): server actions de campañas + consentimiento editable en el panel`

### Task 9: plantillas base sembradas + nav

**Files:** Create `src/lib/campaign-templates-builtin.ts` (1-2 arreglos de bloques de marca: "Anuncio" y "Newsletter simple"); Modify `campaigns.ts` `getBuiltinTemplates()` para devolverlas cuando la tabla esté vacía; Modify `src/app/(site)/panel/page.tsx` (link "✉️ Campañas" en el header).

- [ ] Implementar + `tsc`/`build`. **Commit** `feat(campanas): plantillas base y navegación del panel`

### Task 10: página lista de campañas

**Files:** Create `src/app/(site)/panel/campanas/page.tsx` (server: `listCampaigns()`), `CampaignsList.tsx` (client: tabla de campañas con estado + recuento + "Nueva campaña" → `createDraftAction` → navega al wizard).

- [ ] Implementar + `build`. **Commit** `feat(campanas): listado de campañas`

### Task 11: wizard de 4 pasos

**Files:** Create `src/app/(site)/panel/campanas/[id]/page.tsx` (carga campaña + plantillas), `CampaignWizard.tsx` (+ subcomponentes `StepConcept`, `StepDesign`, `StepRecipients`, `StepSend`, `BlockEditor`, `PreviewFrame`).

Especificación clave (el implementador rellena estilo siguiendo `LeadsTable.tsx`):
- **PreviewFrame**: `<iframe sandbox="" srcDoc={html} style="width:100%;height:...">`. El `html` se obtiene llamando a un endpoint/acción que renderiza (`renderCampaignEmail(blocks, style, {unsubscribeUrl:"#preview"})`) — o render en server action que devuelve el html. Nunca `dangerouslySetInnerHTML` en el panel.
- **StepConcept**: selector de plantilla (de `listEmailTemplates()`), textarea concepto + referencias → `generateAction` → guarda blocks → paso 2.
- **StepDesign**: layout 2 columnas. Izquierda: lista de bloques (añadir/quitar/reordenar con `newBlock`), edición directa de props por bloque (inputs de texto, color, select tamaño, url de botón) + caja IA (`editAction`). Botón "Guardar como plantilla" (`saveAsTemplateAction`). Cada cambio persiste con `saveBlocksAction` (debounce). Derecha: `PreviewFrame`.
- **StepRecipients**: campos remitente (select `ALLOWED_SENDERS`)/asunto (`setCampaignMetaAction`); selector de destinatarios reutilizando filtros de estado/campaña/canal + checkboxes sobre `listEmailableLeads`; muestra recuento emailable; caja de emails de prueba + "Enviar prueba" (`sendTestAction`).
- **StepSend**: resumen (asunto, remitente, nº destinatarios) + "Enviar" (`sendCampaignAction`) con confirmación; al terminar muestra el desglose de estados (que el webhook irá actualizando).

- [ ] Implementar por sub-pasos, `tsc` + `build` limpios tras cada uno. **Commit(s)** `feat(campanas): wizard de composición y envío`

---

## PHASE D — verificación

### Task 12: verificación E2E + build + deploy

- [ ] `npx vitest run` (todo verde), `npx tsc --noEmit` (limpio), `npm run build` (OK; rutas `/panel/campanas`, `/api/unsubscribe` presentes).
- [ ] **E2E Playwright (contra preview/local o prod tras deploy):** crear campaña → generar con IA → editar un bloque + caja IA → enviar prueba a un email propio → seleccionar 1 destinatario emailable → enviar → verificar recipient `sent` → (webhook) `delivered`. Probar `/api/unsubscribe?id=&token=` marca `consent=false`.
- [ ] Checklist manual + **notas de despliegue**:
  - Correr el SQL de migración (columna `consent` + 3 tablas).
  - Confirmar `OPENAI_API_KEY` y `RESEND_API_KEY` en Vercel; `CAMPAIGN_SENDERS` si se quieren varios remitentes; `PROMO_TOKEN_SECRET` (reutilizado para baja).
  - El webhook de Resend ya existente cubre las campañas (mismo endpoint).

## Notas de despliegue

- Migración SQL (arriba). Env: `OPENAI_API_KEY`, `RESEND_API_KEY`, opcional `CAMPAIGN_SENDERS`, `PROMO_TOKEN_SECRET`.
- Leads históricos: `consent` es null → no emailables hasta marcarlos (toggle/lote en el panel).
