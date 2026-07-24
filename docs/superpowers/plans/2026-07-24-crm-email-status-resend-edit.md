# CRM — Estado de email + Reenviar + Editar campos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En el panel `/panel`, rastrear el estado real del email de marca de Kit Digital (enviado/entregado/rebotado/spam) vía webhook de Resend, permitir reenviarlo a mano, y editar los campos de contacto (nombre/email/teléfono) del lead.

**Architecture:** Dos escrituras a columnas nuevas de `imagina_leads`: al enviar (handler Meta + acción Reenviar) guardamos `email_message_id` + `email_status='sent'`; el webhook de Resend (`/api/resend/webhook`, firma Svix verificada) casa por `email_message_id` y actualiza el estado. El panel pinta un badge y el botón Reenviar.

**Tech Stack:** Next.js App Router (route handlers + server actions, runtime nodejs), Supabase (service role), Resend, Vitest, `node:crypto` para verificar la firma Svix.

## Global Constraints

- Columnas nuevas en `imagina_leads`: `email_status` (`sent`|`delivered`|`bounced`|`complained`|null), `email_message_id` (text), `email_updated_at` (timestamptz). **Migración manual** (ver Prerequisito).
- El webhook **verifica la firma Svix** siempre: sin `RESEND_WEBHOOK_SECRET` → 500; firma inválida → 401; nunca muta el CRM sin firma válida. Responde 200 aunque no case ninguna fila (evita reintentos de Resend).
- Persistir estado de email es **best-effort**: nunca rompe el envío del email ni la respuesta del webhook.
- Reenviar solo aplica a leads de campaña `"Kit Digital 2026"` con email.
- Etiquetas del badge: `sent`→"Enviado", `delivered`→"Entregado" (verde), `bounced`→"Rebotado" (rojo), `complained`→"Spam" (ámbar), `null`→"—".
- Comandos: tests `npx vitest run`, tipos `npx tsc --noEmit`.

## Prerequisito (migración — la corre el usuario, ya entregada)

```sql
alter table imagina_leads
  add column if not exists email_status text,
  add column if not exists email_message_id text,
  add column if not exists email_updated_at timestamptz;
create index if not exists imagina_leads_email_message_id_idx
  on imagina_leads (email_message_id);
```

El código de este plan asume esas columnas. Los tests mockean Supabase, así que pasan sin la migración; el funcionamiento en producción la requiere.

---

### Task 1: Columnas de email + helpers CRM + editar contacto

**Files:**
- Create: `src/lib/email-status.ts`
- Modify: `src/lib/imagina-leads.ts`
- Test: `src/lib/__tests__/email-status.test.ts`, `src/lib/__tests__/imagina-leads-email.test.ts`

**Interfaces:**
- Produces (`email-status.ts`): `EMAIL_STATUS_LABELS: Record<string,string>`, `EMAIL_STATUS_COLORS: Record<string,string>`, `emailStatusLabel(s: string | null): string`.
- Produces (`imagina-leads.ts`): `setLeadEmailSent(leadId, messageId): Promise<void>`; `setLeadEmailStatusByMessageId(messageId, status): Promise<number>`; `LeadRow` con `email_status`/`email_message_id`/`email_updated_at`; `updateLeadField` acepta también `"name"|"email"|"phone"`.

- [ ] **Step 1: Tests que fallan**

Crear `src/lib/__tests__/email-status.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { emailStatusLabel, EMAIL_STATUS_COLORS } from "../email-status";

describe("email-status", () => {
  test("labels por estado", () => {
    expect(emailStatusLabel("sent")).toBe("Enviado");
    expect(emailStatusLabel("delivered")).toBe("Entregado");
    expect(emailStatusLabel("bounced")).toBe("Rebotado");
    expect(emailStatusLabel("complained")).toBe("Spam");
  });
  test("null / desconocido → guion", () => {
    expect(emailStatusLabel(null)).toBe("—");
    expect(emailStatusLabel("otro")).toBe("—");
  });
  test("colores definidos para entregado y rebotado", () => {
    expect(EMAIL_STATUS_COLORS.delivered).toBeTruthy();
    expect(EMAIL_STATUS_COLORS.bounced).toBeTruthy();
  });
});
```

