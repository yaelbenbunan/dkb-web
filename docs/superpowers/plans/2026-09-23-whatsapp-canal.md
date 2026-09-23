# Canal de WhatsApp (entrega 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recibir mensajes de WhatsApp en `dkb-web`, atribuir como leads los que llegan de anuncios CTWA, responderles acuse + una pregunta, y dar bandeja en el panel para las respuestas manuales.

**Architecture:** Un webhook en `/api/whatsapp/webhook` verifica la firma de Meta, persiste la conversación en dos tablas `ventas_*` y delega en funciones puras la clasificación del mensaje y el cálculo de la ventana. El envío vive detrás de `MensajeroWhatsApp`, que en ausencia de credenciales funciona en modo simulación. La bandeja es una pantalla más del módulo de ventas.

**Tech Stack:** Next.js App Router (runtime nodejs), TypeScript, Supabase (clave de servicio), vitest, zod.

**Spec:** `docs/superpowers/specs/2026-09-23-whatsapp-canal-design.md`

## Global Constraints

- Rama de trabajo: `feat/whatsapp-canal`. Ya existe y contiene el spec.
- Código y comentarios **en español**, como el resto del módulo de ventas.
- Tablas nuevas con prefijo `ventas_`, **RLS activada sin políticas**. Migración manual en `docs/sql/`, nunca automática.
- Acceso a datos siempre con `getSupabaseAdmin()` desde `src/lib/supabase-admin.ts`, en ficheros con `import "server-only"`.
- El token de Meta **nunca sale del servidor**: ni componentes cliente, ni rutas que lo devuelvan.
- El webhook devuelve **200 siempre que la firma sea válida**, aunque no procese nada. Solo 401 (firma mala) y 403 (verificación GET fallida) son respuestas de error.
- Variables de entorno: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.
- Versión de la Graph API: `v21.0`, en una constante única.
- Tests con `npm test` (vitest). Antes de cada commit: `npm test` y `npm run typecheck`.

## Review Focus

Cinco cosas que el spec da por supuestas y que romperían el canal en manos de una persona real. Cada una tiene su test asignado a la tarea que la implementa:

1. **Mensaje entrante que no es texto** (imagen, audio, ubicación, pulsación de botón): debe guardarse sin romper y sin generar una autorespuesta vacía. → Tarea 6.
2. **Reintento de Meta con el mismo `wamid`**: debe producir una sola autorespuesta, no dos. → Tarea 5.
3. **Cuerpo con firma válida pero sin `messages`** (solo `statuses`, o eventos de plantilla que Meta también manda a la misma URL): 200 y ninguna escritura. → Tareas 6 y 7.
4. **Teléfono extranjero o de longitud rara**: no debe casar por error con el lead de otra persona al comparar solo 9 dígitos. → Tarea 3.
5. **Fallo de envío de Meta** (token caducado, ventana cerrada, número bloqueado): el mensaje entrante ya está guardado, el error queda registrado y la petición nunca devuelve 500. → Tarea 7.

---

### Task 1: Migración SQL del canal

**Files:**
- Create: `docs/sql/2026-09-23-whatsapp-canal.sql`

**Interfaces:**
- Consumes: tablas `ventas_marcas` y `ventas_leads` (ya existen).
- Produces: tablas `ventas_conversaciones` y `ventas_mensajes` con los nombres de columna que usan todas las tareas siguientes.

- [ ] **Step 1: Escribir la migración**

```sql
-- Canal de WhatsApp del módulo de ventas B2B (/panel/ventas), entrega 1.
-- Spec: docs/superpowers/specs/2026-09-23-whatsapp-canal-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- RLS activada sin políticas, como el resto del módulo: solo la lee la clave
-- de servicio desde el servidor.

create table if not exists public.ventas_conversaciones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  lead_id uuid references public.ventas_leads(id) on delete set null,
  wa_id text not null,
  estado text not null default 'humana' check (estado in ('bot', 'humana', 'cerrada')),
  ventana_hasta timestamptz,
  ultimo_mensaje_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists ventas_conversaciones_marca_wa_idx
  on public.ventas_conversaciones (marca_id, wa_id);
create index if not exists ventas_conversaciones_recientes_idx
  on public.ventas_conversaciones (marca_id, ultimo_mensaje_at desc);

create table if not exists public.ventas_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.ventas_conversaciones(id) on delete cascade,
  direccion text not null check (direccion in ('entrante', 'saliente')),
  wamid text,
  texto text,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'enviado' check (estado in ('enviado', 'entregado', 'leido', 'fallido')),
  error text,
  created_at timestamptz not null default now()
);
-- Único y parcial: los salientes simulados no tienen wamid y no deben chocar.
create unique index if not exists ventas_mensajes_wamid_idx
  on public.ventas_mensajes (wamid) where wamid is not null;
create index if not exists ventas_mensajes_hilo_idx
  on public.ventas_mensajes (conversacion_id, created_at);

alter table public.ventas_conversaciones enable row level security;
alter table public.ventas_mensajes enable row level security;
```

