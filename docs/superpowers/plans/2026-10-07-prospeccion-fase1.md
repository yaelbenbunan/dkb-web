# Prospección, fase 1 (Google Places + correo 1:1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pestaña «Prospección» en `/panel` que busca negocios en Google Places, les encuentra el email en su web y permite enviarles un correo individual con una plantilla de variables.

**Architecture:** Lógica pura y probada en `src/lib/prospeccion/` (extracción de emails, plantilla, reglas de envío, normalización de Places); una capa fina de datos sobre Supabase; envío por Resend con reclamo atómico de fila; interfaz en `src/app/(site)/panel/prospeccion/` con acciones de servidor. Los prospectos viven en tablas propias, nunca en `imagina_leads`.

**Tech Stack:** Next.js 16 (App Router, acciones de servidor), React 19, Supabase (`@supabase/supabase-js`, `service_role`), Resend 6, undici, Vitest 4. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-07-prospeccion-design.md`

**Alcance:** solo la fase 1 del spec. BORME (fase 2) tiene plan propio, que se escribe después de la prueba de parseo de PDF. El esquema ya admite `source = 'borme'` para no migrar dos veces.

## Global Constraints

- Rama `feat/prospeccion` creada desde el `HEAD` actual de `feat/landing-web-299`, en un worktree (`superpowers:using-git-worktrees`). En el directorio principal hay cambios de WhatsApp sin commitear que no se tocan.
- Los prospectos nunca se insertan en `imagina_leads` salvo por «Convertir en lead», y entonces con `consent` sin definir (`null`).
- Sin `PROSPECT_SENDERS` configurada no se envía nada. Nunca se cae al remitente de las campañas (`CAMPAIGN_SENDERS`).
- Tope diario: 30 por día natural en Europe/Madrid, configurable con `PROSPECT_DAILY_LIMIT`.
- Variables de plantilla: exactamente `{{empresa}}`, `{{ciudad}}`, `{{sector}}`, `{{web}}`. Un correo con una variable sin resolver no sale.
- Enriquecimiento: máximo 3 páginas por empresa, 6 s y 600 KB por página, siempre a través de la guardia SSRF.
- Places: máximo 3 páginas (60 resultados) por búsqueda; si una página falla no se guarda nada.
- Tablas con RLS activado y sin políticas; solo se accede con `getSupabaseAdmin()` desde el servidor.
- Identificadores, comentarios y textos de interfaz en español, como `src/lib/ventas/`. Estilos en línea con las constantes de `panel/_componentes/estilos.ts`.
- Mensajes de commit en español con prefijo `feat(prospeccion):` / `refactor:` / `docs:`, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Antes de dar una tarea por hecha: `npm run typecheck` y la prueba de esa tarea en verde.

## Review Focus

1. **El email de la web es de un tercero** (la agencia que hizo la página, `info@agenciaweb.com`): no se elige nunca; escribiríamos a quien no es. → prueba en Task 2.
2. **Variable mal escrita en la plantilla** (`{{emprsa}}`): se trata como dato que falta y bloquea el envío, no sale tal cual. → prueba en Task 3.
3. **Doble clic en «Enviar»** o dos pestañas a la vez: sale un solo correo. → prueba en Task 8.
4. **La «web» del negocio es su Facebook o Instagram**: se guarda como «sin web» y no se intenta leer. → prueba en Task 5.
5. **Nombre de empresa con HTML o `&`** (`Bar <b>Pepe</b> & Hijos`): llega escapado en el cuerpo del correo. → prueba en Task 3.

## Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `docs/sql/2026-10-07-prospeccion.sql` | Las cuatro tablas |
| `src/lib/prospeccion/tipos.ts` | Tipos de fila y lista de estados |
| `src/lib/prospeccion/emails.ts` | HTML → direcciones, clasificación, elección, enlaces de contacto |
| `src/lib/prospeccion/plantilla.ts` | Variables, render, texto → HTML |
| `src/lib/prospeccion/reglas-envio.ts` | Remitentes, tope diario, motivo de bloqueo |
| `src/lib/prospeccion/places.ts` | Petición a Places y normalización |
| `src/lib/prospeccion/filtros.ts` | Filtro de la tabla (cliente) |
| `src/lib/fetch-seguro.ts` | `fetch` con guardia SSRF, extraído de `website-extract.ts` |
| `src/lib/prospeccion/enriquecer.ts` | Web → mejor email |
| `src/lib/prospeccion/db.ts` | Lecturas y escrituras |
| `src/lib/prospeccion/baja-token.ts` | Token de baja |
| `src/lib/prospeccion/enviar.ts` | Reclamar, renderizar, enviar, registrar |
| `src/app/api/prospeccion/baja/route.ts` | Enlace de baja |
| `src/app/api/resend/webhook/route.ts` | (modificar) rebotes y quejas de prospectos |
| `src/app/(site)/panel/prospeccion/*` | Página, acciones y componentes |
| `src/app/(site)/panel/_componentes/PanelShell.tsx` | (modificar) pestaña nueva |
| `src/app/(site)/panel/LeadsTable.tsx`, `src/lib/leads-csv.ts` | (modificar) canal «Prospección» |
| `.env.example` | (modificar) variables nuevas |

Pruebas en `src/lib/prospeccion/__tests__/`.

---

### Task 1: Esquema, tipos y capa de datos

**Files:**
- Create: `docs/sql/2026-10-07-prospeccion.sql`
- Create: `src/lib/prospeccion/tipos.ts`
- Create: `src/lib/prospeccion/db.ts`
- Test: `src/lib/prospeccion/__tests__/db.test.ts`

**Interfaces:**
- Produces (tipos): `EstadoProspecto`, `ESTADOS_PROSPECTO`, `FuenteProspecto`, `TipoEmail`, `ProspectRow`, `ProspectSearchRow`, `ProspectTemplateRow`, `ProspectoNuevo`.
- Produces (db): `crearBusqueda`, `cerrarBusqueda`, `listarBusquedas`, `guardarProspectos`, `listarProspectos`, `getProspecto`, `prospectosPorIds`, `pendientesDeEnriquecer`, `contarPendientes`, `guardarEnriquecimiento`, `reclamarParaEnvio`, `registrarEnvio`, `revertirEnvio`, `enviadosDesde`, `marcarEstado`, `marcarPorResendId`, `enlazarLead`, `suprimir`, `listarSuprimidos`, `listarPlantillas`, `getPlantilla`, `guardarPlantilla`, `borrarPlantilla`, `buscarLeadPorEmail`. Firmas exactas en el paso 3.

- [ ] **Step 1: Escribir la migración**

`docs/sql/2026-10-07-prospeccion.sql`:

```sql
-- Prospección (/panel/prospeccion): empresas encontradas por búsqueda y los
-- correos 1:1 que se les mandan.
-- Spec: docs/superpowers/specs/2026-10-07-prospeccion-design.md
--
-- Van en tablas propias y no en `imagina_leads` a propósito: nadie aquí ha dado
-- consentimiento, y las campañas solo envían a `consent = true`.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente. RLS sin políticas: solo lee la clave de servicio.

create table if not exists public.prospect_searches (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('places', 'borme')),
  params jsonb not null default '{}',
  status text not null default 'buscando' check (status in ('buscando', 'lista', 'error')),
  error text,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.prospect_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.prospect_searches(id) on delete set null,
  source text not null check (source in ('places', 'borme')),
  external_id text not null,
  name text not null,
  sector text,
  address text,
  city text,
  province text,
  phone text,
  website text,
  email text,
  email_kind text check (email_kind in ('generica', 'personal')),
  rating numeric(2,1),
  reviews integer,
  extra jsonb not null default '{}',
  status text not null default 'nuevo' check (status in (
    'nuevo', 'listo', 'sin_contacto', 'enviado', 'respondido', 'rebotado', 'baja', 'descartado'
  )),
  contact_note text,
  enriched_at timestamptz,
  template_id uuid references public.prospect_templates(id) on delete set null,
  sent_at timestamptz,
  resend_id text,
  send_error text,
  lead_id text,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists prospects_search_idx on public.prospects (search_id);
create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_sent_at_idx on public.prospects (sent_at);
create index if not exists prospects_resend_id_idx on public.prospects (resend_id);

create table if not exists public.prospect_suppressions (
  value text primary key,
  kind text not null check (kind in ('email', 'dominio')),
  reason text not null check (reason in ('baja', 'rebote', 'queja', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.prospect_searches enable row level security;
alter table public.prospect_templates enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_suppressions enable row level security;
```

- [ ] **Step 2: Escribir los tipos**

`src/lib/prospeccion/tipos.ts`:

```ts
/** Tipos de la prospección. Sin `server-only`: los usa también el cliente. */

export const ESTADOS_PROSPECTO = [
  "nuevo",
  "listo",
  "sin_contacto",
  "enviado",
  "respondido",
  "rebotado",
  "baja",
  "descartado",
] as const;
export type EstadoProspecto = (typeof ESTADOS_PROSPECTO)[number];

export type FuenteProspecto = "places" | "borme";
export type TipoEmail = "generica" | "personal";

export interface ProspectRow {
  id: string;
  search_id: string | null;
  source: FuenteProspecto;
  external_id: string;
  name: string;
  sector: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  email_kind: TipoEmail | null;
  rating: number | null;
  reviews: number | null;
  status: EstadoProspecto;
  /** Por qué quedó sin contacto (sin web, web caída, sin email publicado). */
  contact_note: string | null;
  enriched_at: string | null;
  template_id: string | null;
  sent_at: string | null;
  resend_id: string | null;
  send_error: string | null;
  lead_id: string | null;
  created_at: string;
}

/** Lo que devuelve una fuente antes de guardarse. */
export interface ProspectoNuevo {
  source: FuenteProspecto;
  external_id: string;
  name: string;
  sector: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
}

export interface ProspectSearchRow {
  id: string;
  source: FuenteProspecto;
  params: Record<string, string>;
  status: "buscando" | "lista" | "error";
  error: string | null;
  total: number;
  created_at: string;
}

export interface ProspectTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Escribir la prueba de la capa de datos**

Solo se prueba lo que tiene lógica propia: el reclamo atómico y que una empresa repetida no se pisa. `src/lib/prospeccion/__tests__/db.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { guardarProspectos, reclamarParaEnvio } from "../db";

/** Cadena de supabase-js de mentira: cada método devuelve la misma cadena y
 *  al hacer `await` resuelve con `resultado`. */
function cadena(resultado: { data?: unknown; error?: { message: string } | null; count?: number }) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "upsert", "insert", "select", "eq", "in", "gte", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null, ...resultado }).then(ok);
  return c as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => fromMock.mockReset());

describe("reclamarParaEnvio", () => {
  test("reclama solo si la fila sigue en «listo»", async () => {
    const c = cadena({ data: [{ id: "p1" }] });
    fromMock.mockReturnValue(c);
    expect(await reclamarParaEnvio("p1")).toBe(true);
    expect(c.eq).toHaveBeenCalledWith("id", "p1");
    expect(c.eq).toHaveBeenCalledWith("status", "listo");
    expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ status: "enviado" }));
  });

  test("devuelve false si otra petición ya se la llevó", async () => {
    fromMock.mockReturnValue(cadena({ data: [] }));
    expect(await reclamarParaEnvio("p1")).toBe(false);
  });
});

describe("guardarProspectos", () => {
  test("ignora las empresas que ya existían y cuenta solo las nuevas", async () => {
    const c = cadena({ data: [{ id: "a" }] });
    fromMock.mockReturnValue(c);
    const nuevos = await guardarProspectos("s1", [
      { source: "places", external_id: "x", name: "Uno", sector: null, address: null, city: null, province: null, phone: null, website: null, rating: null, reviews: null },
      { source: "places", external_id: "y", name: "Dos", sector: null, address: null, city: null, province: null, phone: null, website: null, rating: null, reviews: null },
    ]);
    expect(nuevos).toBe(1);
    expect(c.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ search_id: "s1", external_id: "x", status: "nuevo" })]),
      { onConflict: "source,external_id", ignoreDuplicates: true },
    );
  });

  test("sin filas no toca la base", async () => {
    expect(await guardarProspectos("s1", [])).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Ejecutar la prueba y verla fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/db.test.ts`
Expected: FAIL — no se resuelve `../db`.

- [ ] **Step 5: Escribir la capa de datos**

`src/lib/prospeccion/db.ts`:

```ts
import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import type {
  EstadoProspecto,
  FuenteProspecto,
  ProspectRow,
  ProspectSearchRow,
  ProspectTemplateRow,
  ProspectoNuevo,
  TipoEmail,
} from "./tipos";

const BUSQUEDAS = "prospect_searches";
const PROSPECTOS = "prospects";
const PLANTILLAS = "prospect_templates";
const SUPRESIONES = "prospect_suppressions";
const LEADS = "imagina_leads";

function aviso(donde: string, mensaje: string) {
  console.error(`[prospeccion] ${donde}: ${mensaje}`);
}

// Búsquedas ---------------------------------------------------------------

export async function crearBusqueda(
  source: FuenteProspecto,
  params: Record<string, string>,
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(BUSQUEDAS).insert({ source, params }).select("id");
  if (error) {
    aviso("crearBusqueda", error.message);
    return null;
  }
  return (data as Array<{ id: string }> | null)?.[0]?.id ?? null;
}

export async function cerrarBusqueda(
  id: string,
  cierre: { status: "lista" | "error"; total?: number; error?: string },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(BUSQUEDAS)
    .update({ status: cierre.status, total: cierre.total ?? 0, error: cierre.error ?? null })
    .eq("id", id);
  if (error) aviso("cerrarBusqueda", error.message);
}

export async function listarBusquedas(limit = 50): Promise<ProspectSearchRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(BUSQUEDAS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    aviso("listarBusquedas", error.message);
    return [];
  }
  return (data ?? []) as ProspectSearchRow[];
}

// Prospectos --------------------------------------------------------------

/** Guarda las empresas de una búsqueda. Las que ya existían (misma fuente e
 *  identificador) no se tocan: conservan su estado y su historial de envío, así
 *  que una empresa ya contactada no vuelve a aparecer como nueva. Devuelve
 *  cuántas eran realmente nuevas. */
export async function guardarProspectos(
  searchId: string,
  nuevos: ProspectoNuevo[],
): Promise<number> {
  if (nuevos.length === 0) return 0;
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const filas = nuevos.map((p) => ({ ...p, search_id: searchId, status: "nuevo" }));
  const { data, error } = await sb
    .from(PROSPECTOS)
    .upsert(filas, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) {
    aviso("guardarProspectos", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function listarProspectos(limit = 2000): Promise<ProspectRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    aviso("listarProspectos", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
}

export async function prospectosPorIds(ids: string[]): Promise<ProspectRow[]> {
  if (ids.length === 0) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb.from(PROSPECTOS).select("*").in("id", ids);
  if (error) {
    aviso("prospectosPorIds", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
}

export async function getProspecto(id: string): Promise<ProspectRow | null> {
  return (await prospectosPorIds([id]))[0] ?? null;
}

export async function pendientesDeEnriquecer(searchId: string, limit: number): Promise<ProspectRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("*")
    .eq("search_id", searchId)
    .eq("status", "nuevo")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    aviso("pendientesDeEnriquecer", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
}

export async function contarPendientes(searchId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { count, error } = await sb
    .from(PROSPECTOS)
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId)
    .eq("status", "nuevo");
  if (error) {
    aviso("contarPendientes", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function guardarEnriquecimiento(
  id: string,
  r: { email: string | null; tipo: TipoEmail | null; nota: string | null },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({
      email: r.email,
      email_kind: r.tipo,
      contact_note: r.nota,
      status: r.email ? "listo" : "sin_contacto",
      enriched_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "nuevo");
  if (error) aviso("guardarEnriquecimiento", error.message);
}

/** Reclama la fila para enviarle un correo. El `where status = 'listo'` es lo
 *  que impide el doble envío: de dos peticiones simultáneas solo una actualiza
 *  la fila; la otra recibe cero filas y se retira. */
export async function reclamarParaEnvio(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data, error } = await sb
    .from(PROSPECTOS)
    .update({ status: "enviado", sent_at: new Date().toISOString(), send_error: null })
    .eq("id", id)
    .eq("status", "listo")
    .select("id");
  if (error) {
    aviso("reclamarParaEnvio", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function registrarEnvio(
  id: string,
  envio: { resendId: string | null; templateId: string },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ resend_id: envio.resendId, template_id: envio.templateId })
    .eq("id", id);
  if (error) aviso("registrarEnvio", error.message);
}

/** Deshace un reclamo cuyo envío falló: vuelve a «listo», sin fecha de envío
 *  (para que no cuente en el tope diario) y con el error a la vista. */
export async function revertirEnvio(id: string, motivo: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ status: "listo", sent_at: null, send_error: motivo })
    .eq("id", id)
    .eq("status", "enviado");
  if (error) aviso("revertirEnvio", error.message);
}

export async function enviadosDesde(desde: Date): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { count, error } = await sb
    .from(PROSPECTOS)
    .select("id", { count: "exact", head: true })
    .gte("sent_at", desde.toISOString());
  if (error) {
    aviso("enviadosDesde", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function marcarEstado(ids: string[], status: EstadoProspecto): Promise<void> {
  if (ids.length === 0) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(PROSPECTOS).update({ status }).in("id", ids);
  if (error) aviso("marcarEstado", error.message);
}

/** Marca el prospecto al que se le mandó ese mensaje de Resend. Devuelve su
 *  email (para añadirlo a la lista de supresión) o null si el mensaje no era de
 *  prospección. */
export async function marcarPorResendId(
  resendId: string,
  status: "rebotado" | "baja",
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from(PROSPECTOS)
    .update({ status })
    .eq("resend_id", resendId)
    .select("email");
  if (error) {
    aviso("marcarPorResendId", error.message);
    return null;
  }
  return (data as Array<{ email: string | null }> | null)?.[0]?.email ?? null;
}

export async function enlazarLead(id: string, leadId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ lead_id: leadId, status: "respondido" })
    .eq("id", id);
  if (error) aviso("enlazarLead", error.message);
}

// Supresión ---------------------------------------------------------------

export async function suprimir(
  valor: string,
  kind: "email" | "dominio",
  reason: "baja" | "rebote" | "queja" | "manual",
): Promise<void> {
  const value = valor.trim().toLowerCase();
  if (!value) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(SUPRESIONES)
    .upsert([{ value, kind, reason }], { onConflict: "value", ignoreDuplicates: true });
  if (error) aviso("suprimir", error.message);
}

/** Emails y dominios vetados, en minúsculas. */
export async function listarSuprimidos(): Promise<Set<string>> {
  const sb = getSupabaseAdmin();
  if (!sb) return new Set();
  const { data, error } = await sb.from(SUPRESIONES).select("value").limit(10000);
  if (error) {
    aviso("listarSuprimidos", error.message);
    return new Set();
  }
  return new Set(((data ?? []) as Array<{ value: string }>).map((f) => f.value));
}

// Plantillas --------------------------------------------------------------

export async function listarPlantillas(): Promise<ProspectTemplateRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PLANTILLAS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    aviso("listarPlantillas", error.message);
    return [];
  }
  return (data ?? []) as ProspectTemplateRow[];
}

export async function getPlantilla(id: string): Promise<ProspectTemplateRow | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(PLANTILLAS).select("*").eq("id", id).limit(1);
  if (error) {
    aviso("getPlantilla", error.message);
    return null;
  }
  return ((data ?? []) as ProspectTemplateRow[])[0] ?? null;
}

export async function guardarPlantilla(p: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const campos = { name: p.name, subject: p.subject, body: p.body, updated_at: new Date().toISOString() };
  const { error } = p.id
    ? await sb.from(PLANTILLAS).update(campos).eq("id", p.id)
    : await sb.from(PLANTILLAS).insert(campos);
  if (error) {
    aviso("guardarPlantilla", error.message);
    return false;
  }
  return true;
}

export async function borrarPlantilla(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(PLANTILLAS).delete().eq("id", id);
  if (error) aviso("borrarPlantilla", error.message);
}

// Leads del CRM -----------------------------------------------------------

/** Id del lead del CRM con ese email, si existe (sin distinguir mayúsculas). */
export async function buscarLeadPorEmail(email: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(LEADS).select("id").ilike("email", email.trim()).limit(1);
  if (error) {
    aviso("buscarLeadPorEmail", error.message);
    return null;
  }
  return (data as Array<{ id: string }> | null)?.[0]?.id ?? null;
}
```

Nota para la prueba: la cadena de mentira no implementa `delete` ni `ilike`; las funciones que los usan no se prueban aquí.

- [ ] **Step 6: Ejecutar la prueba y verla pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/db.test.ts && npm run typecheck`
Expected: 4 pruebas en verde, typecheck limpio.

- [ ] **Step 7: Commit**

```bash
git add docs/sql/2026-10-07-prospeccion.sql src/lib/prospeccion
git commit -m "feat(prospeccion): tablas, tipos y capa de datos"
```

---

### Task 2: Extraer y elegir el email de una web

**Files:**
- Create: `src/lib/prospeccion/emails.ts`
- Test: `src/lib/prospeccion/__tests__/emails.test.ts`

**Interfaces:**
- Consumes: `TipoEmail` de `./tipos`.
- Produces:
  - `extraerEmails(html: string): string[]`
  - `elegirEmail(emails: string[], dominioWeb: string | null): { email: string; tipo: TipoEmail } | null`
  - `enlacesDeContacto(html: string, base: URL): string[]`

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/emails.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { elegirEmail, enlacesDeContacto, extraerEmails } from "../emails";

describe("extraerEmails", () => {
  test("saca direcciones de mailto y del texto, sin repetir y en minúsculas", () => {
    const html = `<a href="mailto:Info@Bar.es?subject=Hola">Escríbenos</a><p>o a reservas@bar.es.</p><p>info@bar.es</p>`;
    expect(extraerEmails(html).sort()).toEqual(["info@bar.es", "reservas@bar.es"]);
  });

  test("entiende ofuscaciones sencillas", () => {
    expect(extraerEmails("<p>info [at] bar [dot] es</p>")).toEqual(["info@bar.es"]);
    expect(extraerEmails("<p>hola (arroba) bar (punto) es</p>")).toEqual(["hola@bar.es"]);
    expect(extraerEmails("<p>info&#64;bar&#46;es</p>")).toEqual(["info@bar.es"]);
  });

  test("descarta falsos positivos", () => {
    const html = `
      <img src="logo@2x.png">
      <script>var dsn = "https://abc123@o1.ingest.sentry.io/5";</script>
      <p>ejemplo@tudominio.com noreply@bar.es dpo@bar.es</p>
      <p>a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4@sentry.wixpress.com</p>`;
    expect(extraerEmails(html)).toEqual([]);
  });
});

describe("elegirEmail", () => {
  test("prefiere la genérica del propio dominio", () => {
    expect(elegirEmail(["juan.perez@bar.es", "bar@gmail.com", "info@bar.es"], "www.bar.es")).toEqual({
      email: "info@bar.es",
      tipo: "generica",
    });
  });

  test("una dirección de proveedor gratuito vale como genérica si no parece una persona", () => {
    expect(elegirEmail(["restaurantebar@gmail.com"], "bar.es")).toEqual({
      email: "restaurantebar@gmail.com",
      tipo: "generica",
    });
  });

  test("marca como personal lo que parece una persona", () => {
    expect(elegirEmail(["juan.perez@bar.es"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["juan@bar.es"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["maria.lopez@gmail.com"], "bar.es")?.tipo).toBe("personal");
  });

  test("«reservas.madrid@» sigue siendo genérica", () => {
    expect(elegirEmail(["reservas.madrid@bar.es"], "bar.es")?.tipo).toBe("generica");
  });

  test("nunca elige la dirección de un tercero (la agencia que hizo la web)", () => {
    expect(elegirEmail(["info@agenciaweb.com"], "bar.es")).toBeNull();
    expect(elegirEmail(["info@agenciaweb.com", "juan@bar.es"], "bar.es")?.email).toBe("juan@bar.es");
  });

  test("acepta subdominios del negocio", () => {
    expect(elegirEmail(["info@bar.es"], "reservas.bar.es")?.email).toBe("info@bar.es");
  });

  test("sin candidatas devuelve null", () => {
    expect(elegirEmail([], "bar.es")).toBeNull();
  });
});

describe("enlacesDeContacto", () => {
  const base = new URL("https://www.bar.es/");

  test("encuentra contacto y aviso legal del mismo sitio, como máximo dos", () => {
    const html = `
      <a href="/carta">Carta</a>
      <a href="/contacto">Contacto</a>
      <a href="https://bar.es/aviso-legal">Aviso legal</a>
      <a href="/politica-legal-2">Legal</a>
      <a href="https://otra.com/contacto">Contacto</a>
      <a href="mailto:info@bar.es">Contacto</a>`;
    expect(enlacesDeContacto(html, base)).toEqual([
      "https://www.bar.es/contacto",
      "https://bar.es/aviso-legal",
    ]);
  });

  test("reconoce el enlace por su texto aunque la ruta no lo diga", () => {
    expect(enlacesDeContacto(`<a href="/p/12"><span>Contacto</span></a>`, base)).toEqual([
      "https://www.bar.es/p/12",
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/emails.test.ts`
Expected: FAIL — no se resuelve `../emails`.

- [ ] **Step 3: Implementar**

`src/lib/prospeccion/emails.ts`:

```ts
/**
 * De HTML a una dirección a la que escribir.
 *
 * Tres pasos separados porque fallan por motivos distintos: encontrar
 * direcciones (expresiones regulares sobre HTML sucio), decidir si son del
 * negocio o de un tercero, y decidir si son un buzón o una persona. Lo último
 * importa por la LSSI: a un buzón genérico publicado se le puede escribir con
 * más tranquilidad que a una persona.
 */
import type { TipoEmail } from "./tipos";

const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const RE_MAILTO = /mailto:([^"'?>\s]+)/gi;
const EXT_FICHERO = /\.(png|jpe?g|gif|webp|svg|css|js|ico|woff2?)$/i;

/** Buzones que no atiende nadie o que existen para otra cosa (protección de
 *  datos): escribirles una oferta comercial no llega a quien decide. */
const LOCALES_BASURA =
  /^(no-?reply|donotreply|noresponder|postmaster|mailer-daemon|abuse|privacy|privacidad|dpo|dpd|lopd|rgpd)$/;

const DOMINIOS_BASURA = [
  "sentry.io",
  "wixpress.com",
  "example.com",
  "ejemplo.com",
  "domain.com",
  "dominio.com",
  "tudominio.com",
  "email.com",
  "wordpress.org",
  "schema.org",
  "w3.org",
];

const GRATUITOS = new Set([
  "gmail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "yahoo.com",
  "yahoo.es",
  "live.com",
  "msn.com",
  "icloud.com",
  "telefonica.net",
  "movistar.es",
]);

const GENERICAS = new Set([
  "info",
  "informacion",
  "contacto",
  "contact",
  "hola",
  "hello",
  "reservas",
  "reserva",
  "booking",
  "bookings",
  "administracion",
  "admin",
  "oficina",
  "comercial",
  "ventas",
  "atencion",
  "atencionalcliente",
  "clientes",
  "recepcion",
  "general",
  "mail",
  "correo",
  "email",
  "pedidos",
  "citas",
  "consultas",
  "secretaria",
  "gerencia",
  "direccion",
  "marketing",
  "tienda",
  "web",
  "eventos",
]);

function sinWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function esBasura(email: string): boolean {
  const [local, dominio] = email.split("@");
  if (!local || !dominio) return true;
  if (EXT_FICHERO.test(email)) return true;
  if (LOCALES_BASURA.test(local)) return true;
  // Las claves de Sentry y similares son ristras hexadecimales largas.
  if (/^[a-f0-9]{24,}$/.test(local)) return true;
  return DOMINIOS_BASURA.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}

/** Todas las direcciones que aparecen en el HTML, en minúsculas y sin repetir.
 *  Los `<script>` y `<style>` no se leen: ahí viven las claves de terceros. */
export function extraerEmails(html: string): string[] {
  const encontrados = new Set<string>();

  for (const m of html.matchAll(RE_MAILTO)) {
    try {
      encontrados.add(decodeURIComponent(m[1]));
    } catch {
      encontrados.add(m[1]);
    }
  }

  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&#(?:64|x40);/gi, "@")
    .replace(/&#(?:46|x2e);/gi, ".")
    .replace(/\s*[\[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@")
    .replace(/\s*[\[(]\s*(?:dot|punto)\s*[\])]\s*/gi, ".");
  for (const m of texto.matchAll(RE_EMAIL)) encontrados.add(m[0]);

  const limpios = new Set<string>();
  for (const bruto of encontrados) {
    const email = bruto.trim().toLowerCase().replace(/\.+$/, "");
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) && !esBasura(email)) limpios.add(email);
  }
  return [...limpios];
}

function esPropio(dominioEmail: string, dominioWeb: string): boolean {
  const a = sinWww(dominioEmail);
  const b = sinWww(dominioWeb);
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function tipoDe(local: string, propio: boolean): TipoEmail {
  const primera = local.split(/[._-]/)[0].replace(/[0-9]+$/, "");
  if (GENERICAS.has(primera)) return "generica";
  // nombre.apellido
  if (/^[a-z]+[._-][a-z]+$/.test(local)) return "personal";
  // Una sola palabra desconocida en el dominio del negocio (`juan@bar.es`)
  // suele ser una persona; en Gmail (`restaurantebar@gmail.com`) suele ser el
  // buzón del negocio. Ante la duda en dominio propio, personal: pide confirmar.
  return propio ? "personal" : "generica";
}

/** La mejor dirección para escribir a ese negocio, o null si no hay ninguna que
 *  sea suya. Las de otros dominios que no sean proveedores gratuitos se
 *  descartan: suelen ser de la agencia que hizo la web. */
export function elegirEmail(
  emails: string[],
  dominioWeb: string | null,
): { email: string; tipo: TipoEmail } | null {
  const candidatas = emails
    .map((email) => {
      const [local, dominio] = email.split("@");
      const propio = dominioWeb ? esPropio(dominio, dominioWeb) : true;
      const gratuito = GRATUITOS.has(dominio);
      if (!propio && !gratuito) return null;
      const tipo = tipoDe(local, propio);
      const orden = tipo === "generica" ? (propio ? 0 : 1) : propio ? 2 : 3;
      return { email, tipo, orden };
    })
    .filter((c): c is { email: string; tipo: TipoEmail; orden: number } => c !== null)
    .sort((a, b) => a.orden - b.orden);
  const mejor = candidatas[0];
  return mejor ? { email: mejor.email, tipo: mejor.tipo } : null;
}

const RE_ENLACE = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const RE_CONTACTO = /contact|aviso-?\s?legal|legal/i;
const MAX_ENLACES = 2;

/** Enlaces internos a las páginas donde un negocio suele publicar su email. */
export function enlacesDeContacto(html: string, base: URL): string[] {
  const enlaces: string[] = [];
  for (const m of html.matchAll(RE_ENLACE)) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const texto = m[2].replace(/<[^>]+>/g, " ");
    if (!RE_CONTACTO.test(href) && !RE_CONTACTO.test(texto)) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (sinWww(url.hostname) !== sinWww(base.hostname)) continue;
    url.hash = "";
    const final = url.toString();
    if (!enlaces.includes(final)) enlaces.push(final);
    if (enlaces.length === MAX_ENLACES) break;
  }
  return enlaces;
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/emails.test.ts`
Expected: 12 pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prospeccion/emails.ts src/lib/prospeccion/__tests__/emails.test.ts
git commit -m "feat(prospeccion): extraer y elegir el email de la web de un negocio"
```

---

### Task 3: Plantilla con variables

**Files:**
- Create: `src/lib/prospeccion/plantilla.ts`
- Test: `src/lib/prospeccion/__tests__/plantilla.test.ts`

**Interfaces:**
- Produces:
  - `VARIABLES: readonly ["empresa", "ciudad", "sector", "web"]`
  - `interface DatosPlantilla { empresa: string | null; ciudad: string | null; sector: string | null; web: string | null }`
  - `datosDeProspecto(p: { name: string; city: string | null; sector: string | null; website: string | null }): DatosPlantilla`
  - `renderPlantilla(texto: string, datos: DatosPlantilla): { ok: true; texto: string } | { ok: false; faltan: string[] }`
  - `textoAHtml(texto: string): string`

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/plantilla.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { datosDeProspecto, renderPlantilla, textoAHtml } from "../plantilla";

const datos = { empresa: "Bar Pepe", ciudad: "Madrid", sector: "Restaurante", web: "barpepe.es" };

describe("renderPlantilla", () => {
  test("sustituye las variables, con o sin espacios y sin distinguir mayúsculas", () => {
    expect(renderPlantilla("Hola {{empresa}} de {{ ciudad }} ({{SECTOR}})", datos)).toEqual({
      ok: true,
      texto: "Hola Bar Pepe de Madrid (Restaurante)",
    });
  });

  test("si falta un dato que la plantilla usa, no renderiza y dice cuál", () => {
    expect(renderPlantilla("Vi {{web}} de {{empresa}}", { ...datos, web: null })).toEqual({
      ok: false,
      faltan: ["web"],
    });
  });

  test("un dato en blanco cuenta como ausente", () => {
    expect(renderPlantilla("Hola {{ciudad}}", { ...datos, ciudad: "  " })).toEqual({
      ok: false,
      faltan: ["ciudad"],
    });
  });

  test("una variable mal escrita bloquea en vez de salir tal cual", () => {
    expect(renderPlantilla("Hola {{emprsa}}", datos)).toEqual({ ok: false, faltan: ["emprsa"] });
  });

  test("no repite una variable que falta dos veces", () => {
    expect(renderPlantilla("{{web}} y {{web}}", { ...datos, web: null })).toEqual({
      ok: false,
      faltan: ["web"],
    });
  });

  test("un texto sin variables pasa sin cambios", () => {
    expect(renderPlantilla("Hola", datos)).toEqual({ ok: true, texto: "Hola" });
  });
});

describe("textoAHtml", () => {
  test("escapa el HTML de los datos", () => {
    const r = renderPlantilla("Hola {{empresa}}", { ...datos, empresa: "Bar <b>Pepe</b> & Hijos" });
    expect(r.ok && textoAHtml(r.texto)).toBe("Hola Bar &lt;b&gt;Pepe&lt;/b&gt; &amp; Hijos");
  });

  test("respeta los saltos de línea", () => {
    expect(textoAHtml("uno\ndos\n\ntres")).toBe("uno<br>dos<br><br>tres");
  });

  test("convierte las URLs en enlaces sin tragarse la puntuación final", () => {
    expect(textoAHtml("Mira https://dinkbit.es/web?a=1&b=2.")).toBe(
      'Mira <a href="https://dinkbit.es/web?a=1&amp;b=2">https://dinkbit.es/web?a=1&amp;b=2</a>.',
    );
  });
});

describe("datosDeProspecto", () => {
  test("deja la web en su forma corta", () => {
    expect(
      datosDeProspecto({ name: "Bar Pepe", city: "Madrid", sector: null, website: "https://www.barpepe.es/" }),
    ).toEqual({ empresa: "Bar Pepe", ciudad: "Madrid", sector: null, web: "barpepe.es" });
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/plantilla.test.ts`
Expected: FAIL — no se resuelve `../plantilla`.