Crear `src/lib/__tests__/imagina-leads-email.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const state: {
  updated: Record<string, unknown> | null;
  eqField: string | null;
  eqValue: string | null;
  returnRows: { id: string }[];
} = { updated: null, eqField: null, eqValue: null, returnRows: [] };

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));

function fakeClient() {
  return {
    from() {
      return {
        update(payload: Record<string, unknown>) {
          state.updated = payload;
          return {
            eq(field: string, value: string) {
              state.eqField = field;
              state.eqValue = value;
              // setLeadEmailStatusByMessageId encadena .select("id"); setLeadEmailSent no.
              return {
                async select() {
                  return { data: state.returnRows, error: null };
                },
                then(res: (v: { error: null }) => unknown) {
                  // permite await directo (setLeadEmailSent)
                  return Promise.resolve({ error: null }).then(res);
                },
              };
            },
          };
        },
      };
    },
  };
}

import {
  setLeadEmailSent,
  setLeadEmailStatusByMessageId,
} from "../imagina-leads";

describe("email-status helpers", () => {
  beforeEach(() => {
    state.updated = null;
    state.eqField = null;
    state.eqValue = null;
    state.returnRows = [];
    getAdminMock.mockReset().mockReturnValue(fakeClient());
  });

  test("setLeadEmailSent guarda status=sent + message_id + timestamp por id", async () => {
    await setLeadEmailSent("lead-1", "msg-abc");
    expect(state.eqField).toBe("id");
    expect(state.eqValue).toBe("lead-1");
    expect(state.updated!.email_status).toBe("sent");
    expect(state.updated!.email_message_id).toBe("msg-abc");
    expect(state.updated!.email_updated_at).toBeTruthy();
  });

  test("setLeadEmailStatusByMessageId actualiza por message_id y devuelve nº filas", async () => {
    state.returnRows = [{ id: "lead-1" }];
    const n = await setLeadEmailStatusByMessageId("msg-abc", "bounced");
    expect(state.eqField).toBe("email_message_id");
    expect(state.eqValue).toBe("msg-abc");
    expect(state.updated!.email_status).toBe("bounced");
    expect(n).toBe(1);
  });

  test("sin match devuelve 0", async () => {
    state.returnRows = [];
    const n = await setLeadEmailStatusByMessageId("no-existe", "delivered");
    expect(n).toBe(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/lib/__tests__/email-status.test.ts src/lib/__tests__/imagina-leads-email.test.ts`
Expected: FAIL — módulos/exports no existen.

- [ ] **Step 3: Crear `email-status.ts`**

```ts
// Client-safe: etiquetas y colores del estado del email de marca en el CRM.
export const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  bounced: "Rebotado",
  complained: "Spam",
};

export const EMAIL_STATUS_COLORS: Record<string, string> = {
  sent: "#64748b", // gris
  delivered: "#16a34a", // verde
  bounced: "#dc2626", // rojo
  complained: "#d97706", // ámbar
};

/** Etiqueta legible; null/desconocido → "—". */
export function emailStatusLabel(status: string | null): string {
  if (!status) return "—";
  return EMAIL_STATUS_LABELS[status] ?? "—";
}
```

- [ ] **Step 4: Modificar `imagina-leads.ts`**

1. En `interface LeadRow`, tras `archived: boolean;` (o donde encaje), añadir:

```ts
  email_status: string | null;
  email_message_id: string | null;
  email_updated_at: string | null;
```

2. Ampliar la firma de `updateLeadField` para aceptar los campos de contacto:

```ts
export async function updateLeadField(
  leadId: string,
  field:
    | "account_manager"
    | "notes"
    | "followup"
    | "channel"
    | "campaign"
    | "name"
    | "email"
    | "phone",
  value: string,
): Promise<boolean> {
```

(el cuerpo no cambia.)

3. Añadir al final del archivo:

```ts
/** Marca el email como enviado y guarda el message_id de Resend (para casar los
 *  eventos del webhook). Best-effort. */
export async function setLeadEmailSent(
  leadId: string,
  messageId: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(TABLE)
    .update({
      email_status: "sent",
      email_message_id: messageId,
      email_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) console.error("[imagina-leads] setLeadEmailSent error:", error.message);
}

/** Actualiza el estado del email de la fila cuyo message_id casa con el evento de
 *  Resend. Devuelve el nº de filas actualizadas (0 si no rastreamos ese email). */
export async function setLeadEmailStatusByMessageId(
  messageId: string,
  status: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { data, error } = await sb
    .from(TABLE)
    .update({ email_status: status, email_updated_at: new Date().toISOString() })
    .eq("email_message_id", messageId)
    .select("id");
  if (error) {
    console.error(
      "[imagina-leads] setLeadEmailStatusByMessageId error:",
      error.message,
    );
    return 0;
  }
  return data?.length ?? 0;
}
```