- [ ] **Step 2: Commit**

```bash
git add docs/sql/2026-09-23-whatsapp-canal.sql
git commit -m "feat(ventas): migración del canal de WhatsApp"
```

**Nota para quien ejecute:** la migración se aplica a mano en Supabase. El resto del plan no depende de que esté aplicada salvo en la comprobación manual final.

---

### Task 2: Verificación de la firma de Meta

**Files:**
- Create: `src/lib/whatsapp/firma.ts`
- Test: `src/lib/whatsapp/__tests__/firma.test.ts`

**Interfaces:**
- Produces: `verificarFirmaMeta(appSecret: string, cabecera: string | null, cuerpoCrudo: string): boolean`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verificarFirmaMeta } from "../firma";

const SECRETO = "secreto-de-prueba";
const CUERPO = '{"object":"whatsapp_business_account","entry":[]}';
const firmaDe = (cuerpo: string, secreto = SECRETO) =>
  `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;

describe("verificarFirmaMeta", () => {
  it("acepta una firma correcta", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO), CUERPO)).toBe(true);
  });

  it("rechaza si el cuerpo fue alterado", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO), CUERPO + " ")).toBe(false);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    expect(verificarFirmaMeta(SECRETO, firmaDe(CUERPO, "otro"), CUERPO)).toBe(false);
  });

  it("rechaza cabecera ausente o con formato raro", () => {
    expect(verificarFirmaMeta(SECRETO, null, CUERPO)).toBe(false);
    expect(verificarFirmaMeta(SECRETO, "sha1=abc", CUERPO)).toBe(false);
    expect(verificarFirmaMeta(SECRETO, "sha256=nohex", CUERPO)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/firma.test.ts`
Expected: FAIL, no existe el módulo `../firma`.

- [ ] **Step 3: Implementar**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la cabecera `X-Hub-Signature-256` de Meta contra el cuerpo CRUDO.
 * La comparación es en tiempo constante: comparar hashes con `===` filtra
 * información por el tiempo de respuesta.
 */
