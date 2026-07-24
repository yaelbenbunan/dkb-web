# Kit Digital 2026 — Dos flujos de lead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el autoresponder del lead orgánico por un success message, y añadir un segundo flujo (leads de Meta Lead Ads) que se integran al CRM, reciben un email de marca "casi has terminado" con botón a la landing, y al completar la landing enriquecen su misma fila del CRM (match por email) sin duplicar.

**Architecture:** Dos entradas a la misma tabla `imagina_leads` (campaña `"Kit Digital 2026"`). El upsert por email vive en `imagina-leads.ts`. El email de marca se repurpone a "casi has terminado" y lo mandan tanto el handler de Meta como (ya no) la acción orgánica. Un endpoint dedicado `/api/leads/kit-digital-2026` recibe el lead de Meta vía Zapier, lo inserta y manda el email. La acción de la landing usa el upsert para enriquecer o crear.

**Tech Stack:** Next.js App Router (server actions + route handlers, runtime nodejs), Supabase (service role, `imagina_leads`), Resend, Zod, Vitest.

## Global Constraints

- Campaña fija (tag del panel): `"Kit Digital 2026"` — literal exacto, en el builder y en el match.
- Canal Meta por defecto: `"Meta"`; canal orgánico: `"Web"`.
- Match por email: case-insensitive, trim, **scope a la campaña `"Kit Digital 2026"`** — nunca global.
- Persistencia al CRM: best-effort, nunca lanza al usuario.
- Endpoint Meta: mismo secreto `LEADS_WEBHOOK_SECRET`, auth timing-safe (header `x-webhook-secret` o `authorization: Bearer`), nunca por query string.
- Emails al lead: best-effort (un fallo no invalida el guardado del lead). Email interno al equipo en la landing orgánica: crítico (devuelve error si falla).
- Env de email: `RESEND_API_KEY`, `CONTACT_EMAIL_FROM` (fallback `onboarding@resend.dev`), `CONTACT_EMAIL_TO` (solo interno).
- Comandos: tests `npm test` (vitest run), tipos `npm run typecheck`.

---

### Task 1: Match-por-email + upsert en `imagina-leads.ts`

**Files:**
- Modify: `src/lib/imagina-leads.ts` (añadir dos funciones al final, junto a `createWebhookLead`)
- Test: `src/lib/__tests__/imagina-leads-upsert.test.ts` (crear)

**Interfaces:**
- Consumes: `getSupabaseAdmin()` de `./supabase-admin`; `WebhookLeadInput`, `createWebhookLead` ya existentes en el mismo archivo.
- Produces:
  - `upsertKitDigital2026Lead(lead: WebhookLeadInput): Promise<{ ok: boolean; id?: string; matched: boolean; error?: string }>` — busca match por email (case-insensitive) dentro de `campaign = "Kit Digital 2026"`; si existe, UPDATE (enriquece); si no, INSERT vía `createWebhookLead`. La búsqueda es inline (necesita name/phone/notes de la fila, no solo el id).

**Reglas de enriquecimiento (UPDATE):** conservar `channel`/`campaign`/`status` existentes; `name` y `phone` solo se rellenan si estaban vacíos; `sector` y `business_type` se setean con lo aportado; `notes` se appende (previo + separador + nuevo) sin borrar lo anterior.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/__tests__/imagina-leads-upsert.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

// Encadenamiento de query builder de supabase-js simulado. Cada test define
// qué devuelve el SELECT (fila existente o null) y captura el UPDATE/INSERT.
const state: {
  selectRow: Record<string, unknown> | null;
  updated: Record<string, unknown> | null;
  upserted: Record<string, unknown> | null;
} = { selectRow: null, updated: null, upserted: null };

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));

vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from() {
      return {
        // SELECT chain: select().ilike().eq().order().limit().maybeSingle()
        select() {
          const chain = {
            ilike() { return chain; },
            eq() { return chain; },
            order() { return chain; },
            limit() { return chain; },
            async maybeSingle() { return { data: state.selectRow, error: null }; },
          };
          return chain;
        },
        // UPDATE chain: update(payload).eq()
        update(payload: Record<string, unknown>) {
          state.updated = payload;
          return { async eq() { return { error: null }; } };
        },
        // INSERT/UPSERT chain: upsert(row)
        async upsert(row: Record<string, unknown>) {
          state.upserted = row;
          return { error: null };
        },
      };
    },
  };
}