- [ ] **Step 5: Correr y verificar que pasan**

Run: `npx vitest run src/lib/__tests__/email-status.test.ts src/lib/__tests__/imagina-leads-email.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head` → sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email-status.ts src/lib/imagina-leads.ts src/lib/__tests__/email-status.test.ts src/lib/__tests__/imagina-leads-email.test.ts
git commit -m "feat(crm): columnas de estado de email + helpers y edición de contacto"
```

---

### Task 2: Helper de envío reutilizable + wiring del handler de Meta

**Files:**
- Create: `src/lib/kit-digital-2026-resend.ts`
- Modify: `src/lib/kit-digital-2026-meta.ts`
- Test: `src/lib/__tests__/kit-digital-2026-resend.test.ts`, `src/lib/__tests__/kit-digital-2026-meta.test.ts` (actualizar)

**Interfaces:**
- Consumes: `buildKitDigital2026Email` (`./kit-digital-2026-email`), `setLeadEmailSent` (Task 1), `createWebhookLead`.
- Produces: `sendKitDigital2026Email(input: { leadId: string; name?: string | null; email: string }): Promise<{ ok: boolean; messageId?: string; error?: string }>` — manda el email de marca y, con `data.id`, persiste `setLeadEmailSent`.

- [ ] **Step 1: Test del helper (falla)**

Crear `src/lib/__tests__/kit-digital-2026-resend.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, setSentMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  setSentMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("../imagina-leads", () => ({ setLeadEmailSent: setSentMock }));

import { sendKitDigital2026Email } from "../kit-digital-2026-resend";