- [ ] **Step 3: Implementar**

`src/lib/prospeccion/plantilla.ts`:

```ts
/**
 * Plantillas de los correos de prospección: texto con `{{variables}}`.
 *
 * Sin `server-only`: el panel renderiza la vista previa en el navegador con
 * este mismo código, para que lo que se ve sea exactamente lo que sale.
 */

export const VARIABLES = ["empresa", "ciudad", "sector", "web"] as const;
type Variable = (typeof VARIABLES)[number];

export type DatosPlantilla = Record<Variable, string | null>;

const RE_VARIABLE = /\{\{\s*([^{}\s]+)\s*\}\}/g;

export function datosDeProspecto(p: {
  name: string;
  city: string | null;
  sector: string | null;
  website: string | null;
}): DatosPlantilla {
  const web = p.website
    ? p.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "")
    : null;
  return { empresa: p.name, ciudad: p.city, sector: p.sector, web };
}

/** Sustituye las variables. Si alguna no tiene dato —o no existe, porque está
 *  mal escrita— no devuelve texto: un correo con `{{empresa}}` a la vista hace
 *  más daño que no mandarlo. */
export function renderPlantilla(
  texto: string,
  datos: DatosPlantilla,
): { ok: true; texto: string } | { ok: false; faltan: string[] } {
  const faltan: string[] = [];
  const salida = texto.replace(RE_VARIABLE, (_, bruta: string) => {
    const nombre = bruta.toLowerCase();
    const valor = (VARIABLES as readonly string[]).includes(nombre)
      ? (datos[nombre as Variable] ?? "").trim()
      : "";
    if (!valor) {
      if (!faltan.includes(nombre)) faltan.push(nombre);
      return "";
    }
    return valor;
  });
  return faltan.length > 0 ? { ok: false, faltan } : { ok: true, texto: salida };
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Texto plano → HTML mínimo: escapado, URLs enlazadas y saltos de línea. */
export function textoAHtml(texto: string): string {
  return escapar(texto)
    .replace(/https?:\/\/[^\s<]+/g, (url) => {
      const cola = url.match(/[.,;:!?)]+$/)?.[0] ?? "";
      const limpia = cola ? url.slice(0, -cola.length) : url;
      return `<a href="${limpia}">${limpia}</a>${cola}`;
    })
    .replace(/\r?\n/g, "<br>");
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/plantilla.test.ts`
Expected: 10 pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prospeccion/plantilla.ts src/lib/prospeccion/__tests__/plantilla.test.ts
git commit -m "feat(prospeccion): plantillas con variables que bloquean si falta un dato"
```

---

### Task 4: Reglas de envío

**Files:**
- Create: `src/lib/prospeccion/reglas-envio.ts`
- Test: `src/lib/prospeccion/__tests__/reglas-envio.test.ts`

**Interfaces:**
- Consumes: `ProspectRow` de `./tipos`.
- Produces:
  - `limiteDiario(bruto?: string): number`
  - `remitentesProspeccion(bruto?: string): string[]`
  - `inicioDelDiaMadrid(ahora: Date): Date`
  - `type MotivoBloqueo = "estado" | "sin_email" | "suprimido" | "ya_es_lead" | "personal_sin_confirmar"`
  - `motivoBloqueo(p: Pick<ProspectRow, "status" | "email" | "email_kind">, ctx: { suprimidos: Set<string>; emailsDeLeads: Set<string>; confirmarPersonal: boolean }): MotivoBloqueo | null`
  - `TEXTO_BLOQUEO: Record<MotivoBloqueo, string>`

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/reglas-envio.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  motivoBloqueo,
  remitentesProspeccion,
} from "../reglas-envio";

const ctx = { suprimidos: new Set<string>(), emailsDeLeads: new Set<string>(), confirmarPersonal: false };
const listo = { status: "listo", email: "info@bar.es", email_kind: "generica" } as const;

describe("motivoBloqueo", () => {
  test("un prospecto listo con buzón genérico se puede enviar", () => {
    expect(motivoBloqueo(listo, ctx)).toBeNull();
  });

  test("solo se envía desde «listo»", () => {
    for (const status of ["nuevo", "sin_contacto", "enviado", "respondido", "rebotado", "baja", "descartado"] as const) {
      expect(motivoBloqueo({ ...listo, status }, ctx)).toBe("estado");
    }
  });

  test("sin email no hay envío", () => {
    expect(motivoBloqueo({ ...listo, email: " " }, ctx)).toBe("sin_email");
  });

  test("respeta la supresión por email y por dominio, sin distinguir mayúsculas", () => {
    expect(motivoBloqueo({ ...listo, email: "Info@Bar.es" }, { ...ctx, suprimidos: new Set(["info@bar.es"]) })).toBe("suprimido");
    expect(motivoBloqueo(listo, { ...ctx, suprimidos: new Set(["bar.es"]) })).toBe("suprimido");
  });

  test("no escribe a quien ya es lead del CRM", () => {
    expect(motivoBloqueo(listo, { ...ctx, emailsDeLeads: new Set(["info@bar.es"]) })).toBe("ya_es_lead");
  });

  test("una dirección personal exige confirmación", () => {
    const personal = { ...listo, email: "juan@bar.es", email_kind: "personal" } as const;
    expect(motivoBloqueo(personal, ctx)).toBe("personal_sin_confirmar");
    expect(motivoBloqueo(personal, { ...ctx, confirmarPersonal: true })).toBeNull();
  });
});

describe("limiteDiario", () => {
  test("30 por defecto, y también si la variable no es un número válido", () => {
    expect(limiteDiario(undefined)).toBe(30);
    expect(limiteDiario("abc")).toBe(30);
    expect(limiteDiario("-5")).toBe(30);
  });
  test("acepta el valor configurado, incluido 0 para parar los envíos", () => {
    expect(limiteDiario("50")).toBe(50);
    expect(limiteDiario("0")).toBe(0);
  });
});

describe("remitentesProspeccion", () => {
  test("lista vacía si no está configurada: no hay remitente por defecto", () => {
    expect(remitentesProspeccion(undefined)).toEqual([]);
    expect(remitentesProspeccion(" ")).toEqual([]);
  });
  test("separa por comas y limpia", () => {
    expect(remitentesProspeccion(" Hola@mail.dinkbit.es , paula@mail.dinkbit.es")).toEqual([
      "hola@mail.dinkbit.es",
      "paula@mail.dinkbit.es",
    ]);
  });
});

describe("inicioDelDiaMadrid", () => {
  test("en verano la medianoche de Madrid son las 22:00 UTC del día anterior", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-07T10:00:00Z")).toISOString()).toBe("2026-10-06T22:00:00.000Z");
  });
  test("las 00:30 de Madrid ya son del día nuevo", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-06T22:30:00Z")).toISOString()).toBe("2026-10-06T22:00:00.000Z");
  });
  test("las 23:59 de Madrid siguen siendo del día anterior", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-06T21:59:00Z")).toISOString()).toBe("2026-10-05T22:00:00.000Z");
  });
  test("en invierno la medianoche de Madrid son las 23:00 UTC", () => {
    expect(inicioDelDiaMadrid(new Date("2026-12-10T12:00:00Z")).toISOString()).toBe("2026-12-09T23:00:00.000Z");
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/reglas-envio.test.ts`
Expected: FAIL — no se resuelve `../reglas-envio`.

- [ ] **Step 3: Implementar**

`src/lib/prospeccion/reglas-envio.ts`:

```ts
/**
 * Cuándo se le puede mandar un correo a un prospecto.
 *
 * Todo lo que frena un envío está aquí y es puro, para poder probarlo sin base
 * de datos ni Resend. Sin `server-only`: el panel usa `TEXTO_BLOQUEO`.
 */
import type { ProspectRow } from "./tipos";

const LIMITE_POR_DEFECTO = 30;

/** Correos de prospección por día natural. `0` es válido: para los envíos. */
export function limiteDiario(bruto: string | undefined = process.env.PROSPECT_DAILY_LIMIT): number {
  const n = Number(bruto);
  return bruto !== undefined && bruto.trim() !== "" && Number.isInteger(n) && n >= 0
    ? n
    : LIMITE_POR_DEFECTO;
}

/** Remitentes autorizados. Vacío si no hay nada configurado, y entonces no se
 *  envía: caer al remitente de las campañas mezclaría la reputación del dominio
 *  que usan los envíos con consentimiento. */
export function remitentesProspeccion(bruto: string | undefined = process.env.PROSPECT_SENDERS): string[] {
  return (bruto ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Medianoche de hoy en Madrid. Los dos días al año del cambio de hora se
 *  desvía una hora; para un tope de envíos no importa. */
export function inicioDelDiaMadrid(ahora: Date): Date {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const n = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const transcurrido = (n("hour") * 3600 + n("minute") * 60 + n("second")) * 1000 + ahora.getMilliseconds();
  return new Date(ahora.getTime() - transcurrido);
}

export type MotivoBloqueo =
  | "estado"
  | "sin_email"
  | "suprimido"
  | "ya_es_lead"
  | "personal_sin_confirmar";

export const TEXTO_BLOQUEO: Record<MotivoBloqueo, string> = {
  estado: "No está pendiente de envío.",
  sin_email: "No tiene email.",
  suprimido: "Pidió no recibir más correos, o su dirección rebotó.",
  ya_es_lead: "Ya es un lead del CRM.",
  personal_sin_confirmar: "La dirección parece personal: envíalo de uno en uno y confírmalo.",
};

export function motivoBloqueo(
  p: Pick<ProspectRow, "status" | "email" | "email_kind">,
  ctx: { suprimidos: Set<string>; emailsDeLeads: Set<string>; confirmarPersonal: boolean },
): MotivoBloqueo | null {
  if (p.status !== "listo") return "estado";
  const email = (p.email ?? "").trim().toLowerCase();
  if (!email) return "sin_email";
  const dominio = email.split("@")[1] ?? "";
  if (ctx.suprimidos.has(email) || ctx.suprimidos.has(dominio)) return "suprimido";
  if (ctx.emailsDeLeads.has(email)) return "ya_es_lead";
  if (p.email_kind === "personal" && !ctx.confirmarPersonal) return "personal_sin_confirmar";
  return null;
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/reglas-envio.test.ts`
Expected: 14 pruebas en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prospeccion/reglas-envio.ts src/lib/prospeccion/__tests__/reglas-envio.test.ts
git commit -m "feat(prospeccion): reglas de envío, tope diario y remitentes propios"
```

---

### Task 5: Búsqueda en Google Places

**Files:**
- Create: `src/lib/prospeccion/places.ts`
- Test: `src/lib/prospeccion/__tests__/places.test.ts`

**Interfaces:**
- Consumes: `ProspectoNuevo` de `./tipos`.
- Produces:
  - `normalizarLugar(lugar: unknown, ciudadBuscada: string): ProspectoNuevo | null`
  - `buscarEnPlaces(q: { categoria: string; ciudad: string }, fetchImpl?: typeof fetch): Promise<{ ok: true; prospectos: ProspectoNuevo[] } | { ok: false; error: "sin_clave" | "error_api"; detalle?: string }>`

Referencia de la API: Places API (New), Text Search — `POST https://places.googleapis.com/v1/places:searchText`, cabeceras `X-Goog-Api-Key` y `X-Goog-FieldMask`. Máximo 20 resultados por página y 60 en total; la página siguiente se pide con el mismo cuerpo más `pageToken`.

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/places.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buscarEnPlaces, normalizarLugar } from "../places";

const lugar = {
  id: "ChIJ123",
  displayName: { text: "Bar Pepe" },
  formattedAddress: "Calle Mayor 1, 28013 Madrid, España",
  addressComponents: [
    { longText: "Madrid", types: ["locality", "political"] },
    { longText: "Madrid", types: ["administrative_area_level_2", "political"] },
  ],
  nationalPhoneNumber: "910 00 00 00",
  websiteUri: "https://www.barpepe.es/",
  primaryTypeDisplayName: { text: "Restaurante" },
  rating: 4.4,
  userRatingCount: 312,
};

describe("normalizarLugar", () => {
  test("mapea los campos de Places", () => {
    expect(normalizarLugar(lugar, "madrid")).toEqual({
      source: "places",
      external_id: "ChIJ123",
      name: "Bar Pepe",
      sector: "Restaurante",
      address: "Calle Mayor 1, 28013 Madrid, España",
      city: "Madrid",
      province: "Madrid",
      phone: "910 00 00 00",
      website: "https://www.barpepe.es/",
      rating: 4.4,
      reviews: 312,
    });
  });

  test("sin id o sin nombre no sirve", () => {
    expect(normalizarLugar({ ...lugar, id: undefined }, "Madrid")).toBeNull();
    expect(normalizarLugar({ ...lugar, displayName: { text: " " } }, "Madrid")).toBeNull();
    expect(normalizarLugar(null, "Madrid")).toBeNull();
  });

  test("si Places no da la localidad, usa la ciudad buscada", () => {
    expect(normalizarLugar({ ...lugar, addressComponents: undefined }, "Getafe")?.city).toBe("Getafe");
  });

  test("un perfil de red social no cuenta como web", () => {
    for (const web of [
      "https://www.facebook.com/barpepe",
      "https://instagram.com/barpepe",
      "https://m.facebook.com/barpepe",
      "https://linktr.ee/barpepe",
      "https://wa.me/34600000000",
    ]) {
      expect(normalizarLugar({ ...lugar, websiteUri: web }, "Madrid")?.website).toBeNull();
    }
  });
});