export function verificarFirmaMeta(
  appSecret: string,
  cabecera: string | null,
  cuerpoCrudo: string,
): boolean {
  if (!appSecret || !cabecera?.startsWith("sha256=")) return false;
  const recibida = cabecera.slice("sha256=".length);
  if (!/^[0-9a-f]+$/i.test(recibida)) return false;

  const esperada = createHmac("sha256", appSecret).update(cuerpoCrudo).digest("hex");
  const a = Buffer.from(recibida, "hex");
  const b = Buffer.from(esperada, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/firma.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/firma.ts src/lib/whatsapp/__tests__/firma.test.ts
git commit -m "feat(whatsapp): verificación de la firma de Meta"
```

---

### Task 3: Ventana de conversación y teléfonos

**Files:**
- Create: `src/lib/whatsapp/ventana.ts`
- Test: `src/lib/whatsapp/__tests__/ventana.test.ts`

**Interfaces:**
- Consumes: `normalizarTelefono` de `src/lib/ventas/dominio.ts` (devuelve los últimos 9 dígitos o `null`).
- Produces:
  - `calcularVentana(recibidoEn: Date, deAnuncio: boolean): Date`
  - `ventanaAbierta(ventanaHasta: string | Date | null, ahora: Date): boolean`
  - `telefonoDeWaId(waId: string): string | null`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { calcularVentana, telefonoDeWaId, ventanaAbierta } from "../ventana";

const EN = (iso: string) => new Date(iso);

describe("calcularVentana", () => {
  it("da 24 horas a un mensaje normal", () => {
    expect(calcularVentana(EN("2026-09-23T10:00:00Z"), false).toISOString()).toBe(
      "2026-09-24T10:00:00.000Z",
    );
  });

  it("da 72 horas a uno que viene de un anuncio", () => {
    expect(calcularVentana(EN("2026-09-23T10:00:00Z"), true).toISOString()).toBe(
      "2026-09-26T10:00:00.000Z",
    );
  });
});

describe("ventanaAbierta", () => {
  it("está abierta antes de caducar y cerrada justo al caducar", () => {
    const hasta = "2026-09-24T10:00:00.000Z";
    expect(ventanaAbierta(hasta, EN("2026-09-24T09:59:59Z"))).toBe(true);
    expect(ventanaAbierta(hasta, EN("2026-09-24T10:00:00Z"))).toBe(false);
  });

  it("sin ventana registrada está cerrada", () => {
    expect(ventanaAbierta(null, EN("2026-09-23T10:00:00Z"))).toBe(false);
  });
});

describe("telefonoDeWaId", () => {
  it("saca el teléfono español de un wa_id con prefijo", () => {
    expect(telefonoDeWaId("34660415514")).toBe("660415514");
  });

  it("no casa números demasiado cortos", () => {
    expect(telefonoDeWaId("1234")).toBeNull();
  });

  // Review Focus 4: dos extranjeros distintos no pueden colapsar en el mismo lead.
  it("distingue números extranjeros que comparten cola", () => {
    expect(telefonoDeWaId("15551234567")).not.toBe(telefonoDeWaId("445551234567"));
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/ventana.test.ts`
Expected: FAIL, no existe `../ventana`.

- [ ] **Step 3: Implementar**

```ts
import { normalizarTelefono } from "../ventas/dominio";

const HORA = 60 * 60 * 1000;

/** Meta abre 24 h al responder, 72 h si el mensaje vino de un anuncio CTWA. */
export function calcularVentana(recibidoEn: Date, deAnuncio: boolean): Date {
  return new Date(recibidoEn.getTime() + (deAnuncio ? 72 : 24) * HORA);
}

export function ventanaAbierta(ventanaHasta: string | Date | null, ahora: Date): boolean {
  if (!ventanaHasta) return false;
  const hasta = ventanaHasta instanceof Date ? ventanaHasta : new Date(ventanaHasta);
  return Number.isFinite(hasta.getTime()) && hasta.getTime() > ahora.getTime();
}

/**
 * El `wa_id` de Meta viene con prefijo de país («34660415514») y el CRM guarda
 * los últimos 9 dígitos. Para números de fuera de España esa cola puede
 * coincidir entre personas distintas, así que se devuelve el número completo:
 * más vale no casar que casar mal.
 */
export function telefonoDeWaId(waId: string): string | null {
  const digitos = waId.replace(/\D/g, "");
  if (digitos.length < 6) return null;
  if (digitos.startsWith("34") && digitos.length === 11) return normalizarTelefono(digitos);
  return digitos;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/ventana.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/ventana.ts src/lib/whatsapp/__tests__/ventana.test.ts
git commit -m "feat(whatsapp): ventana de conversación y normalización de wa_id"
```

---

### Task 4: El mensajero

**Files:**
- Create: `src/lib/whatsapp/mensajero.ts`
- Test: `src/lib/whatsapp/__tests__/mensajero.test.ts`

**Interfaces:**
- Produces:
  - `type ResultadoEnvio = { ok: true; wamid: string | null } | { ok: false; error: string }`
  - `interface MensajeroWhatsApp { enviarTexto(waId: string, texto: string): Promise<ResultadoEnvio> }`
  - `crearMensajero(config?: ConfigMensajero): MensajeroWhatsApp`
  - `mensajeroSimulado(): MensajeroWhatsApp & { enviados: Array<{ waId: string; texto: string }> }`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it, vi } from "vitest";
import { crearMensajero, mensajeroSimulado } from "../mensajero";

describe("mensajeroSimulado", () => {
  it("registra lo enviado y no llama a la red", async () => {
    const m = mensajeroSimulado();
    const res = await m.enviarTexto("34660415514", "hola");
    expect(res).toEqual({ ok: true, wamid: null });
    expect(m.enviados).toEqual([{ waId: "34660415514", texto: "hola" }]);
  });
});

describe("crearMensajero", () => {
  it("sin credenciales devuelve el simulado", async () => {
    const m = crearMensajero({ token: "", phoneNumberId: "" });
    const res = await m.enviarTexto("34660415514", "hola");
    expect(res.ok).toBe(true);
  });

  it("llama a la Graph API con el cuerpo correcto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.ABC" }] }),
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    const res = await m.enviarTexto("34660415514", "hola");

    expect(res).toEqual({ ok: true, wamid: "wamid.ABC" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: "whatsapp",
      to: "34660415514",
      type: "text",
      text: { body: "hola" },
    });
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  // Review Focus 5: un fallo de Meta se devuelve tipado, nunca lanza.
  it("devuelve el error de Meta sin lanzar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Authorization Error", code: 100 } }),
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    expect(await m.enviarTexto("34660415514", "hola")).toEqual({
      ok: false,
      error: "Authorization Error",
    });
  });

  it("devuelve error si la red falla", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    expect(await m.enviarTexto("34660415514", "hola")).toEqual({ ok: false, error: "ECONNRESET" });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/mensajero.test.ts`
Expected: FAIL, no existe `../mensajero`.

- [ ] **Step 3: Implementar**

```ts
export const GRAPH_VERSION = "v21.0";

export type ResultadoEnvio = { ok: true; wamid: string | null } | { ok: false; error: string };

export interface MensajeroWhatsApp {
  enviarTexto(waId: string, texto: string): Promise<ResultadoEnvio>;
}

export interface ConfigMensajero {
  token?: string;
  phoneNumberId?: string;
  fetchImpl?: typeof fetch;
}

/** Guarda lo que se habría enviado. Para tests y para entornos sin credenciales. */
export function mensajeroSimulado(): MensajeroWhatsApp & {
  enviados: Array<{ waId: string; texto: string }>;
} {
  const enviados: Array<{ waId: string; texto: string }> = [];
  return {
    enviados,
    async enviarTexto(waId, texto) {
      enviados.push({ waId, texto });
      return { ok: true, wamid: null };
    },
  };
}

/**
 * Sin token o sin número configurado devuelve el simulado: preferimos no enviar
 * nada a reventar en producción o, peor, escribir a alguien desde una preview.
 */
export function crearMensajero(config: ConfigMensajero = {}): MensajeroWhatsApp {
  const token = config.token ?? process.env.WHATSAPP_TOKEN ?? "";
  const phoneNumberId = config.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  if (!token || !phoneNumberId) return mensajeroSimulado();

  const hacerFetch = config.fetchImpl ?? fetch;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  return {
    async enviarTexto(waId, texto) {
      try {
        const res = await hacerFetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: waId,
            type: "text",
            text: { body: texto },
          }),
        });
        const cuerpo = (await res.json()) as {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        };
        if (!res.ok) return { ok: false, error: cuerpo.error?.message ?? "error desconocido" };
        return { ok: true, wamid: cuerpo.messages?.[0]?.id ?? null };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "error de red" };
      }
    },
  };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/mensajero.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/mensajero.ts src/lib/whatsapp/__tests__/mensajero.test.ts