describe("sendKitDigital2026Email", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: "msg-1" }, error: null });
    setSentMock.mockReset().mockResolvedValue(undefined);
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("manda el email y persiste el message_id como 'enviado'", async () => {
    const res = await sendKitDigital2026Email({ leadId: "lead-1", name: "Rosario", email: "r@example.com" });
    expect(res.ok).toBe(true);
    expect(res.messageId).toBe("msg-1");
    const msg = sendMock.mock.calls[0][0];
    expect(msg.to).toBe("r@example.com");
    expect(msg.html).toContain("/kit-digital-2026?email=r%40example.com");
    expect(setSentMock).toHaveBeenCalledWith("lead-1", "msg-1");
  });

  test("error de Resend → ok:false y NO persiste enviado", async () => {
    sendMock.mockReset().mockResolvedValue({ data: null, error: { message: "bounce" } });
    const res = await sendKitDigital2026Email({ leadId: "lead-1", name: "X", email: "x@example.com" });
    expect(res.ok).toBe(false);
    expect(setSentMock).not.toHaveBeenCalled();
  });

  test("sin RESEND_API_KEY → ok:false sin intentar enviar", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendKitDigital2026Email({ leadId: "l", name: "X", email: "x@example.com" });
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-resend.test.ts`
Expected: FAIL — `sendKitDigital2026Email` no existe.

- [ ] **Step 3: Crear `kit-digital-2026-resend.ts`**

```ts
import "server-only";
import { Resend } from "resend";
import { buildKitDigital2026Email } from "./kit-digital-2026-email";
import { setLeadEmailSent } from "./imagina-leads";

/** Manda el email de marca "casi has terminado" al lead y, si Resend devuelve un
 *  message id, lo persiste en el CRM (email_status='sent'). Best-effort en la
 *  persistencia; el resultado refleja el envío. Lo usan el webhook de Meta y la
 *  acción "Reenviar" del panel. */
export async function sendKitDigital2026Email(input: {
  leadId: string;
  name?: string | null;
  email: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const mail = buildKitDigital2026Email({ name: input.name ?? "", email: input.email });
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (error) {
      console.error("[kit-digital-2026-resend] send error:", error);
      return { ok: false, error: "send_failed" };
    }
    const messageId = data?.id;
    if (messageId) await setLeadEmailSent(input.leadId, messageId);
    return { ok: true, messageId };
  } catch (err) {
    console.error("[kit-digital-2026-resend] threw:", err);
    return { ok: false, error: "send_threw" };
  }
}
```

- [ ] **Step 4: Refactor de `kit-digital-2026-meta.ts`**

Reemplazar el bloque de envío inline (el que crea `new Resend(...)` y llama `resend.emails.send`) por una llamada al helper, usando el `id` del lead guardado:

```ts
import "server-only";
import { createWebhookLead } from "./imagina-leads";
import { sendKitDigital2026Email } from "./kit-digital-2026-resend";

const CAMPAIGN = "Kit Digital 2026";

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
    status: "kit-digital",
    notes: "Origen: Meta Lead Ads (campaña Kit Digital) · pendiente de completar datos en la landing",
  });
  if (!saved.ok) return saved;

  // Email al lead (best-effort). El helper persiste el estado de envío.
  if (email && saved.id) {
    await sendKitDigital2026Email({ leadId: saved.id, name: clean(input.name), email });
  }
  return saved;
}
```

(Se elimina el import de `Resend` y `buildKitDigital2026Email` de este archivo.)

- [ ] **Step 5: Actualizar el test del handler de Meta**

En `src/lib/__tests__/kit-digital-2026-meta.test.ts`: en vez de mockear `resend`, mockear el helper. Reemplazar el bloque de mocks y aserciones de email:

```ts
const { createWebhookLeadMock, sendEmailMock } = vi.hoisted(() => ({
  createWebhookLeadMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("../imagina-leads", () => ({ createWebhookLead: createWebhookLeadMock }));
vi.mock("../kit-digital-2026-resend", () => ({ sendKitDigital2026Email: sendEmailMock }));

import { handleKitDigital2026MetaLead } from "../kit-digital-2026-meta";

describe("handleKitDigital2026MetaLead", () => {
  beforeEach(() => {
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "meta-1" });
    sendEmailMock.mockReset().mockResolvedValue({ ok: true, messageId: "msg-1" });
  });

  test("inserta lead (Meta, Kit Digital 2026, kit-digital) y manda el email al lead", async () => {
    const res = await handleKitDigital2026MetaLead({
      id: "lg-123", name: "Marta", email: "marta@example.com", phone: "600111222",
    });
    expect(res.ok).toBe(true);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.id).toBe("lg-123");
    expect(row.channel).toBe("Meta");
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.status).toBe("kit-digital");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.leadId).toBe("meta-1");
    expect(arg.email).toBe("marta@example.com");
  });

  test("sin email → guarda el lead pero no manda email", async () => {
    const res = await handleKitDigital2026MetaLead({ name: "Sin Email", phone: "600111222" });
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test("si el guardado falla, no intenta enviar", async () => {
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: false, error: "supabase_not_configured" });
    const res = await handleKitDigital2026MetaLead({ email: "x@example.com", name: "X" });
    expect(res.ok).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Correr los tests + tipos**

Run: `npx vitest run src/lib/__tests__/kit-digital-2026-resend.test.ts src/lib/__tests__/kit-digital-2026-meta.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head` → sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/kit-digital-2026-resend.ts src/lib/kit-digital-2026-meta.ts src/lib/__tests__/kit-digital-2026-resend.test.ts src/lib/__tests__/kit-digital-2026-meta.test.ts
git commit -m "feat(crm): helper de envío reutilizable que persiste el message_id de Resend"
```

---

### Task 3: Verificación de firma Svix + endpoint de webhook de Resend

**Files:**
- Create: `src/lib/resend-webhook.ts`
- Create: `src/app/api/resend/webhook/route.ts`
- Test: `src/lib/__tests__/resend-webhook.test.ts`

**Interfaces:**
- Produces (`resend-webhook.ts`):
  - `verifyResendSignature(secret: string, headers: { id: string|null; timestamp: string|null; signature: string|null }, rawBody: string): boolean`
  - `resendEventStatus(type: string): "delivered" | "bounced" | "complained" | null`
- Consumes (route): `setLeadEmailStatusByMessageId` (Task 1).

- [ ] **Step 1: Test de la lib (falla)**

Crear `src/lib/__tests__/resend-webhook.test.ts`:

```ts
import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { verifyResendSignature, resendEventStatus } from "../resend-webhook";

// Genera una firma Svix válida para el test (mismo algoritmo que el verificador).
function sign(secretB64: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secretB64, "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return `v1,${sig}`;
}

const SECRET_B64 = Buffer.from("supersecretkey-supersecretkey").toString("base64");
const SECRET = `whsec_${SECRET_B64}`;

describe("verifyResendSignature", () => {
  const id = "msg_1";
  const ts = "1700000000";
  const body = '{"type":"email.bounced"}';

  test("firma válida → true", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body)).toBe(true);
  });

  test("acepta el secreto sin el prefijo whsec_", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET_B64, { id, timestamp: ts, signature }, body)).toBe(true);
  });

  test("cuerpo alterado → false", () => {
    const signature = sign(SECRET_B64, id, ts, body);
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body + "x")).toBe(false);
  });

  test("faltan headers → false", () => {
    expect(verifyResendSignature(SECRET, { id: null, timestamp: ts, signature: "v1,x" }, body)).toBe(false);
  });

  test("varias firmas en el header, una válida → true", () => {
    const good = sign(SECRET_B64, id, ts, body);
    const signature = `v1,otracosa ${good}`;
    expect(verifyResendSignature(SECRET, { id, timestamp: ts, signature }, body)).toBe(true);
  });
});