describe("buscarEnPlaces", () => {
  beforeEach(() => vi.stubEnv("GOOGLE_PLACES_API_KEY", "clave"));
  afterEach(() => vi.unstubAllEnvs());

  const respuesta = (cuerpo: unknown, ok = true, status = 200) =>
    ({ ok, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) }) as Response;

  test("sin clave no llama a la API", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const f = vi.fn();
    expect(await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f)).toEqual({
      ok: false,
      error: "sin_clave",
    });
    expect(f).not.toHaveBeenCalled();
  });

  test("pide en español, para España, y sigue la paginación", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ places: [lugar], nextPageToken: "t2" }))
      .mockResolvedValueOnce(respuesta({ places: [{ ...lugar, id: "ChIJ456" }] }));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r.ok && r.prospectos.map((p) => p.external_id)).toEqual(["ChIJ123", "ChIJ456"]);

    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.headers["X-Goog-Api-Key"]).toBe("clave");
    expect(init.headers["X-Goog-FieldMask"]).toContain("places.websiteUri");
    expect(JSON.parse(init.body)).toEqual({
      textQuery: "restaurante en Madrid",
      languageCode: "es",
      regionCode: "ES",
      pageSize: 20,
    });
    expect(JSON.parse(f.mock.calls[1][1].body).pageToken).toBe("t2");
  });

  test("no pasa de tres páginas", async () => {
    const f = vi.fn().mockResolvedValue(respuesta({ places: [lugar], nextPageToken: "mas" }));
    await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(f).toHaveBeenCalledTimes(3);
  });

  test("si una página falla, no devuelve resultados a medias", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ places: [lugar], nextPageToken: "t2" }))
      .mockResolvedValueOnce(respuesta({ error: { message: "quota" } }, false, 429));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r).toEqual({ ok: false, error: "error_api", detalle: expect.stringContaining("429") });
  });

  test("un fallo de red también es error_api", async () => {
    const f = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r).toEqual({ ok: false, error: "error_api", detalle: "ECONNRESET" });
  });

  test("cero resultados es una búsqueda válida", async () => {
    const f = vi.fn().mockResolvedValue(respuesta({}));
    expect(await buscarEnPlaces({ categoria: "x", ciudad: "y" }, f)).toEqual({ ok: true, prospectos: [] });
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/places.test.ts`
Expected: FAIL — no se resuelve `../places`.

- [ ] **Step 3: Implementar**

`src/lib/prospeccion/places.ts`:

```ts
import "server-only";
import type { ProspectoNuevo } from "./tipos";

const URL_BUSQUEDA = "https://places.googleapis.com/v1/places:searchText";
const MAX_PAGINAS = 3;
const POR_PAGINA = 20;

/** Solo los campos que se guardan: Places cobra según lo que se pide. */
const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

/** Un perfil en una red social no es una web: ni se puede leer para buscar el
 *  email, ni quita que al negocio le haga falta una. */
const REDES = ["facebook.com", "instagram.com", "linktr.ee", "wa.me", "tiktok.com", "twitter.com", "x.com"];

function webPropia(bruta: unknown): string | null {
  if (typeof bruta !== "string" || !bruta.trim()) return null;
  try {
    const host = new URL(bruta).hostname.toLowerCase();
    if (REDES.some((r) => host === r || host.endsWith(`.${r}`))) return null;
    return bruta.trim();
  } catch {
    return null;
  }
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function componente(lugar: Record<string, unknown>, tipo: string): string | null {
  const lista = Array.isArray(lugar.addressComponents) ? lugar.addressComponents : [];
  for (const c of lista as Array<{ longText?: unknown; types?: unknown }>) {
    if (Array.isArray(c.types) && c.types.includes(tipo)) return texto(c.longText);
  }
  return null;
}

export function normalizarLugar(bruto: unknown, ciudadBuscada: string): ProspectoNuevo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const lugar = bruto as Record<string, unknown>;
  const id = texto(lugar.id);
  const nombre = texto((lugar.displayName as { text?: unknown } | undefined)?.text);
  if (!id || !nombre) return null;
  return {
    source: "places",
    external_id: id,
    name: nombre,
    sector: texto((lugar.primaryTypeDisplayName as { text?: unknown } | undefined)?.text),
    address: texto(lugar.formattedAddress),
    city: componente(lugar, "locality") ?? texto(ciudadBuscada),
    province: componente(lugar, "administrative_area_level_2"),
    phone: texto(lugar.nationalPhoneNumber),
    website: webPropia(lugar.websiteUri),
    rating: typeof lugar.rating === "number" ? lugar.rating : null,
    reviews: typeof lugar.userRatingCount === "number" ? lugar.userRatingCount : null,
  };
}

/** Busca negocios de una categoría en una ciudad. Si falla cualquier página se
 *  devuelve el error y ningún resultado: una búsqueda a medias parecería
 *  completa en el panel. */
export async function buscarEnPlaces(
  q: { categoria: string; ciudad: string },
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { ok: true; prospectos: ProspectoNuevo[] }
  | { ok: false; error: "sin_clave" | "error_api"; detalle?: string }
> {
  const clave = process.env.GOOGLE_PLACES_API_KEY;
  if (!clave) return { ok: false, error: "sin_clave" };

  const base = {
    textQuery: `${q.categoria.trim()} en ${q.ciudad.trim()}`,
    languageCode: "es",
    regionCode: "ES",
    pageSize: POR_PAGINA,
  };
  const prospectos: ProspectoNuevo[] = [];
  const vistos = new Set<string>();
  let pageToken: string | undefined;

  try {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const res = await fetchImpl(URL_BUSQUEDA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": clave,
          "X-Goog-FieldMask": CAMPOS,
        },
        body: JSON.stringify(pageToken ? { ...base, pageToken } : base),
      });
      if (!res.ok) {
        const cuerpo = await res.text().catch(() => "");
        return { ok: false, error: "error_api", detalle: `${res.status} ${cuerpo.slice(0, 200)}` };
      }
      const datos = (await res.json()) as { places?: unknown[]; nextPageToken?: string };
      for (const bruto of datos.places ?? []) {
        const p = normalizarLugar(bruto, q.ciudad);
        if (p && !vistos.has(p.external_id)) {
          vistos.add(p.external_id);
          prospectos.push(p);
        }
      }
      pageToken = datos.nextPageToken;
      if (!pageToken) break;
    }
  } catch (err) {
    return { ok: false, error: "error_api", detalle: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, prospectos };
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/places.test.ts`
Expected: 10 pruebas en verde.

Nota: en la prueba «no pasa de tres páginas» el mismo lugar se repite; por eso el resultado se deduplica con `vistos`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prospeccion/places.ts src/lib/prospeccion/__tests__/places.test.ts
git commit -m "feat(prospeccion): búsqueda de negocios en Google Places"
```

---

### Task 6: `fetch` seguro compartido y enriquecimiento

**Files:**
- Create: `src/lib/fetch-seguro.ts`
- Modify: `src/lib/website-extract.ts` (imports de cabecera, `ssrfLookup` en las líneas ~31-62 y el bloque de `fetch` de `extractWebsite` en ~163-212)
- Create: `src/lib/prospeccion/enriquecer.ts`
- Test: `src/lib/prospeccion/__tests__/enriquecer.test.ts`

**Interfaces:**
- Consumes: `extraerEmails`, `elegirEmail`, `enlacesDeContacto` (Task 2); `normalizeUrl`, `isBlockedHost` de `@/lib/website-extract-guard`.
- Produces:
  - `fetch-seguro.ts`: `ssrfLookup`, `crearAgenteSeguro(timeoutMs: number): Agent`, `leerHtml(url: URL, o: { agente: Agent; signal: AbortSignal; maxBytes: number; userAgent: string }): Promise<{ urlFinal: URL; html: string } | null>`, `leerPaginaSegura(url: URL): Promise<{ urlFinal: URL; html: string } | null>`
  - `enriquecer.ts`: `type LectorPagina = (url: URL) => Promise<{ urlFinal: URL; html: string } | null>`; `enriquecerWeb(web: string | null, leer?: LectorPagina): Promise<{ email: string | null; tipo: TipoEmail | null; nota: string | null }>`

- [ ] **Step 1: Extraer el `fetch` protegido**

`src/lib/fetch-seguro.ts` — el `ssrfLookup` se **mueve** tal cual desde `website-extract.ts` (mismo cuerpo, mismo comentario):

```ts
import "server-only";
import dns from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isBlockedHost, isBlockedIp } from "./website-extract-guard";

/** Custom DNS resolver for undici. Runs for EVERY connection the dispatcher
 *  opens — the initial request and each redirect hop — and rejects the
 *  connection if any resolved address is in a blocked range. Because undici
 *  connects to exactly the address we return here, there is no resolve→connect
 *  TOCTOU gap (no DNS-rebinding window). */
export const ssrfLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 0);
      return;
    }
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0) {
      callback(new Error("No address resolved"), "", 0);
      return;
    }
    const blocked = list.find((a) => isBlockedIp(a.address));
    if (blocked) {
      callback(new Error(`Blocked by SSRF guard: ${blocked.address}`), "", 0);
      return;
    }
    // Respect the shape undici asked for.
    if ((options as dns.LookupAllOptions).all) {
      callback(null, list as unknown as string, 0);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
};

/** Agente de undici cuyas conexiones pasan todas por {@link ssrfLookup}. Quien
 *  lo crea lo cierra (`agente.close()`). */
export function crearAgenteSeguro(timeoutMs: number): Agent {
  return new Agent({
    connect: { lookup: ssrfLookup },
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
}

/** Descarga una página HTML a través del agente protegido, leyendo como mucho
 *  `maxBytes`. Devuelve null si no responde bien, no es HTML o acaba en un host
 *  bloqueado. Los errores de red se propagan: decide quien llama. */
export async function leerHtml(
  url: URL,
  o: { agente: Agent; signal: AbortSignal; maxBytes: number; userAgent: string },
): Promise<{ urlFinal: URL; html: string } | null> {
  const res = await undiciFetch(url, {
    method: "GET",
    redirect: "follow", // each hop re-connects through ssrfLookup → revalidated
    signal: o.signal,
    dispatcher: o.agente,
    headers: { "User-Agent": o.userAgent, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok || !res.body) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) return null;

  // Final URL host re-check (defense in depth; the lookup already vetted the
  // IP of every hop).
  const urlFinal = new URL(res.url || url.toString());
  if (isBlockedHost(urlFinal.hostname)) return null;

  // Read at most maxBytes so a giant page can't exhaust memory.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let received = 0;
  while (received < o.maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return { urlFinal, html };
}

const TIMEOUT_MS = 6000;
const MAX_BYTES = 600_000;

/** Lee una página suelta, con su propio agente y su propio límite de tiempo.
 *  Nunca lanza: cualquier problema es null. */
export async function leerPaginaSegura(url: URL): Promise<{ urlFinal: URL; html: string } | null> {
  if (isBlockedHost(url.hostname)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const agente = crearAgenteSeguro(TIMEOUT_MS);
  try {
    return await leerHtml(url, {
      agente,
      signal: controller.signal,
      maxBytes: MAX_BYTES,
      userAgent: "Mozilla/5.0 (compatible; DinkbitBot/1.0; +https://www.dinkbit.es)",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    await agente.close().catch(() => {});
  }
}
```

- [ ] **Step 2: Usarlo desde `website-extract.ts`**

En `src/lib/website-extract.ts`:

1. Cabecera — quitar `import dns from "node:dns";` y `import type { LookupFunction } from "node:net";`, y añadir:

```ts
import { crearAgenteSeguro, leerHtml } from "./fetch-seguro";
```

`import { Agent, fetch as undiciFetch } from "undici";` se queda: lo usa `measureImageWidth`. De `./website-extract-guard` queda `import { isBlockedHost, normalizeUrl } from "./website-extract-guard";` (`isBlockedIp` ya solo lo usa `fetch-seguro`).

2. Borrar la definición entera de `ssrfLookup` con su comentario.

3. En `extractWebsite`, sustituir desde `const dispatcher = new Agent({` hasta `await reader.cancel().catch(() => {});` (ambos incluidos) por:

```ts
  const dispatcher = crearAgenteSeguro(FETCH_TIMEOUT_MS);

  try {
    const pagina = await leerHtml(url, {
      agente: dispatcher,
      signal: controller.signal,
      maxBytes: MAX_BYTES,
      userAgent: "Mozilla/5.0 (compatible; DinkbitPreviewBot/1.0)",
    });
    if (!pagina) return null;
    const { html, urlFinal: finalUrl } = pagina;
```

El resto de la función (`const extracted = extractFromHtml(html, finalUrl);` en adelante, el `catch` y el `finally`) no cambia.

- [ ] **Step 3: Comprobar que el refactor no rompe nada**

Run: `npm run typecheck && npx vitest run src/lib/__tests__/website-extract-guard.test.ts`
Expected: typecheck limpio y las pruebas existentes en verde. (`website-extract.ts` no tiene prueba propia: el comportamiento es el mismo código, movido.)

- [ ] **Step 4: Commit del refactor**

```bash
git add src/lib/fetch-seguro.ts src/lib/website-extract.ts
git commit -m "refactor: extraer el fetch con guardia SSRF a un módulo compartido"
```

- [ ] **Step 5: Escribir la prueba del enriquecimiento**

`src/lib/prospeccion/__tests__/enriquecer.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";

vi.mock("../../fetch-seguro", () => ({ leerPaginaSegura: vi.fn() }));

import { enriquecerWeb, type LectorPagina } from "../enriquecer";

/** Lector de mentira: un mapa de URL → HTML. */
function lector(paginas: Record<string, string>): LectorPagina & { mock: { calls: unknown[][] } } {
  return vi.fn(async (url: URL) => {
    const html = paginas[url.toString()];
    return html === undefined ? null : { urlFinal: url, html };
  }) as never;
}

describe("enriquecerWeb", () => {
  test("sin web no hay nada que leer", async () => {
    const leer = lector({});
    expect(await enriquecerWeb(null, leer)).toEqual({ email: null, tipo: null, nota: "Sin web." });
    expect(leer).not.toHaveBeenCalled();
  });

  test("si la portada ya trae un buzón genérico, no lee más páginas", async () => {
    const leer = lector({
      "https://bar.es/": `<a href="/contacto">Contacto</a> info@bar.es`,
      "https://bar.es/contacto": "otra@bar.es",
    });
    expect(await enriquecerWeb("bar.es", leer)).toEqual({ email: "info@bar.es", tipo: "generica", nota: null });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  test("si la portada no lo trae, busca en contacto y aviso legal", async () => {
    const leer = lector({
      "https://bar.es/": `<a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a>`,
      "https://bar.es/contacto": "<p>Llámanos</p>",
      "https://bar.es/aviso-legal": "<p>Titular: Bar SL, reservas@bar.es</p>",
    });
    expect(await enriquecerWeb("https://bar.es", leer)).toEqual({
      email: "reservas@bar.es",
      tipo: "generica",
      nota: null,
    });
    expect(leer).toHaveBeenCalledTimes(3);
  });

  test("prefiere un genérico de la página de contacto a un personal de la portada", async () => {
    const leer = lector({
      "https://bar.es/": `juan.perez@bar.es <a href="/contacto">Contacto</a>`,
      "https://bar.es/contacto": "info@bar.es",
    });
    expect((await enriquecerWeb("bar.es", leer)).email).toBe("info@bar.es");
  });

  test("compara con el dominio final tras una redirección", async () => {
    const leer: LectorPagina = async () => ({
      urlFinal: new URL("https://www.barpepe.com/"),
      html: "info@barpepe.com",
    });
    expect((await enriquecerWeb("bar.es", leer)).email).toBe("info@barpepe.com");
  });

  test("web que no responde", async () => {
    expect(await enriquecerWeb("bar.es", lector({}))).toEqual({
      email: null,
      tipo: null,
      nota: "La web no responde.",
    });
  });

  test("web sin email publicado", async () => {
    expect(await enriquecerWeb("bar.es", lector({ "https://bar.es/": "<p>Hola</p>" }))).toEqual({
      email: null,
      tipo: null,
      nota: "La web no publica ningún email.",
    });
  });

  test("una URL inválida o interna no se intenta", async () => {
    const leer = lector({});
    expect((await enriquecerWeb("javascript:alert(1)", leer)).nota).toBe("La web no responde.");
    expect((await enriquecerWeb("http://localhost/admin", leer)).nota).toBe("La web no responde.");
    expect(leer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/enriquecer.test.ts`
Expected: FAIL — no se resuelve `../enriquecer`.

- [ ] **Step 7: Implementar**

`src/lib/prospeccion/enriquecer.ts`:

```ts
import "server-only";
import { leerPaginaSegura } from "../fetch-seguro";
import { isBlockedHost, normalizeUrl } from "../website-extract-guard";
import { elegirEmail, enlacesDeContacto, extraerEmails } from "./emails";
import type { TipoEmail } from "./tipos";

export type LectorPagina = (url: URL) => Promise<{ urlFinal: URL; html: string } | null>;

export interface ResultadoEnriquecer {
  email: string | null;
  tipo: TipoEmail | null;
  /** Por qué no hay email, para enseñarlo en la tabla. */
  nota: string | null;
}

const sinEmail = (nota: string): ResultadoEnriquecer => ({ email: null, tipo: null, nota });

/** Busca en la web de un negocio la mejor dirección a la que escribirle: la
 *  portada primero y, si no trae un buzón genérico, las páginas de contacto y
 *  aviso legal (tres páginas como mucho). `leer` es inyectable para las
 *  pruebas; por defecto pasa por la guardia SSRF. */
export async function enriquecerWeb(
  web: string | null,
  leer: LectorPagina = leerPaginaSegura,
): Promise<ResultadoEnriquecer> {
  if (!web || !web.trim()) return sinEmail("Sin web.");
  const url = normalizeUrl(web);
  if (!url || isBlockedHost(url.hostname)) return sinEmail("La web no responde.");

  const portada = await leer(url);
  if (!portada) return sinEmail("La web no responde.");

  const dominio = portada.urlFinal.hostname;
  const emails = extraerEmails(portada.html);
  let mejor = elegirEmail(emails, dominio);

  if (!mejor || mejor.tipo !== "generica") {
    for (const enlace of enlacesDeContacto(portada.html, portada.urlFinal)) {
      const pagina = await leer(new URL(enlace));
      if (pagina) emails.push(...extraerEmails(pagina.html));
    }
    mejor = elegirEmail(emails, dominio);
  }

  return mejor
    ? { email: mejor.email, tipo: mejor.tipo, nota: null }
    : sinEmail("La web no publica ningún email.");
}
```

- [ ] **Step 8: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/enriquecer.test.ts`
Expected: 8 pruebas en verde.

- [ ] **Step 9: Commit**

```bash
git add src/lib/prospeccion/enriquecer.ts src/lib/prospeccion/__tests__/enriquecer.test.ts
git commit -m "feat(prospeccion): encontrar el email de un negocio leyendo su web"
```

---

### Task 7: Baja y rebotes

**Files:**
- Create: `src/lib/prospeccion/baja-token.ts`
- Create: `src/app/api/prospeccion/baja/route.ts`
- Modify: `src/app/api/resend/webhook/route.ts`
- Test: `src/lib/prospeccion/__tests__/baja.test.ts`

**Interfaces:**
- Consumes: `mintUnsubscribeToken`, `verifyUnsubscribeToken` de `@/lib/unsubscribe-token`; `getProspecto`, `marcarEstado`, `marcarPorResendId`, `suprimir` (Task 1); `resendEventStatus` de `@/lib/resend-webhook`.
- Produces: `urlDeBaja(prospectoId: string): string`, `verificarTokenBaja(prospectoId: string, token: string): boolean`.

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/baja.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const { getProspectoMock, marcarEstadoMock, suprimirMock } = vi.hoisted(() => ({
  getProspectoMock: vi.fn(),
  marcarEstadoMock: vi.fn(),
  suprimirMock: vi.fn(),
}));
vi.mock("../db", () => ({
  getProspecto: getProspectoMock,
  marcarEstado: marcarEstadoMock,
  suprimir: suprimirMock,
}));

import { urlDeBaja, verificarTokenBaja } from "../baja-token";
import { verifyUnsubscribeToken } from "../../unsubscribe-token";
import { GET } from "@/app/api/prospeccion/baja/route";

beforeEach(() => {
  vi.stubEnv("PROMO_TOKEN_SECRET", "secreto-de-prueba");
  getProspectoMock.mockReset();
  marcarEstadoMock.mockReset();
  suprimirMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const pedir = (url: string) => GET(new NextRequest(url));

describe("token de baja", () => {
  test("la URL lleva un token que verifica para ese prospecto y no para otro", () => {
    const url = new URL(urlDeBaja("p1"));
    expect(url.pathname).toBe("/api/prospeccion/baja");
    const token = url.searchParams.get("token") ?? "";
    expect(verificarTokenBaja("p1", token)).toBe(true);
    expect(verificarTokenBaja("p2", token)).toBe(false);
  });

  test("no sirve como token de baja de un lead con el mismo id", () => {
    const token = new URL(urlDeBaja("p1")).searchParams.get("token") ?? "";
    expect(verifyUnsubscribeToken("p1", token)).toBe(false);
  });
});

describe("GET /api/prospeccion/baja", () => {
  test("con token válido da de baja y suprime el email", async () => {
    getProspectoMock.mockResolvedValue({ id: "p1", email: "Info@Bar.es" });
    const res = await pedir(urlDeBaja("p1"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No recibirás más correos");
    expect(marcarEstadoMock).toHaveBeenCalledWith(["p1"], "baja");
    expect(suprimirMock).toHaveBeenCalledWith("Info@Bar.es", "email", "baja");
  });

  test("con token manipulado no toca nada", async () => {
    const res = await pedir(`${urlDeBaja("p1")}x`);
    expect(await res.text()).toContain("no válido");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("con token caducado no toca nada", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const url = urlDeBaja("p1");
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z")); // > 180 días
    const res = await pedir(url);
    expect(await res.text()).toContain("no válido");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("sin parámetros responde sin romperse", async () => {
    const res = await pedir("https://www.dinkbit.es/api/prospeccion/baja");
    expect(res.status).toBe(200);
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("si el prospecto ya no existe, la baja se confirma igual", async () => {
    getProspectoMock.mockResolvedValue(null);
    const res = await pedir(urlDeBaja("p1"));
    expect(await res.text()).toContain("No recibirás más correos");
    expect(suprimirMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/baja.test.ts`
Expected: FAIL — no se resuelve `../baja-token`.

- [ ] **Step 3: Implementar el token**

`src/lib/prospeccion/baja-token.ts`:

```ts
import "server-only";
import { mintUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token";

const SITE = "https://www.dinkbit.es";

/** Mismo HMAC que la baja de los leads, con un prefijo en lo que se firma: así
 *  un token de prospecto no vale en `/api/unsubscribe` ni al revés. */
const sujeto = (prospectoId: string) => `prospecto:${prospectoId}`;

export function urlDeBaja(prospectoId: string): string {
  const token = mintUnsubscribeToken(sujeto(prospectoId));
  return `${SITE}/api/prospeccion/baja?id=${encodeURIComponent(prospectoId)}&token=${token}`;
}

export function verificarTokenBaja(prospectoId: string, token: string): boolean {
  return verifyUnsubscribeToken(sujeto(prospectoId), token);
}
```

- [ ] **Step 4: Implementar la ruta**

`src/app/api/prospeccion/baja/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verificarTokenBaja } from "@/lib/prospeccion/baja-token";
import { getProspecto, marcarEstado, suprimir } from "@/lib/prospeccion/db";

// Enlace de baja de los correos de prospección. Además de marcar el prospecto,
// el email entra en la lista de supresión: si la misma empresa vuelve a salir
// en otra búsqueda, sigue sin recibir nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(msg: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;text-align:center;padding:64px 20px;"><h1 style="font-size:22px;">${msg}</h1><p><a href="https://www.dinkbit.es" style="color:#187bef;">dinkbit.es</a></p></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!id || !verificarTokenBaja(id, token)) {
    return page("Enlace de baja no válido o caducado.");
  }
  const prospecto = await getProspecto(id);
  if (prospecto) {
    await marcarEstado([id], "baja");
    if (prospecto.email) await suprimir(prospecto.email, "email", "baja");
  }
  return page("Hecho. No recibirás más correos nuestros.");
}
```

- [ ] **Step 5: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/baja.test.ts`
Expected: 7 pruebas en verde.

- [ ] **Step 6: Rebotes y quejas en el webhook de Resend**

En `src/app/api/resend/webhook/route.ts`, añadir el import:

```ts
import { marcarPorResendId, suprimir } from "@/lib/prospeccion/db";
```

y, justo antes del comentario `// 200 con firma válida aunque no case ninguna fila…`, añadir:

```ts
  // Correos de prospección: se reconocen porque su id de Resend está guardado
  // en el prospecto. Un rebote o una queja lo sacan de circulación y vetan la
  // dirección para siempre.
  if (messageId && (leadStatus === "bounced" || leadStatus === "complained")) {
    const queja = leadStatus === "complained";
    const email = await marcarPorResendId(messageId, queja ? "baja" : "rebotado");
    if (email) await suprimir(email, "email", queja ? "queja" : "rebote");
  }
```

- [ ] **Step 7: Comprobar que el webhook sigue en verde**

Run: `npx vitest run src/lib/__tests__/resend-webhook.test.ts && npm run typecheck`
Expected: verde y typecheck limpio. Si existe una prueba de la ruta (`grep -rl "resend/webhook/route" src`) que simule `@/lib/imagina-leads`, añadirle `vi.mock("@/lib/prospeccion/db", () => ({ marcarPorResendId: vi.fn(async () => null), suprimir: vi.fn() }));`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/prospeccion/baja-token.ts src/lib/prospeccion/__tests__/baja.test.ts src/app/api/prospeccion src/app/api/resend/webhook/route.ts
git commit -m "feat(prospeccion): enlace de baja y supresión por rebote o queja"
```

---

### Task 8: Envío

**Files:**
- Create: `src/lib/prospeccion/enviar.ts`
- Test: `src/lib/prospeccion/__tests__/enviar.test.ts`

**Interfaces:**
- Consumes: db (Task 1), `renderPlantilla`, `textoAHtml`, `datosDeProspecto` (Task 3), `motivoBloqueo`, `limiteDiario`, `remitentesProspeccion`, `inicioDelDiaMadrid`, `MotivoBloqueo` (Task 4), `urlDeBaja` (Task 7), `listLeadContacts` de `@/lib/imagina-leads`, `formatFromHeader` de `@/lib/email-from`.
- Produces:
  - `type ErrorEnvio = MotivoBloqueo | "sin_remitente" | "remitente_no_permitido" | "plantilla_no_encontrada" | "tope_diario" | "faltan_datos" | "ya_reclamado" | "fallo_resend"`
  - `enviarProspectos(ids: string[], plantillaId: string, o: { from: string; confirmarPersonal?: boolean }): Promise<{ ok: boolean; error?: ErrorEnvio; enviados: number; omitidos: Array<{ id: string; motivo: ErrorEnvio; detalle?: string }> }>`
  - `componerCorreo(cuerpoTexto: string, bajaUrl: string): { html: string; text: string }`

- [ ] **Step 1: Escribir la prueba**

`src/lib/prospeccion/__tests__/enviar.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const db = vi.hoisted(() => ({
  prospectosPorIds: vi.fn(),
  getPlantilla: vi.fn(),
  listarSuprimidos: vi.fn(),
  enviadosDesde: vi.fn(),
  reclamarParaEnvio: vi.fn(),
  registrarEnvio: vi.fn(),
  revertirEnvio: vi.fn(),
}));
vi.mock("../db", () => db);

const { listLeadContactsMock } = vi.hoisted(() => ({ listLeadContactsMock: vi.fn() }));
vi.mock("../../imagina-leads", () => ({ listLeadContacts: listLeadContactsMock }));

import { componerCorreo, enviarProspectos } from "../enviar";

const FROM = "hola@mail.dinkbit.es";
const plantilla = { id: "t1", name: "Web", subject: "Una web para {{empresa}}", body: "Hola {{empresa}} de {{ciudad}}." };
const prospecto = (extra: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Bar Pepe",
  city: "Madrid",
  sector: "Restaurante",
  website: "https://barpepe.es",
  email: "info@barpepe.es",
  email_kind: "generica",
  status: "listo",
  ...extra,
});

beforeEach(() => {
  vi.stubEnv("PROSPECT_SENDERS", FROM);
  vi.stubEnv("PROMO_TOKEN_SECRET", "secreto");
  for (const f of Object.values(db)) f.mockReset();
  sendMock.mockReset();
  listLeadContactsMock.mockReset();
  db.getPlantilla.mockResolvedValue(plantilla);
  db.prospectosPorIds.mockResolvedValue([prospecto()]);
  db.listarSuprimidos.mockResolvedValue(new Set());
  db.enviadosDesde.mockResolvedValue(0);
  db.reclamarParaEnvio.mockResolvedValue(true);
  listLeadContactsMock.mockResolvedValue([]);
  sendMock.mockResolvedValue({ data: { id: "re_1" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("enviarProspectos", () => {
  test("envía un correo individual, con respuesta a dinkbit y enlace de baja", async () => {
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r).toEqual({ ok: true, enviados: 1, omitidos: [] });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const correo = sendMock.mock.calls[0][0];
    expect(correo.to).toBe("info@barpepe.es");
    expect(correo.from).toBe(`"dinkbit" <${FROM}>`);
    expect(correo.replyTo).toBe("hola@dinkbit.es");
    expect(correo.subject).toBe("Una web para Bar Pepe");
    expect(correo.text).toContain("Hola Bar Pepe de Madrid.");
    expect(correo.text).toContain("/api/prospeccion/baja?id=p1&token=");
    expect(correo.html).toContain("/api/prospeccion/baja?id=p1&amp;token=");
    expect(correo.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/www\.dinkbit\.es\/api\/prospeccion\/baja\?id=p1&token=.+>$/);
    expect(db.registrarEnvio).toHaveBeenCalledWith("p1", { resendId: "re_1", templateId: "t1" });
  });

  test("sin PROSPECT_SENDERS no envía, aunque exista el remitente de campañas", async () => {
    vi.stubEnv("PROSPECT_SENDERS", "");
    vi.stubEnv("CAMPAIGN_SENDERS", "hola@dinkbit.es");
    const r = await enviarProspectos(["p1"], "t1", { from: "hola@dinkbit.es" });
    expect(r).toEqual({ ok: false, error: "sin_remitente", enviados: 0, omitidos: [] });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("rechaza un remitente fuera de la lista", async () => {
    const r = await enviarProspectos(["p1"], "t1", { from: "otro@dinkbit.es" });
    expect(r.error).toBe("remitente_no_permitido");
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("plantilla inexistente", async () => {
    db.getPlantilla.mockResolvedValue(null);
    expect((await enviarProspectos(["p1"], "nope", { from: FROM })).error).toBe("plantilla_no_encontrada");
  });

  test("doble clic: si otra petición ya reclamó la fila, no sale un segundo correo", async () => {
    db.reclamarParaEnvio.mockResolvedValue(false);
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "ya_reclamado" }]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("si Resend falla, deshace el reclamo y no cuenta como enviado", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "fallo_resend", detalle: "domain not verified" }]);
    expect(db.revertirEnvio).toHaveBeenCalledWith("p1", "domain not verified");
    expect(db.registrarEnvio).not.toHaveBeenCalled();
  });

  test("si Resend lanza, también deshace el reclamo", async () => {
    sendMock.mockRejectedValue(new Error("timeout"));
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.omitidos[0]).toMatchObject({ motivo: "fallo_resend", detalle: "timeout" });
    expect(db.revertirEnvio).toHaveBeenCalledWith("p1", "timeout");
  });

  test("no reclama la fila si a la plantilla le falta un dato", async () => {
    db.prospectosPorIds.mockResolvedValue([prospecto({ city: null })]);
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "faltan_datos", detalle: "ciudad" }]);
    expect(db.reclamarParaEnvio).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("respeta la supresión y a quien ya es lead", async () => {
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    db.listarSuprimidos.mockResolvedValue(new Set(["info@a.es"]));
    listLeadContactsMock.mockResolvedValue([{ email: "INFO@b.es", phone: null }]);
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([
      { id: "a", motivo: "suprimido" },
      { id: "b", motivo: "ya_es_lead" },
    ]);
  });

  test("una dirección personal no sale en un envío múltiple ni sin confirmar", async () => {
    const personal = prospecto({ email: "juan@barpepe.es", email_kind: "personal" });
    db.prospectosPorIds.mockResolvedValue([personal]);
    expect((await enviarProspectos(["p1"], "t1", { from: FROM })).omitidos[0].motivo).toBe("personal_sin_confirmar");

    db.prospectosPorIds.mockResolvedValue([personal, prospecto({ id: "p2", email: "info@otro.es" })]);
    const multiple = await enviarProspectos(["p1", "p2"], "t1", { from: FROM, confirmarPersonal: true });
    expect(multiple.omitidos).toEqual([{ id: "p1", motivo: "personal_sin_confirmar" }]);
    expect(multiple.enviados).toBe(1);

    db.prospectosPorIds.mockResolvedValue([personal]);
    expect((await enviarProspectos(["p1"], "t1", { from: FROM, confirmarPersonal: true })).enviados).toBe(1);
  });

  test("al llegar al tope diario manda hasta el tope y deja el resto sin tocar", async () => {
    vi.stubEnv("PROSPECT_DAILY_LIMIT", "30");
    db.enviadosDesde.mockResolvedValue(29);
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(1);
    expect(r.omitidos).toEqual([{ id: "b", motivo: "tope_diario" }]);
    expect(db.reclamarParaEnvio).toHaveBeenCalledTimes(1);
  });

  test("un envío fallido no gasta cupo del tope", async () => {
    vi.stubEnv("PROSPECT_DAILY_LIMIT", "1");
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    sendMock
      .mockResolvedValueOnce({ data: null, error: { message: "x" } })
      .mockResolvedValueOnce({ data: { id: "re_2" }, error: null });
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(1);
  });

  test("un id que no existe se informa como omitido", async () => {
    db.prospectosPorIds.mockResolvedValue([]);
    const r = await enviarProspectos(["fantasma"], "t1", { from: FROM });
    expect(r.omitidos).toEqual([{ id: "fantasma", motivo: "estado" }]);
  });
});

describe("componerCorreo", () => {
  test("el pie identifica a dinkbit, dice de dónde sale la dirección y enlaza la baja", () => {
    const { html, text } = componerCorreo("Hola <Bar>", "https://www.dinkbit.es/baja?id=1&token=2");
    expect(text).toContain("Hola <Bar>");
    expect(text).toContain("publicada en su web");
    expect(text).toContain("https://www.dinkbit.es/baja?id=1&token=2");
    expect(html).toContain("Hola &lt;Bar&gt;");
    expect(html).toContain('href="https://www.dinkbit.es/baja?id=1&amp;token=2"');
    expect(html).toContain("dinkbit");
  });
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/enviar.test.ts`
Expected: FAIL — no se resuelve `../enviar`.

- [ ] **Step 3: Implementar**

`src/lib/prospeccion/enviar.ts`:

```ts
import "server-only";
import { Resend } from "resend";
import { formatFromHeader } from "../email-from";
import { listLeadContacts } from "../imagina-leads";
import { urlDeBaja } from "./baja-token";
import {
  enviadosDesde,
  getPlantilla,
  listarSuprimidos,
  prospectosPorIds,
  reclamarParaEnvio,
  registrarEnvio,
  revertirEnvio,
} from "./db";
import { datosDeProspecto, renderPlantilla, textoAHtml } from "./plantilla";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  motivoBloqueo,
  remitentesProspeccion,
  type MotivoBloqueo,
} from "./reglas-envio";

export type ErrorEnvio =
  | MotivoBloqueo
  | "sin_remitente"
  | "remitente_no_permitido"
  | "plantilla_no_encontrada"
  | "tope_diario"
  | "faltan_datos"
  | "ya_reclamado"
  | "fallo_resend";

export interface ResultadoEnvio {
  ok: boolean;
  error?: ErrorEnvio;
  enviados: number;
  omitidos: Array<{ id: string; motivo: ErrorEnvio; detalle?: string }>;
}

const RESPONDER_A = process.env.PROSPECT_REPLY_TO ?? "hola@dinkbit.es";

const PIE =
  "Le escribe dinkbit (dinkbit.es · hola@dinkbit.es). Hemos encontrado esta dirección publicada en su web. " +
  "Si prefiere no recibir más correos nuestros, puede darse de baja aquí:";

/** Cuerpo ya renderizado + pie legal → versiones HTML y texto. Sobrio a
 *  propósito: tiene que leerse como un correo de persona a persona, no como una
 *  campaña. */
export function componerCorreo(cuerpoTexto: string, bajaUrl: string): { html: string; text: string } {
  const text = `${cuerpoTexto}\n\n--\n${PIE} ${bajaUrl}`;
  const enlace = bajaUrl.replace(/&/g, "&amp;");
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;">` +
    `${textoAHtml(cuerpoTexto)}` +
    `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">` +
    `${PIE} <a href="${enlace}" style="color:#64748b;">darme de baja</a>.</p></div>`;
  return { html, text };
}

const fallo = (error: ErrorEnvio): ResultadoEnvio => ({ ok: false, error, enviados: 0, omitidos: [] });

/** Envía la plantilla a cada prospecto, de uno en uno y cada cual en su propio
 *  correo. Lo que no se puede enviar se devuelve con su motivo, sin abortar el
 *  resto. Las direcciones personales solo salen si se pide un único prospecto
 *  con `confirmarPersonal`. */
export async function enviarProspectos(
  ids: string[],
  plantillaId: string,
  o: { from: string; confirmarPersonal?: boolean },
): Promise<ResultadoEnvio> {
  const remitentes = remitentesProspeccion();
  if (remitentes.length === 0) return fallo("sin_remitente");
  const from = o.from.trim().toLowerCase();
  if (!remitentes.includes(from)) return fallo("remitente_no_permitido");

  const plantilla = await getPlantilla(plantillaId);
  if (!plantilla) return fallo("plantilla_no_encontrada");

  const [filas, suprimidos, contactos, yaEnviados] = await Promise.all([
    prospectosPorIds(ids),
    listarSuprimidos(),
    listLeadContacts(),
    enviadosDesde(inicioDelDiaMadrid(new Date())),
  ]);
  const porId = new Map(filas.map((p) => [p.id, p]));
  const ctx = {
    suprimidos,
    emailsDeLeads: new Set(
      contactos.map((c) => (c.email ?? "").trim().toLowerCase()).filter(Boolean),
    ),
    confirmarPersonal: o.confirmarPersonal === true && ids.length === 1,
  };

  const resend = new Resend(process.env.RESEND_API_KEY ?? "");
  const resultado: ResultadoEnvio = { ok: true, enviados: 0, omitidos: [] };
  let cupo = limiteDiario() - yaEnviados;

  for (const id of ids) {
    const p = porId.get(id);
    if (!p) {
      resultado.omitidos.push({ id, motivo: "estado" });
      continue;
    }
    const bloqueo = motivoBloqueo(p, ctx);
    if (bloqueo) {
      resultado.omitidos.push({ id, motivo: bloqueo });
      continue;
    }
    if (cupo <= 0) {
      resultado.omitidos.push({ id, motivo: "tope_diario" });
      continue;
    }

    const datos = datosDeProspecto(p);
    const asunto = renderPlantilla(plantilla.subject, datos);
    const cuerpo = renderPlantilla(plantilla.body, datos);
    if (!asunto.ok || !cuerpo.ok) {
      const faltan = [...(asunto.ok ? [] : asunto.faltan), ...(cuerpo.ok ? [] : cuerpo.faltan)];
      resultado.omitidos.push({ id, motivo: "faltan_datos", detalle: [...new Set(faltan)].join(", ") });
      continue;
    }

    if (!(await reclamarParaEnvio(id))) {
      resultado.omitidos.push({ id, motivo: "ya_reclamado" });
      continue;
    }

    const baja = urlDeBaja(id);
    const { html, text } = componerCorreo(cuerpo.texto, baja);
    let detalle: string | null = null;
    let resendId: string | null = null;
    try {
      const { data, error } = await resend.emails.send({
        from: formatFromHeader(null, from),
        to: (p.email as string).trim(),
        replyTo: RESPONDER_A,
        subject: asunto.texto,
        html,
        text,
        headers: { "List-Unsubscribe": `<${baja}>` },
      });
      if (error) detalle = error.message;
      else resendId = data?.id ?? null;
    } catch (err) {
      detalle = err instanceof Error ? err.message : String(err);
    }

    if (detalle !== null) {
      await revertirEnvio(id, detalle);
      resultado.omitidos.push({ id, motivo: "fallo_resend", detalle });
      continue;
    }
    await registrarEnvio(id, { resendId, templateId: plantilla.id });
    resultado.enviados += 1;
    cupo -= 1;
  }

  return resultado;
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

Run: `npx vitest run src/lib/prospeccion/__tests__/enviar.test.ts && npm run typecheck`
Expected: 14 pruebas en verde, typecheck limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prospeccion/enviar.ts src/lib/prospeccion/__tests__/enviar.test.ts
git commit -m "feat(prospeccion): envío 1:1 con reclamo atómico, tope diario y pie de baja"
```

---

### Task 9: Pestaña, acciones e interfaz

**Files:**
- Create: `src/lib/prospeccion/filtros.ts`
- Test: `src/lib/prospeccion/__tests__/filtros.test.ts`
- Modify: `src/app/(site)/panel/_componentes/PanelShell.tsx:4-10`
- Create: `src/app/(site)/panel/prospeccion/page.tsx`
- Create: `src/app/(site)/panel/prospeccion/actions.ts`
- Create: `src/app/(site)/panel/prospeccion/Prospeccion.tsx`
- Create: `src/app/(site)/panel/prospeccion/Buscador.tsx`
- Create: `src/app/(site)/panel/prospeccion/TablaProspectos.tsx`
- Create: `src/app/(site)/panel/prospeccion/VistaPrevia.tsx`
- Create: `src/app/(site)/panel/prospeccion/Plantillas.tsx`
- Modify: `src/app/(site)/panel/LeadsTable.tsx:76-96`, `src/lib/leads-csv.ts:29-37`, `.env.example`

**Interfaces:**
- Consumes: todo lo anterior; `createManualLead` de `@/lib/imagina-leads`.
- Produces (acciones, todas `Promise<Resultado>` con `type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }` salvo donde se indica):
  - `buscarAction(categoria: string, ciudad: string): Promise<{ ok: true; searchId: string; mensaje: string } | { ok: false; error: string }>`
  - `enriquecerTandaAction(searchId: string): Promise<{ procesados: number; restantes: number }>`
  - `enviarAction(ids: string[], plantillaId: string, from: string, confirmarPersonal: boolean)`
  - `descartarAction(ids: string[])`, `marcarRespondidoAction(id: string)`, `convertirEnLeadAction(id: string)`
  - `guardarPlantillaAction(p: { id?: string; name: string; subject: string; body: string })`, `borrarPlantillaAction(id: string)`
- Produces (filtros): `interface FiltrosProspectos { texto: string; busqueda: string; estado: EstadoProspecto | ""; email: "" | "con" | "sin"; web: "" | "con" | "sin" }`, `FILTROS_VACIOS`, `filtrarProspectos(lista: ProspectRow[], f: FiltrosProspectos): ProspectRow[]`

- [ ] **Step 1: Prueba del filtro**

`src/lib/prospeccion/__tests__/filtros.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { FILTROS_VACIOS, filtrarProspectos } from "../filtros";
import type { ProspectRow } from "../tipos";

const p = (extra: Partial<ProspectRow>): ProspectRow =>
  ({ id: "x", name: "Bar", city: "Madrid", sector: null, email: null, website: null, status: "nuevo", search_id: "s1", ...extra }) as ProspectRow;

const lista = [
  p({ id: "a", name: "Bar Pepe", email: "info@pepe.es", website: "https://pepe.es", status: "listo" }),
  p({ id: "b", name: "Casa Lola", city: "Getafe", status: "sin_contacto" }),
  p({ id: "c", name: "Taller Ruiz", email: "  ", website: "https://ruiz.es", status: "enviado", search_id: "s2" }),
];
const ids = (f: Partial<typeof FILTROS_VACIOS>) => filtrarProspectos(lista, { ...FILTROS_VACIOS, ...f }).map((x) => x.id);

describe("filtrarProspectos", () => {
  test("sin filtros devuelve todo", () => expect(ids({})).toEqual(["a", "b", "c"]));
  test("por estado", () => expect(ids({ estado: "listo" })).toEqual(["a"]));
  test("por búsqueda de origen", () => expect(ids({ busqueda: "s2" })).toEqual(["c"]));
  test("con y sin email; un email en blanco es no tener", () => {
    expect(ids({ email: "con" })).toEqual(["a"]);
    expect(ids({ email: "sin" })).toEqual(["b", "c"]);
  });
  test("con y sin web", () => {
    expect(ids({ web: "con" })).toEqual(["a", "c"]);
    expect(ids({ web: "sin" })).toEqual(["b"]);
  });
  test("texto libre sobre nombre, ciudad y email, sin distinguir mayúsculas ni acentos", () => {
    expect(ids({ texto: "GETAFE" })).toEqual(["b"]);
    expect(ids({ texto: "pepe.es" })).toEqual(["a"]);
    expect(ids({ texto: "lóla" })).toEqual(["b"]);
  });
  test("los filtros se combinan", () => expect(ids({ web: "con", estado: "enviado" })).toEqual(["c"]));
});
```

- [ ] **Step 2: Ejecutar y ver fallar**

Run: `npx vitest run src/lib/prospeccion/__tests__/filtros.test.ts`
Expected: FAIL — no se resuelve `../filtros`.

- [ ] **Step 3: Implementar el filtro**

`src/lib/prospeccion/filtros.ts`:

```ts
import type { EstadoProspecto, ProspectRow } from "./tipos";

export interface FiltrosProspectos {
  texto: string;
  /** Id de la búsqueda de origen, o "" para todas. */
  busqueda: string;
  estado: EstadoProspecto | "";
  email: "" | "con" | "sin";
  web: "" | "con" | "sin";
}

export const FILTROS_VACIOS: FiltrosProspectos = { texto: "", busqueda: "", estado: "", email: "", web: "" };

const plano = (s: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tiene = (s: string | null) => !!s && s.trim() !== "";

export function filtrarProspectos(lista: ProspectRow[], f: FiltrosProspectos): ProspectRow[] {
  const texto = plano(f.texto.trim());
  return lista.filter((p) => {
    if (f.estado && p.status !== f.estado) return false;
    if (f.busqueda && p.search_id !== f.busqueda) return false;
    if (f.email && tiene(p.email) !== (f.email === "con")) return false;
    if (f.web && tiene(p.website) !== (f.web === "con")) return false;
    if (texto && ![p.name, p.city, p.email, p.sector].some((v) => plano(v).includes(texto))) return false;
    return true;
  });
}
```

Run: `npx vitest run src/lib/prospeccion/__tests__/filtros.test.ts` → 7 en verde.

- [ ] **Step 4: Añadir la pestaña y el canal**

`PanelShell.tsx`, en `PESTANAS`, tras la línea de `campanas`:

```ts
  { clave: "prospeccion", texto: "Prospección", ruta: "/panel/prospeccion" },
```

`LeadsTable.tsx`: en `CHANNEL_COLORS` añadir `"Prospección": "#7c3aed",` y en `CHANNEL_OPTIONS` añadir `"Prospección",` al final.

`src/lib/leads-csv.ts`: en `CSV_CHANNELS` añadir `"Prospección",` al final.

Run: `npx vitest run src/lib/__tests__/leads-csv.test.ts src/lib/__tests__/panel-filtros.test.ts`
Expected: verde. Si alguna prueba enumera los canales exactos, añadirle `"Prospección"`.

`.env.example`, al final:

```bash

# --- Prospección (/panel/prospeccion) ---
# Clave de Places API (New) de Google Cloud, con facturación activa. Sin ella
# la búsqueda de negocios queda deshabilitada.
GOOGLE_PLACES_API_KEY=
# Remitentes autorizados para los correos de prospección, separados por comas.
# Usar un subdominio distinto del de las campañas (p. ej. hola@mail.dinkbit.es)
# y verificarlo en Resend. Sin esta variable NO se envía nada: a propósito no se
# cae a CAMPAIGN_SENDERS.
PROSPECT_SENDERS=
# Dirección a la que llegan las respuestas. Por defecto hola@dinkbit.es.
PROSPECT_REPLY_TO=
# Correos de prospección por día (Europe/Madrid). Por defecto 30.
PROSPECT_DAILY_LIMIT=
```

- [ ] **Step 5: Acciones de servidor**

`src/app/(site)/panel/prospeccion/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createManualLead } from "@/lib/imagina-leads";
import {
  borrarPlantilla,
  buscarLeadPorEmail,
  cerrarBusqueda,
  contarPendientes,
  crearBusqueda,
  enlazarLead,
  getProspecto,
  guardarEnriquecimiento,
  guardarPlantilla,
  guardarProspectos,
  marcarEstado,
  pendientesDeEnriquecer,
} from "@/lib/prospeccion/db";
import { enriquecerWeb } from "@/lib/prospeccion/enriquecer";
import { enviarProspectos, type ErrorEnvio } from "@/lib/prospeccion/enviar";
import { buscarEnPlaces } from "@/lib/prospeccion/places";
import { TEXTO_BLOQUEO } from "@/lib/prospeccion/reglas-envio";

const RUTA = "/panel/prospeccion";
const TANDA = 10;

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

const TEXTO_ERROR: Record<ErrorEnvio, string> = {
  ...TEXTO_BLOQUEO,
  sin_remitente: "Falta configurar PROSPECT_SENDERS: sin un remitente de prospección no se envía.",
  remitente_no_permitido: "Ese remitente no está autorizado.",
  plantilla_no_encontrada: "La plantilla ya no existe.",
  tope_diario: "Se alcanzó el tope de envíos de hoy.",
  faltan_datos: "A la empresa le falta un dato que la plantilla usa",
  ya_reclamado: "Ya se le estaba enviando.",
  fallo_resend: "Resend rechazó el envío",
};

export async function buscarAction(
  categoria: string,
  ciudad: string,
): Promise<{ ok: true; searchId: string; mensaje: string } | { ok: false; error: string }> {
  const cat = categoria.trim().slice(0, 80);
  const ciu = ciudad.trim().slice(0, 80);
  if (!cat || !ciu) return { ok: false, error: "Indica qué buscar y en qué ciudad." };

  const searchId = await crearBusqueda("places", { categoria: cat, ciudad: ciu });
  if (!searchId) return { ok: false, error: "No se pudo guardar la búsqueda." };

  const r = await buscarEnPlaces({ categoria: cat, ciudad: ciu });
  if (!r.ok) {
    const error =
      r.error === "sin_clave"
        ? "Falta configurar GOOGLE_PLACES_API_KEY."
        : `Google Places devolvió un error (${r.detalle ?? "sin detalle"}).`;
    await cerrarBusqueda(searchId, { status: "error", error });
    revalidatePath(RUTA);
    return { ok: false, error };
  }

  const nuevas = await guardarProspectos(searchId, r.prospectos);
  await cerrarBusqueda(searchId, { status: "lista", total: r.prospectos.length });
  revalidatePath(RUTA);
  const repetidas = r.prospectos.length - nuevas;
  return {
    ok: true,
    searchId,
    mensaje:
      `${r.prospectos.length} empresas encontradas: ${nuevas} nuevas` +
      (repetidas > 0 ? ` y ${repetidas} que ya tenías.` : "."),
  };
}

/** Busca el email de hasta diez empresas de la búsqueda. El cliente la llama en
 *  bucle hasta que `restantes` llega a cero: así ninguna petición es larga y la
 *  barra de progreso avanza de verdad. */
export async function enriquecerTandaAction(
  searchId: string,
): Promise<{ procesados: number; restantes: number }> {
  const tanda = await pendientesDeEnriquecer(searchId, TANDA);
  await Promise.all(
    tanda.map(async (p) => {
      const r = await enriquecerWeb(p.website).catch(() => ({
        email: null,
        tipo: null,
        nota: "La web no responde.",
      }));
      await guardarEnriquecimiento(p.id, r);
    }),
  );
  const restantes = await contarPendientes(searchId);
  if (restantes === 0) revalidatePath(RUTA);
  // Si una tanda no avanzó (fallo de base de datos), se corta el bucle del cliente.
  return { procesados: tanda.length, restantes: tanda.length === 0 ? 0 : restantes };
}

export async function enviarAction(
  ids: string[],
  plantillaId: string,
  from: string,
  confirmarPersonal: boolean,
): Promise<Resultado> {
  if (ids.length === 0) return { ok: false, error: "No hay ninguna empresa seleccionada." };
  if (!plantillaId) return { ok: false, error: "Elige una plantilla." };
  const r = await enviarProspectos(ids.slice(0, 200), plantillaId, { from, confirmarPersonal });
  revalidatePath(RUTA);
  if (!r.ok) return { ok: false, error: TEXTO_ERROR[r.error ?? "fallo_resend"] };

  const motivos = [
    ...new Set(r.omitidos.map((o) => TEXTO_ERROR[o.motivo] + (o.detalle ? `: ${o.detalle}` : "."))),
  ];
  if (r.enviados === 0) {
    return { ok: false, error: `No se envió ninguno. ${motivos.join(" ")}` };
  }
  return {
    ok: true,
    mensaje:
      `${r.enviados} enviado${r.enviados === 1 ? "" : "s"}.` +
      (r.omitidos.length > 0 ? ` ${r.omitidos.length} sin enviar: ${motivos.join(" ")}` : ""),
  };
}

export async function descartarAction(ids: string[]): Promise<Resultado> {
  await marcarEstado(ids, "descartado");
  revalidatePath(RUTA);
  return { ok: true, mensaje: `${ids.length} descartada${ids.length === 1 ? "" : "s"}.` };
}

export async function marcarRespondidoAction(id: string): Promise<Resultado> {
  await marcarEstado([id], "respondido");
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Marcada como respondida." };
}

/** Pasa el prospecto al CRM. `consent` se queda sin definir: haber contestado a
 *  un correo no es consentimiento para recibir campañas. */
export async function convertirEnLeadAction(id: string): Promise<Resultado> {
  const p = await getProspecto(id);
  if (!p) return { ok: false, error: "Esa empresa ya no existe." };
  if (p.lead_id) return { ok: false, error: "Ya está en el CRM." };

  const existente = p.email ? await buscarLeadPorEmail(p.email) : null;
  if (existente) {
    await enlazarLead(id, existente);
    revalidatePath(RUTA);
    return { ok: true, mensaje: "Ya había un lead con ese email: queda enlazada con él." };
  }

  const alta = await createManualLead({
    name: p.name,
    email: p.email,
    phone: p.phone,
    website: p.website,
    channel: "Prospección",
    notes: [p.sector, p.city].filter(Boolean).join(" · ") || null,
  });
  if (!alta.ok || !alta.id) return { ok: false, error: "No se pudo crear el lead." };
  await enlazarLead(id, alta.id);
  revalidatePath(RUTA);
  revalidatePath("/panel");
  return { ok: true, mensaje: "Convertida en lead del CRM." };
}

export async function guardarPlantillaAction(p: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}): Promise<Resultado> {
  const name = p.name.trim().slice(0, 80);
  const subject = p.subject.trim().slice(0, 200);
  const body = p.body.trim().slice(0, 5000);
  if (!name || !subject || !body) return { ok: false, error: "Nombre, asunto y texto son obligatorios." };
  const ok = await guardarPlantilla({ id: p.id, name, subject, body });
  revalidatePath(RUTA);
  return ok ? { ok: true, mensaje: "Plantilla guardada." } : { ok: false, error: "No se pudo guardar." };
}

export async function borrarPlantillaAction(id: string): Promise<Resultado> {
  await borrarPlantilla(id);
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Plantilla borrada." };
}
```

- [ ] **Step 6: Página**

`src/app/(site)/panel/prospeccion/page.tsx`:

```tsx
import {
  enviadosDesde,
  listarBusquedas,
  listarPlantillas,
  listarProspectos,
} from "@/lib/prospeccion/db";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  remitentesProspeccion,
} from "@/lib/prospeccion/reglas-envio";
import { PanelShell } from "../_componentes/PanelShell";
import { Prospeccion } from "./Prospeccion";

export const metadata = {
  title: "Prospección — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ProspeccionPage() {
  const [prospectos, busquedas, plantillas, enviadosHoy] = await Promise.all([
    listarProspectos(),
    listarBusquedas(),
    listarPlantillas(),
    enviadosDesde(inicioDelDiaMadrid(new Date())),
  ]);

  return (
    <PanelShell activa="prospeccion">
      <Prospeccion
        prospectos={prospectos}
        busquedas={busquedas}
        plantillas={plantillas}
        enviadosHoy={enviadosHoy}
        limite={limiteDiario()}
        remitentes={remitentesProspeccion()}
        placesConfigurado={!!process.env.GOOGLE_PLACES_API_KEY}
      />
    </PanelShell>
  );
}
```

- [ ] **Step 7: Componente raíz y buscador**

`src/app/(site)/panel/prospeccion/Prospeccion.tsx`:

```tsx
"use client";

import { useState } from "react";
import type {
  ProspectRow,
  ProspectSearchRow,
  ProspectTemplateRow,
} from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario } from "../_componentes/estilos";
import { Buscador } from "./Buscador";
import { Plantillas } from "./Plantillas";
import { TablaProspectos } from "./TablaProspectos";

export interface Aviso {
  ok: boolean;
  texto: string;
}

export function Prospeccion(props: {
  prospectos: ProspectRow[];
  busquedas: ProspectSearchRow[];
  plantillas: ProspectTemplateRow[];
  enviadosHoy: number;
  limite: number;
  remitentes: string[];
  placesConfigurado: boolean;
}) {
  const [vista, setVista] = useState<"empresas" | "plantillas">("empresas");
  const [aviso, setAviso] = useState<Aviso | null>(null);

  // Empresas que se quedaron sin revisar, agrupadas por su búsqueda.
  const cuenta = new Map<string, number>();
  for (const p of props.prospectos) {
    if (p.status === "nuevo" && p.search_id) cuenta.set(p.search_id, (cuenta.get(p.search_id) ?? 0) + 1);
  }
  const pendientes = [...cuenta].map(([searchId, n]) => ({ searchId, n }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setVista("empresas")} style={vista === "empresas" ? botonPrimario : botonSecundario}>
          Empresas ({props.prospectos.length})
        </button>
        <button type="button" onClick={() => setVista("plantillas")} style={vista === "plantillas" ? botonPrimario : botonSecundario}>
          Plantillas ({props.plantillas.length})
        </button>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#475569" }}>
          Enviados hoy: <strong>{props.enviadosHoy}</strong> de {props.limite}
        </span>
      </div>

      {props.remitentes.length === 0 && (
        <p style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13 }}>
          No hay remitente de prospección configurado (<code>PROSPECT_SENDERS</code>). Puedes buscar y preparar, pero no enviar.
        </p>
      )}

      {aviso && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: aviso.ok ? "#16a34a" : "#b91c1c" }}>
          {aviso.texto}
        </p>
      )}

      {vista === "empresas" ? (
        <>
          <Buscador placesConfigurado={props.placesConfigurado} pendientes={pendientes} onAviso={setAviso} />
          <TablaProspectos
            prospectos={props.prospectos}
            busquedas={props.busquedas}
            plantillas={props.plantillas}
            remitentes={props.remitentes}
            cupo={Math.max(0, props.limite - props.enviadosHoy)}
            onAviso={setAviso}
          />
        </>
      ) : (
        <Plantillas plantillas={props.plantillas} onAviso={setAviso} />
      )}
    </div>
  );
}
```

`src/app/(site)/panel/prospeccion/Buscador.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../_componentes/estilos";
import { buscarAction, enriquecerTandaAction } from "./actions";
import type { Aviso } from "./Prospeccion";

