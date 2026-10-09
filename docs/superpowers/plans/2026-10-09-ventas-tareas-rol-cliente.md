# Ventas B2B: borrar leads, tareas, hora de seguimiento y rol cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En `/panel/ventas`: poder borrar leads (y quitar los 135 de «lista1» de Hydrup), abrir «Añadir lead» e «Importar CSV» desde botones, ver la última nota en el tablero, apuntar hora en el seguimiento, tener una pestaña «Tareas» y un rol «cliente» limitado a su marca.

**Architecture:** Una migración SQL idempotente añade columnas, la tabla `ventas_tareas` y tres funciones. Las reglas (acceso por rol/marca, estado del seguimiento con hora, derivación de tareas) viven en módulos puros con tests; las páginas y server actions las consumen a través de un único helper de acceso por marca. Nada de librerías nuevas.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase (clave de servicio, RPC en plpgsql), zod, vitest. Estilos en línea como el resto del módulo.

**Spec:** `docs/superpowers/specs/2026-10-09-ventas-tareas-rol-cliente-design.md`

## Global Constraints

- Idioma del código y de la interfaz: español, como el resto de `src/lib/ventas` (nombres `usuaria`, `marca`, `tarea`…).
- Fechas `YYYY-MM-DD` y horas `HH:MM`, siempre en hora de Madrid (`Europe/Madrid`). Postgres devuelve `time` como `HH:MM:SS`: se recorta a 5 caracteres al leer.
- Los tests del módulo viven en `src/lib/__tests__/ventas-*.test.ts` y mockean `@/lib/ventas/db`, `@/lib/ventas/auth`, `next/cache` y `next/navigation` con `vi.hoisted` (ver `ventas-acciones-leads.test.ts`).
- Las SQL se guardan en `docs/sql/` y las ejecuta una persona en el SQL Editor de Supabase (proyecto `wnboyesnlrbtwfmhcxmc`). El código nunca ejecuta migraciones.
- La migración tiene que ser compatible con el código ya desplegado: se ejecuta ANTES de desplegar el código nuevo y no debe romper el viejo.
- Borrar leads es solo de admin. El rol `cliente` solo accede a las secciones `resumen`, `tablero`, `leads` y `tareas` de la marca de su `marca_id`.
- El control de acceso se hace en servidor en cada página y cada server action; ocultar una pestaña no cuenta como control.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` en verde.
- No tocar los ficheros con cambios sin commit ajenos a este plan (`src/lib/whatsapp/*`, `Calculadora.tsx`, `docs/sql/2026-09-16-…`, `docs/sql/2026-10-06-…`). `src/lib/ventas/db.ts` y `conversaciones/acciones.ts` tienen cambios locales de WhatsApp: editar encima sin revertirlos y usar `git add -p` para no mezclar commits.

## Review Focus

1. **Clienta que llama a una server action con el slug de otra marca** (no pasa por la página): debe recibir «Sin permiso» y no escribirse nada. Test en Tarea 3.
2. **Lead cuyo id pertenece a otra marca en una acción de tareas o de borrado**: se rechaza aunque la marca del slug sí sea la de la usuaria. Tests en Tareas 6 y 10.
3. **Hora sin fecha, u hora con formato raro (`9:5`, `25:00`)**: error de validación legible, no un 500 de Postgres. Test en Tarea 5.
4. **Seguimiento de hoy con hora ya pasada / de hoy sin hora / de hoy con hora futura**: atrasado / hoy / hoy. Test en Tarea 5.
5. **Borrado de un lead con historial y conversación de WhatsApp**: desaparecen los tres y el trigger de inmutabilidad sigue rechazando un `DELETE` directo. Comprobación manual en SQL en Tarea 1 (no hay base de datos en los tests).

---

### Task 1: Migración SQL y borrado de lista1

**Files:**
- Create: `docs/sql/2026-10-09-ventas-tareas-rol-cliente.sql`
- Create: `docs/sql/2026-10-09-borrar-lista1-hydrup.sql`

**Interfaces:**
- Produces (para las tareas siguientes):
  - `ventas_usuarias.rol` admite `'cliente'`; `ventas_usuarias.marca_id uuid null`.
  - `ventas_leads.proximo_seguimiento_hora time null`.
  - RPC `ventas_registrar_actividad(..., p_proximo_seguimiento date, p_proximo_seguimiento_hora time default null)`.
  - Tabla `ventas_tareas`.
  - RPC `ventas_ultimas_notas(p_marca_id uuid) returns table(lead_id uuid, nota text, created_at timestamptz)`.
  - RPC `ventas_eliminar_leads(p_marca_id uuid, p_lead_ids uuid[]) returns integer`.

- [ ] **Step 1: Escribir la migración**

`docs/sql/2026-10-09-ventas-tareas-rol-cliente.sql`:

```sql
-- Ventas B2B: rol «cliente», hora de seguimiento, tareas, última nota y borrado
-- de leads. Spec: docs/superpowers/specs/2026-10-09-ventas-tareas-rol-cliente-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc),
-- ANTES de desplegar el código. Es idempotente y compatible con el código ya
-- desplegado: el parámetro nuevo de ventas_registrar_actividad tiene default.

-- 1. Rol «cliente» ligado a una marca --------------------------------------
alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_rol_check;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_rol_check check (rol in ('admin', 'comercial', 'cliente'));

alter table public.ventas_usuarias
  add column if not exists marca_id uuid references public.ventas_marcas(id) on delete restrict;

alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_marca_de_cliente;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_marca_de_cliente check ((rol = 'cliente') = (marca_id is not null));

-- 2. Hora del próximo seguimiento ------------------------------------------
alter table public.ventas_leads add column if not exists proximo_seguimiento_hora time;

alter table public.ventas_leads drop constraint if exists ventas_leads_hora_con_fecha;
alter table public.ventas_leads
  add constraint ventas_leads_hora_con_fecha
  check (proximo_seguimiento_hora is null or proximo_seguimiento is not null);

-- La firma antigua (8 parámetros) se quita para que no haya dos candidatas.
drop function if exists public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date);

create or replace function public.ventas_registrar_actividad(
  p_lead_id uuid,
  p_usuaria_id uuid,
  p_tipo text,
  p_resultado text,
  p_nota text,
  p_fase_nueva text,
  p_cambiar_seguimiento boolean,
  p_proximo_seguimiento date,
  p_proximo_seguimiento_hora time default null
) returns text
language plpgsql as $$
declare
  v_lead public.ventas_leads%rowtype;
  v_hora time := case when p_proximo_seguimiento is null then null else p_proximo_seguimiento_hora end;
begin
  select * into v_lead from public.ventas_leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead_no_existe';
  end if;

  if p_tipo <> 'cambio_fase' then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, resultado, nota, datos)
    values (
      p_lead_id, v_lead.marca_id, p_usuaria_id, p_tipo, p_resultado, nullif(btrim(p_nota), ''),
      case when p_cambiar_seguimiento
        then jsonb_build_object(
          'proximo_seguimiento', p_proximo_seguimiento,
          'proximo_seguimiento_hora', to_char(v_hora, 'HH24:MI'))
        else '{}'::jsonb end
    );
  end if;

  if p_fase_nueva is not null and p_fase_nueva <> v_lead.fase then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, nota, datos)
    values (
      p_lead_id, v_lead.marca_id, p_usuaria_id, 'cambio_fase',
      case when p_tipo = 'cambio_fase' then nullif(btrim(p_nota), '') end,
      jsonb_build_object('fase_anterior', v_lead.fase, 'fase_nueva', p_fase_nueva)
    );
  end if;

  update public.ventas_leads set
    fase = coalesce(p_fase_nueva, fase),
    proximo_seguimiento = case when p_cambiar_seguimiento then p_proximo_seguimiento else proximo_seguimiento end,
    proximo_seguimiento_hora = case when p_cambiar_seguimiento then v_hora else proximo_seguimiento_hora end,
    updated_at = now()
  where id = p_lead_id;

  return coalesce(p_fase_nueva, v_lead.fase);
end $$;

revoke execute on function public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date, time) from public, anon, authenticated;
grant execute on function public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date, time) to service_role;

-- 3. Tareas manuales --------------------------------------------------------
create table if not exists public.ventas_tareas (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  lead_id uuid references public.ventas_leads(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  vence date,
  vence_hora time,
  asignada_a uuid references public.ventas_usuarias(id),
  creada_por uuid references public.ventas_usuarias(id),
  hecha_at timestamptz,
  hecha_por uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now(),
  check (vence_hora is null or vence is not null)
);
create index if not exists ventas_tareas_marca_idx on public.ventas_tareas (marca_id, hecha_at);
create index if not exists ventas_tareas_asignada_idx on public.ventas_tareas (asignada_a, vence);
alter table public.ventas_tareas enable row level security;

-- 4. Última nota de cada lead de una marca ---------------------------------
create or replace function public.ventas_ultimas_notas(p_marca_id uuid)
returns table (lead_id uuid, nota text, created_at timestamptz)
language sql stable as $$
  select distinct on (a.lead_id) a.lead_id, a.nota, a.created_at
  from public.ventas_actividad a
  where a.marca_id = p_marca_id and a.nota is not null
  order by a.lead_id, a.created_at desc
$$;
revoke execute on function public.ventas_ultimas_notas(uuid) from public, anon, authenticated;
grant execute on function public.ventas_ultimas_notas(uuid) to service_role;

-- 5. Borrado definitivo de leads -------------------------------------------
-- El historial sigue siendo de solo inserción. La única puerta para borrarlo
-- es ventas_eliminar_leads, que levanta una marca válida solo en su transacción.
create or replace function public.ventas_actividad_inmutable() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('ventas.borrando_lead', true) = 'on' then
    return old;
  end if;
  raise exception 'ventas_actividad es de solo inserción: el historial no se edita ni se borra';
end $$;

create or replace function public.ventas_eliminar_leads(p_marca_id uuid, p_lead_ids uuid[])
returns integer
language plpgsql as $$
declare
  v_ids uuid[];
  v_borrados integer;
begin
  select coalesce(array_agg(id), '{}') into v_ids
  from public.ventas_leads
  where marca_id = p_marca_id and id = any(p_lead_ids);
  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  perform set_config('ventas.borrando_lead', 'on', true);
  delete from public.ventas_conversaciones where lead_id = any(v_ids);
  delete from public.ventas_tareas where lead_id = any(v_ids);
  delete from public.ventas_actividad where lead_id = any(v_ids);
  delete from public.ventas_leads where id = any(v_ids);
  get diagnostics v_borrados = row_count;
  perform set_config('ventas.borrando_lead', 'off', true);
  return v_borrados;
end $$;
revoke execute on function public.ventas_eliminar_leads(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.ventas_eliminar_leads(uuid, uuid[]) to service_role;
```

- [ ] **Step 2: Escribir el SQL de lista1**

`docs/sql/2026-10-09-borrar-lista1-hydrup.sql`:

```sql
-- De un solo uso: quita de Hydrup los leads de la importación de prueba
-- «lista1» (135 el 2026-10-09). Ejecutar DESPUÉS de
-- 2026-10-09-ventas-tareas-rol-cliente.sql. Devuelve cuántos ha borrado.
select public.ventas_eliminar_leads(
  m.id,
  array(
    select l.id from public.ventas_leads l
    where l.marca_id = m.id and l.origen = 'lista' and l.origen_detalle = 'lista1'
  )
) as leads_borrados
from public.ventas_marcas m
where m.slug = 'hydrup';
```

- [ ] **Step 3: Comprobación manual en el SQL Editor (la hace quien ejecute la migración)**

Tras ejecutar la migración y antes del SQL de lista1:

```sql
-- Debe FALLAR con «ventas_actividad es de solo inserción…»
delete from public.ventas_actividad where id = (select id from public.ventas_actividad limit 1);
-- Debe devolver 0 (marca inexistente): no borra nada
select public.ventas_eliminar_leads(gen_random_uuid(), array(select id from public.ventas_leads limit 1));
```

- [ ] **Step 4: Commit**

```bash
git add docs/sql/2026-10-09-ventas-tareas-rol-cliente.sql docs/sql/2026-10-09-borrar-lista1-hydrup.sql
git commit -m "feat(ventas): migración de rol cliente, hora de seguimiento, tareas y borrado de leads"
```

---

### Task 2: Regla de acceso por rol y marca

**Files:**
- Modify: `src/lib/ventas/dominio.ts` (líneas `ROLES`/`ROL_LABELS`, ~187-189)
- Modify: `src/lib/ventas/rutas.ts`
- Modify: `src/lib/ventas/db.ts` (interfaz `Usuaria`, nueva `getMarcaPorId`)
- Modify: `src/lib/ventas/auth.ts`
- Test: `src/lib/__tests__/ventas-rutas.test.ts`, `src/lib/__tests__/ventas-auth.test.ts`

**Interfaces:**
- Produces:
  - `ROLES = ["admin", "comercial", "cliente"]`, `ROL_LABELS.cliente = "Cliente"`.
  - `Usuaria.marca_id: string | null`.
  - `type SeccionMarca = "resumen" | "tablero" | "leads" | "tareas" | "secuencias" | "conversaciones" | "condiciones"`.
  - `SECCIONES_CLIENTE: readonly SeccionMarca[]`.
  - `evaluarAccesoMarca(usuaria: { rol: string; activa: boolean; marca_id: string | null } | null, marcaId: string, seccion: SeccionMarca): Acceso`.
  - `evaluarAcceso(usuaria, rol?: "admin" | "equipo")` — `"equipo"` = admin o comercial.
  - `requireUsuaria(rol?: "admin" | "equipo")`.
  - `requireAccesoMarca(slug: string, seccion: SeccionMarca): Promise<{ usuaria: Usuaria; marca: Marca }>` — para páginas (redirige o `notFound()`).
  - `accesoMarcaAccion(slug: string, seccion: SeccionMarca): Promise<{ ok: true; usuaria: Usuaria; marca: Marca } | { ok: false; error: string }>` — para server actions.
  - `getMarcaPorId(id: string): Promise<Marca | null>`.

- [ ] **Step 1: Tests de la regla pura**

Añadir a `src/lib/__tests__/ventas-rutas.test.ts` (ampliando el import con `evaluarAccesoMarca`):

```ts
describe("evaluarAccesoMarca", () => {
  const admin = { rol: "admin", activa: true, marca_id: null };
  const comercial = { rol: "comercial", activa: true, marca_id: null };
  const cliente = { rol: "cliente", activa: true, marca_id: "m1" };

  test("admin y comercial entran en cualquier marca y sección", () => {
    for (const u of [admin, comercial]) {
      expect(evaluarAccesoMarca(u, "m1", "condiciones")).toBe("ok");
      expect(evaluarAccesoMarca(u, "m2", "tareas")).toBe("ok");
    }
  });

  test("la clienta solo entra en las cuatro secciones de su marca", () => {
    for (const s of ["resumen", "tablero", "leads", "tareas"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("ok");
    }
    for (const s of ["secuencias", "conversaciones", "condiciones"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("permiso");
    }
  });

  test("la clienta no entra en una marca ajena, ni si no tiene marca", () => {
    expect(evaluarAccesoMarca(cliente, "m2", "leads")).toBe("permiso");
    expect(evaluarAccesoMarca({ ...cliente, marca_id: null }, "m1", "leads")).toBe("permiso");
  });

  test("sin sesión o desactivada va al login", () => {
    expect(evaluarAccesoMarca(null, "m1", "leads")).toBe("login");
    expect(evaluarAccesoMarca({ ...cliente, activa: false }, "m1", "leads")).toBe("login");
  });
});

describe("evaluarAcceso con rol «equipo»", () => {
  test("deja pasar a admin y comercial, no a la clienta", () => {
    expect(evaluarAcceso({ rol: "admin", activa: true }, "equipo")).toBe("ok");
    expect(evaluarAcceso({ rol: "comercial", activa: true }, "equipo")).toBe("ok");
    expect(evaluarAcceso({ rol: "cliente", activa: true }, "equipo")).toBe("permiso");
  });
  test("la clienta nunca pasa por admin", () => {
    expect(evaluarAcceso({ rol: "cliente", activa: true }, "admin")).toBe("permiso");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/lib/__tests__/ventas-rutas.test.ts`
Expected: FAIL — `evaluarAccesoMarca` no existe.

- [ ] **Step 3: Implementar en `rutas.ts`**

Sustituir `evaluarAcceso` y añadir debajo:

```ts
export function evaluarAcceso(usuaria: { rol: string; activa: boolean } | null, rol?: "admin" | "equipo"): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  if (rol === "admin" && usuaria.rol !== "admin") return "permiso";
  if (rol === "equipo" && usuaria.rol !== "admin" && usuaria.rol !== "comercial") return "permiso";
  return "ok";
}

export type SeccionMarca = "resumen" | "tablero" | "leads" | "tareas" | "secuencias" | "conversaciones" | "condiciones";

/** Lo único que ve una usuaria con rol «cliente», y solo en su marca. */
export const SECCIONES_CLIENTE: readonly SeccionMarca[] = ["resumen", "tablero", "leads", "tareas"];