describe("resendEventStatus", () => {
  test("mapea los eventos que rastreamos", () => {
    expect(resendEventStatus("email.delivered")).toBe("delivered");
    expect(resendEventStatus("email.bounced")).toBe("bounced");
    expect(resendEventStatus("email.complained")).toBe("complained");
  });
  test("otros eventos → null", () => {
    expect(resendEventStatus("email.sent")).toBeNull();
    expect(resendEventStatus("email.opened")).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/lib/__tests__/resend-webhook.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Crear `resend-webhook.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica la firma Svix de un webhook de Resend.
 *  `secret` es "whsec_<base64>" (o el base64 pelado). La firma se calcula como
 *  base64(HMAC-SHA256(base64decode(secret), `${id}.${timestamp}.${body}`)) y el
 *  header `svix-signature` trae una lista separada por espacios de "v1,<sig>". */
export function verifyResendSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const part of signature.split(" ")) {
    const comma = part.indexOf(",");
    const sig = comma >= 0 ? part.slice(comma + 1) : part;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

const EVENT_STATUS: Record<string, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** Estado que guardamos según el tipo de evento de Resend, o null si no interesa. */
export function resendEventStatus(
  type: string,
): "delivered" | "bounced" | "complained" | null {
  return EVENT_STATUS[type] ?? null;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/lib/__tests__/resend-webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Crear el endpoint `src/app/api/resend/webhook/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyResendSignature, resendEventStatus } from "@/lib/resend-webhook";
import { setLeadEmailStatusByMessageId } from "@/lib/imagina-leads";

// Recibe los eventos de entrega de Resend (Svix) y actualiza el estado del email
// del lead en el CRM. La firma se verifica SIEMPRE; sin firma válida no se muta nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
  }

  // Cuerpo crudo (necesario para verificar la firma).
  const raw = await req.text();
  const valid = verifyResendSignature(
    secret,
    {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    raw,
  );
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string; id?: string } } = {};
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const status = resendEventStatus(event.type ?? "");
  const messageId = event.data?.email_id ?? event.data?.id ?? null;
  if (status && messageId) {
    await setLeadEmailStatusByMessageId(messageId, status);
  }
  // 200 con firma válida aunque no case ninguna fila → evita reintentos de Resend.
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "resend-webhook", method: "POST" });
}
```

- [ ] **Step 6: Tipos + suite del webhook**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head` → sin errores.
Run: `npx vitest run src/lib/__tests__/resend-webhook.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resend-webhook.ts src/app/api/resend/webhook/route.ts src/lib/__tests__/resend-webhook.test.ts
git commit -m "feat(crm): webhook de Resend con verificación de firma Svix → estado de email"
```

---

### Task 4: Acciones del panel — editar contacto + reenviar

**Files:**
- Modify: `src/app/(site)/panel/actions.ts`

**Interfaces:**
- Consumes: `updateLeadField` (ampliado en Task 1), `sendKitDigital2026Email` (Task 2), `listLeads` o una lectura puntual del lead.
- Produces: `setLeadName`, `setLeadEmail`, `setLeadPhone` (formData → void); `resendKitDigitalEmailAction(formData): Promise<{ ok: boolean; error?: string }>`.