git commit -m "feat(whatsapp): mensajero con modo simulación"
```

---

### Task 5: Acceso a datos del canal

**Files:**
- Create: `src/lib/whatsapp/db.ts`
- Test: `src/lib/whatsapp/__tests__/db.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin` de `src/lib/supabase-admin.ts`.
- Produces:
  - `interface Conversacion { id: string; marca_id: string; lead_id: string | null; wa_id: string; estado: "bot" | "humana" | "cerrada"; ventana_hasta: string | null; ultimo_mensaje_at: string }`
  - `getConversacion(marcaId: string, waId: string): Promise<Conversacion | null>`
  - `crearConversacion(input: { marcaId: string; waId: string; leadId: string | null; estado: Conversacion["estado"]; ventanaHasta: Date }): Promise<Conversacion>`
  - `actualizarConversacion(id: string, cambios: { estado?: Conversacion["estado"]; leadId?: string | null; ventanaHasta?: Date }): Promise<void>`
  - `guardarEntrante(input: { conversacionId: string; wamid: string; texto: string | null; payload: unknown }): Promise<{ nuevo: boolean }>`
  - `guardarSaliente(input: { conversacionId: string; wamid: string | null; texto: string; error?: string }): Promise<void>`
  - `listConversaciones(marcaId: string): Promise<Array<Conversacion & { ultimo_texto: string | null }>>`
  - `interface Mensaje { id: string; direccion: "entrante" | "saliente"; wamid: string | null; texto: string | null; estado: "enviado" | "entregado" | "leido" | "fallido"; error: string | null; created_at: string }`
  - `listMensajes(conversacionId: string): Promise<Mensaje[]>`
  - `setEstadoMensaje(wamid: string, estado: "entregado" | "leido" | "fallido"): Promise<void>`

- [ ] **Step 1: Escribir el test que falla**

El único comportamiento con lógica propia es la idempotencia: `guardarEntrante` devuelve `{ nuevo: false }` cuando el `wamid` ya existía. El resto son consultas finas que se cubren en la tarea 7 con el cliente simulado. Aquí se testea con un doble de Supabase.

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

import { guardarEntrante } from "../db";

beforeEach(() => insertMock.mockReset());

describe("guardarEntrante", () => {
  it("dice que es nuevo cuando la fila se inserta", async () => {
    insertMock.mockReturnValue({ select: () => ({ data: [{ id: "m1" }], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} }))
      .toEqual({ nuevo: true });
  });

  // Review Focus 2: el reintento de Meta no debe producir una segunda respuesta.
  it("dice que no es nuevo si el wamid ya estaba", async () => {
    insertMock.mockReturnValue({ select: () => ({ data: [], error: null }) });
    expect(await guardarEntrante({ conversacionId: "c1", wamid: "w1", texto: "hola", payload: {} }))
      .toEqual({ nuevo: false });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/db.test.ts`
Expected: FAIL, no existe `../db`.

- [ ] **Step 3: Implementar**

Fichero con `import "server-only"` al principio. La pieza crítica es `guardarEntrante`:

```ts
/**
 * Inserta el entrante ignorando duplicados por `wamid`. Meta reintenta el
 * webhook cuando tarda en llegar el 200, así que el mismo mensaje puede
 * llegar varias veces; `nuevo: false` es la señal de que no hay que volver
 * a responder.
 */
export async function guardarEntrante(input: {
  conversacionId: string;
  wamid: string;
  texto: string | null;
  payload: unknown;
}): Promise<{ nuevo: boolean }> {
  const { data, error } = await getSupabaseAdmin()
    .from("ventas_mensajes")
    .insert(
      {
        conversacion_id: input.conversacionId,
        direccion: "entrante",
        wamid: input.wamid,
        texto: input.texto,
        payload: input.payload ?? {},
        estado: "entregado",
      },
      { onConflict: "wamid", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`No se pudo guardar el mensaje entrante: ${error.message}`);
  return { nuevo: (data ?? []).length > 0 };
}
```