export function evaluarAccesoMarca(
  usuaria: { rol: string; activa: boolean; marca_id: string | null } | null,
  marcaId: string,
  seccion: SeccionMarca,
): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  if (usuaria.rol !== "cliente") return "ok";
  return usuaria.marca_id === marcaId && SECCIONES_CLIENTE.includes(seccion) ? "ok" : "permiso";
}
```

En `dominio.ts`:

```ts
export const ROLES = ["admin", "comercial", "cliente"] as const;
export type Rol = (typeof ROLES)[number];
export const ROL_LABELS: Record<Rol, string> = { admin: "Admin", comercial: "Comercial", cliente: "Cliente" };
```

En `db.ts`, añadir `marca_id: string | null;` a `Usuaria` (tras `rol`) y, junto a `getMarcaPorSlug`:

```ts
export async function getMarcaPorId(id: string): Promise<Marca | null> {
  const r = await db().from("ventas_marcas").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Marca>, "getMarcaPorId");
}
```

- [ ] **Step 4: Helpers de servidor en `auth.ts`**

Cambiar la firma de `requireUsuaria` a `rol?: "admin" | "equipo"` (el cuerpo no cambia) y añadir:

```ts
import { notFound, redirect } from "next/navigation";
import { getMarcaPorSlug, getUsuaria, type Marca, type Usuaria } from "./db";
import { evaluarAcceso, evaluarAccesoMarca, type SeccionMarca } from "./rutas";

/** Para páginas bajo /panel/ventas/[slug]: usuaria + marca, o redirige. */
export async function requireAccesoMarca(slug: string, seccion: SeccionMarca): Promise<{ usuaria: Usuaria; marca: Marca }> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) notFound();
  if (evaluarAccesoMarca(usuaria, marca.id, seccion) !== "ok") redirect("/panel/ventas?aviso=permiso");
  return { usuaria, marca };
}

/** Para server actions: sin sesión redirige; sin permiso o sin marca devuelve el error. */
export async function accesoMarcaAccion(
  slug: string,
  seccion: SeccionMarca,
): Promise<{ ok: true; usuaria: Usuaria; marca: Marca } | { ok: false; error: string }> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada." };
  if (evaluarAccesoMarca(usuaria, marca.id, seccion) !== "ok") return { ok: false, error: "No tienes permiso para esto." };
  return { ok: true, usuaria, marca };
}
```

- [ ] **Step 5: Tests de los helpers**

Añadir a `src/lib/__tests__/ventas-auth.test.ts`, siguiendo los mocks que ya tiene ese fichero para `getUsuaria` y la sesión (añadir `getMarcaPorSlug` al mock de `@/lib/ventas/db` y `notFound` al de `next/navigation`, lanzando `new Error("NEXT_NOT_FOUND")`):

```ts
describe("accesoMarcaAccion", () => {
  test("clienta en su marca y sección permitida: ok", async () => {
    sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
    m.getMarcaPorSlug.mockResolvedValue({ id: "m1", slug: "hydrup" });
    expect(await accesoMarcaAccion("hydrup", "leads")).toMatchObject({ ok: true });
  });
  test("clienta en marca ajena: error, sin redirigir", async () => {
    sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
    m.getMarcaPorSlug.mockResolvedValue({ id: "m2", slug: "dinkbit" });
    expect(await accesoMarcaAccion("dinkbit", "leads")).toEqual({ ok: false, error: "No tienes permiso para esto." });
  });
  test("marca que no existe: error", async () => {
    sesionDe({ id: "u1", rol: "admin", activa: true, marca_id: null });
    m.getMarcaPorSlug.mockResolvedValue(null);
    expect(await accesoMarcaAccion("nada", "leads")).toEqual({ ok: false, error: "Marca no encontrada." });
  });
});

describe("requireAccesoMarca", () => {
  test("clienta en sección prohibida: redirige al panel con aviso", async () => {
    sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
    m.getMarcaPorSlug.mockResolvedValue({ id: "m1", slug: "hydrup" });
    await expect(requireAccesoMarca("hydrup", "condiciones")).rejects.toThrow("NEXT_REDIRECT:/panel/ventas?aviso=permiso");
  });
});
```

`sesionDe(usuaria)` es un helper local del test: hace que el cliente de sesión mockeado devuelva `{ data: { user: { id: usuaria.id } } }` y `m.getUsuaria` devuelva `usuaria`. Si el fichero ya tiene un helper equivalente con otro nombre, reutilizarlo.

- [ ] **Step 6: Verde y commit**

Run: `npx vitest run src/lib/__tests__/ventas-rutas.test.ts src/lib/__tests__/ventas-auth.test.ts && npm run typecheck`
Expected: PASS. El typecheck puede señalar objetos `Usuaria` de otros tests sin `marca_id`: añadir `marca_id: null`.

```bash
git add -p src/lib/ventas/db.ts
git add src/lib/ventas/dominio.ts src/lib/ventas/rutas.ts src/lib/ventas/auth.ts src/lib/__tests__/
git commit -m "feat(ventas): regla de acceso por rol y marca, con rol cliente"
```

---

### Task 3: Aplicar el acceso a páginas, acciones y navegación

**Files:**
- Modify: todas las `page.tsx` bajo `src/app/(site)/panel/ventas/(app)/[slug]/` (resumen `page.tsx`, `tablero`, `leads`, `leads/[id]`, `secuencias`, `secuencias/[id]`, `conversaciones`, `condiciones`)
- Modify: `src/app/(site)/panel/ventas/(app)/page.tsx`, `(app)/hoy/page.tsx`
- Modify: `src/app/(site)/panel/ventas/acciones-leads.ts`
- Modify: `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones.ts`
- Modify: `src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx`, `VentasShell.tsx`
- Test: `src/lib/__tests__/ventas-acciones-leads.test.ts`

**Interfaces:**
- Consumes: `requireAccesoMarca`, `accesoMarcaAccion`, `requireUsuaria("equipo")`, `SECCIONES_CLIENTE` (Tarea 2).
- Produces: `MarcaCabecera` con props `{ marca: Marca; activa: Pestana; rol: Rol }`; clave de pestaña `"tareas"` reservada (la página llega en Tarea 10).

- [ ] **Step 1: Test — una clienta no opera sobre otra marca**

En `ventas-acciones-leads.test.ts`: sustituir el mock de `@/lib/ventas/auth` por uno que exponga también `accesoMarcaAccion` (`m.accesoMarcaAccion`), y en el `beforeEach` darle por defecto `{ ok: true, usuaria: USUARIA, marca: MARCA }`. Añadir:

```ts
describe("acceso por marca", () => {
  const SIN_PERMISO = { ok: false, error: "No tienes permiso para esto." };

  test("ninguna acción de leads escribe si el acceso a la marca falla", async () => {
    m.accesoMarcaAccion.mockResolvedValue(SIN_PERMISO);
    m.getLead.mockResolvedValue(LEAD);

    expect(await moverLeadAction("dinkbit", "l1", "contactado")).toEqual(SIN_PERMISO);
    expect(await notaAction("dinkbit", "l1", null, fd({ nota: "hola" }))).toEqual(SIN_PERMISO);
    expect(await registrarLlamadaAction("dinkbit", "l1", null, fd({ resultado: "interesado" }))).toEqual(SIN_PERMISO);
    expect(await cambiarFaseAction("dinkbit", "l1", null, fd({ fase: "cliente" }))).toEqual(SIN_PERMISO);
    expect(await asignarLeadAction("dinkbit", "l1", "u2")).toEqual(SIN_PERMISO);
    expect(await actualizarLeadAction("dinkbit", "l1", null, fd({ negocio: "X", telefono: "600000000" }))).toEqual(SIN_PERMISO);
    expect(await crearLeadManualAction("dinkbit", null, fd({ negocio: "X", telefono: "600000000" }))).toEqual(SIN_PERMISO);

    for (const escritura of [m.moverLead, m.anadirNota, m.registrarLlamada, m.cambiarFaseManual, m.asignarLead, m.actualizarDatosLead, m.crearLeadManual]) {
      expect(escritura).not.toHaveBeenCalled();
    }
  });

  test("las acciones piden la sección «leads» (o «tablero» al mover)", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.anadirNota.mockResolvedValue({ ok: true });
    m.moverLead.mockResolvedValue({ ok: true });
    await notaAction("hydrup", "l1", null, fd({ nota: "hola" }));
    expect(m.accesoMarcaAccion).toHaveBeenLastCalledWith("hydrup", "leads");
    await moverLeadAction("hydrup", "l1", "contactado");
    expect(m.accesoMarcaAccion).toHaveBeenLastCalledWith("hydrup", "tablero");
  });
});
```

Los tests existentes del fichero que montaban `m.requireUsuaria` + `m.getMarcaPorSlug` pasan a montar `m.accesoMarcaAccion`.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-leads.test.ts`
Expected: FAIL — las acciones aún no llaman a `accesoMarcaAccion`.