Nota: `actions.ts` no tiene tests unitarios en el repo (usa `next/headers`/`next/cache`). La verificación es typecheck + build; la lógica de envío ya está testeada en Task 2.

- [ ] **Step 1: Añadir las acciones de contacto**

En `src/app/(site)/panel/actions.ts`, tras `setLeadCampaign`, añadir:

```ts
export async function setLeadName(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "name", String(formData.get("name") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadEmail(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "email", String(formData.get("email") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadPhone(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "phone", String(formData.get("phone") ?? ""));
    revalidatePath("/panel");
  }
}
```

- [ ] **Step 2: Añadir la acción de reenviar**

Añadir el import y la acción. Se busca el lead entre `listLeads()` (misma fuente que el panel), se valida campaña + email, y se reenvía:

```ts
import { /* …existentes… */, listLeads } from "@/lib/imagina-leads";
import { sendKitDigital2026Email } from "@/lib/kit-digital-2026-resend";
```

```ts
export async function resendKitDigitalEmailAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el id." };
  const lead = (await listLeads()).find((l) => l.id === id);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (lead.campaign !== "Kit Digital 2026") {
    return { ok: false, error: "Solo para leads de Kit Digital 2026." };
  }
  const email = (lead.email ?? "").trim();
  if (!email) return { ok: false, error: "El lead no tiene email." };

  const res = await sendKitDigital2026Email({ leadId: id, name: lead.name, email });
  revalidatePath("/panel");
  if (!res.ok) return { ok: false, error: "No se pudo reenviar. Inténtalo de nuevo." };
  return { ok: true };
}
```

- [ ] **Step 3: Tipos**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/panel/actions.ts"
git commit -m "feat(crm): acciones de editar contacto y reenviar email en el panel"
```

---

### Task 5: UI del panel — columna Email, campos editables, botón Reenviar

**Files:**
- Modify: `src/app/(site)/panel/LeadsTable.tsx`
- Modify: `src/app/(site)/panel/page.tsx`

**Interfaces:**
- Consumes: `setLeadName`/`setLeadEmail`/`setLeadPhone`/`resendKitDigitalEmailAction` (Task 4), `emailStatusLabel`/`EMAIL_STATUS_COLORS` (Task 1). Reutiliza el componente `InlineText` existente.

- [ ] **Step 1: Pasar el estado de email desde `page.tsx`**

En `src/app/(site)/panel/page.tsx`, en el `map` a `LeadRowView`, añadir tras `status`:

```ts
    status: String(l.status),
    email_status: l.email_status,
    archived: l.archived,