import { upsertKitDigital2026Lead } from "../imagina-leads";

const leadInput = () => ({
  name: "Nuria",
  email: "Nuria@Example.com",
  phone: "633333333",
  channel: "Web",
  campaign: "Kit Digital 2026",
  sector: "Hostelería/restauración",
  businessType: "Pyme",
  notes: "Origen: landing /kit-digital-2026 · Servicios de interés: Web, SEO",
});

describe("upsertKitDigital2026Lead", () => {
  beforeEach(() => {
    state.selectRow = null;
    state.updated = null;
    state.upserted = null;
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("sin match → inserta fila nueva (createWebhookLead)", async () => {
    state.selectRow = null;
    const res = await upsertKitDigital2026Lead(leadInput());
    expect(res.ok).toBe(true);
    expect(res.matched).toBe(false);
    expect(state.upserted).not.toBeNull();
    expect(state.upserted!.campaign).toBe("Kit Digital 2026");
    expect(state.updated).toBeNull();
  });

  test("con match (lead de Meta) → enriquece conservando canal Meta y appende notas", async () => {
    state.selectRow = {
      id: "meta-1",
      name: "Nuria",
      phone: "633333333",
      notes: "Origen: Meta Lead Ads",
      channel: "Meta",
    };
    const res = await upsertKitDigital2026Lead(leadInput());
    expect(res.ok).toBe(true);
    expect(res.matched).toBe(true);
    expect(res.id).toBe("meta-1");
    expect(state.upserted).toBeNull(); // no insert
    // No pisa channel/campaign
    expect(state.updated).not.toHaveProperty("channel");
    expect(state.updated).not.toHaveProperty("campaign");
    // Setea columnas de la landing
    expect(state.updated!.sector).toBe("Hostelería/restauración");
    expect(state.updated!.business_type).toBe("Pyme");
    // Appende, no borra
    expect(state.updated!.notes).toContain("Origen: Meta Lead Ads");
    expect(state.updated!.notes).toContain("Servicios de interés: Web, SEO");
  });

  test("con match sin name/phone previos → los rellena", async () => {
    state.selectRow = { id: "meta-2", name: null, phone: null, notes: null, channel: "Meta" };
    await upsertKitDigital2026Lead(leadInput());
    expect(state.updated!.name).toBe("Nuria");
    expect(state.updated!.phone).toBe("633333333");
  });

  test("con match con name/phone previos → no los pisa", async () => {
    state.selectRow = { id: "meta-3", name: "Nombre Bueno", phone: "600000000", notes: null, channel: "Meta" };
    await upsertKitDigital2026Lead(leadInput());
    expect(state.updated).not.toHaveProperty("name");
    expect(state.updated).not.toHaveProperty("phone");
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx vitest run src/lib/__tests__/imagina-leads-upsert.test.ts`
Expected: FAIL — `upsertKitDigital2026Lead is not a function` / no export.

- [ ] **Step 3: Implementar las funciones**

Añadir al final de `src/lib/imagina-leads.ts` (después de `createWebhookLead`, reutilizando el `TABLE` ya definido en el módulo):

```ts
const KD2026_CAMPAIGN = "Kit Digital 2026";

/** Enriquece la fila existente (match por email en la campaña) o crea una nueva.
 *  Al enriquecer: conserva channel/campaign/status; rellena name/phone solo si
 *  faltaban; setea sector/business_type; appende notes. */
export async function upsertKitDigital2026Lead(
  lead: WebhookLeadInput,
): Promise<{ ok: boolean; id?: string; matched: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, matched: false, error: "supabase_not_configured" };
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const email = clean(lead.email);

  // Buscar fila existente (con sus campos para decidir el merge).
  const existing = email
    ? (
        await sb
          .from(TABLE)
          .select("id,name,phone,notes")
          .ilike("email", email)
          .eq("campaign", KD2026_CAMPAIGN)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  if (!existing) {
    const res = await createWebhookLead(lead);
    return { ...res, matched: false };
  }

  const row = existing as {
    id: string;
    name: string | null;
    phone: string | null;
    notes: string | null;
  };
  const update: Record<string, string | null> = {
    sector: clean(lead.sector),
    business_type: clean(lead.businessType),
  };
  // name/phone: solo si faltaban (no pisar dato bueno con vacío).
  if (!clean(row.name) && clean(lead.name)) update.name = clean(lead.name);
  if (!clean(row.phone) && clean(lead.phone)) update.phone = clean(lead.phone);
  // notes: appendear al bloque previo.
  const incoming = clean(lead.notes);
  if (incoming) {
    update.notes = row.notes
      ? `${row.notes}\n\n— Datos de la landing —\n${incoming}`
      : incoming;
  }

  const { error } = await sb.from(TABLE).update(update).eq("id", row.id);
  if (error) {
    console.error("[imagina-leads] upsertKitDigital2026Lead update error:", error.message);
    return { ok: false, id: row.id, matched: true, error: error.message };
  }
  return { ok: true, id: row.id, matched: true };
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/imagina-leads-upsert.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/imagina-leads.ts src/lib/__tests__/imagina-leads-upsert.test.ts
git commit -m "feat(kit-digital-2026): upsert de lead por email dentro de la campaña"
```

---

### Task 2: Repurpose del email → "casi has terminado"

**Files:**
- Modify: `src/lib/kit-digital-2026-email.ts`
- Test: `src/lib/__tests__/kit-digital-2026-email.test.ts` (reescribir asserts)

**Interfaces:**
- Produces: `buildKitDigital2026Email(input: { name: string; email?: string }): { subject: string; html: string; text: string }` — email de marca "casi has terminado" cuyo CTA apunta a `landingUrl?email=<encoded>` cuando se pasa `email`.

- [ ] **Step 1: Reescribir el test que falla**

Reemplazar el contenido de `src/lib/__tests__/kit-digital-2026-email.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { buildKitDigital2026Email } from "../kit-digital-2026-email";

describe("buildKitDigital2026Email (casi has terminado)", () => {
  test("copy de 'un paso más' y CTA a la landing con el email prefilled", () => {
    const { subject, html, text } = buildKitDigital2026Email({
      name: "Yael Ben Bunan",
      email: "yael@example.com",
    });
    expect(subject.toLowerCase()).toContain("paso");
    expect(html).toContain("Yael");
    expect(html.toLowerCase()).toContain("un paso");
    // CTA lleva a la landing con el email prefilled para el match.
    expect(html).toContain("/kit-digital-2026?email=yael%40example.com");
    // Marca intacta
    expect(html).toContain("dinkbit-email.png");
    expect(html).toContain("www.dinkbit.es");
    expect(text).toContain("Yael");
  });

  test("sin email → CTA a la landing sin querystring", () => {
    const { html } = buildKitDigital2026Email({ name: "Ana" });
    expect(html).toContain("/kit-digital-2026");
    expect(html).not.toContain("?email=");
  });

  test("escapa HTML del nombre para evitar inyección", () => {
    const { html } = buildKitDigital2026Email({ name: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("nombre vacío usa saludo por defecto", () => {
    const { html } = buildKitDigital2026Email({ name: "" });
    expect(html).toContain("hola");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-email.test.ts`
Expected: FAIL — el CTA no incluye `?email=` y el copy sigue siendo "Gracias — te avisamos".

- [ ] **Step 3: Actualizar el builder**

En `src/lib/kit-digital-2026-email.ts`:

1. Cambiar la firma y las cadenas de copy. Reemplazar el bloque `STEPS`, `subject`, `preheader`, el `<h1>`/`<p>` del hero y el CTA. La estructura table-based, colores, logo y footer se conservan.

```ts
/** Qué falta — pasos que se muestran como filas con check de acento. */
const STEPS: readonly string[] = [
  "Cuéntanos qué necesitas para tu negocio (2 minutos).",
  "Nos encargamos de toda la tramitación del Kit Digital por ti.",
  "Te avisamos en cuanto la convocatoria se reactive.",
];

export function buildKitDigital2026Email(input: {
  name: string;
  email?: string;
}): { subject: string; html: string; text: string } {
  const first = escapeHtml((input.name || "").trim().split(/\s+/)[0] || "hola");
  const accent = `#${KD_EMAIL.accentHex}`;
  const subject = "Casi está — solo falta un paso para tu Kit Digital";
  const preheader =
    "Ya casi está. Solo falta que nos cuentes qué necesitas y nos encargamos de todo.";
  const ctaUrl = input.email
    ? `${KD_EMAIL.landingUrl}?email=${encodeURIComponent(input.email)}`
    : KD_EMAIL.landingUrl;
```

2. En el HTML, sustituir el `<h1>` y el párrafo del hero por:

```ts
    <h1 style="margin:0;font-size:30px;line-height:1.12;color:#0f172a;font-weight:900;letter-spacing:-0.5px;">
      ¡Casi has terminado, ${first}! 🚀
    </h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:#475569;">
      Gracias por tu interés en el <strong style="color:${accent};">Kit Digital</strong>.
      Solo falta <strong>un paso más</strong>: cuéntanos qué necesitas y nos encargamos del resto.
    </p>
```

3. El label de la card cambia de "Qué pasa ahora" a "Qué falta" y el botón del CTA usa `ctaUrl` y el texto "Completar mis datos →":

```ts
        <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${accent};text-transform:uppercase;">Qué falta</p>
```

```ts
    <a href="${ctaUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:15px 32px;border-radius:12px;box-shadow:0 10px 24px -10px ${accent};">Completar mis datos →</a>
```

4. Actualizar el bloque `text` para reflejar el nuevo copy y la url:

```ts
  const text = [
    `Hola ${(input.name || "").trim().split(/\s+/)[0] || "hola"},`,
    "",
    "Gracias por tu interés en el Kit Digital. Solo falta un paso más.",
    "",
    "Qué falta:",
    ...STEPS.map((s) => `· ${s}`),
    "",
    `Completa tus datos aquí: ${ctaUrl}`,
    "",
    "Un saludo,",
    "El equipo de Dinkbit",
    `${KD_EMAIL.siteUrl}`,
  ].join("\n");
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kit-digital-2026-email.ts src/lib/__tests__/kit-digital-2026-email.test.ts
git commit -m "feat(kit-digital-2026): email de marca 'casi has terminado' con CTA a la landing"
```

---

### Task 3: Acción orgánica — quitar autoresponder y usar upsert

**Files:**
- Modify: `src/lib/kit-digital-2026-action.ts`
- Test: `src/lib/__tests__/kit-digital-2026-action.test.ts` (actualizar mocks y asserts)

**Interfaces:**
- Consumes: `upsertKitDigital2026Lead` (Task 1), `kitDigital2026Lead`/`utmFromFormData` (`./web-lead-origin`).
- Produces: sin cambios en la firma de `requestKitDigital2026(formData): Promise<{ ok; error? }>`. Cambio de comportamiento: 1 email (interno), CRM vía upsert.

- [ ] **Step 1: Actualizar el test que falla**

En `src/lib/__tests__/kit-digital-2026-action.test.ts`:

1. Cambiar el mock de `../imagina-leads` para exponer `upsertKitDigital2026Lead` en vez de `createWebhookLead`:

```ts
const { sendMock, upsertMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../imagina-leads", () => ({
  upsertKitDigital2026Lead: upsertMock,
}));
```

2. En `beforeEach`, reemplazar `createWebhookLeadMock` por:

```ts
    upsertMock.mockReset().mockResolvedValue({ ok: true, id: "x", matched: false });
```

3. Reemplazar el test principal para exigir **un solo** email (interno) y el upsert:

```ts
  test("valid pyme lead → upsert al CRM y SOLO email interno (sin autoresponder)", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));

    expect(res.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const row = upsertMock.mock.calls[0][0];
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.businessType).toBe("Pyme");
    expect(row.sector).toContain("Hostelería/restauración");
    expect(row.notes).toContain("Web, SEO");

    // Un solo email: el interno al equipo. NO se manda autoresponder al lead.
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("to@example.com");
    const recipients = sendMock.mock.calls.map((c) => c[0].to);
    expect(recipients).not.toContain("nuria@example.com");
  });
```

4. Sustituir el test `"autoresponder failure does not fail the submission"` por uno que verifique que un fallo del email interno SÍ devuelve error (el interno es crítico):

```ts
  test("fallo del email interno devuelve error", async () => {
    sendMock.mockReset().mockResolvedValue({ error: { message: "smtp down" } });
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));
    expect(res.ok).toBe(false);
  });
```

5. En el resto de tests de validación, renombrar cualquier assert `createWebhookLeadMock` → `upsertMock` (los `not.toHaveBeenCalled()` siguen igual). Buscar y reemplazar `createWebhookLeadMock` por `upsertMock` en todo el archivo.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-action.test.ts`
Expected: FAIL — la acción todavía llama `createWebhookLead` y manda 2 emails.

- [ ] **Step 3: Actualizar la acción**

En `src/lib/kit-digital-2026-action.ts`:

1. Cambiar el import:

```ts
import { upsertKitDigital2026Lead } from "./imagina-leads";
```

(eliminar el import de `createWebhookLead` y el de `buildKitDigital2026Email`).

2. Reemplazar la llamada `await createWebhookLead(kitDigital2026Lead(...))` por `await upsertKitDigital2026Lead(kitDigital2026Lead(...))` — los argumentos del builder no cambian.

3. Eliminar por completo el bloque del autoresponder al lead (el comentario `// 2) Autoresponder al lead ...`, el `buildKitDigital2026Email` y el segundo `resend.emails.send({ to: d.email, ... })` con su manejo de `autoErr`). La función termina tras el envío del email interno con `return { ok: true };`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-action.test.ts`
Expected: PASS (todos los tests del archivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/kit-digital-2026-action.ts src/lib/__tests__/kit-digital-2026-action.test.ts
git commit -m "refactor(kit-digital-2026): landing usa upsert y quita el autoresponder al lead"
```

---

### Task 4: Prefill del email en la landing (page + form)

**Files:**
- Modify: `src/app/(site)/kit-digital-2026/page.tsx`
- Modify: `src/app/(site)/kit-digital-2026/KitDigital2026Form.tsx`

**Interfaces:**
- Produces: `KitDigital2026Form` acepta prop opcional `initialEmail?: string`; el input `email` usa ese valor como `defaultValue`.

Nota: no hay test unitario de componentes en este repo; la verificación es typecheck + build. El prefill es no-crítico (si el email no llega, el usuario lo escribe).

- [ ] **Step 1: Aceptar `initialEmail` en el form**

En `src/app/(site)/kit-digital-2026/KitDigital2026Form.tsx`, cambiar la firma del componente y el input de email:

```ts
export function KitDigital2026Form({ initialEmail = "" }: { initialEmail?: string }) {
```

En el `<input name="email" ...>` añadir `defaultValue={initialEmail}`:

```tsx
          <label className="block">
            <span className={labelClass}>Email *</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={initialEmail}
              placeholder="Tu mejor email"
              className={inputClass}
            />
          </label>
```

- [ ] **Step 2: Pasar el email desde la page (searchParams)**

En `src/app/(site)/kit-digital-2026/page.tsx`, la firma del componente pasa a leer `searchParams` (async en App Router) y pasar `initialEmail`:

```tsx
export default async function KitDigital2026Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const initialEmail = typeof email === "string" ? email : "";
```

Y en el render del form:

```tsx
              <KitDigital2026Form initialEmail={initialEmail} />
```

- [ ] **Step 3: Verificar tipos y build**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/kit-digital-2026/page.tsx" "src/app/(site)/kit-digital-2026/KitDigital2026Form.tsx"
git commit -m "feat(kit-digital-2026): prefill del email en la landing desde ?email="
```

---

### Task 5: Handler de lead de Meta + auth compartida

**Files:**
- Create: `src/lib/webhook-auth.ts`
- Create: `src/lib/kit-digital-2026-meta.ts`
- Test: `src/lib/__tests__/kit-digital-2026-meta.test.ts` (crear)
- Modify: `src/app/api/leads/route.ts` (usar el helper de auth compartido)
- Create: `src/app/api/leads/kit-digital-2026/route.ts`

**Interfaces:**
- Produces (`webhook-auth.ts`):
  - `providedSecret(req: NextRequest): string | null`
  - `secretMatches(provided: string | null, expected: string): boolean`
- Produces (`kit-digital-2026-meta.ts`):
  - `handleKitDigital2026MetaLead(input: { id?: string | null; name?: string | null; email?: string | null; phone?: string | null }): Promise<{ ok: boolean; id?: string; error?: string }>` — inserta al CRM (`channel: "Meta"`, `campaign: "Kit Digital 2026"`) vía `createWebhookLead` y, si hay email, manda el email de marca (best-effort).
- Consumes: `createWebhookLead` (`./imagina-leads`), `buildKitDigital2026Email` (`./kit-digital-2026-email`), `Resend`.

- [ ] **Step 1: Test del handler de Meta (falla)**

Crear `src/lib/__tests__/kit-digital-2026-meta.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, createWebhookLeadMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createWebhookLeadMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../imagina-leads", () => ({
  createWebhookLead: createWebhookLeadMock,
}));

import { handleKitDigital2026MetaLead } from "../kit-digital-2026-meta";

describe("handleKitDigital2026MetaLead", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "meta-1" });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("inserta lead con canal Meta + campaña Kit Digital 2026 y manda email al lead", async () => {
    const res = await handleKitDigital2026MetaLead({
      id: "lg-123",
      name: "Marta",
      email: "marta@example.com",
      phone: "600111222",
    });
    expect(res.ok).toBe(true);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.id).toBe("lg-123");
    expect(row.channel).toBe("Meta");
    expect(row.campaign).toBe("Kit Digital 2026");
    // Email al lead con CTA a la landing prefilled.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const msg = sendMock.mock.calls[0][0];
    expect(msg.to).toBe("marta@example.com");
    expect(msg.html).toContain("/kit-digital-2026?email=marta%40example.com");
  });

  test("sin email → guarda el lead pero no manda email", async () => {
    const res = await handleKitDigital2026MetaLead({ name: "Sin Email", phone: "600111222" });
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("fallo del email no invalida el guardado (best-effort)", async () => {
    sendMock.mockReset().mockResolvedValue({ error: { message: "bounce" } });
    const res = await handleKitDigital2026MetaLead({ email: "x@example.com", name: "X" });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-meta.test.ts`
Expected: FAIL — `handleKitDigital2026MetaLead` no existe.

- [ ] **Step 3: Implementar el handler**

Crear `src/lib/kit-digital-2026-meta.ts`:

```ts
import "server-only";
import { Resend } from "resend";
import { createWebhookLead } from "./imagina-leads";
import { buildKitDigital2026Email } from "./kit-digital-2026-email";

const CAMPAIGN = "Kit Digital 2026";

/** Lead entrante de Meta Lead Ads (vía Zapier) para el Kit Digital: se guarda en
 *  el CRM con canal Meta + campaña Kit Digital 2026 y se le manda el email de
 *  marca "casi has terminado". El guardado es lo crítico; el email es
 *  best-effort. Idempotente por `id` externo (leadgen_id) en createWebhookLead. */
export async function handleKitDigital2026MetaLead(input: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const email = clean(input.email);

  const saved = await createWebhookLead({
    id: clean(input.id),
    name: clean(input.name),
    email,
    phone: clean(input.phone),
    channel: "Meta",
    campaign: CAMPAIGN,
    notes: "Origen: Meta Lead Ads (campaña Kit Digital) · pendiente de completar datos en la landing",
  });
  if (!saved.ok) return saved;

  // Email al lead — best-effort. Sin email o sin config de Resend, se omite.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (email && apiKey) {
    try {
      const resend = new Resend(apiKey);
      const mail = buildKitDigital2026Email({ name: clean(input.name) ?? "", email });
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (error) console.error("[kit-digital-2026-meta] email error:", error);
    } catch (err) {
      console.error("[kit-digital-2026-meta] email threw:", err);
    }
  }
  return saved;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-meta.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Extraer auth compartida**

Crear `src/lib/webhook-auth.ts` (mismo código que hoy vive inline en `route.ts`):

```ts
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// Header only — never accept the secret via query string (it leaks into access
// logs, proxies and browser history).
export function providedSecret(req: NextRequest): string | null {
  const header =
    req.headers.get("x-webhook-secret") ?? req.headers.get("authorization");
  if (!header) return null;
  return header.replace(/^Bearer\s+/i, "").trim();
}

// Constant-time compare to avoid leaking the secret through timing.
export function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

En `src/app/api/leads/route.ts`, borrar las funciones locales `providedSecret` y `secretMatches` y su import de `timingSafeEqual`, y añadir arriba:

```ts
import { providedSecret, secretMatches } from "@/lib/webhook-auth";
```

- [ ] **Step 6: Crear el endpoint dedicado**

Crear `src/app/api/leads/kit-digital-2026/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { providedSecret, secretMatches } from "@/lib/webhook-auth";
import { handleKitDigital2026MetaLead } from "@/lib/kit-digital-2026-meta";

// Endpoint dedicado para leads de la campaña de Meta Lead Ads del Kit Digital.
// Zapier reenvía aquí el lead crudo → se guarda en el CRM (canal Meta, campaña
// "Kit Digital 2026") y se le manda el email "casi has terminado" con el botón
// a la landing. Mismo secreto que /api/leads.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.LEADS_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
  }
  if (!secretMatches(providedSecret(req), expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      data = (await req.json()) as Record<string, unknown>;
    } else {
      const fd = await req.formData();
      data = Object.fromEntries(fd.entries());
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return null;
  };

  const name = pick("name", "full_name", "fullName", "nombre");
  const email = pick("email", "correo", "e-mail");
  const phone = pick("phone", "phone_number", "phoneNumber", "telefono", "teléfono");

  if (!name && !email && !phone) {
    return NextResponse.json({ ok: false, error: "missing_name_email_or_phone" }, { status: 400 });
  }

  const res = await handleKitDigital2026MetaLead({
    id: pick("id", "leadgen_id", "lead_id", "external_id"),
    name,
    email,
    phone,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: res.id });
}

// Health check para confirmar la URL desde el navegador.
export function GET() {
  return NextResponse.json({ ok: true, service: "kit-digital-2026-meta-webhook", method: "POST" });
}
```

- [ ] **Step 7: Ejecutar toda la suite + tipos**

Run: `npm test`
Expected: PASS (toda la suite, incluidos los nuevos archivos).

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/lib/webhook-auth.ts src/lib/kit-digital-2026-meta.ts src/lib/__tests__/kit-digital-2026-meta.test.ts src/app/api/leads/route.ts src/app/api/leads/kit-digital-2026/route.ts
git commit -m "feat(kit-digital-2026): endpoint /api/leads/kit-digital-2026 (lead Meta + email 'casi has terminado')"
```

---

### Task 6: Verificación end-to-end y build

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos los tests en verde.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build OK; la ruta `/api/leads/kit-digital-2026` aparece en el listado de rutas.

- [ ] **Step 4: Repaso manual de los dos flujos (checklist, sin código)**

- Flujo 1 (orgánico): `/kit-digital-2026` sin `?email` → enviar el form → success message; el lead aparece en el panel con campaña "Kit Digital 2026"; **no** llega email al lead; sí llega el interno al equipo.
- Flujo 2 (Meta): `POST /api/leads/kit-digital-2026` con secret + `{name,email,phone}` → 200; lead en el panel canal Meta; llega email "casi has terminado" con botón a `/kit-digital-2026?email=…`; completar la landing → **misma fila** enriquecida (no duplicado), canal Meta intacto.

- [ ] **Step 5: Commit final (si hay ajustes de la verificación)**

```bash
git add -A
git commit -m "chore(kit-digital-2026): verificación de los dos flujos"
```

---

## Notas de despliegue (post-merge)

- Env necesarias en producción (ya usadas en el proyecto): `LEADS_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO`.
- Configurar el Zap de la campaña de Meta Lead Ads del Kit Digital para hacer `POST` a `https://www.dinkbit.es/api/leads/kit-digital-2026` con el header `x-webhook-secret: <LEADS_WEBHOOK_SECRET>` y el mapping de campos (`name`/`email`/`phone`/`leadgen_id`).