- [ ] **Step 3: Reescribir el control en `acciones-leads.ts`**

Sustituir `leadDeMarca` y el arranque de cada acción por este patrón:

```ts
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import type { SeccionMarca } from "@/lib/ventas/rutas";

/** Acceso a la marca de la URL + el lead, que tiene que ser de esa marca. */
async function accesoALead(slug: string, leadId: string, seccion: SeccionMarca = "leads") {
  const acceso = await accesoMarcaAccion(slug, seccion);
  if (!acceso.ok) return acceso;
  const lead = await getLead(leadId);
  if (!lead || lead.marca_id !== acceso.marca.id) return NO_ENCONTRADO;
  return { ...acceso, lead };
}
```

Uso en cada acción con lead (ejemplo completo; repetir igual en `actualizarLeadAction`, `asignarLeadAction`, `registrarLlamadaAction`, `muestrasEnviadasAction`, `cambiarFaseAction`, `pasarAlEmbudoAction`):

```ts
export async function notaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await anadirNota({ usuaria: acceso.usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Nota añadida." };
}
```

`moverLeadAction` usa `accesoALead(slug, leadId, "tablero")`. Las acciones sin lead (`previsualizarLeadsAction`, `importarLeadsAction`, `crearLeadManualAction`) usan `accesoMarcaAccion(slug, "leads")` y toman `marca` y `usuaria` de ahí; `importarLeadsAction` devuelve `{ ok: false, error: acceso.error, errores: [] }` para respetar su tipo. Quitar los imports que queden sin uso (`requireUsuaria`, `getMarcaPorSlug`).

- [ ] **Step 4: Conversaciones solo para el equipo**

En `conversaciones/acciones.ts`, `responder`: cambiar `await requireUsuaria();` + la lectura de marca por:

```ts
  const acceso = await accesoMarcaAccion(slug, "conversaciones");
  if (!acceso.ok) return acceso;
  const marca = acceso.marca;
```

(conservar el resto, incluido `mensajeroDeNumero(marca.whatsapp_phone_number_id)` del cambio local).

- [ ] **Step 5: Páginas**

En cada `page.tsx` bajo `[slug]`, sustituir el par `requireUsuaria()` + `cargarMarca(slug)` por una llamada, con su sección:

```ts
const { slug } = await params;
const { usuaria, marca } = await requireAccesoMarca(slug, "leads");
```

Secciones: `[slug]/page.tsx` → `"resumen"`; `tablero` → `"tablero"`; `leads` y `leads/[id]` → `"leads"`; `secuencias` y `secuencias/[id]` → `"secuencias"`; `conversaciones` → `"conversaciones"`; `condiciones` → `"condiciones"`. Pasar `rol={usuaria.rol}` a `<MarcaCabecera>`.

En `(app)/page.tsx` y `(app)/hoy/page.tsx`, justo tras `requireUsuaria()`:

```ts
if (usuaria.rol === "cliente") {
  const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
  redirect(marca ? `/panel/ventas/${marca.slug}` : "/panel/ventas/login?aviso=sin-marca");
}
```

- [ ] **Step 6: Navegación**

`MarcaCabecera.tsx`: añadir la pestaña `{ clave: "tareas", texto: "Tareas", ruta: "/tareas" }` entre Leads y Secuencias, la prop `rol: Rol`, y filtrar:

```tsx
const visibles = rol === "cliente" ? PESTANAS.filter((p) => (SECCIONES_CLIENTE as readonly string[]).includes(p.clave)) : PESTANAS;
```

Pintar `visibles` en vez de `PESTANAS`, y el enlace «← Panel» solo si `rol !== "cliente"`.

`VentasShell.tsx`: envolver «Panel» y «Mi día» en `{usuaria.rol !== "cliente" && (...)}`.

- [ ] **Step 7: Verde y commit**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS.

```bash
git add -p "src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones.ts"
git add "src/app/(site)/panel/ventas" src/lib/__tests__/ventas-acciones-leads.test.ts
git commit -m "feat(ventas): cada página y acción comprueba el acceso a la marca"
```

---

### Task 4: Alta de una usuaria «cliente» con su marca

**Files:**
- Modify: `src/lib/ventas/validacion.ts` (`NuevaUsuaria`, `leerNuevaUsuaria`)
- Modify: `src/lib/ventas/db.ts` (`crearUsuariaCompleta`)
- Modify: `src/app/(site)/panel/ventas/acciones-usuarias.ts`, `(app)/usuarias/NuevaUsuariaForm.tsx`, `(app)/usuarias/page.tsx`
- Test: `src/lib/__tests__/ventas-validacion.test.ts`, `ventas-acciones-usuarias.test.ts`

**Interfaces:**
- Produces: `NuevaUsuaria.marca_id: string | null`.

- [ ] **Step 1: Tests de validación**

```ts
describe("leerNuevaUsuaria con rol cliente", () => {
  const base = { nombre: "Ana", email: "ana@hydrup.es", password: "1234567890ab" };
  const fd = (c: Record<string, string>) => { const f = new FormData(); Object.entries(c).forEach(([k, v]) => f.set(k, v)); return f; };
  const UUID = "3f0c2a4e-1b2c-4d5e-8f90-123456789abc";

  test("cliente con marca: se guarda la marca", () => {
    expect(leerNuevaUsuaria(fd({ ...base, rol: "cliente", marca_id: UUID }))).toEqual({ ok: true, datos: { ...base, rol: "cliente", marca_id: UUID } });
  });
  test("cliente sin marca: error", () => {
    expect(leerNuevaUsuaria(fd({ ...base, rol: "cliente" }))).toEqual({ ok: false, error: "Elige la marca de la clienta." });
  });
  test("comercial: la marca se ignora aunque venga", () => {
    const r = leerNuevaUsuaria(fd({ ...base, rol: "comercial", marca_id: UUID }));
    expect(r.ok && r.datos.marca_id).toBeNull();
  });
});
```

- [ ] **Step 2: Fallan** — Run: `npx vitest run src/lib/__tests__/ventas-validacion.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`validacion.ts`: añadir `marca_id: string | null;` a `NuevaUsuaria` y reescribir `leerNuevaUsuaria`:

```ts
export function leerNuevaUsuaria(fd: FormData): Leido<NuevaUsuaria> {
  const r = leer(
    z.object({
      nombre: z.string().min(2, "Pon el nombre.").max(60, "Nombre demasiado largo."),
      email: z.string().toLowerCase().pipe(z.email("Email no válido.")),
      password: passwordSchema,
      rol: z.enum(ROLES, { message: "Elige un rol." }),
      marca_id: z.uuid("Marca no válida.").nullable(),
    }),
    {
      nombre: campo(fd, "nombre"),
      email: campo(fd, "email"),
      password: String(fd.get("password") ?? ""),
      rol: campo(fd, "rol"),
      marca_id: campo(fd, "marca_id") || null,
    },
  );
  if (!r.ok) return r;
  if (r.datos.rol !== "cliente") return { ok: true, datos: { ...r.datos, marca_id: null } };
  if (!r.datos.marca_id) return { ok: false, error: "Elige la marca de la clienta." };
  return r;
}
```

`db.ts`, `crearUsuariaCompleta`: el `insert` pasa a `{ id: data.user.id, nombre: u.nombre, email: u.email, rol: u.rol, marca_id: u.marca_id }`.

`acciones-usuarias.ts`, `crearUsuariaAction`: tras validar, si `leido.datos.marca_id`, comprobar `await getMarcaPorId(leido.datos.marca_id)` y devolver `{ ok: false, error: "Esa marca no existe." }` si es `null`. Añadir el test correspondiente en `ventas-acciones-usuarias.test.ts`:

```ts
test("no crea una clienta con una marca que no existe", async () => {
  m.requireUsuaria.mockResolvedValue({ id: "a1", rol: "admin", activa: true });
  m.getMarcaPorId.mockResolvedValue(null);
  const f = new FormData();
  Object.entries({ nombre: "Ana", email: "ana@hydrup.es", password: "1234567890ab", rol: "cliente", marca_id: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc" }).forEach(([k, v]) => f.set(k, v));
  expect(await crearUsuariaAction(null, f)).toEqual({ ok: false, error: "Esa marca no existe." });
  expect(m.crearUsuariaCompleta).not.toHaveBeenCalled();
});
```

`usuarias/page.tsx`: cargar `listMarcas()` y pasar `marcas={marcas.map(({ id, nombre }) => ({ id, nombre }))}` al formulario (solo id y nombre: la marca lleva el secreto del webhook). En la tabla de usuarias, mostrar la marca junto al rol cuando sea clienta.

`NuevaUsuariaForm.tsx`: estado `const [rol, setRol] = useState<Rol>("comercial")` enlazado al `<select name="rol">`, y debajo:

```tsx
{rol === "cliente" && (
  <label style={etiqueta}>
    Marca
    <select name="marca_id" required defaultValue="" style={campo}>
      <option value="" disabled>Elige la marca…</option>
      {marcas.map((m) => (
        <option key={m.id} value={m.id}>{m.nombre}</option>
      ))}
    </select>
    <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>Solo verá Resumen, Tablero, Leads y Tareas de esta marca.</span>
  </label>
)}
```

- [ ] **Step 4: Verde y commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.

```bash
git add -p src/lib/ventas/db.ts
git add src/lib/ventas/validacion.ts "src/app/(site)/panel/ventas" src/lib/__tests__/
git commit -m "feat(ventas): alta de usuarias con rol cliente ligadas a una marca"
```

---

### Task 5: Hora en el próximo seguimiento

**Files:**
- Modify: `src/lib/ventas/metricas.ts` (nuevas `ahoraMadrid`, `formatoSeguimiento`)
- Modify: `src/lib/ventas/tablero.ts` (`estadoSeguimiento`, `ordenarPorUrgencia`)
- Modify: `src/lib/ventas/validacion.ts`, `src/lib/ventas/db.ts`, `src/lib/ventas/servicios.ts`, `src/lib/ventas/historial.ts`
- Modify: `leads/[id]/AccionesLead.tsx`, `leads/[id]/page.tsx`, `leads/page.tsx`, `tablero/page.tsx`, `tablero/Tablero.tsx`
- Test: `ventas-tablero.test.ts`, `ventas-validacion.test.ts`, `ventas-metricas.test.ts`, `ventas-servicios.test.ts`

**Interfaces:**
- Produces:
  - `interface Ahora { fecha: string; hora: string }` y `ahoraMadrid(now?: Date): Ahora` en `metricas.ts`.
  - `formatoSeguimiento(fecha: string, hora: string | null): string` → `"20/10/2026 · 16:30"` o `"20/10/2026"`.
  - `estadoSeguimiento(proximo: string | null, hora: string | null, fase: Fase, ahora: Ahora): EstadoSeguimiento | null`.
  - `vencimiento(fecha: string | null, hora: string | null, ahora: Ahora): "atrasado" | "hoy" | "futuro" | null` (sin mirar la fase; lo reutiliza Tareas).
  - `Lead.proximo_seguimiento_hora: string | null` (`HH:MM`).
  - `Llamada.proximo_seguimiento_hora` y `NotaSeguimiento.proximo_seguimiento_hora: string | null`.
  - `registrarActividad({ ..., proximoSeguimientoHora?: string | null })`.

- [ ] **Step 1: Tests de la regla de tiempo**

En `ventas-tablero.test.ts`, sustituir los casos actuales de `estadoSeguimiento` por:

```ts
describe("estadoSeguimiento con hora", () => {
  const ahora = { fecha: "2026-10-20", hora: "10:01" };
  test("sin fecha o en fase cerrada no hay estado", () => {
    expect(estadoSeguimiento(null, null, "nuevo", ahora)).toBeNull();
    expect(estadoSeguimiento("2026-10-19", null, "cliente", ahora)).toBeNull();
  });
  test("días anteriores y posteriores", () => {
    expect(estadoSeguimiento("2026-10-19", "23:59", "contactado", ahora)).toBe("atrasado");
    expect(estadoSeguimiento("2026-10-21", "00:00", "contactado", ahora)).toBe("futuro");
  });
  test("hoy: con la hora pasada está atrasado; sin hora o con hora futura es de hoy", () => {
    expect(estadoSeguimiento("2026-10-20", "10:00", "contactado", ahora)).toBe("atrasado");
    expect(estadoSeguimiento("2026-10-20", "10:01", "contactado", ahora)).toBe("hoy");
    expect(estadoSeguimiento("2026-10-20", "16:30", "contactado", ahora)).toBe("hoy");
    expect(estadoSeguimiento("2026-10-20", null, "contactado", ahora)).toBe("hoy");
  });
});

test("ordenarPorUrgencia: a igual día, primero las que tienen hora, de más temprana a más tardía", () => {
  const ahora = { fecha: "2026-10-20", hora: "08:00" };
  const l = (id: string, hora: string | null) => ({ id, fase: "contactado" as const, proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: hora, created_at: "2026-10-01T00:00:00Z" });
  expect(ordenarPorUrgencia([l("sin", null), l("tarde", "16:30"), l("pronto", "09:00")], ahora).map((x) => x.id)).toEqual(["pronto", "tarde", "sin"]);
});
```

En `ventas-metricas.test.ts`:

```ts
test("ahoraMadrid da fecha y hora de Madrid", () => {
  expect(ahoraMadrid(new Date("2026-10-20T08:05:00Z"))).toEqual({ fecha: "2026-10-20", hora: "10:05" });
  expect(ahoraMadrid(new Date("2026-12-31T23:30:00Z"))).toEqual({ fecha: "2027-01-01", hora: "00:30" });
});
test("formatoSeguimiento", () => {
  expect(formatoSeguimiento("2026-10-20", "16:30")).toBe("20/10/2026 · 16:30");
  expect(formatoSeguimiento("2026-10-20", null)).toBe("20/10/2026");
});
```

En `ventas-validacion.test.ts`:

```ts
describe("hora de seguimiento", () => {
  const fd = (c: Record<string, string>) => { const f = new FormData(); Object.entries(c).forEach(([k, v]) => f.set(k, v)); return f; };
  test("fecha y hora válidas", () => {
    const r = leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" }));
    expect(r).toEqual({ ok: true, datos: { nota: "x", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" } });
  });
  test("sin hora queda en null", () => {
    const r = leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento: "2026-10-20" }));
    expect(r.ok && r.datos.proximo_seguimiento_hora).toBeNull();
  });
  test("hora sin fecha: error", () => {
    expect(leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento_hora: "16:30" }))).toEqual({ ok: false, error: "Para poner hora hace falta la fecha." });
  });
  test.each(["9:5", "25:00", "12:60", "tarde"])("hora «%s» no válida", (hora) => {
    expect(leerLlamada(fd({ resultado: "interesado", nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: hora }))).toEqual({ ok: false, error: "Hora de seguimiento no válida." });
  });
});
```

- [ ] **Step 2: Fallan** — Run: `npx vitest run src/lib/__tests__/ventas-tablero.test.ts src/lib/__tests__/ventas-metricas.test.ts src/lib/__tests__/ventas-validacion.test.ts` → FAIL.

- [ ] **Step 3: Implementar las funciones puras**

`metricas.ts`:

```ts
export interface Ahora {
  fecha: string;
  hora: string;
}