```

- [ ] **Step 2: Extender `LeadRowView` y los imports en `LeadsTable.tsx`**

En `interface LeadRowView`, añadir `email_status: string | null;`.

Ampliar los imports:

```ts
import {
  setLeadStatus,
  setLeadAccountManager,
  setLeadNotes,
  setLeadFollowup,
  setLeadChannel,
  setLeadCampaign,
  setLeadName,
  setLeadEmail,
  setLeadPhone,
  resendKitDigitalEmailAction,
  archiveLeadsAction,
  deleteLeadsAction,
  createLeadAction,
} from "./actions";
import { LEAD_STATUSES, STATUS_COLORS, statusLabel } from "@/lib/lead-status";
import { emailStatusLabel, EMAIL_STATUS_COLORS } from "@/lib/email-status";
import { ACCOUNT_MANAGERS, AM_COLORS } from "@/lib/account-managers";
```

- [ ] **Step 3: Añadir la cabecera "Estado email"**

En el array de cabeceras, insertar `"Estado email"` justo después de `"Email"`:

```ts
              {[
                "Fecha",
                "Nombre",
                "Teléfono",
                "Email",
                "Estado email",
                "Web",
                "Canal",
                "Campaña",
                "Notas adicionales",
                "Account manager",
                "Estado",
                "Seguimiento",
              ].map((h) => (
```

Y actualizar el `colSpan` de la fila vacía de `12` a `13`.

- [ ] **Step 4: Hacer editables nombre/teléfono/email y añadir la celda de estado + Reenviar**

Reemplazar las celdas de Nombre, Teléfono y Email por versiones editables con `InlineText`, y añadir tras la de Email una celda con el badge de estado y el botón Reenviar:

```tsx
                  <td style={{ ...td, fontWeight: 600, minWidth: 160 }}>
                    <InlineText
                      id={l.id}
                      field="name"
                      action={setLeadName}
                      value={l.name ?? ""}
                      placeholder="—"
                    />
                  </td>
                  <td style={{ ...td, minWidth: 150 }}>
                    <InlineText
                      id={l.id}
                      field="phone"
                      action={setLeadPhone}
                      value={l.phone ?? ""}
                      placeholder="—"
                    />
                  </td>
                  <td style={{ ...td, minWidth: 190 }}>
                    <InlineText
                      id={l.id}
                      field="email"
                      action={setLeadEmail}
                      value={l.email ?? ""}
                      placeholder="—"
                    />
                  </td>
                  <td style={td}>
                    <EmailStatusCell
                      id={l.id}
                      status={l.email_status}
                      campaign={l.campaign}
                      hasEmail={!!(l.email ?? "").trim()}
                    />
                  </td>
```

- [ ] **Step 5: Añadir el componente `EmailStatusCell`**

Antes del `btnStyle` (o junto a los demás componentes) añadir:

```tsx
/** Badge de estado del email + botón Reenviar para leads de Kit Digital 2026.
 *  El botón se resalta (rojo) cuando el email rebotó o fue marcado como spam. */
function EmailStatusCell({
  id,
  status,
  campaign,
  hasEmail,
}: {
  id: string;
  status: string | null;
  campaign: string | null;
  hasEmail: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const color = status ? EMAIL_STATUS_COLORS[status] ?? "#94a3b8" : "#cbd5e1";
  const canResend = campaign === "Kit Digital 2026" && hasEmail;
  const failed = status === "bounced" || status === "complained";

  const resend = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await resendKitDigitalEmailAction(fd);
      setMsg(r.ok ? "Reenviado ✓" : r.error ?? "Error");
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
      <span
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          borderRadius: 999,
          background: status ? color : "#fff",
          color: status ? "#fff" : "#94a3b8",
          border: status ? "none" : "1px solid #e2e8f0",
          fontWeight: 700,
          fontSize: 12,
          padding: "3px 10px",
        }}
      >
        {emailStatusLabel(status)}
      </span>
      {canResend && (
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          style={{
            alignSelf: "flex-start",
            border: `1px solid ${failed ? "#dc2626" : "#cbd5e1"}`,
            background: failed ? "#fef2f2" : "#fff",
            color: failed ? "#b91c1c" : "#475569",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Enviando…" : failed ? "⟳ Reenviar" : "Reenviar"}
        </button>
      )}
      {msg && <span style={{ fontSize: 11, color: "#64748b" }}>{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 6: Tipos + build**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head`
Expected: sin errores.

Run: `npm run build 2>&1 | tail -5`
Expected: build OK.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/panel/LeadsTable.tsx" "src/app/(site)/panel/page.tsx"
git commit -m "feat(crm): columna de estado de email, contacto editable y botón Reenviar"
```

---

### Task 6: Verificación end-to-end + build

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa**

Run: `npx vitest run 2>&1 | grep -E "Test Files|Tests "`
Expected: todo verde.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | head`
Expected: sin errores.

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | grep -E "api/resend|/panel|Compiled|error" | head`
Expected: build OK; `/api/resend/webhook` aparece en el árbol de rutas.

- [ ] **Step 4: Checklist manual (post-deploy, con la migración y el webhook configurados)**

- Migración SQL corrida en Supabase (3 columnas + índice).
- `RESEND_WEBHOOK_SECRET` en Vercel + webhook creado en Resend (eventos delivered/bounced/complained) apuntando a `/api/resend/webhook`.
- Nuevo lead de Meta → panel muestra "Enviado"; al entregarse pasa a "Entregado" (verde); un rebote pasa a "Rebotado" (rojo) y aparece "⟳ Reenviar" resaltado.
- Editar el email de un lead rebotado → "Reenviar" → estado vuelve a "Enviado".
- Editar nombre/teléfono/email inline persiste al salir del campo.

## Notas de despliegue

- **Supabase:** correr el SQL del Prerequisito (una vez).
- **Resend → Webhooks:** añadir endpoint `https://www.dinkbit.es/api/resend/webhook`, eventos `email.delivered`, `email.bounced`, `email.complained` (opcional `email.sent`), copiar el **Signing Secret** (`whsec_…`) → `RESEND_WEBHOOK_SECRET` en Vercel (Production) + redeploy.