El resto de funciones siguen el estilo de `src/lib/ventas/db.ts`: las lecturas lanzan si Supabase falla (una bandeja que enseña «0 conversaciones» por un error de red engaña justo en lo que sirve), y las escrituras que alimentan formularios devuelven `{ ok, error }`.

`listConversaciones` ordena por `ultimo_mensaje_at desc` y trae el último texto con una subconsulta sobre `ventas_mensajes`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/db.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/db.ts src/lib/whatsapp/__tests__/db.test.ts
git commit -m "feat(whatsapp): acceso a conversaciones y mensajes"
```

---

### Task 6: Clasificador del mensaje entrante

**Files:**
- Create: `src/lib/whatsapp/entrante.ts`
- Test: `src/lib/whatsapp/__tests__/entrante.test.ts`

**Interfaces:**
- Produces:
  - `interface MensajeEntrante { wamid: string; waId: string; texto: string | null; tipo: string; recibidoEn: Date; referral: { campana: string | null; anuncio: string | null; titular: string | null } | null }`
  - `extraerMensajes(cuerpo: unknown): MensajeEntrante[]`
  - `extraerEstados(cuerpo: unknown): Array<{ wamid: string; estado: "entregado" | "leido" | "fallido" }>`
  - `type Decision = { accion: "crear_lead_y_responder" } | { accion: "responder" } | { accion: "guardar_respuesta" } | { accion: "solo_guardar" }`
  - `decidir(input: { mensaje: MensajeEntrante; conversacion: { estado: "bot" | "humana" | "cerrada" } | null; leadExiste: boolean }): Decision`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { decidir, extraerEstados, extraerMensajes } from "../entrante";

const sobre = (value: unknown) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "1058918150452294", changes: [{ field: "messages", value }] }],
});

describe("extraerMensajes", () => {
  it("saca texto, wa_id y referral de un mensaje de anuncio", () => {
    const [m] = extraerMensajes(
      sobre({
        messaging_product: "whatsapp",
        messages: [
          {
            id: "wamid.A",
            from: "34660415514",
            timestamp: "1790000000",
            type: "text",
            text: { body: "hola" },
            referral: {
              source_id: "120200000000",
              headline: "Tu web en 7 días",
              ctwa_clid: "abc",
            },
          },
        ],
      }),
    );
    expect(m.wamid).toBe("wamid.A");
    expect(m.waId).toBe("34660415514");
    expect(m.texto).toBe("hola");
    expect(m.referral?.anuncio).toBe("120200000000");
    expect(m.referral?.titular).toBe("Tu web en 7 días");
  });

  // Review Focus 1: los no-texto no pueden romper ni generar respuesta vacía.
  it("acepta mensajes que no son de texto dejando el texto a null", () => {
    const [m] = extraerMensajes(
      sobre({
        messages: [
          { id: "wamid.B", from: "34660415514", timestamp: "1790000000", type: "image", image: { id: "i1" } },
        ],
      }),
    );
    expect(m.tipo).toBe("image");
    expect(m.texto).toBeNull();
  });

  // Review Focus 3: cuerpos sin mensajes no producen nada.
  it("devuelve lista vacía si no hay mensajes", () => {
    expect(extraerMensajes(sobre({ statuses: [] }))).toEqual([]);
    expect(extraerMensajes({})).toEqual([]);
    expect(extraerMensajes(null)).toEqual([]);
  });
});

describe("extraerEstados", () => {
  it("traduce los estados de entrega de Meta", () => {
    const estados = extraerEstados(
      sobre({ statuses: [{ id: "wamid.A", status: "delivered" }, { id: "wamid.B", status: "read" }] }),
    );
    expect(estados).toEqual([
      { wamid: "wamid.A", estado: "entregado" },
      { wamid: "wamid.B", estado: "leido" },
    ]);
  });
});

describe("decidir", () => {
  const base = {
    wamid: "w",
    waId: "34660415514",
    texto: "hola",
    tipo: "text",
    recibidoEn: new Date(),
  };
  const conRef = { ...base, referral: { campana: "c", anuncio: "a", titular: null } };
  const sinRef = { ...base, referral: null };

  it("crea lead y responde si viene de anuncio y no hay lead", () => {
    expect(decidir({ mensaje: conRef, conversacion: null, leadExiste: false }))
      .toEqual({ accion: "crear_lead_y_responder" });
  });

  it("solo responde si viene de anuncio y el lead ya existe", () => {
    expect(decidir({ mensaje: conRef, conversacion: null, leadExiste: true }))
      .toEqual({ accion: "responder" });
  });

  it("no responde a quien llega sin anuncio", () => {
    expect(decidir({ mensaje: sinRef, conversacion: null, leadExiste: false }))
      .toEqual({ accion: "solo_guardar" });
  });

  it("guarda la respuesta cuando la conversación estaba en bot", () => {
    expect(decidir({ mensaje: sinRef, conversacion: { estado: "bot" }, leadExiste: true }))
      .toEqual({ accion: "guardar_respuesta" });
  });

  it("no vuelve a responder en una conversación ya humana", () => {
    expect(decidir({ mensaje: sinRef, conversacion: { estado: "humana" }, leadExiste: true }))
      .toEqual({ accion: "solo_guardar" });
  });

  it("un mensaje sin texto en conversación bot no cuenta como respuesta", () => {
    expect(decidir({ mensaje: { ...sinRef, texto: null, tipo: "image" }, conversacion: { estado: "bot" }, leadExiste: true }))
      .toEqual({ accion: "solo_guardar" });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/entrante.test.ts`