/** 60 empresas en tandas de 10 son 6 vueltas; el margen cubre reintentos. Con
 *  tope, un fallo que no deje avanzar no convierte el bucle en infinito. */
const MAX_TANDAS = 12;

export function Buscador({
  placesConfigurado,
  pendientes,
  onAviso,
}: {
  placesConfigurado: boolean;
  /** Búsquedas con empresas aún sin revisar (se cerró la pestaña a medias). */
  pendientes: Array<{ searchId: string; n: number }>;
  onAviso: (a: Aviso | null) => void;
}) {
  const router = useRouter();
  const [categoria, setCategoria] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fase, setFase] = useState<null | "buscando" | "emails">(null);
  const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    onAviso(null);
    setFase("buscando");
    const r = await buscarAction(categoria, ciudad);
    if (!r.ok) {
      setFase(null);
      onAviso({ ok: false, texto: r.error });
      return;
    }
    onAviso({ ok: true, texto: r.mensaje });

    await revisarWebs([r.searchId]);
  }

  /** Emails: tandas de diez hasta que no quede ninguna empresa por mirar. */
  async function revisarWebs(searchIds: string[]) {
    setFase("emails");
    setProgreso({ hechos: 0, total: 0 });
    let hechos = 0;
    for (const searchId of searchIds) {
      for (let i = 0; i < MAX_TANDAS; i++) {
        const t = await enriquecerTandaAction(searchId);
        hechos += t.procesados;
        setProgreso({ hechos, total: hechos + t.restantes });
        if (t.restantes === 0) break;
      }
    }
    setFase(null);
    router.refresh();
  }

  const porRevisar = pendientes.reduce((suma, p) => suma + p.n, 0);

  return (
    <form onSubmit={buscar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={titulo}>Buscar negocios</h2>
      {!placesConfigurado && (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
          Falta configurar <code>GOOGLE_PLACES_API_KEY</code>: la búsqueda no está disponible.
        </p>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={etiqueta}>
          Qué buscar
          <input style={{ ...campo, width: 240 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="restaurante, clínica dental…" required maxLength={80} />
        </label>
        <label style={etiqueta}>
          Ciudad
          <input style={{ ...campo, width: 200 }} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Madrid" required maxLength={80} />
        </label>
        <button type="submit" disabled={!placesConfigurado || fase !== null} style={{ ...botonPrimario, opacity: !placesConfigurado || fase !== null ? 0.6 : 1 }}>
          {fase === "buscando" ? "Buscando…" : fase === "emails" ? "Buscando emails…" : "Buscar"}
        </button>
        {fase === "emails" && progreso.total > 0 && (
          <span style={{ fontSize: 13, color: "#475569" }}>
            {progreso.hechos} de {progreso.total} webs revisadas
          </span>
        )}
      </div>
      {fase === null && porRevisar > 0 && (
        <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
          Quedan {porRevisar} empresas sin revisar de una búsqueda anterior.{" "}
          <button
            type="button"
            onClick={() => revisarWebs(pendientes.map((p) => p.searchId))}
            style={{ background: "none", border: "none", padding: 0, color: "#187bef", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Buscar sus emails
          </button>
        </p>
      )}
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        Hasta 60 negocios por búsqueda. Después se lee la web de cada uno para encontrar su email.
      </p>
    </form>
  );
}
```

- [ ] **Step 8: Tabla y vista previa**

`src/app/(site)/panel/prospeccion/VistaPrevia.tsx`:

```tsx
"use client";

import { datosDeProspecto, renderPlantilla } from "@/lib/prospeccion/plantilla";
import type { ProspectRow, ProspectTemplateRow } from "@/lib/prospeccion/tipos";
import { tarjeta } from "../_componentes/estilos";

/** Lo que va a recibir esa empresa, renderizado con el mismo código que el
 *  envío. Si falta un dato, lo dice en vez de enseñar un correo a medias. */
export function VistaPrevia({ prospecto, plantilla }: { prospecto: ProspectRow; plantilla: ProspectTemplateRow }) {
  const datos = datosDeProspecto(prospecto);
  const asunto = renderPlantilla(plantilla.subject, datos);
  const cuerpo = renderPlantilla(plantilla.body, datos);
  const faltan = [...new Set([...(asunto.ok ? [] : asunto.faltan), ...(cuerpo.ok ? [] : cuerpo.faltan)])];

  return (
    <div style={{ ...tarjeta, background: "#f8fafc" }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
        Para <strong>{prospecto.email}</strong>
      </p>
      {faltan.length > 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
          No se puede enviar: a esta empresa le falta {faltan.map((f) => `{{${f}}}`).join(", ")}.
        </p>
      ) : (
        <>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14 }}>{asunto.ok && asunto.texto}</p>
          <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{cuerpo.ok && cuerpo.texto}</p>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#94a3b8" }}>+ pie con los datos de dinkbit y el enlace de baja.</p>
        </>
      )}
    </div>
  );
}
```

`src/app/(site)/panel/prospeccion/TablaProspectos.tsx`:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { FILTROS_VACIOS, filtrarProspectos, type FiltrosProspectos } from "@/lib/prospeccion/filtros";
import {
  ESTADOS_PROSPECTO,
  type EstadoProspecto,
  type ProspectRow,
  type ProspectSearchRow,
  type ProspectTemplateRow,
} from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario, campo, tarjeta, td, th } from "../_componentes/estilos";
import { convertirEnLeadAction, descartarAction, enviarAction, marcarRespondidoAction } from "./actions";
import type { Aviso } from "./Prospeccion";
import { VistaPrevia } from "./VistaPrevia";

const ESTADO: Record<EstadoProspecto, { texto: string; bg: string; color: string }> = {
  nuevo: { texto: "Sin revisar", bg: "#e2e8f0", color: "#334155" },
  listo: { texto: "Listo", bg: "#dbeafe", color: "#1e40af" },
  sin_contacto: { texto: "Sin email", bg: "#f1f5f9", color: "#64748b" },
  enviado: { texto: "Enviado", bg: "#dcfce7", color: "#166534" },
  respondido: { texto: "Respondió", bg: "#ede9fe", color: "#5b21b6" },
  rebotado: { texto: "Rebotó", bg: "#fee2e2", color: "#b91c1c" },
  baja: { texto: "Baja", bg: "#fee2e2", color: "#b91c1c" },
  descartado: { texto: "Descartado", bg: "#f1f5f9", color: "#94a3b8" },
};

function urlSegura(web: string | null): string | null {
  return web && /^https?:\/\//i.test(web) ? web : null;
}

export function TablaProspectos({
  prospectos,
  busquedas,
  plantillas,
  remitentes,
  cupo,
  onAviso,
}: {
  prospectos: ProspectRow[];
  busquedas: ProspectSearchRow[];
  plantillas: ProspectTemplateRow[];
  remitentes: string[];
  /** Correos que aún caben hoy dentro del tope diario. */
  cupo: number;
  onAviso: (a: Aviso | null) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosProspectos>(FILTROS_VACIOS);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [from, setFrom] = useState(remitentes[0] ?? "");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const visibles = useMemo(() => filtrarProspectos(prospectos, filtros), [prospectos, filtros]);
  const plantilla = plantillas.find((t) => t.id === plantillaId) ?? null;
  const elegidas = visibles.filter((p) => seleccion.has(p.id));
  // En un envío múltiple solo entran las listas con buzón genérico.
  const enviables = elegidas.filter((p) => p.status === "listo" && p.email_kind !== "personal");
  const puedeEnviar = remitentes.length > 0 && !!plantilla && cupo > 0;

  const cambiar = (parcial: Partial<FiltrosProspectos>) => setFiltros((f) => ({ ...f, ...parcial }));
  const alternar = (id: string) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function ejecutar(accion: () => Promise<{ ok: true; mensaje: string } | { ok: false; error: string }>) {
    onAviso(null);
    startTransition(async () => {
      const r = await accion();
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (r.ok) setSeleccion(new Set());
    });
  }

  function enviarUno(p: ProspectRow) {
    const personal = p.email_kind === "personal";
    if (
      personal &&
      !window.confirm(`${p.email} parece la dirección de una persona, no un buzón de empresa. ¿Enviar igualmente?`)
    ) {
      return;
    }
    ejecutar(() => enviarAction([p.id], plantillaId, from, personal));
  }

  function enviarSeleccion() {
    const n = Math.min(enviables.length, cupo);
    if (!window.confirm(`Se enviará un correo individual a ${n} empresa${n === 1 ? "" : "s"}. ¿Continuar?`)) return;
    ejecutar(() => enviarAction(enviables.map((p) => p.id), plantillaId, from, false));
  }

  return (
    <section style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <input style={{ ...campo, width: 200 }} placeholder="Buscar en la lista…" value={filtros.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
        <select style={campo} value={filtros.busqueda} onChange={(e) => cambiar({ busqueda: e.target.value })} aria-label="Búsqueda de origen">
          <option value="">Todas las búsquedas</option>
          {busquedas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.params.categoria} · {b.params.ciudad} ({b.total})
            </option>
          ))}
        </select>
        <select style={campo} value={filtros.estado} onChange={(e) => cambiar({ estado: e.target.value as EstadoProspecto | "" })} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS_PROSPECTO.map((e) => (
            <option key={e} value={e}>{ESTADO[e].texto}</option>
          ))}
        </select>
        <select style={campo} value={filtros.email} onChange={(e) => cambiar({ email: e.target.value as "" | "con" | "sin" })} aria-label="Email">
          <option value="">Con y sin email</option>
          <option value="con">Con email</option>
          <option value="sin">Sin email</option>
        </select>
        <select style={campo} value={filtros.web} onChange={(e) => cambiar({ web: e.target.value as "" | "con" | "sin" })} aria-label="Web">
          <option value="">Con y sin web</option>
          <option value="con">Con web</option>
          <option value="sin">Sin web</option>
        </select>
        <span style={{ fontSize: 13, color: "#64748b" }}>{visibles.length} empresas</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <select style={campo} value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} aria-label="Plantilla">
          {plantillas.length === 0 && <option value="">Crea antes una plantilla</option>}
          {plantillas.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {remitentes.length > 1 && (
          <select style={campo} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Remitente">
            {remitentes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
        <button type="button" disabled={!puedeEnviar || enviables.length === 0 || pendiente} onClick={enviarSeleccion} style={{ ...botonPrimario, opacity: !puedeEnviar || enviables.length === 0 || pendiente ? 0.5 : 1 }}>
          Enviar a {enviables.length} seleccionada{enviables.length === 1 ? "" : "s"}
        </button>
        <button type="button" disabled={elegidas.length === 0 || pendiente} onClick={() => ejecutar(() => descartarAction(elegidas.map((p) => p.id)))} style={{ ...botonSecundario, opacity: elegidas.length === 0 || pendiente ? 0.5 : 1 }}>
          Descartar
        </button>
        {cupo === 0 && <span style={{ fontSize: 13, color: "#b91c1c" }}>Tope de envíos de hoy alcanzado.</span>}
        {elegidas.length > enviables.length && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {elegidas.length - enviables.length} de las seleccionadas no entran: sin email, ya contactadas o con dirección personal.
          </span>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas"
                  checked={visibles.length > 0 && visibles.every((p) => seleccion.has(p.id))}
                  onChange={(e) => setSeleccion(e.target.checked ? new Set(visibles.map((p) => p.id)) : new Set())}
                />
              </th>
              <th style={th}>Empresa</th>
              <th style={th}>Ciudad</th>
              <th style={th}>Web</th>
              <th style={th}>Email</th>
              <th style={th}>Teléfono</th>
              <th style={th}>Estado</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 32 }} colSpan={8}>
                  {prospectos.length === 0 ? "Todavía no has buscado ninguna empresa." : "Ninguna empresa coincide con los filtros."}
                </td>
              </tr>
            )}
            {visibles.map((p) => {
              const web = urlSegura(p.website);
              const estado = ESTADO[p.status];
              return (
                <FilaProspecto key={p.id}>
                  <tr>
                    <td style={td}>
                      <input type="checkbox" aria-label={`Seleccionar ${p.name}`} checked={seleccion.has(p.id)} onChange={() => alternar(p.id)} />
                    </td>
                    <td style={td}>
                      <strong>{p.name}</strong>
                      {p.sector && <div style={{ fontSize: 12, color: "#64748b" }}>{p.sector}</div>}
                    </td>
                    <td style={td}>{p.city ?? "—"}</td>
                    <td style={td}>
                      {web ? (
                        <a href={web} target="_blank" rel="noopener noreferrer" style={{ color: "#187bef" }}>
                          {web.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/.*$/, "")}
                        </a>
                      ) : (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>Sin web</span>
                      )}
                    </td>
                    <td style={td}>
                      {p.email ?? <span style={{ color: "#94a3b8" }}>{p.contact_note ?? "—"}</span>}
                      {p.email_kind === "personal" && (
                        <div style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>Parece personal</div>
                      )}
                      {p.send_error && <div style={{ fontSize: 11, color: "#b91c1c" }}>Falló: {p.send_error}</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{p.phone ?? "—"}</td>
                    <td style={td}>
                      <span style={{ background: estado.bg, color: estado.color, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {estado.texto}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {p.status === "listo" && plantilla && (
                        <button type="button" style={enlace} onClick={() => setAbierta(abierta === p.id ? null : p.id)}>
                          {abierta === p.id ? "Cerrar" : "Ver y enviar"}
                        </button>
                      )}
                      {p.status === "enviado" && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => marcarRespondidoAction(p.id))}>
                          Respondió
                        </button>
                      )}
                      {(p.status === "enviado" || p.status === "respondido") && !p.lead_id && (
                        <button type="button" style={enlace} disabled={pendiente} onClick={() => ejecutar(() => convertirEnLeadAction(p.id))}>
                          Convertir en lead
                        </button>
                      )}
                      {p.lead_id && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>En el CRM</span>}
                    </td>
                  </tr>
                  {abierta === p.id && plantilla && (
                    <tr>
                      <td style={{ ...td, background: "#f8fafc" }} colSpan={8}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
                          <VistaPrevia prospecto={p} plantilla={plantilla} />
                          <div>
                            <button type="button" disabled={!puedeEnviar || pendiente} onClick={() => enviarUno(p)} style={{ ...botonPrimario, opacity: !puedeEnviar || pendiente ? 0.5 : 1 }}>
                              {pendiente ? "Enviando…" : "Enviar este correo"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </FilaProspecto>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Agrupa la fila y su vista previa bajo una sola `key`. */
function FilaProspecto({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const enlace = {
  background: "none",
  border: "none",
  padding: "0 8px 0 0",
  color: "#187bef",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
} as const;
```

- [ ] **Step 9: Plantillas**

`src/app/(site)/panel/prospeccion/Plantillas.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { VARIABLES } from "@/lib/prospeccion/plantilla";
import type { ProspectTemplateRow } from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../_componentes/estilos";
import { borrarPlantillaAction, guardarPlantillaAction } from "./actions";
import type { Aviso } from "./Prospeccion";

const VACIA = { id: undefined as string | undefined, name: "", subject: "", body: "" };

export function Plantillas({
  plantillas,
  onAviso,
}: {
  plantillas: ProspectTemplateRow[];
  onAviso: (a: Aviso | null) => void;
}) {
  const [borrador, setBorrador] = useState(VACIA);
  const [pendiente, startTransition] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await guardarPlantillaAction(borrador);
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (r.ok) setBorrador(VACIA);
    });
  }

  function borrar(t: ProspectTemplateRow) {
    if (!window.confirm(`¿Borrar la plantilla «${t.name}»?`)) return;
    startTransition(async () => {
      const r = await borrarPlantillaAction(t.id);
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (borrador.id === t.id) setBorrador(VACIA);
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <form onSubmit={guardar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={titulo}>{borrador.id ? "Editar plantilla" : "Nueva plantilla"}</h2>
        <label style={etiqueta}>
          Nombre (solo lo ves tú)
          <input style={campo} value={borrador.name} onChange={(e) => setBorrador({ ...borrador, name: e.target.value })} required maxLength={80} />
        </label>
        <label style={etiqueta}>
          Asunto
          <input style={campo} value={borrador.subject} onChange={(e) => setBorrador({ ...borrador, subject: e.target.value })} required maxLength={200} />
        </label>
        <label style={etiqueta}>
          Texto
          <textarea style={{ ...campo, minHeight: 220, resize: "vertical" }} value={borrador.body} onChange={(e) => setBorrador({ ...borrador, body: e.target.value })} required maxLength={5000} />
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          Variables: {VARIABLES.map((v) => `{{${v}}}`).join(" ")}. Si a una empresa le falta un dato que usas, ese correo no se envía. El pie con los datos de dinkbit y el enlace de baja se añade solo.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={pendiente} style={botonPrimario}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {borrador.id && (
            <button type="button" onClick={() => setBorrador(VACIA)} style={botonSecundario}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {plantillas.length === 0 && <p style={{ ...tarjeta, margin: 0, color: "#64748b", fontSize: 14 }}>Aún no hay plantillas.</p>}
        {plantillas.map((t) => (
          <article key={t.id} style={tarjeta}>
            <strong>{t.name}</strong>
            <p style={{ margin: "6px 0", fontSize: 13, color: "#334155" }}>{t.subject}</p>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b", whiteSpace: "pre-wrap", maxHeight: 96, overflow: "hidden" }}>{t.body}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={botonSecundario} onClick={() => setBorrador({ id: t.id, name: t.name, subject: t.subject, body: t.body })}>
                Editar
              </button>
              <button type="button" style={{ ...botonSecundario, color: "#b91c1c" }} disabled={pendiente} onClick={() => borrar(t)}>
                Borrar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Verificación completa**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: todo en verde; `npm test` con las pruebas previas más las ~86 nuevas; el build lista la ruta `/panel/prospeccion` y `/api/prospeccion/baja`.

- [ ] **Step 11: Comprobarlo en el navegador**

Requiere haber ejecutado `docs/sql/2026-10-07-prospeccion.sql` en Supabase y tener `GOOGLE_PLACES_API_KEY` en `.env.local`. `PROSPECT_SENDERS` puede faltar para esta comprobación.

Run: `npm run dev`, abrir `http://localhost:3000/panel/prospeccion` y comprobar:
1. La pestaña «Prospección» aparece y queda marcada.
2. Buscar «restaurante» en una ciudad pequeña: llega el recuento, avanza «N de M webs revisadas» y la tabla se llena.
3. Hay filas «Listo» con email, filas «Sin email» con su motivo y filas «Sin web».
4. Repetir la misma búsqueda: el aviso dice «0 nuevas y N que ya tenías».
   Recargar la página a mitad de «Buscando emails…»: aparece «Quedan N empresas sin revisar» y el enlace las termina.
5. Crear una plantilla con `{{empresa}}` y `{{ciudad}}`; en una fila «Listo», «Ver y enviar» muestra el texto ya sustituido.
6. Sin `PROSPECT_SENDERS`: aviso amarillo y botones de envío deshabilitados.

Si falta la clave o la migración, decirlo en el informe en vez de dar el paso por hecho.

- [ ] **Step 12: Commit**

```bash
git add src/lib/prospeccion/filtros.ts src/lib/prospeccion/__tests__/filtros.test.ts "src/app/(site)/panel" src/lib/leads-csv.ts .env.example
git commit -m "feat(prospeccion): pestaña del panel para buscar empresas y escribirles 1:1"
```

---

## Puesta en marcha (manual, fuera del código)

1. Ejecutar `docs/sql/2026-10-07-prospeccion.sql` en el SQL Editor del proyecto `wnboyesnlrbtwfmhcxmc`.
2. Google Cloud: activar **Places API (New)**, crear una clave restringida a esa API y añadir `GOOGLE_PLACES_API_KEY` en Vercel.
3. Resend: dar de alta y verificar el subdominio de envío (registros DNS), y añadir `PROSPECT_SENDERS` en Vercel.
4. Primer envío real: a una dirección propia metida a mano como prospecto, para comprobar remitente, respuesta, pie y enlace de baja antes de escribir a nadie.