/** Fecha (YYYY-MM-DD) y hora (HH:MM) de Madrid en este instante. */
export function ahoraMadrid(now: Date = new Date()): Ahora {
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return { fecha: fechaMadrid(now), hora };
}

/** «20/10/2026 · 16:30», o solo la fecha si no hay hora. */
export function formatoSeguimiento(fecha: string, hora: string | null): string {
  return hora ? `${formatoFecha(fecha)} · ${hora.slice(0, 5)}` : formatoFecha(fecha);
}
```

`tablero.ts` (importar `type Ahora` de `./metricas`):

```ts
/** Una fecha (y hora opcional) frente a ahora. Sin hora, el día entero cuenta como «hoy». */
export function vencimiento(fecha: string | null, hora: string | null, ahora: Ahora): EstadoSeguimiento | null {
  if (!fecha) return null;
  if (fecha < ahora.fecha) return "atrasado";
  if (fecha > ahora.fecha) return "futuro";
  return hora && hora.slice(0, 5) < ahora.hora ? "atrasado" : "hoy";
}

/** Solo las fases activas llevan seguimiento. */
export function estadoSeguimiento(proximo: string | null, hora: string | null, fase: Fase, ahora: Ahora): EstadoSeguimiento | null {
  return esFaseActiva(fase) ? vencimiento(proximo, hora, ahora) : null;
}
```

`ordenarPorUrgencia`: el genérico pasa a exigir `proximo_seguimiento_hora: string | null`, recibe `ahora: Ahora`, y el comparador queda:

```ts
  const clave = (l: T) => `${l.proximo_seguimiento ?? "9999-12-31"}T${l.proximo_seguimiento_hora?.slice(0, 5) ?? "99:99"}`;
  return [...leads].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    if (pa !== pb) return pa - pb;
    if (pa < 2) return clave(a).localeCompare(clave(b));
    return b.created_at.localeCompare(a.created_at);
  });
```

con `peso` usando `estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora, l.fase, ahora)`.

`validacion.ts`:

```ts
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const horaSchema = z.string().regex(HORA_RE, "Hora de seguimiento no válida.").nullable();

function conHoraCoherente<T extends { proximo_seguimiento: string | null; proximo_seguimiento_hora: string | null }>(r: Leido<T>): Leido<T> {
  if (r.ok && r.datos.proximo_seguimiento_hora && !r.datos.proximo_seguimiento) {
    return { ok: false, error: "Para poner hora hace falta la fecha." };
  }
  return r;
}
```

Añadir `proximo_seguimiento_hora: string | null` a `Llamada` y `NotaSeguimiento`; en `leerLlamada` y `leerNotaSeguimiento` añadir al schema `proximo_seguimiento_hora: horaSchema`, al valor `proximo_seguimiento_hora: campo(fd, "proximo_seguimiento_hora") || null`, y envolver el resultado en `conHoraCoherente(...)`.

- [ ] **Step 4: Persistencia**

`db.ts`: añadir `proximo_seguimiento_hora: string | null;` a `Lead`; en `registrarActividad` añadir el input `proximoSeguimientoHora?: string | null` y el parámetro RPC:

```ts
    p_proximo_seguimiento_hora: cambiarSeguimiento ? (input.proximoSeguimientoHora ?? null) : null,
```

`servicios.ts`: en `registrarLlamada`, `marcarMuestrasEnviadas` y `anadirNota` pasar la hora junto a la fecha. En `registrarLlamada`, la hora solo viaja si el seguimiento sobrevive al resultado:

```ts
  const proximo = seguimientoTrasLlamada(input.llamada.resultado, input.llamada.proximo_seguimiento);
  return registrarActividad({
    // …campos actuales…
    proximoSeguimiento: proximo,
    proximoSeguimientoHora: proximo ? input.llamada.proximo_seguimiento_hora : null,
  });
```

Test en `ventas-servicios.test.ts`:

```ts
test("una llamada que cierra el lead no guarda hora de seguimiento", async () => {
  m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
  m.registrarActividad.mockResolvedValue({ ok: true });
  await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_interesa", nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" } });
  expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ proximoSeguimiento: null, proximoSeguimientoHora: null }));
});
```

`historial.ts`: donde se describe `datos.proximo_seguimiento`, usar `formatoSeguimiento(fecha, typeof datos.proximo_seguimiento_hora === "string" ? datos.proximo_seguimiento_hora : null)`.

- [ ] **Step 5: Interfaz**

`AccionesLead.tsx`: nueva prop `proximoSeguimientoHora: string | null`; el componente `Seguimiento` queda:

```tsx
function Seguimiento({ actual, hora }: { actual: string | null; hora: string | null }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Próximo seguimiento
        <input name="proximo_seguimiento" type="date" defaultValue={actual ?? ""} style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 120px" }}>
        Hora (opcional)
        <input name="proximo_seguimiento_hora" type="time" defaultValue={hora?.slice(0, 5) ?? ""} style={campo} />
      </label>
      <span style={{ flexBasis: "100%", fontSize: 12, color: "#64748b" }}>Deja la fecha vacía para quitar el seguimiento.</span>
    </div>
  );
}
```

Pasar `hora={proximoSeguimientoHora}` en sus tres usos.

Sustituciones de `hoy`/`formatoFecha` por la versión con hora:
- `leads/[id]/page.tsx`: `formatoSeguimiento(lead.proximo_seguimiento, lead.proximo_seguimiento_hora)` y pasar `proximoSeguimientoHora` a `AccionesLead`.
- `leads/page.tsx`: `const ahora = ahoraMadrid();` y `atrasado = estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora, l.fase, ahora) === "atrasado"`; celda con `formatoSeguimiento`.
- `tablero/page.tsx`: `const ahora = ahoraMadrid();`, filtro de atrasados con la firma nueva, añadir `proximo_seguimiento_hora: l.proximo_seguimiento_hora` a cada tarjeta, y `<Tablero … ahora={ahora} …>` en vez de `hoy`.
- `Tablero.tsx`: `TarjetaLead` gana `proximo_seguimiento_hora: string | null`; la prop `hoy: string` pasa a `ahora: Ahora` en `Tablero` y `Tarjeta`; `estadoSeguimiento` y `ordenarPorUrgencia` con la firma nueva; las tres etiquetas usan `formatoSeguimiento` (para «hoy» con hora: `` `Hoy · ${hora}` ``).

- [ ] **Step 6: Verde y commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.

```bash
git add -p src/lib/ventas/db.ts
git add src/lib/ventas "src/app/(site)/panel/ventas" src/lib/__tests__/
git commit -m "feat(ventas): hora opcional en el próximo seguimiento"
```

---

### Task 6: Eliminar un lead

**Files:**
- Modify: `src/lib/ventas/db.ts`, `src/app/(site)/panel/ventas/acciones-leads.ts`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/EliminarLead.tsx`
- Modify: `leads/[id]/page.tsx`
- Test: `ventas-acciones-leads.test.ts`

**Interfaces:**
- Consumes: RPC `ventas_eliminar_leads` (Tarea 1), `accesoALead` (Tarea 3).
- Produces: `eliminarLeads(marcaId: string, leadIds: string[]): Promise<{ ok: true; borrados: number } | { ok: false; error: string }>`; `eliminarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`.

- [ ] **Step 1: Tests**

Añadir `eliminarLeads: vi.fn()` a `m` y al mock de `@/lib/ventas/db`, importar `eliminarLeadAction`, y:

```ts
describe("eliminarLeadAction", () => {
  const ADMIN = { id: "a1", rol: "admin", activa: true };
  const confirmacion = (texto: string) => fd({ confirmacion: texto });

  test("solo admin: una comercial o una clienta no borran", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    for (const rol of ["comercial", "cliente"]) {
      m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { id: "u1", rol, activa: true }, marca: MARCA });
      expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Solo una admin puede eliminar leads." });
    }
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("lead de otra marca: no encontrado", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, marca_id: "m2", negocio: "Bar Paco" });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("la confirmación tiene que ser el nombre del negocio", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("bar"))).toEqual({ ok: false, error: "Escribe el nombre del negocio tal cual para confirmar." });
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("borra con la marca del lead y vuelve a la lista", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    m.eliminarLeads.mockResolvedValue({ ok: true, borrados: 1 });
    await expect(eliminarLeadAction("hydrup", "l1", null, confirmacion("  bar paco "))).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/hydrup/leads");
    expect(m.eliminarLeads).toHaveBeenCalledWith("m1", ["l1"]);
  });

  test("si la base no borra nada, se dice", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    m.eliminarLeads.mockResolvedValue({ ok: true, borrados: 0 });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Lead no encontrado." });
  });
});
```

- [ ] **Step 2: Fallan** — Run: `npx vitest run src/lib/__tests__/ventas-acciones-leads.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`db.ts`:

```ts
/** Borrado definitivo: lead, historial, tareas y conversaciones. Solo de la marca dada. */
export async function eliminarLeads(marcaId: string, leadIds: string[]): Promise<{ ok: true; borrados: number } | { ok: false; error: string }> {
  const { data, error } = await db().rpc("ventas_eliminar_leads", { p_marca_id: marcaId, p_lead_ids: leadIds });
  if (error) {
    console.error("[ventas/db] eliminarLeads:", error.message);
    return { ok: false, error: "No se pudo eliminar. Vuelve a intentarlo." };
  }
  return { ok: true, borrados: Number(data ?? 0) };
}
```

`acciones-leads.ts`:

```ts
/** Ficha → «Eliminar lead». Definitivo y solo de admin. */
export async function eliminarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  if (acceso.usuaria.rol !== "admin") return { ok: false, error: "Solo una admin puede eliminar leads." };
  const escrito = String(fd.get("confirmacion") ?? "").trim().toLowerCase();
  if (escrito !== acceso.lead.negocio.trim().toLowerCase()) {
    return { ok: false, error: "Escribe el nombre del negocio tal cual para confirmar." };
  }
  const res = await eliminarLeads(acceso.marca.id, [leadId]);
  if (!res.ok) return res;
  if (res.borrados === 0) return NO_ENCONTRADO;
  refrescar(slug);
  redirect(`/panel/ventas/${slug}/leads`);
}
```

`EliminarLead.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { eliminarLeadAction } from "../../../../acciones-leads";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonSecundario, campo, etiqueta, tarjeta } from "../../../../_componentes/estilos";