Expected: FAIL, no existe `../entrante`.

- [ ] **Step 3: Implementar**

Módulo puro, sin `server-only`: lo usan el webhook y los tests. `extraerMensajes` navega `entry[].changes[].value.messages[]` defendiéndose de cualquier forma inesperada (Meta manda a la misma URL eventos de plantillas y de calidad del número). El texto solo se rellena si `type === "text"`. `decidir` aplica la tabla del spec y trata «sin texto» como «no es una respuesta».

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/entrante.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/entrante.ts src/lib/whatsapp/__tests__/entrante.test.ts
git commit -m "feat(whatsapp): clasificación de mensajes entrantes"
```

---

### Task 7: La ruta del webhook

**Files:**
- Create: `src/app/api/whatsapp/webhook/route.ts`
- Create: `src/lib/whatsapp/procesar.ts`
- Test: `src/lib/whatsapp/__tests__/procesar.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `procesarWebhook(input: { cuerpo: unknown; deps?: Deps; ahora?: Date }): Promise<{ procesados: number }>`.
  `deps` es **opcional**: si no se pasa, el módulo usa las dependencias reales (`crearMensajero()` y las funciones de `db.ts`). Los tests la pasan siempre para no tocar Supabase ni la red. La ruta la omite.

```ts
export interface Deps {
  mensajero: MensajeroWhatsApp;
  getConversacion: typeof import("./db").getConversacion;
  crearConversacion: typeof import("./db").crearConversacion;
  actualizarConversacion: typeof import("./db").actualizarConversacion;
  guardarEntrante: typeof import("./db").guardarEntrante;
  guardarSaliente: typeof import("./db").guardarSaliente;
  setEstadoMensaje: typeof import("./db").setEstadoMensaje;
  buscarLeadPorTelefono: (marcaId: string, telefono: string) => Promise<{ id: string } | null>;
  crearLeadDeAnuncio: (input: {
    marcaId: string;
    waId: string;
    telefono: string | null;
    campana: string | null;
    anuncio: string | null;
  }) => Promise<{ id: string }>;
}
```

- [ ] **Step 1: Escribir el test que falla**

Tests de `procesarWebhook` con dependencias falsas: que un mensaje de anuncio cree lead, marque `bot` y envíe un texto; que un reintento con el mismo `wamid` no envíe una segunda vez; que un cuerpo solo con `statuses` no escriba nada; y que un fallo de envío quede registrado sin lanzar.

```ts
it("un fallo de envío no rompe el procesado", async () => {
  const deps = depsFalsas({ enviar: async () => ({ ok: false, error: "Authorization Error" }) });
  await expect(procesarWebhook({ cuerpo: sobreDeAnuncio, deps })).resolves.toEqual({ procesados: 1 });
  expect(deps.salientes[0].error).toBe("Authorization Error");
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `procesar.ts` y la ruta**

La ruta queda fina, con la misma forma que la de Resend:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verificarFirmaMeta } from "@/lib/whatsapp/firma";
import { procesarWebhook } from "@/lib/whatsapp/procesar";

// Webhook de WhatsApp Cloud API. La firma se verifica SIEMPRE; sin firma
// válida no se parsea el cuerpo ni se toca la base.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    esperado &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === esperado
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
  }

  const raw = await req.text();
  if (!verificarFirmaMeta(appSecret, req.headers.get("x-hub-signature-256"), raw)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    await procesarWebhook({ cuerpo });
  } catch (e) {
    // Un 500 solo provoca reintentos de Meta y más ruido. Se registra y se
    // devuelve 200: el mensaje entrante, si llegó a guardarse, ya está.
    console.error("[whatsapp] fallo procesando el webhook", e);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/whatsapp/webhook/route.ts src/lib/whatsapp/procesar.ts src/lib/whatsapp/__tests__/procesar.test.ts
git commit -m "feat(whatsapp): webhook de entrada con firma verificada"
```

---

### Task 8: La autorespuesta

**Files:**
- Create: `src/lib/whatsapp/autorespuesta.ts`
- Test: `src/lib/whatsapp/__tests__/autorespuesta.test.ts`
- Modify: `src/lib/whatsapp/procesar.ts`

**Interfaces:**
- Produces: `textoAutorespuesta(input: { titularAnuncio: string | null }): string`