export function EliminarLead({ slug, leadId, negocio }: { slug: string; leadId: string; negocio: string }) {
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(eliminarLeadAction.bind(null, slug, leadId), null);
  const coincide = escrito.trim().toLowerCase() === negocio.trim().toLowerCase();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} style={{ ...botonSecundario, color: "#b91c1c", borderColor: "#fecaca", alignSelf: "flex-start" }}>
        Eliminar lead
      </button>
    );
  }
  return (
    <form action={accion} style={{ ...tarjeta, borderColor: "#fecaca", display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d" }}>
        Se borra el lead con todo su historial y sus conversaciones de WhatsApp. No se puede deshacer y deja de contar en el resumen y el embudo.
      </p>
      <label style={etiqueta}>
        Escribe «{negocio}» para confirmar
        <input name="confirmacion" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" style={campo} />
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={!coincide || pendiente} style={{ ...botonSecundario, background: coincide ? "#b91c1c" : "#fecaca", color: "#fff", borderColor: "transparent" }}>
          Eliminar definitivamente
        </button>
        <button type="button" onClick={() => setAbierto(false)} style={botonSecundario}>Cancelar</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
```

`leads/[id]/page.tsx`: al final de la columna izquierda, bajo `<DatosLead>`:

```tsx
{usuaria.rol === "admin" && <EliminarLead slug={slug} leadId={lead.id} negocio={lead.negocio} />}
```

- [ ] **Step 4: Verde y commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.

```bash
git add -p src/lib/ventas/db.ts
git add "src/app/(site)/panel/ventas" src/lib/__tests__/ventas-acciones-leads.test.ts
git commit -m "feat(ventas): eliminar un lead desde su ficha (solo admin)"
```

---

### Task 7: «Añadir lead» e «Importar CSV» como botones

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/BotonesLeads.tsx`
- Modify: `leads/page.tsx`

**Interfaces:**
- Consumes: `NuevoLeadForm` e `ImportarLeads` tal cual (prop `slug`).
- Produces: `<BotonesLeads slug={slug} />`.

- [ ] **Step 1: Componente**

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { botonPrimario, botonSecundario } from "../../../_componentes/estilos";
import { ImportarLeads } from "./ImportarLeads";
import { NuevoLeadForm } from "./NuevoLeadForm";

function Dialogo({ titulo, etiquetaBoton, estiloBoton, children }: { titulo: string; etiquetaBoton: string; estiloBoton: React.CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} style={{ ...estiloBoton, padding: "6px 12px", fontSize: 13 }}>
        {etiquetaBoton}
      </button>
      <dialog
        ref={ref}
        aria-label={titulo}
        // Clic en el fondo (el propio <dialog>, no su contenido) cierra.
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        style={{ border: "none", borderRadius: 12, padding: 0, width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)" }}
      >
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong style={{ fontSize: 17 }}>{titulo}</strong>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar" style={{ ...botonSecundario, padding: "4px 10px" }}>✕</button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

export function BotonesLeads({ slug }: { slug: string }) {
  return (
    <>
      <Dialogo titulo="Añadir lead" etiquetaBoton="+ Añadir lead" estiloBoton={botonPrimario}>
        <NuevoLeadForm slug={slug} />
      </Dialogo>
      <Dialogo titulo="Importar leads desde CSV" etiquetaBoton="Importar CSV" estiloBoton={botonSecundario}>
        <ImportarLeads slug={slug} />
      </Dialogo>
    </>
  );
}
```

- [ ] **Step 2: Colocarlo en la página**

En `leads/page.tsx`: quitar `<ImportarLeads slug={slug} />` y `<NuevoLeadForm slug={slug} />` del final y sus imports; en la barra de filtros, sustituir el `<form … style={{ marginLeft: "auto" }}>` por un contenedor que agrupe buscador y botones:

```tsx
<div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
  <form action={`/panel/ventas/${slug}/leads`}>
    {/* inputs ocultos y buscador, sin cambios */}
  </form>
  <BotonesLeads slug={slug} />
</div>
```

`NuevoLeadForm` e `ImportarLeads` llevan hoy su propia tarjeta y título de sección: dentro del diálogo sobran. Si pintan `<section style={tarjeta}>` con un `<h2>`, añadirles una prop `enDialogo?: boolean` que quite borde, sombra y título, y pasarla desde `BotonesLeads`.

- [ ] **Step 3: Comprobar en el navegador**

Run: `npm run dev`, abrir `/panel/ventas/hydrup/leads`.
Expected: los dos botones junto al buscador; cada uno abre su diálogo; Esc y clic fuera cierran; crear un lead lleva a su ficha; la previsualización del CSV y el resultado de la importación se ven dentro del diálogo; al fondo de la página ya no hay formularios.

- [ ] **Step 4: Commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.

```bash
git add "src/app/(site)/panel/ventas/(app)/[slug]/leads"
git commit -m "feat(ventas): añadir lead e importar CSV desde botones en la lista"
```

---

### Task 8: Última nota en las tarjetas del tablero

**Files:**
- Modify: `src/lib/ventas/db.ts`, `tablero/page.tsx`, `tablero/Tablero.tsx`
- Test: `src/lib/__tests__/ventas-db.test.ts`

**Interfaces:**
- Consumes: RPC `ventas_ultimas_notas` (Tarea 1).
- Produces: `listUltimasNotas(marcaId: string): Promise<Map<string, { texto: string; fecha: string }>>`; `TarjetaLead.ultima_nota: { texto: string; fecha: string } | null` (`fecha` ya formateada `DD/MM`).

- [ ] **Step 1: Test**

En `ventas-db.test.ts`, siguiendo cómo ese fichero mockea `getSupabaseAdmin` (un cliente falso cuyo `rpc` devuelve un objeto con `range`):

```ts
test("listUltimasNotas devuelve un mapa por lead y pagina", async () => {
  const range = vi.fn().mockResolvedValue({
    data: [
      { lead_id: "l1", nota: "Llamar el martes", created_at: "2026-10-05T09:00:00Z" },
      { lead_id: "l2", nota: "Pide catálogo", created_at: "2026-10-06T09:00:00Z" },
    ],
    error: null,
  });
  const order = vi.fn(() => ({ range }));
  rpc.mockReturnValue({ order });
  const notas = await listUltimasNotas("m1");
  expect(rpc).toHaveBeenCalledWith("ventas_ultimas_notas", { p_marca_id: "m1" });
  expect(notas.get("l1")).toEqual({ texto: "Llamar el martes", fecha: "2026-10-05T09:00:00Z" });
  expect(notas.size).toBe(2);
});
```

- [ ] **Step 2: Falla** — Run: `npx vitest run src/lib/__tests__/ventas-db.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`db.ts`:

```ts
/** La nota con texto más reciente de cada lead de la marca (de cualquier tipo de actividad). */
export async function listUltimasNotas(marcaId: string): Promise<Map<string, { texto: string; fecha: string }>> {
  type Fila = { lead_id: string; nota: string; created_at: string };
  const filas = await todas<Fila>(
    (d, h) => db().rpc("ventas_ultimas_notas", { p_marca_id: marcaId }).order("lead_id").range(d, h) as PromiseLike<Respuesta<Fila[]>>,
    "listUltimasNotas",
  );
  return new Map(filas.map((f) => [f.lead_id, { texto: f.nota, fecha: f.created_at }]));
}
```

`tablero/page.tsx`: añadir `listUltimasNotas(marca.id)` al `Promise.all` y, en el `map`:

```ts
const nota = notas.get(l.id);
// …
ultima_nota: nota ? { texto: nota.texto, fecha: formatoFechaHora(nota.fecha).slice(0, 5) } : null,
```

`Tablero.tsx`: `ultima_nota: { texto: string; fecha: string } | null` en `TarjetaLead`, y en `Tarjeta`, entre el bloque de etiquetas y la fila de botones:

```tsx
{lead.ultima_nota && (
  <p
    title={lead.ultima_nota.texto}
    style={{
      margin: 0,
      fontSize: 12,
      lineHeight: 1.35,
      color: "#334155",
      background: "#f8fafc",
      borderRadius: 6,
      padding: "5px 7px",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      overflowWrap: "anywhere",
    }}
  >
    <span style={{ color: "#64748b", fontWeight: 600 }}>{lead.ultima_nota.fecha} · </span>
    {lead.ultima_nota.texto}
  </p>
)}
```

- [ ] **Step 4: Verde y commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.

```bash
git add -p src/lib/ventas/db.ts
git add "src/app/(site)/panel/ventas/(app)/[slug]/tablero" src/lib/__tests__/ventas-db.test.ts
git commit -m "feat(ventas): la tarjeta del tablero enseña la última nota"
```

---

### Task 9: Reglas de tareas (módulo puro)

**Files:**
- Create: `src/lib/ventas/tareas.ts`
- Test: `src/lib/__tests__/ventas-tareas.test.ts`

**Interfaces:**
- Consumes: `vencimiento`, `type Ahora` (Tarea 5).
- Produces:

```ts
export type TipoTarea = "llamar" | "enviar_muestras" | "manual";
export type SeccionTarea = "atrasadas" | "hoy" | "proximas" | "sin_fecha";
export interface TareaVista {
  clave: string;            // única: `llamar:<leadId>`, `muestras:<leadId>`, `manual:<tareaId>`
  tipo: TipoTarea;
  titulo: string;
  leadId: string | null;
  negocio: string | null;
  fecha: string | null;     // YYYY-MM-DD
  hora: string | null;      // HH:MM
  asignadaA: string | null;
  tareaId: string | null;   // solo las manuales
  hecha: boolean;
}
export interface TareaManual { id: string; marca_id: string; lead_id: string | null; titulo: string; vence: string | null; vence_hora: string | null; asignada_a: string | null; creada_por: string | null; hecha_at: string | null; hecha_por: string | null; created_at: string }
export function leadsQuePidenMuestras(llamadas: { lead_id: string; resultado: string | null }[]): Set<string>
export function tareasAutomaticas(leads: LeadDeTarea[], pidenMuestras: Set<string>): TareaVista[]
export function contarPrimerContacto(leads: LeadDeTarea[]): number
export function tareasManuales(tareas: TareaManual[], negocios: Map<string, string>): TareaVista[]
export function agruparTareas(tareas: TareaVista[], ahora: Ahora): Record<SeccionTarea, TareaVista[]>
```

- [ ] **Step 1: Tests**

`src/lib/__tests__/ventas-tareas.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { agruparTareas, contarPrimerContacto, leadsQuePidenMuestras, tareasAutomaticas, tareasManuales, type TareaManual } from "../ventas/tareas";

const lead = (id: string, extra: Partial<Parameters<typeof tareasAutomaticas>[0][number]> = {}) => ({
  id,
  negocio: `Negocio ${id}`,
  fase: "contactado" as const,
  asignada_a: "u1",
  proximo_seguimiento: null,
  proximo_seguimiento_hora: null,
  ...extra,
});

describe("leadsQuePidenMuestras", () => {
  test("solo cuenta la ÚLTIMA llamada de cada lead (vienen en orden cronológico)", () => {
    const pide = leadsQuePidenMuestras([
      { lead_id: "a", resultado: "pide_muestras" },
      { lead_id: "b", resultado: "pide_muestras" },
      { lead_id: "b", resultado: "volver_a_llamar" },
      { lead_id: "c", resultado: "no_contesta" },
    ]);
    expect([...pide]).toEqual(["a"]);
  });
});

describe("tareasAutomaticas", () => {
  test("llamar: fase activa con fecha, a nombre de quien lleva el lead y con su hora", () => {
    const t = tareasAutomaticas([lead("a", { proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30:00", asignada_a: "u7" })], new Set());
    expect(t).toEqual([
      { clave: "llamar:a", tipo: "llamar", titulo: "Llamar a Negocio a", leadId: "a", negocio: "Negocio a", fecha: "2026-10-20", hora: "16:30", asignadaA: "u7", tareaId: null, hecha: false },
    ]);
  });
  test("un lead cerrado con fecha no genera llamada", () => {
    expect(tareasAutomaticas([lead("a", { fase: "no_interesa", proximo_seguimiento: "2026-10-20" })], new Set())).toEqual([]);
  });
  test("enviar muestras: interesado que las pidió; sin fecha propia", () => {
    const t = tareasAutomaticas([lead("a", { fase: "interesado" }), lead("b", { fase: "muestras" })], new Set(["a", "b"]));
    expect(t.map((x) => [x.clave, x.titulo, x.fecha])).toEqual([["muestras:a", "Enviar muestras a Negocio a", null]]);
  });
  test("un interesado que pidió muestras y tiene fecha genera las dos tareas", () => {
    const t = tareasAutomaticas([lead("a", { fase: "interesado", proximo_seguimiento: "2026-10-21" })], new Set(["a"]));
    expect(t.map((x) => x.clave).sort()).toEqual(["llamar:a", "muestras:a"]);
  });
});

test("contarPrimerContacto: nuevos sin seguimiento", () => {
  expect(contarPrimerContacto([lead("a", { fase: "nuevo" }), lead("b", { fase: "nuevo", proximo_seguimiento: "2026-10-20" }), lead("c")])).toBe(1);
});

test("tareasManuales pone el negocio del lead y marca las hechas", () => {
  const base: TareaManual = { id: "t1", marca_id: "m1", lead_id: "a", titulo: "Mandar catálogo", vence: "2026-10-20", vence_hora: "09:00:00", asignada_a: "u1", creada_por: "u2", hecha_at: null, hecha_por: null, created_at: "2026-10-01T00:00:00Z" };
  const t = tareasManuales([base, { ...base, id: "t2", lead_id: null, hecha_at: "2026-10-02T00:00:00Z" }], new Map([["a", "Bar Paco"]]));
  expect(t[0]).toMatchObject({ clave: "manual:t1", tipo: "manual", negocio: "Bar Paco", hora: "09:00", tareaId: "t1", hecha: false });
  expect(t[1]).toMatchObject({ clave: "manual:t2", negocio: null, hecha: true });
});

describe("agruparTareas", () => {
  const ahora = { fecha: "2026-10-20", hora: "10:00" };
  const t = (clave: string, fecha: string | null, hora: string | null = null) => ({ clave, tipo: "manual" as const, titulo: clave, leadId: null, negocio: null, fecha, hora, asignadaA: null, tareaId: clave, hecha: false });

  test("reparte en atrasadas, hoy, próximas y sin fecha, teniendo en cuenta la hora", () => {
    const g = agruparTareas([t("ayer", "2026-10-19"), t("hoy-pasada", "2026-10-20", "09:00"), t("hoy-luego", "2026-10-20", "16:00"), t("hoy-sin-hora", "2026-10-20"), t("mañana", "2026-10-21"), t("nunca", null)], ahora);
    expect(g.atrasadas.map((x) => x.clave)).toEqual(["ayer", "hoy-pasada"]);
    expect(g.hoy.map((x) => x.clave)).toEqual(["hoy-luego", "hoy-sin-hora"]);
    expect(g.proximas.map((x) => x.clave)).toEqual(["mañana"]);
    expect(g.sin_fecha.map((x) => x.clave)).toEqual(["nunca"]);
  });

  test("las hechas no aparecen", () => {
    expect(agruparTareas([{ ...t("x", "2026-10-19"), hecha: true }], ahora).atrasadas).toEqual([]);
  });
});
```

- [ ] **Step 2: Fallan** — Run: `npx vitest run src/lib/__tests__/ventas-tareas.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`src/lib/ventas/tareas.ts`:

```ts
/**
 * Tareas del módulo de ventas: las automáticas, que se deducen del estado de
 * cada lead, y las manuales (tabla `ventas_tareas`). Puro: recibe filas ya
 * leídas, así se prueba sin base de datos.
 */

import { esFaseActiva, type Fase } from "./dominio";
import type { Ahora } from "./metricas";
import { vencimiento } from "./tablero";

export type TipoTarea = "llamar" | "enviar_muestras" | "manual";
export type SeccionTarea = "atrasadas" | "hoy" | "proximas" | "sin_fecha";

export interface TareaVista {
  clave: string;
  tipo: TipoTarea;
  titulo: string;
  leadId: string | null;
  negocio: string | null;
  fecha: string | null;
  hora: string | null;
  asignadaA: string | null;
  tareaId: string | null;
  hecha: boolean;
}

export interface TareaManual {
  id: string;
  marca_id: string;
  lead_id: string | null;
  titulo: string;
  vence: string | null;
  vence_hora: string | null;
  asignada_a: string | null;
  creada_por: string | null;
  hecha_at: string | null;
  hecha_por: string | null;
  created_at: string;
}

export interface LeadDeTarea {
  id: string;
  negocio: string;
  fase: Fase;
  asignada_a: string | null;
  proximo_seguimiento: string | null;
  proximo_seguimiento_hora: string | null;
}

const hhmm = (hora: string | null) => (hora ? hora.slice(0, 5) : null);

/** Leads cuya última llamada terminó en «pide muestras». Las llamadas llegan de la más antigua a la más reciente. */
export function leadsQuePidenMuestras(llamadas: { lead_id: string; resultado: string | null }[]): Set<string> {
  const ultimo = new Map<string, string | null>();
  for (const l of llamadas) ultimo.set(l.lead_id, l.resultado);
  return new Set([...ultimo].filter(([, r]) => r === "pide_muestras").map(([id]) => id));
}

export function tareasAutomaticas(leads: LeadDeTarea[], pidenMuestras: Set<string>): TareaVista[] {
  const tareas: TareaVista[] = [];
  for (const l of leads) {
    const comun = { leadId: l.id, negocio: l.negocio, asignadaA: l.asignada_a, tareaId: null, hecha: false };
    if (esFaseActiva(l.fase) && l.proximo_seguimiento) {
      tareas.push({ ...comun, clave: `llamar:${l.id}`, tipo: "llamar", titulo: `Llamar a ${l.negocio}`, fecha: l.proximo_seguimiento, hora: hhmm(l.proximo_seguimiento_hora) });
    }
    if (l.fase === "interesado" && pidenMuestras.has(l.id)) {
      tareas.push({ ...comun, clave: `muestras:${l.id}`, tipo: "enviar_muestras", titulo: `Enviar muestras a ${l.negocio}`, fecha: null, hora: null });
    }
  }
  return tareas;
}

/** Leads nuevos a los que nadie ha puesto fecha: se enseñan como contador, no uno a uno. */
export function contarPrimerContacto(leads: LeadDeTarea[]): number {
  return leads.filter((l) => l.fase === "nuevo" && !l.proximo_seguimiento).length;
}

export function tareasManuales(tareas: TareaManual[], negocios: Map<string, string>): TareaVista[] {
  return tareas.map((t) => ({
    clave: `manual:${t.id}`,
    tipo: "manual",
    titulo: t.titulo,
    leadId: t.lead_id,
    negocio: t.lead_id ? (negocios.get(t.lead_id) ?? null) : null,
    fecha: t.vence,
    hora: hhmm(t.vence_hora),
    asignadaA: t.asignada_a,
    tareaId: t.id,
    hecha: t.hecha_at !== null,
  }));
}

/** Pendientes repartidas por urgencia; dentro de cada grupo, por fecha y hora (sin hora, al final del día). */
export function agruparTareas(tareas: TareaVista[], ahora: Ahora): Record<SeccionTarea, TareaVista[]> {
  const grupos: Record<SeccionTarea, TareaVista[]> = { atrasadas: [], hoy: [], proximas: [], sin_fecha: [] };
  const seccion = { atrasado: "atrasadas", hoy: "hoy", futuro: "proximas" } as const;
  for (const t of tareas) {
    if (t.hecha) continue;
    const v = vencimiento(t.fecha, t.hora, ahora);
    grupos[v ? seccion[v] : "sin_fecha"].push(t);
  }
  const orden = (t: TareaVista) => `${t.fecha ?? "9999-12-31"}T${t.hora ?? "99:99"}`;
  for (const lista of Object.values(grupos)) lista.sort((a, b) => orden(a).localeCompare(orden(b)));
  return grupos;
}
```

- [ ] **Step 4: Verde y commit**

Run: `npx vitest run src/lib/__tests__/ventas-tareas.test.ts && npm run typecheck` → PASS.

```bash
git add src/lib/ventas/tareas.ts src/lib/__tests__/ventas-tareas.test.ts
git commit -m "feat(ventas): reglas de tareas automáticas y manuales"
```

---

### Task 10: Pestaña «Tareas», acciones y «Mi día»

**Files:**
- Modify: `src/lib/ventas/db.ts`, `src/lib/ventas/validacion.ts`
- Create: `src/app/(site)/panel/ventas/acciones-tareas.ts`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/tareas/page.tsx`, `tareas/NuevaTareaForm.tsx`, `tareas/FilaTarea.tsx`
- Modify: `src/app/(site)/panel/ventas/(app)/hoy/page.tsx`
- Test: `src/lib/__tests__/ventas-acciones-tareas.test.ts`, `ventas-validacion.test.ts`

**Interfaces:**
- Consumes: `accesoMarcaAccion` (T2), `tareas.ts` (T9), `ahoraMadrid`/`formatoSeguimiento` (T5).
- Produces en `db.ts`:
  - `listTareasMarca(marcaId: string, opciones?: { hechasDesde?: string }): Promise<TareaManual[]>` — pendientes, más las hechas desde esa fecha ISO si se pide.
  - `listTareasUsuaria(usuariaId: string): Promise<(TareaManual & { marca: { nombre: string; slug: string } | null })[]>` — pendientes con fecha.
  - `getTarea(id: string): Promise<TareaManual | null>`.
  - `crearTarea(t: { marcaId: string; leadId: string | null; titulo: string; vence: string | null; venceHora: string | null; asignadaA: string | null; creadaPor: string }): Promise<Escritura>`.
  - `actualizarTarea(id: string, cambios: { hecha?: { por: string } | null; asignadaA?: string | null }): Promise<Escritura>`.
  - `listLlamadasMarca(marcaId: string): Promise<{ lead_id: string; resultado: string | null }[]>` — orden cronológico ascendente.
- Produces en `validacion.ts`: `interface NuevaTarea { titulo: string; vence: string | null; vence_hora: string | null; asignada_a: string | null; lead_id: string | null }` y `leerNuevaTarea(fd: FormData): Leido<NuevaTarea>`.
- Produces en `acciones-tareas.ts`: `crearTareaAction(slug, _prev, fd)`, `marcarTareaAction(slug, tareaId, hecha: boolean)`, `reasignarTareaAction(slug, tareaId, usuariaId: string)`; todas devuelven `ResultadoAccion`.

- [ ] **Step 1: Tests de validación**

```ts
describe("leerNuevaTarea", () => {
  const fd = (c: Record<string, string>) => { const f = new FormData(); Object.entries(c).forEach(([k, v]) => f.set(k, v)); return f; };
  test("solo el título es obligatorio", () => {
    expect(leerNuevaTarea(fd({ titulo: " Mandar catálogo " }))).toEqual({ ok: true, datos: { titulo: "Mandar catálogo", vence: null, vence_hora: null, asignada_a: null, lead_id: null } });
    expect(leerNuevaTarea(fd({ titulo: "  " }))).toEqual({ ok: false, error: "Escribe qué hay que hacer." });
  });
  test("hora sin fecha: error", () => {
    expect(leerNuevaTarea(fd({ titulo: "x", vence_hora: "10:00" }))).toEqual({ ok: false, error: "Para poner hora hace falta la fecha." });
  });
  test("título de más de 200 caracteres: error", () => {
    expect(leerNuevaTarea(fd({ titulo: "a".repeat(201) }))).toEqual({ ok: false, error: "El título es demasiado largo." });
  });
});
```

- [ ] **Step 2: Tests de las acciones**

`src/lib/__tests__/ventas-acciones-tareas.test.ts` (misma cabecera de mocks que `ventas-acciones-leads.test.ts`, con `accesoMarcaAccion`, `getLead`, `getUsuaria`, `getTarea`, `crearTarea`, `actualizarTarea`, `revalidatePath`):

```ts
const CLIENTA = { id: "c1", rol: "cliente", activa: true, marca_id: "m1" };
const MARCA = { id: "m1", slug: "hydrup" };
const TAREA = { id: "t1", marca_id: "m1", hecha_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: CLIENTA, marca: MARCA });
  m.crearTarea.mockResolvedValue({ ok: true });
  m.actualizarTarea.mockResolvedValue({ ok: true });
});

test("todas piden acceso a la sección «tareas» y no escriben si falla", async () => {
  m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
  expect(await crearTareaAction("dinkbit", null, fd({ titulo: "x" }))).toEqual({ ok: false, error: "No tienes permiso para esto." });
  expect(await marcarTareaAction("dinkbit", "t1", true)).toEqual({ ok: false, error: "No tienes permiso para esto." });
  expect(await reasignarTareaAction("dinkbit", "t1", "u2")).toEqual({ ok: false, error: "No tienes permiso para esto." });
  expect(m.accesoMarcaAccion).toHaveBeenCalledWith("dinkbit", "tareas");
  expect(m.crearTarea).not.toHaveBeenCalled();
  expect(m.actualizarTarea).not.toHaveBeenCalled();
});

test("una clienta crea una tarea y la asigna", async () => {
  m.getUsuaria.mockResolvedValue({ id: "u2", activa: true });
  const r = await crearTareaAction("hydrup", null, fd({ titulo: "Mandar catálogo", vence: "2026-10-20", vence_hora: "16:30", asignada_a: "u2" }));
  expect(r).toEqual({ ok: true, mensaje: "Tarea creada." });
  expect(m.crearTarea).toHaveBeenCalledWith({ marcaId: "m1", leadId: null, titulo: "Mandar catálogo", vence: "2026-10-20", venceHora: "16:30", asignadaA: "u2", creadaPor: "c1" });
});

test("no se asigna a una usuaria desactivada", async () => {
  m.getUsuaria.mockResolvedValue({ id: "u2", activa: false });
  expect(await crearTareaAction("hydrup", null, fd({ titulo: "x", asignada_a: "u2" }))).toEqual({ ok: false, error: "Esa usuaria no existe o está desactivada." });
});

test("no se liga a un lead de otra marca", async () => {
  m.getLead.mockResolvedValue({ id: "l9", marca_id: "m2" });
  expect(await crearTareaAction("hydrup", null, fd({ titulo: "x", lead_id: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc" }))).toEqual({ ok: false, error: "Lead no encontrado." });
  expect(m.crearTarea).not.toHaveBeenCalled();
});

test("no se marca ni reasigna una tarea de otra marca", async () => {
  m.getTarea.mockResolvedValue({ ...TAREA, marca_id: "m2" });
  expect(await marcarTareaAction("hydrup", "t1", true)).toEqual({ ok: false, error: "Tarea no encontrada." });
  expect(await reasignarTareaAction("hydrup", "t1", "")).toEqual({ ok: false, error: "Tarea no encontrada." });
  expect(m.actualizarTarea).not.toHaveBeenCalled();
});

test("marcar hecha guarda quién; deshacer lo limpia", async () => {
  m.getTarea.mockResolvedValue(TAREA);
  await marcarTareaAction("hydrup", "t1", true);
  expect(m.actualizarTarea).toHaveBeenLastCalledWith("t1", { hecha: { por: "c1" } });
  await marcarTareaAction("hydrup", "t1", false);
  expect(m.actualizarTarea).toHaveBeenLastCalledWith("t1", { hecha: null });
});
```

- [ ] **Step 3: Fallan** — Run: `npx vitest run src/lib/__tests__/ventas-acciones-tareas.test.ts src/lib/__tests__/ventas-validacion.test.ts` → FAIL.

- [ ] **Step 4: Validación y base de datos**

`validacion.ts`:

```ts
export interface NuevaTarea {
  titulo: string;
  vence: string | null;
  vence_hora: string | null;
  asignada_a: string | null;
  lead_id: string | null;
}

export function leerNuevaTarea(fd: FormData): Leido<NuevaTarea> {
  const r = leer(
    z.object({
      titulo: z.string().min(1, "Escribe qué hay que hacer.").max(200, "El título es demasiado largo."),
      vence: proximoSchema,
      vence_hora: horaSchema,
      asignada_a: z.uuid("Responsable no válida.").nullable(),
      lead_id: z.uuid("Lead no válido.").nullable(),
    }),
    {
      titulo: campo(fd, "titulo"),
      vence: campo(fd, "vence") || null,
      vence_hora: campo(fd, "vence_hora") || null,
      asignada_a: campo(fd, "asignada_a") || null,
      lead_id: campo(fd, "lead_id") || null,
    },
  );
  if (r.ok && r.datos.vence_hora && !r.datos.vence) return { ok: false, error: "Para poner hora hace falta la fecha." };
  return r;
}
```

`db.ts` (sección nueva `/* Tareas */`, importando `type TareaManual` de `./tareas`):

```ts
export async function listTareasMarca(marcaId: string, opciones: { hechasDesde?: string } = {}): Promise<TareaManual[]> {
  return todas((d, h) => {
    let q = db().from("ventas_tareas").select("*").eq("marca_id", marcaId);
    q = opciones.hechasDesde ? q.or(`hecha_at.is.null,hecha_at.gte.${opciones.hechasDesde}`) : q.is("hecha_at", null);
    return q.order("created_at").range(d, h) as PromiseLike<Respuesta<TareaManual[]>>;
  }, "listTareasMarca");
}

export async function listTareasUsuaria(usuariaId: string): Promise<(TareaManual & { marca: { nombre: string; slug: string } | null })[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_tareas")
        .select("*, marca:ventas_marcas(nombre,slug)")
        .eq("asignada_a", usuariaId)
        .is("hecha_at", null)
        .not("vence", "is", null)
        .order("vence")
        .range(d, h) as PromiseLike<Respuesta<(TareaManual & { marca: { nombre: string; slug: string } | null })[]>>,
    "listTareasUsuaria",
  );
}

export async function getTarea(id: string): Promise<TareaManual | null> {
  const r = await db().from("ventas_tareas").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<TareaManual>, "getTarea");
}

export async function crearTarea(t: {
  marcaId: string;
  leadId: string | null;
  titulo: string;
  vence: string | null;
  venceHora: string | null;
  asignadaA: string | null;
  creadaPor: string;
}): Promise<Escritura> {
  return escritura(
    await db().from("ventas_tareas").insert({
      marca_id: t.marcaId,
      lead_id: t.leadId,
      titulo: t.titulo,
      vence: t.vence,
      vence_hora: t.venceHora,
      asignada_a: t.asignadaA,
      creada_por: t.creadaPor,
    }),
    "crearTarea",
  );
}

export async function actualizarTarea(id: string, cambios: { hecha?: { por: string } | null; asignadaA?: string | null }): Promise<Escritura> {
  const fila: Record<string, unknown> = {};
  if (cambios.hecha !== undefined) {
    fila.hecha_at = cambios.hecha ? new Date().toISOString() : null;
    fila.hecha_por = cambios.hecha ? cambios.hecha.por : null;
  }
  if (cambios.asignadaA !== undefined) fila.asignada_a = cambios.asignadaA;
  return escritura(await db().from("ventas_tareas").update(fila).eq("id", id), "actualizarTarea");
}

export async function listLlamadasMarca(marcaId: string): Promise<{ lead_id: string; resultado: string | null }[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("lead_id,resultado")
        .eq("marca_id", marcaId)
        .eq("tipo", "llamada")
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<{ lead_id: string; resultado: string | null }[]>>,
    "listLlamadasMarca",
  );
}
```

- [ ] **Step 5: Acciones**

`src/app/(site)/panel/ventas/acciones-tareas.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import { actualizarTarea, crearTarea, getLead, getTarea, getUsuaria } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerNuevaTarea } from "@/lib/ventas/validacion";

const TAREA_NO_ENCONTRADA = { ok: false, error: "Tarea no encontrada." } as const;
const USUARIA_NO_VALIDA = { ok: false, error: "Esa usuaria no existe o está desactivada." } as const;

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}/tareas`);
  revalidatePath("/panel/ventas/hoy");
}

async function responsableValida(usuariaId: string | null): Promise<boolean> {
  if (!usuariaId) return true;
  return (await getUsuaria(usuariaId))?.activa === true;
}

/** Acceso a la sección de tareas + la tarea, que tiene que ser de la marca de la URL. */
async function accesoATarea(slug: string, tareaId: string) {
  const acceso = await accesoMarcaAccion(slug, "tareas");
  if (!acceso.ok) return acceso;
  const tarea = await getTarea(tareaId);
  if (!tarea || tarea.marca_id !== acceso.marca.id) return TAREA_NO_ENCONTRADA;
  return { ...acceso, tarea };
}

export async function crearTareaAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoMarcaAccion(slug, "tareas");
  if (!acceso.ok) return acceso;
  const leido = leerNuevaTarea(fd);
  if (!leido.ok) return leido;
  const d = leido.datos;
  if (!(await responsableValida(d.asignada_a))) return USUARIA_NO_VALIDA;
  if (d.lead_id) {
    const lead = await getLead(d.lead_id);
    if (!lead || lead.marca_id !== acceso.marca.id) return { ok: false, error: "Lead no encontrado." };
  }
  const res = await crearTarea({
    marcaId: acceso.marca.id,
    leadId: d.lead_id,
    titulo: d.titulo,
    vence: d.vence,
    venceHora: d.vence_hora,
    asignadaA: d.asignada_a,
    creadaPor: acceso.usuaria.id,
  });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Tarea creada." };
}

export async function marcarTareaAction(slug: string, tareaId: string, hecha: boolean): Promise<ResultadoAccion> {
  const acceso = await accesoATarea(slug, tareaId);
  if (!acceso.ok) return acceso;
  const res = await actualizarTarea(tareaId, { hecha: hecha ? { por: acceso.usuaria.id } : null });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}

export async function reasignarTareaAction(slug: string, tareaId: string, usuariaId: string): Promise<ResultadoAccion> {
  const acceso = await accesoATarea(slug, tareaId);
  if (!acceso.ok) return acceso;
  if (!(await responsableValida(usuariaId || null))) return USUARIA_NO_VALIDA;
  const res = await actualizarTarea(tareaId, { asignadaA: usuariaId || null });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}
```

- [ ] **Step 6: Página**

`tareas/page.tsx` (server component):

```tsx
import Link from "next/link";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { listLeads, listLlamadasMarca, listTareasMarca, listUsuarias } from "@/lib/ventas/db";
import { ahoraMadrid } from "@/lib/ventas/metricas";
import { agruparTareas, contarPrimerContacto, leadsQuePidenMuestras, tareasAutomaticas, tareasManuales, type SeccionTarea } from "@/lib/ventas/tareas";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { FilaTarea } from "./FilaTarea";
import { NuevaTareaForm } from "./NuevaTareaForm";

const SECCIONES: { clave: SeccionTarea; texto: string }[] = [
  { clave: "atrasadas", texto: "Atrasadas" },
  { clave: "hoy", texto: "Hoy" },
  { clave: "proximas", texto: "Próximas" },
  { clave: "sin_fecha", texto: "Sin fecha" },
];
const TREINTA_DIAS = 30 * 86_400_000;

export default async function TareasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ de?: string; hechas?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { usuaria, marca } = await requireAccesoMarca(slug, "tareas");
  const verHechas = sp.hechas === "1";

  const [leads, llamadas, manuales, usuarias] = await Promise.all([
    listLeads(marca.id),
    listLlamadasMarca(marca.id),
    listTareasMarca(marca.id, verHechas ? { hechasDesde: new Date(Date.now() - TREINTA_DIAS).toISOString() } : {}),
    listUsuarias(),
  ]);
  const activas = usuarias.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre }));
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  // «de» filtra por responsable: «yo», el id de una usuaria, o vacío para todas.
  const de = sp.de === "yo" ? usuaria.id : activas.some((u) => u.id === sp.de) ? sp.de : undefined;

  const todas = [
    ...tareasAutomaticas(leads, leadsQuePidenMuestras(llamadas)),
    ...tareasManuales(manuales, new Map(leads.map((l) => [l.id, l.negocio]))),
  ].filter((t) => !de || t.asignadaA === de);
  const grupos = agruparTareas(todas, ahoraMadrid());
  const hechas = verHechas ? todas.filter((t) => t.hecha) : [];
  const sinContactar = contarPrimerContacto(leads);

  const base = `/panel/ventas/${slug}/tareas`;
  const url = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ de: sp.de, hechas: verHechas ? "1" : undefined, ...extra }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const chip = (activo: boolean) =>
    ({
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 13,
      textDecoration: "none",
      border: `1px solid ${activo ? "#187bef" : "#cbd5e1"}`,
      color: activo ? "#187bef" : "#475569",
      background: activo ? "#eff6ff" : "#fff",
    }) as const;

  return (
    <div>
      <MarcaCabecera marca={marca} activa="tareas" rol={usuaria.rol} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={url({ de: undefined })} style={chip(!sp.de)}>Todas</Link>
          <Link href={url({ de: "yo" })} style={chip(sp.de === "yo")}>Solo mías</Link>
          {activas.filter((u) => u.id !== usuaria.id).map((u) => (
            <Link key={u.id} href={url({ de: u.id })} style={chip(sp.de === u.id)}>{u.nombre}</Link>
          ))}
          <Link href={url({ hechas: verHechas ? undefined : "1" })} style={{ ...chip(verHechas), marginLeft: "auto" }}>Hechas (30 días)</Link>
        </div>

        <NuevaTareaForm slug={slug} usuarias={activas} leads={leads.map((l) => ({ id: l.id, negocio: l.negocio }))} yo={usuaria.id} />

        {sinContactar > 0 && (
          <Link href={`/panel/ventas/${slug}/leads?fase=nuevo`} style={{ ...tarjeta, textDecoration: "none", color: "#0f172a", fontSize: 14 }}>
            <strong>{sinContactar}</strong> {sinContactar === 1 ? "lead nuevo sin contactar" : "leads nuevos sin contactar"} →
          </Link>
        )}

        {SECCIONES.map(({ clave, texto }) => (
          <section key={clave} style={tarjeta}>
            <h2 style={{ ...titulo, color: clave === "atrasadas" && grupos[clave].length ? "#b91c1c" : undefined }}>
              {texto} ({grupos[clave].length})
            </h2>
            {grupos[clave].length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {grupos[clave].map((t) => (
                  <FilaTarea key={t.clave} slug={slug} tarea={t} usuarias={activas} responsable={t.asignadaA ? (nombres[t.asignadaA] ?? "—") : null} atrasada={clave === "atrasadas"} />
                ))}
              </ul>
            )}
          </section>
        ))}

        {verHechas && (
          <section style={tarjeta}>
            <h2 style={titulo}>Hechas en los últimos 30 días ({hechas.length})</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {hechas.map((t) => (
                <FilaTarea key={t.clave} slug={slug} tarea={t} usuarias={activas} responsable={t.asignadaA ? (nombres[t.asignadaA] ?? "—") : null} atrasada={false} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
```

`tareas/FilaTarea.tsx` (cliente):

```tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarTareaAction, reasignarTareaAction } from "../../../acciones-tareas";
import { formatoSeguimiento } from "@/lib/ventas/metricas";
import type { TareaVista } from "@/lib/ventas/tareas";

const ETIQUETA = { llamar: "Llamada", enviar_muestras: "Muestras", manual: "Tarea" } as const;

export function FilaTarea({
  slug,
  tarea,
  usuarias,
  responsable,
  atrasada,
}: {
  slug: string;
  tarea: TareaVista;
  usuarias: { id: string; nombre: string }[];
  responsable: string | null;
  atrasada: boolean;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const manual = tarea.tipo === "manual" && tarea.tareaId !== null;
  const ejecutar = (accion: () => Promise<{ ok: boolean; error?: string }>) =>
    empezar(async () => {
      const r = await accion();
      setError(r.ok ? null : (r.error ?? "No se pudo guardar."));
    });

  return (
    <li style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, opacity: pendiente ? 0.55 : 1 }}>
      {manual ? (
        <input
          type="checkbox"
          checked={tarea.hecha}
          disabled={pendiente}
          aria-label={`${tarea.hecha ? "Deshacer" : "Marcar hecha"}: ${tarea.titulo}`}
          onChange={(e) => ejecutar(() => marcarTareaAction(slug, tarea.tareaId!, e.target.checked))}
        />
      ) : (
        <span aria-hidden="true" style={{ width: 13 }} />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#f1f5f9", borderRadius: 4, padding: "2px 6px" }}>{ETIQUETA[tarea.tipo]}</span>
      <span style={{ flex: "1 1 220px", fontSize: 14, textDecoration: tarea.hecha ? "line-through" : "none" }}>
        {tarea.leadId ? (
          <Link href={`/panel/ventas/${slug}/leads/${tarea.leadId}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>{tarea.titulo}</Link>
        ) : (
          <strong>{tarea.titulo}</strong>
        )}
        {manual && tarea.negocio && <span style={{ color: "#64748b" }}> · {tarea.negocio}</span>}
      </span>
      {tarea.fecha && (
        <span style={{ fontSize: 13, fontWeight: atrasada ? 700 : 400, color: atrasada ? "#b91c1c" : "#334155" }}>{formatoSeguimiento(tarea.fecha, tarea.hora)}</span>
      )}
      {manual ? (
        <select
          value={tarea.asignadaA ?? ""}
          disabled={pendiente}
          aria-label={`Responsable de: ${tarea.titulo}`}
          onChange={(e) => ejecutar(() => reasignarTareaAction(slug, tarea.tareaId!, e.target.value))}
          style={{ fontSize: 13, padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 6 }}
        >
          <option value="">Sin asignar</option>
          {usuarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      ) : (
        <span style={{ fontSize: 13, color: "#64748b" }}>{responsable ?? "Sin asignar"}</span>
      )}
      {error && <span role="alert" style={{ flexBasis: "100%", fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </li>
  );
}
```

`tareas/NuevaTareaForm.tsx` (cliente):

```tsx
"use client";

import { useActionState } from "react";
import { crearTareaAction } from "../../../acciones-tareas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta } from "../../../_componentes/estilos";

export function NuevaTareaForm({
  slug,
  usuarias,
  leads,
  yo,
}: {
  slug: string;
  usuarias: { id: string; nombre: string }[];
  leads: { id: string; negocio: string }[];
  yo: string;
}) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearTareaAction.bind(null, slug), null);
  return (
    // La clave reinicia el formulario tras crear una tarea.
    <form key={resultado?.ok ? Date.now() : "form"} action={accion} style={{ ...tarjeta, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ ...etiqueta, flex: "2 1 240px" }}>
        Nueva tarea
        <input name="titulo" required maxLength={200} placeholder="Qué hay que hacer" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 150px" }}>
        Fecha
        <input name="vence" type="date" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 110px" }}>
        Hora
        <input name="vence_hora" type="time" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Responsable
        <select name="asignada_a" defaultValue={usuarias.some((u) => u.id === yo) ? yo : ""} style={campo}>
          <option value="">Sin asignar</option>
          {usuarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </label>
      <label style={{ ...etiqueta, flex: "1 1 180px" }}>
        Lead (opcional)
        <select name="lead_id" defaultValue="" style={campo}>
          <option value="">—</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>{l.negocio}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pendiente} style={botonPrimario}>Añadir</button>
      <Mensaje resultado={resultado} />
    </form>
  );
}
```

- [ ] **Step 7: «Mi día»**

En `hoy/page.tsx`: usar `ahoraMadrid()`; cargar en paralelo `listSeguimientosUsuaria(usuaria.id, ahora.fecha)` y `listTareasUsuaria(usuaria.id)`; repartir los leads con `estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora, l.fase, ahora)` en atrasados y hoy (sustituye a `agruparSeguimientos`, que no mira la hora); en la tabla, columna «Cuándo» con `formatoSeguimiento`. Debajo, una sección «Mis tareas ({n})» con las tareas manuales cuyo `vencimiento(t.vence, t.vence_hora, ahora)` sea `"atrasado"` u `"hoy"`, cada una como enlace a `/panel/ventas/${t.marca?.slug}/tareas?de=yo` mostrando título, marca y `formatoSeguimiento(t.vence, t.vence_hora)`, en rojo las atrasadas.

- [ ] **Step 8: Verde, navegador y commit**

Run: `npm run typecheck && npm run lint && npm test` → PASS.
Run: `npm run dev` y comprobar en `/panel/ventas/hydrup/tareas`: crear una tarea con hora, verla en «Hoy», marcarla, verla en «Hechas», reasignarla; registrar una llamada con resultado «Pide muestras» en un lead y ver «Enviar muestras a…».

```bash
git add -p src/lib/ventas/db.ts
git add src/lib/ventas/validacion.ts "src/app/(site)/panel/ventas" src/lib/__tests__/
git commit -m "feat(ventas): pestaña de tareas automáticas y manuales, y tareas en Mi día"
```

---

### Task 11: Verificación final

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite completa**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: todo en verde.

- [ ] **Step 2: Repaso de accesos**

Run: `grep -rn "requireUsuaria()" "src/app/(site)/panel/ventas"`
Expected: solo quedan `(app)/layout.tsx`, `(app)/page.tsx` y `(app)/hoy/page.tsx` (las dos últimas con la redirección de clienta). Cualquier otra aparición bajo `[slug]` o en un fichero de acciones es un hueco: cambiarla por `requireAccesoMarca` / `accesoMarcaAccion`.

- [ ] **Step 3: Prueba manual del rol cliente (con la migración ya ejecutada)**

Crear una usuaria «Cliente» de Hydrup y, con su sesión:
- Entra y cae en `/panel/ventas/hydrup`; ve cuatro pestañas y ni «Panel» ni «Mi día» ni «Usuarias».
- `/panel/ventas/dinkbit`, `/panel/ventas/hydrup/condiciones`, `/panel/ventas/hydrup/secuencias`, `/panel/ventas/hydrup/conversaciones`, `/panel/ventas/usuarias` y `/panel/ventas/hoy` la devuelven a su marca.
- Puede mover una tarjeta, abrir una ficha, añadir una nota, crear y asignar una tarea, añadir un lead.
- En la ficha no ve «Eliminar lead».

- [ ] **Step 4: Orden de despliegue**

1. Ejecutar `2026-10-09-ventas-tareas-rol-cliente.sql` en Supabase.
2. Ejecutar `2026-10-09-borrar-lista1-hydrup.sql` (debe devolver 135).
3. Desplegar el código.