El texto vive en un único sitio para poder cambiarlo sin tocar lógica. Menciona el anuncio cuando Meta manda el titular, porque reconocer de dónde viene la persona sube mucho la tasa de respuesta:

```ts
export function textoAutorespuesta({ titularAnuncio }: { titularAnuncio: string | null }): string {
  const entrada = titularAnuncio
    ? `¡Hola! Gracias por escribirnos desde el anuncio «${titularAnuncio}».`
    : "¡Hola! Gracias por escribirnos.";
  return `${entrada} Soy del equipo de Dinkbit y te leo enseguida.\n\nPara ir adelantando: ¿qué necesitas exactamente, una web nueva o mejorar la que ya tienes?`;
}
```

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { textoAutorespuesta } from "../autorespuesta";

describe("textoAutorespuesta", () => {
  it("menciona el anuncio cuando Meta manda el titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: "Tu web en 7 días" });
    expect(texto).toContain("«Tu web en 7 días»");
    expect(texto).toContain("¿qué necesitas");
  });

  it("funciona sin titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: null });
    expect(texto).toContain("Gracias por escribirnos.");
    expect(texto).not.toContain("«");
  });

  it("nunca pasa del límite de WhatsApp", () => {
    const largo = "x".repeat(2000);
    expect(textoAutorespuesta({ titularAnuncio: largo }).length).toBeLessThanOrEqual(1024);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/autorespuesta.test.ts`
Expected: FAIL, no existe `../autorespuesta`.

- [ ] **Step 3: Implementar**

El código de arriba, más un recorte defensivo del titular a 120 caracteres para que el tercer test pase.

- [ ] **Step 4: Conectar en `procesar.ts`**

En las acciones `crear_lead_y_responder` y `responder`, sustituir el texto fijo por `textoAutorespuesta({ titularAnuncio: mensaje.referral?.titular ?? null })`.

- [ ] **Step 5: Ejecutar todo y commitear**

```bash
npm test && npm run typecheck
git add src/lib/whatsapp/autorespuesta.ts src/lib/whatsapp/__tests__/autorespuesta.test.ts src/lib/whatsapp/procesar.ts
git commit -m "feat(whatsapp): texto de la autorespuesta"
```

---

### Task 9: La bandeja

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/Conversaciones.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones.ts`
- Test: `src/lib/whatsapp/__tests__/bandeja.test.ts`
- Modify: la navegación del panel de marca (añadir la pestaña «Conversaciones»)

**Interfaces:**
- Consumes: `listConversaciones`, `listMensajes`, `ventanaAbierta`, `crearMensajero`, `guardarSaliente`.
- Produces: server action `responder(conversacionId: string, texto: string): Promise<{ ok: boolean; error?: string }>`.

La lógica testeable se extrae a funciones puras en `src/lib/whatsapp/bandeja.ts`: ordenación de la lista, extracto del último mensaje (recortado a 80 caracteres, sin cortar a mitad de palabra) y la etiqueta de la ventana («Abierta · quedan 3 h» / «Cerrada, hace falta plantilla»). Los componentes solo pintan.

La server action valida que el texto no esté vacío ni pase de 1024 caracteres, comprueba `ventanaAbierta` **en el servidor** (no basta con deshabilitar el campo en el navegador), envía y guarda el saliente con su `wamid` o su error.

- [ ] **Step 1: Escribir el test que falla** (`src/lib/whatsapp/__tests__/bandeja.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { etiquetaVentana, extracto } from "../bandeja";

describe("extracto", () => {
  it("deja pasar los textos cortos", () => {
    expect(extracto("hola qué tal")).toBe("hola qué tal");
  });

  it("recorta sin partir palabras", () => {
    const largo = "palabra ".repeat(20).trim();
    const res = extracto(largo);
    expect(res.length).toBeLessThanOrEqual(81);
    expect(res.endsWith("…")).toBe(true);
    expect(res).not.toMatch(/palabr…$/);
  });

  it("describe los mensajes sin texto", () => {
    expect(extracto(null)).toBe("(sin texto)");
  });
});

describe("etiquetaVentana", () => {
  const ahora = new Date("2026-09-23T10:00:00Z");

  it("dice cuánto queda mientras está abierta", () => {
    expect(etiquetaVentana("2026-09-23T13:30:00Z", ahora)).toBe("Abierta · quedan 3 h");
  });

  it("redondea a minutos cuando queda menos de una hora", () => {
    expect(etiquetaVentana("2026-09-23T10:20:00Z", ahora)).toBe("Abierta · quedan 20 min");
  });

  it("avisa de que hace falta plantilla si está cerrada", () => {
    expect(etiquetaVentana("2026-09-23T09:00:00Z", ahora)).toBe("Cerrada, hace falta plantilla");
    expect(etiquetaVentana(null, ahora)).toBe("Cerrada, hace falta plantilla");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/bandeja.test.ts`
Expected: FAIL, no existe `../bandeja`.

- [ ] **Step 3: Implementar `src/lib/whatsapp/bandeja.ts`**

Módulo puro con `extracto` (80 caracteres, corta en el último espacio y añade `…`) y `etiquetaVentana` (usa `ventanaAbierta` de la tarea 3).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/bandeja.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Construir la pantalla**

`page.tsx` es un Server Component que llama a `listConversaciones` y, si la URL trae `?c=<id>`, a `listMensajes`. `Conversaciones.tsx` pinta lista e hilo. `acciones.ts` lleva la server action `responder`, con `"use server"` arriba, la validación descrita y la comprobación de ventana en servidor.

- [ ] **Step 6: Añadir la pestaña en la navegación del panel de marca**

Buscar cómo se declaran las pestañas actuales (tablero, secuencias, condiciones) y añadir «Conversaciones» siguiendo ese patrón.

- [ ] **Step 7: Ejecutar todo y commitear**

```bash
npm test && npm run typecheck && npm run lint
git add src/lib/whatsapp/bandeja.ts src/lib/whatsapp/__tests__/bandeja.test.ts "src/app/(site)/panel/ventas/(app)/[slug]/conversaciones"
git commit -m "feat(ventas): bandeja de conversaciones de WhatsApp"
```

---

### Task 10: Pasar al embudo y alta de la marca

**Files:**
- Modify: la ficha de lead del módulo de ventas (botón «Pasar al embudo»)
- Create: `src/lib/whatsapp/promocion.ts`
- Test: `src/lib/whatsapp/__tests__/promocion.test.ts`
- Create: `docs/sql/2026-09-23-marca-dinkbit.sql`

**Interfaces:**
- Consumes: `crearLead` de `src/lib/imagina-leads.ts` (CRM principal).
- Produces: `datosParaEmbudo(lead: Lead): { name: string; phone: string; channel: string; campaign: string | null }`

La función pura mapea un `ventas_leads` al formato del CRM principal; la server action la usa y registra actividad en el lead de origen para dejar rastro de que se promocionó. Tests del mapeo, incluido el caso de lead sin nombre de contacto.

El SQL da de alta la marca `dinkbit` con su slug, para que el panel exista.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { datosParaEmbudo } from "../promocion";

const lead = {
  id: "l1",
  negocio: "Panadería Sol",
  contacto: "Ana",
  telefono: "660415514",
  email: null,
  origen_detalle: "campana-web-express",
};

describe("datosParaEmbudo", () => {
  it("usa el contacto como nombre cuando lo hay", () => {
    expect(datosParaEmbudo(lead)).toEqual({
      name: "Ana",
      phone: "660415514",
      channel: "WhatsApp",
      campaign: "campana-web-express",
    });
  });

  it("cae al nombre del negocio si no hay contacto", () => {
    expect(datosParaEmbudo({ ...lead, contacto: null }).name).toBe("Panadería Sol");
  });

  it("si no hay ni contacto ni negocio, usa el teléfono", () => {
    expect(datosParaEmbudo({ ...lead, contacto: null, negocio: null }).name).toBe("660415514");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/promocion.test.ts`
Expected: FAIL, no existe `../promocion`.

- [ ] **Step 3: Implementar `promocion.ts`**

Función pura con la cascada de nombre descrita. `channel` es siempre `"WhatsApp"` para que el CRM principal los distinga de los de formulario.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/promocion.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Server action y botón**

La acción llama a `datosParaEmbudo`, crea el lead en el CRM principal con `crearLead` de `imagina-leads.ts`, y registra actividad de tipo `nota` en el lead de ventas con el texto «Pasado al embudo principal», para que quede rastro de quién y cuándo.

- [ ] **Step 6: SQL de alta de la marca**

```sql
-- Marca «Dinkbit» en el módulo de ventas: los leads que entran por WhatsApp
-- desde anuncios CTWA viven aquí antes de pasar al embudo principal.
insert into public.ventas_marcas (nombre, slug, estado)
values ('Dinkbit', 'dinkbit', 'activa')
on conflict (slug) do nothing;
```

- [ ] **Step 7: Ejecutar todo y commitear**

```bash
npm test && npm run typecheck
git add src/lib/whatsapp/promocion.ts src/lib/whatsapp/__tests__/promocion.test.ts docs/sql/2026-09-23-marca-dinkbit.sql
git commit -m "feat(ventas): pasar un lead de WhatsApp al embudo principal"
```

---

## Comprobación manual al desplegar

No automatizable, hay que hacerlo en este orden:

1. Aplicar las dos migraciones en el SQL Editor de Supabase.
2. **Publicar la app en Meta.** Sin esto solo llegan webhooks de prueba.
3. En el panel de la app → Configuración de producción: URL de devolución de llamada `https://dinkbit.com/api/whatsapp/webhook`, token de verificación igual a `WHATSAPP_VERIFY_TOKEN`, y activar el toggle **Suscribir webhooks**.
4. Lanzar un anuncio CTWA de prueba con presupuesto mínimo, escribir desde un móvil y comprobar: llega la autorespuesta, aparece el lead con su campaña, y la conversación se ve en la bandeja.
