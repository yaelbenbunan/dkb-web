# Ventas B2B (fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poner en marcha `/panel/ventas`: usuarias con login propio, marcas con condiciones y exclusiones, leads por CSV y por webhook de anuncios, ficha con historial y registro de llamadas, «Mi día» y paneles con embudo y esfuerzo.

**Architecture:** Módulo dentro de dkb-web. La lógica vive en `src/lib/ventas/`: módulos puros (dominio, CSV, validación, métricas, historial, rutas) testeados sin red, una capa de datos `db.ts` sobre Supabase con la clave de servicio, y `servicios.ts` que orquesta. Las escrituras de varios pasos van en funciones de Postgres (RPC) transaccionales. La sesión la gestiona Supabase Auth con `@supabase/ssr`; el `proxy.ts` existente separa `/panel/ventas` del panel con contraseña compartida. Las pantallas son Server Components con formularios cliente mínimos y server actions finas.

**Tech Stack:** Next.js 16 App Router (`proxy.ts`, `params` como Promise), React 19 (`useActionState`), TypeScript, zod 4, Supabase (Postgres + Auth), `@supabase/ssr`, Vitest + jsdom.

**Spec:** [docs/superpowers/specs/2026-09-17-captacion-b2b-design.md](../specs/2026-09-17-captacion-b2b-design.md)

## Global Constraints

- **Ruta del módulo:** `/panel/ventas`. Login en `/panel/ventas/login`. El panel actual (`/panel`) y su contraseña compartida no cambian.
- **Proyecto Supabase:** `wnboyesnlrbtwfmhcxmc`. Tablas con prefijo `ventas_`. Migración manual en el SQL Editor (convención del repo: `docs/sql/`).
- **Importes en céntimos** (`bigint` / `number` entero). Porcentaje como `numeric(5,2)`.
- **Historial (`ventas_actividad`) de solo inserción**, garantizado con trigger.
- **RLS activado en todas las tablas `ventas_*`, sin políticas.** Todas las funciones RPC con `revoke execute ... from public, anon, authenticated`.
- **Alta de usuarios desactivada en Supabase Auth.** Solo la admin crea cuentas. Sesión válida sin perfil activo en `ventas_usuarias` = sin acceso.
- **Variable nueva:** `SUPABASE_PUBLISHABLE_KEY` (clave publicable del proyecto), en `.env.local` y en Vercel.
- **Fases** (valores exactos): `nuevo`, `contactado`, `interesado`, `muestras`, `cliente`, `perdido`, `no_interesa`, `ilocalizable`.
- **Resultados de llamada:** `no_contesta`, `volver_a_llamar`, `interesado`, `pide_muestras`, `no_interesa`, `numero_erroneo`.
- **Roles:** `admin`, `comercial`. **Orígenes:** `lista`, `anuncio`, `manual`.
- **Normalización de contacto** (idéntica en TS y SQL): email `lower(trim)`; teléfono = últimos 9 dígitos si hay ≥ 6 dígitos; CIF = mayúsculas sin signos.
- **Fechas de negocio en hora de Madrid** (`Europe/Madrid`): meses y «hoy».
- **Idioma:** textos de pantalla y comentarios en español de España.
- **Estilo visual:** el del panel actual (estilos en línea, slate + azul `#187bef`, overlay `position: fixed` a pantalla completa).
- **npm install** en este equipo: `npm install --cache /tmp/npm-cache-dkbweb --legacy-peer-deps <paquete>`.
- **Verificación de cada tarea:** `npx vitest run src/lib/__tests__/ventas-*` en verde y `npm run typecheck` limpio.
- **Tests** en `src/lib/__tests__/ventas-*.test.ts`, como el resto del repo.
- **Nada de push** hasta la tarea 16 y con el visto bueno de Yael.

---

### Task 1: Base de datos, dependencia y primera admin

**Files:**
- Create: `docs/sql/2026-09-17-ventas-fase1.sql`
- Create: `scripts/ventas-crear-admin.mjs`
- Modify: `package.json` (dependencia `@supabase/ssr`)
- Modify: `.env.example`

**Interfaces:**
- Consumes: nada.
- Produces: tablas `ventas_usuarias`, `ventas_marcas`, `ventas_exclusiones`, `ventas_leads`, `ventas_actividad`, `ventas_importaciones`; RPC `ventas_crear_leads(p_marca_id uuid, p_usuaria_id uuid, p_origen text, p_origen_detalle text, p_leads jsonb) returns integer` y `ventas_registrar_actividad(p_lead_id uuid, p_usuaria_id uuid, p_tipo text, p_resultado text, p_nota text, p_fase_nueva text, p_cambiar_seguimiento boolean, p_proximo_seguimiento date) returns text`.

- [ ] **Step 1: Escribir la migración**

`docs/sql/2026-09-17-ventas-fase1.sql`:

```sql
-- Módulo de ventas B2B con comisión (/panel/ventas), fase 1.
-- Spec: docs/superpowers/specs/2026-09-17-captacion-b2b-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Todas las tablas llevan RLS sin políticas: solo las lee la clave de servicio
-- desde el servidor. Las funciones revocan execute a anon/authenticated, porque
-- la clave publicable (que usa el login) podría llamarlas por la API.

-- Usuarias ---------------------------------------------------------------
create table if not exists public.ventas_usuarias (
  id uuid primary key references auth.users(id) on delete restrict,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('admin', 'comercial')),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Marcas -----------------------------------------------------------------
create table if not exists public.ventas_marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  estado text not null default 'activa' check (estado in ('activa', 'pausada', 'finalizada')),
  fecha_inicio date,
  cuota_mensual_cts bigint not null default 0 check (cuota_mensual_cts >= 0),
  comision_pct numeric(5,2) not null default 0 check (comision_pct between 0 and 100),
  plazo_meses integer check (plazo_meses is null or plazo_meses > 0),
  pago_por_cliente_cts bigint not null default 0 check (pago_por_cliente_cts >= 0),
  skus_b2b text[] not null default '{}',
  webhook_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

-- Exclusiones (clientes previos de la marca) --------------------------------
create table if not exists public.ventas_exclusiones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  nombre text,
  email text,
  telefono text,
  cif text,
  email_norm text generated always as (nullif(lower(btrim(email)), '')) stored,
  telefono_norm text generated always as (
    case when length(regexp_replace(coalesce(telefono, ''), '\D', '', 'g')) >= 6
      then right(regexp_replace(telefono, '\D', '', 'g'), 9) end
  ) stored,
  cif_norm text generated always as (
    nullif(upper(regexp_replace(coalesce(cif, ''), '[^A-Za-z0-9]', '', 'g')), '')
  ) stored,
  created_by uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now(),
  check (coalesce(email, telefono, cif) is not null)
);
create index if not exists ventas_exclusiones_marca_idx on public.ventas_exclusiones (marca_id);

-- Leads ------------------------------------------------------------------
create table if not exists public.ventas_leads (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete restrict,
  negocio text not null,
  tipo_negocio text,
  contacto text,
  telefono text,
  email text,
  ciudad text,
  cif text,
  web text,
  email_norm text generated always as (nullif(lower(btrim(email)), '')) stored,
  telefono_norm text generated always as (
    case when length(regexp_replace(coalesce(telefono, ''), '\D', '', 'g')) >= 6
      then right(regexp_replace(telefono, '\D', '', 'g'), 9) end
  ) stored,
  origen text not null check (origen in ('lista', 'anuncio', 'manual')),
  origen_detalle text,
  fase text not null default 'nuevo' check (fase in (
    'nuevo', 'contactado', 'interesado', 'muestras', 'cliente', 'perdido', 'no_interesa', 'ilocalizable'
  )),
  asignada_a uuid references public.ventas_usuarias(id),
  proximo_seguimiento date,
  codigo_cliente text not null,
  primer_pedido_at timestamptz,
  excluido boolean not null default false,
  created_by uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca_id, codigo_cliente)
);
create unique index if not exists ventas_leads_email_uq
  on public.ventas_leads (marca_id, email_norm) where email_norm is not null;
create unique index if not exists ventas_leads_telefono_uq
  on public.ventas_leads (marca_id, telefono_norm) where telefono_norm is not null;
create index if not exists ventas_leads_marca_idx on public.ventas_leads (marca_id, created_at desc);
create index if not exists ventas_leads_seguimiento_idx
  on public.ventas_leads (asignada_a, proximo_seguimiento) where proximo_seguimiento is not null;

-- Historial (solo inserción) -----------------------------------------------
create table if not exists public.ventas_actividad (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.ventas_leads(id) on delete restrict,
  marca_id uuid not null references public.ventas_marcas(id) on delete restrict,
  usuaria_id uuid references public.ventas_usuarias(id),
  tipo text not null check (tipo in (
    'llamada', 'nota', 'cambio_fase', 'muestras_enviadas', 'pedido_vinculado', 'lead_creado'
  )),
  resultado text check (resultado is null or resultado in (
    'no_contesta', 'volver_a_llamar', 'interesado', 'pide_muestras', 'no_interesa', 'numero_erroneo'
  )),
  nota text,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ventas_actividad_lead_idx on public.ventas_actividad (lead_id, created_at desc);
create index if not exists ventas_actividad_marca_idx on public.ventas_actividad (marca_id, created_at);

create or replace function public.ventas_actividad_inmutable() returns trigger
language plpgsql as $$
begin
  raise exception 'ventas_actividad es de solo inserción: el historial no se edita ni se borra';
end $$;

drop trigger if exists ventas_actividad_inmutable on public.ventas_actividad;
create trigger ventas_actividad_inmutable
  before update or delete on public.ventas_actividad
  for each row execute function public.ventas_actividad_inmutable();

-- Importaciones ------------------------------------------------------------
create table if not exists public.ventas_importaciones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete restrict,
  tipo text not null check (tipo in ('leads', 'pedidos')),
  nombre_fichero text,
  filas_totales integer not null,
  filas_guardadas integer not null,
  resumen jsonb not null default '{}'::jsonb,
  usuaria_id uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now()
);

-- RLS ----------------------------------------------------------------------
alter table public.ventas_usuarias enable row level security;
alter table public.ventas_marcas enable row level security;
alter table public.ventas_exclusiones enable row level security;
alter table public.ventas_leads enable row level security;
alter table public.ventas_actividad enable row level security;
alter table public.ventas_importaciones enable row level security;

-- RPC: crear leads + su entrada «lead_creado», en una sola transacción ----
-- Los duplicados (email o teléfono ya existentes en la marca) se saltan sin
-- error: devuelve cuántos se crearon de verdad.
create or replace function public.ventas_crear_leads(
  p_marca_id uuid,
  p_usuaria_id uuid,
  p_origen text,
  p_origen_detalle text,
  p_leads jsonb
) returns integer
language plpgsql as $$
declare
  v_prefijo text;
  v_creados integer;
begin
  select upper(left(replace(slug, '-', ''), 3)) into v_prefijo
    from public.ventas_marcas where id = p_marca_id;
  if v_prefijo is null then
    raise exception 'marca_no_existe';
  end if;

  with nuevos as (
    insert into public.ventas_leads (
      marca_id, negocio, tipo_negocio, contacto, telefono, email, ciudad, cif, web,
      origen, origen_detalle, codigo_cliente, excluido, created_by
    )
    select
      p_marca_id,
      l->>'negocio',
      nullif(l->>'tipo_negocio', ''),
      nullif(l->>'contacto', ''),
      nullif(l->>'telefono', ''),
      nullif(l->>'email', ''),
      nullif(l->>'ciudad', ''),
      nullif(l->>'cif', ''),
      nullif(l->>'web', ''),
      p_origen,
      p_origen_detalle,
      v_prefijo || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)),
      coalesce((l->>'excluido')::boolean, false),
      p_usuaria_id
    from jsonb_array_elements(p_leads) as l
    on conflict do nothing
    returning id
  ), historial as (
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, datos)
    select id, p_marca_id, p_usuaria_id, 'lead_creado',
      jsonb_build_object('origen', p_origen, 'origen_detalle', p_origen_detalle)
    from nuevos
    returning 1
  )
  select count(*) into v_creados from historial;

  return v_creados;
end $$;

-- RPC: registrar actividad y mover fase/seguimiento, en una transacción ----
-- p_tipo = 'cambio_fase' → solo cambia la fase (la nota va en esa entrada).
-- Otro tipo → inserta la entrada y, si p_fase_nueva difiere, otra 'cambio_fase'.
-- p_cambiar_seguimiento = false deja proximo_seguimiento como estaba.
create or replace function public.ventas_registrar_actividad(
  p_lead_id uuid,
  p_usuaria_id uuid,
  p_tipo text,
  p_resultado text,
  p_nota text,
  p_fase_nueva text,
  p_cambiar_seguimiento boolean,
  p_proximo_seguimiento date
) returns text
language plpgsql as $$
declare
  v_lead public.ventas_leads%rowtype;
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
        then jsonb_build_object('proximo_seguimiento', p_proximo_seguimiento)
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
    updated_at = now()
  where id = p_lead_id;

  return coalesce(p_fase_nueva, v_lead.fase);
end $$;

revoke execute on function public.ventas_crear_leads(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date) from public, anon, authenticated;
revoke execute on function public.ventas_actividad_inmutable() from public, anon, authenticated;
```

- [ ] **Step 2: Script para crear la primera admin**

`scripts/ventas-crear-admin.mjs`:

```js
// Crea una usuaria admin del módulo de ventas (/panel/ventas).
// Uso: node --env-file=.env.local scripts/ventas-crear-admin.mjs "Yael" tech@dinkbit.com
// Imprime una contraseña temporal: cámbiala en el panel (Usuarias → Nueva contraseña).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [nombre, emailRaw] = process.argv.slice(2);
if (!nombre || !emailRaw) {
  console.error('Uso: node --env-file=.env.local scripts/ventas-crear-admin.mjs "Nombre" email@dinkbit.com');
  process.exit(1);
}
const email = emailRaw.trim().toLowerCase();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = randomBytes(12).toString("base64url");
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) {
  console.error("No se pudo crear el usuario:", error?.message);
  process.exit(1);
}
const { error: perfilError } = await sb
  .from("ventas_usuarias")
  .insert({ id: data.user.id, nombre, email, rol: "admin" });
if (perfilError) {
  await sb.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo crear el perfil:", perfilError.message);
  process.exit(1);
}
console.log(`Admin creada: ${email}\nContraseña temporal: ${password}`);
```

- [ ] **Step 3: Instalar `@supabase/ssr` y documentar la variable**

Run: `npm install --cache /tmp/npm-cache-dkbweb --legacy-peer-deps @supabase/ssr@^0.12.7`
Expected: `package.json` gana `"@supabase/ssr": "^0.12.7"`.

En `.env.example`, justo debajo de `SUPABASE_SERVICE_ROLE_KEY=`:

```
# Clave PUBLICABLE (sb_publishable_…) del mismo proyecto. La usa el login de
# /panel/ventas (Supabase Auth). No es secreta, pero sin ella no se puede entrar.
SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 4: PAUSA — pasos manuales de Yael**

Pedir a Yael, en este orden:
1. Ejecutar `docs/sql/2026-09-17-ventas-fase1.sql` en el SQL Editor.
2. Supabase → Authentication → Sign In / Providers: desactivar **Allow new users to sign up**.
3. Supabase → Project Settings → API Keys: copiar la **publishable key** a `.env.local` y a Vercel (Production) como `SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 5: Verificar tablas y crear la admin**

Run:
```bash
set -a; source .env.local; set +a
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['definitions']; print(sorted(k for k in d if k.startswith('ventas_')))"
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/ventas_crear_leads" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{}' -w " %{http_code}\n"
node --env-file=.env.local scripts/ventas-crear-admin.mjs "Yael" tech@dinkbit.com
```
Expected: las 6 tablas `ventas_*`; la llamada RPC con la clave publicable devuelve **401/404** (permiso denegado), nunca 200; el script imprime la contraseña temporal (entregársela a Yael por el chat, no guardarla en ningún fichero).

- [ ] **Step 6: Commit**

```bash
git add docs/sql/2026-09-17-ventas-fase1.sql scripts/ventas-crear-admin.mjs package.json package-lock.json .env.example
git commit -m "feat(ventas): tablas, RPC y alta de admin del módulo de ventas B2B"
```

---
### Task 2: Vocabulario del dominio

Fases, resultados, tipos de negocio, normalización de contacto y las reglas de cómo una llamada mueve la fase. Todo puro.

**Files:**
- Create: `src/lib/ventas/dominio.ts`
- Test: `src/lib/__tests__/ventas-dominio.test.ts`

**Interfaces:**
- Consumes: `normalizeKey(raw: string): string` de `src/lib/leads-csv.ts`.
- Produces: `FASES`, `type Fase`, `FASE_LABELS`, `FASE_COLORES`, `FASES_ACTIVAS`, `esFaseActiva(fase: string): boolean`, `esFase(v: unknown): v is Fase`, `RESULTADOS_LLAMADA`, `type ResultadoLlamada`, `RESULTADO_LABELS`, `TIPOS_ACTIVIDAD`, `type TipoActividad`, `TIPOS_NEGOCIO`, `type TipoNegocio`, `TIPO_NEGOCIO_LABELS`, `ROLES`, `type Rol`, `ROL_LABELS`, `ORIGENES`, `type Origen`, `ORIGEN_LABELS`, `ESTADOS_MARCA`, `type EstadoMarca`, `faseTrasLlamada(actual: Fase, resultado: ResultadoLlamada): Fase`, `seguimientoTrasLlamada(resultado: ResultadoLlamada, fecha: string | null): string | null`, `normalizarEmail(raw?: string | null): string | null`, `normalizarTelefono(raw?: string | null): string | null`, `normalizarCif(raw?: string | null): string | null`, `parseTipoNegocio(raw: string): TipoNegocio | null`, `slugify(nombre: string): string`.

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-dominio.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  faseTrasLlamada,
  seguimientoTrasLlamada,
  normalizarEmail,
  normalizarTelefono,
  normalizarCif,
  parseTipoNegocio,
  slugify,
  esFaseActiva,
} from "../ventas/dominio";

describe("faseTrasLlamada", () => {
  test("la primera llamada sin respuesta deja el lead como contactado", () => {
    expect(faseTrasLlamada("nuevo", "no_contesta")).toBe("contactado");
  });

  test("interesado y pide muestras llevan a interesado", () => {
    expect(faseTrasLlamada("contactado", "interesado")).toBe("interesado");
    expect(faseTrasLlamada("nuevo", "pide_muestras")).toBe("interesado");
  });

  test("una llamada normal no hace retroceder a quien ya tiene muestras", () => {
    expect(faseTrasLlamada("muestras", "volver_a_llamar")).toBe("muestras");
    expect(faseTrasLlamada("muestras", "interesado")).toBe("muestras");
  });

  test("los resultados negativos cierran el lead desde cualquier fase activa", () => {
    expect(faseTrasLlamada("muestras", "no_interesa")).toBe("no_interesa");
    expect(faseTrasLlamada("nuevo", "numero_erroneo")).toBe("ilocalizable");
  });

  test("un lead cerrado que vuelve a mostrar interés se reactiva", () => {
    expect(faseTrasLlamada("no_interesa", "interesado")).toBe("interesado");
  });

  test("un cliente sigue siendo cliente pase lo que pase en la llamada", () => {
    expect(faseTrasLlamada("cliente", "no_interesa")).toBe("cliente");
  });
});

describe("seguimientoTrasLlamada", () => {
  test("los resultados que cierran el lead borran el seguimiento", () => {
    expect(seguimientoTrasLlamada("no_interesa", "2026-09-20")).toBeNull();
    expect(seguimientoTrasLlamada("numero_erroneo", "2026-09-20")).toBeNull();
  });

  test("el resto conserva la fecha elegida", () => {
    expect(seguimientoTrasLlamada("volver_a_llamar", "2026-09-20")).toBe("2026-09-20");
  });
});

describe("normalización de contacto", () => {
  test("email en minúsculas y sin espacios; vacío es null", () => {
    expect(normalizarEmail("  Laura@Gym.ES ")).toBe("laura@gym.es");
    expect(normalizarEmail("  ")).toBeNull();
  });

  test("teléfono: últimos 9 dígitos, y null si no parece un teléfono", () => {
    expect(normalizarTelefono("+34 600 11 22 33")).toBe("600112233");
    expect(normalizarTelefono("600112233")).toBe("600112233");
    expect(normalizarTelefono("123")).toBeNull();
  });

  test("CIF en mayúsculas y sin guiones", () => {
    expect(normalizarCif("b-1234567.8")).toBe("B12345678");
    expect(normalizarCif("")).toBeNull();
  });
});

describe("parseTipoNegocio", () => {
  test("acepta el valor, la etiqueta y sinónimos habituales", () => {
    expect(parseTipoNegocio("gimnasio")).toBe("gimnasio");
    expect(parseTipoNegocio("Farmacia / parafarmacia")).toBe("farmacia");
    expect(parseTipoNegocio("Gym")).toBe("gimnasio");
    expect(parseTipoNegocio("CrossFit")).toBe("box_crossfit");
    expect(parseTipoNegocio("Fisio")).toBe("fisioterapia");
  });

  test("lo desconocido devuelve null", () => {
    expect(parseTipoNegocio("peluquería")).toBeNull();
    expect(parseTipoNegocio("")).toBeNull();
  });
});

describe("utilidades", () => {
  test("slugify quita acentos y signos", () => {
    expect(slugify("Hydrup Electrolitos")).toBe("hydrup-electrolitos");
    expect(slugify("  Café & Más ")).toBe("cafe-mas");
  });

  test("solo las fases activas tienen seguimiento", () => {
    expect(esFaseActiva("muestras")).toBe(true);
    expect(esFaseActiva("cliente")).toBe(false);
    expect(esFaseActiva("perdido")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-dominio.test.ts`
Expected: FAIL — `Failed to resolve import "../ventas/dominio"`.

- [ ] **Step 3: Write the implementation**

`src/lib/ventas/dominio.ts`:

```ts
/**
 * Vocabulario del módulo de ventas B2B: fases del lead, resultados de llamada,
 * tipos de negocio, roles y orígenes, y las reglas que los relacionan. Módulo
 * puro (sin `server-only`): lo usan las pantallas y el servidor.
 *
 * Fases, resultados, tipos de actividad, roles y orígenes tienen además un
 * CHECK en la base de datos (docs/sql/2026-09-17-ventas-fase1.sql): si se
 * añade un valor aquí, hay que añadirlo también allí. Los tipos de negocio no
 * tienen CHECK, a propósito: se amplían sin migración.
 */

import { normalizeKey } from "../leads-csv";

export const FASES = [
  "nuevo",
  "contactado",
  "interesado",
  "muestras",
  "cliente",
  "perdido",
  "no_interesa",
  "ilocalizable",
] as const;
export type Fase = (typeof FASES)[number];

export const FASE_LABELS: Record<Fase, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  muestras: "Muestras enviadas",
  cliente: "Cliente",
  perdido: "Perdido",
  no_interesa: "No le interesa",
  ilocalizable: "Ilocalizable",
};

export const FASE_COLORES: Record<Fase, { bg: string; text: string }> = {
  nuevo: { bg: "#e2e8f0", text: "#334155" },
  contactado: { bg: "#dbeafe", text: "#1e40af" },
  interesado: { bg: "#fef3c7", text: "#92400e" },
  muestras: { bg: "#ede9fe", text: "#5b21b6" },
  cliente: { bg: "#dcfce7", text: "#166534" },
  perdido: { bg: "#fee2e2", text: "#991b1b" },
  no_interesa: { bg: "#fee2e2", text: "#991b1b" },
  ilocalizable: { bg: "#f1f5f9", text: "#64748b" },
};

/** Fases en las que todavía se trabaja el lead: solo estas llevan seguimiento. */
export const FASES_ACTIVAS: readonly Fase[] = ["nuevo", "contactado", "interesado", "muestras"];

export function esFaseActiva(fase: string): boolean {
  return (FASES_ACTIVAS as readonly string[]).includes(fase);
}

export function esFase(v: unknown): v is Fase {
  return typeof v === "string" && (FASES as readonly string[]).includes(v);
}

export const RESULTADOS_LLAMADA = [
  "no_contesta",
  "volver_a_llamar",
  "interesado",
  "pide_muestras",
  "no_interesa",
  "numero_erroneo",
] as const;
export type ResultadoLlamada = (typeof RESULTADOS_LLAMADA)[number];

export const RESULTADO_LABELS: Record<ResultadoLlamada, string> = {
  no_contesta: "No contesta",
  volver_a_llamar: "Volver a llamar",
  interesado: "Interesado",
  pide_muestras: "Pide muestras",
  no_interesa: "No le interesa",
  numero_erroneo: "Número erróneo",
};

export const TIPOS_ACTIVIDAD = [
  "llamada",
  "nota",
  "cambio_fase",
  "muestras_enviadas",
  "pedido_vinculado",
  "lead_creado",
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const TIPOS_NEGOCIO = [
  "gimnasio",
  "box_crossfit",
  "club_deportivo",
  "fisioterapia",
  "farmacia",
  "tienda_deporte",
  "herbolario",
  "empresa",
  "otro",
] as const;
export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];

export const TIPO_NEGOCIO_LABELS: Record<TipoNegocio, string> = {
  gimnasio: "Gimnasio",
  box_crossfit: "Box / CrossFit",
  club_deportivo: "Club deportivo",
  fisioterapia: "Fisioterapia",
  farmacia: "Farmacia / parafarmacia",
  tienda_deporte: "Tienda de deporte",
  herbolario: "Herbolario",
  empresa: "Empresa",
  otro: "Otro",
};

export const ROLES = ["admin", "comercial"] as const;
export type Rol = (typeof ROLES)[number];
export const ROL_LABELS: Record<Rol, string> = { admin: "Admin", comercial: "Comercial" };

export const ORIGENES = ["lista", "anuncio", "manual"] as const;
export type Origen = (typeof ORIGENES)[number];
export const ORIGEN_LABELS: Record<Origen, string> = {
  lista: "Lista",
  anuncio: "Anuncio",
  manual: "Alta manual",
};

export const ESTADOS_MARCA = ["activa", "pausada", "finalizada"] as const;
export type EstadoMarca = (typeof ESTADOS_MARCA)[number];

/* -------------------------------------------------------------------------- */
/* Reglas de llamada                                                          */
/* -------------------------------------------------------------------------- */

const RANGO_ACTIVO: Record<string, number> = { nuevo: 0, contactado: 1, interesado: 2, muestras: 3 };

const DESTINO_LLAMADA: Record<ResultadoLlamada, Fase> = {
  no_contesta: "contactado",
  volver_a_llamar: "contactado",
  interesado: "interesado",
  pide_muestras: "interesado",
  no_interesa: "no_interesa",
  numero_erroneo: "ilocalizable",
};

/**
 * Fase en la que queda un lead tras una llamada. Dentro de las fases activas
 * solo se avanza (una llamada rutinaria no devuelve a «contactado» a quien ya
 * tiene muestras); los resultados negativos cierran el lead; un lead cerrado
 * que vuelve a interesarse se reactiva; un cliente no cambia por una llamada.
 * La fase «muestras» no la pone una llamada: la marca el botón Muestras enviadas.
 */
export function faseTrasLlamada(actual: Fase, resultado: ResultadoLlamada): Fase {
  if (actual === "cliente") return "cliente";
  const destino = DESTINO_LLAMADA[resultado];
  if (!esFaseActiva(destino)) return destino;
  if (!esFaseActiva(actual)) return destino;
  return RANGO_ACTIVO[destino] > RANGO_ACTIVO[actual] ? destino : actual;
}

/** Un resultado que cierra el lead no deja seguimiento pendiente. */
export function seguimientoTrasLlamada(
  resultado: ResultadoLlamada,
  fecha: string | null,
): string | null {
  return resultado === "no_interesa" || resultado === "numero_erroneo" ? null : fecha;
}

/* -------------------------------------------------------------------------- */
/* Normalización (idéntica a las columnas *_norm de la base de datos)         */
/* -------------------------------------------------------------------------- */

export function normalizarEmail(raw?: string | null): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  return email || null;
}

/** Últimos 9 dígitos: «+34 600 11 22 33» y «600112233» son el mismo teléfono.
 *  Con menos de 6 dígitos no es un teléfono, es ruido. */
export function normalizarTelefono(raw?: string | null): string | null {
  const digitos = (raw ?? "").replace(/\D/g, "");
  return digitos.length >= 6 ? digitos.slice(-9) : null;
}

export function normalizarCif(raw?: string | null): string | null {
  const cif = (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cif || null;
}

const SINONIMOS_TIPO: Record<string, TipoNegocio> = {
  gym: "gimnasio",
  gimnasios: "gimnasio",
  crossfit: "box_crossfit",
  box: "box_crossfit",
  club: "club_deportivo",
  fisio: "fisioterapia",
  fisioterapeuta: "fisioterapia",
  farmacia: "farmacia",
  parafarmacia: "farmacia",
  tiendadedeportes: "tienda_deporte",
  tienda: "tienda_deporte",
  herboristeria: "herbolario",
};

const ALIAS_TIPO: Record<string, TipoNegocio> = (() => {
  const mapa: Record<string, TipoNegocio> = { ...SINONIMOS_TIPO };
  for (const tipo of TIPOS_NEGOCIO) {
    mapa[normalizeKey(tipo)] = tipo;
    mapa[normalizeKey(TIPO_NEGOCIO_LABELS[tipo])] = tipo;
  }
  return mapa;
})();

export function parseTipoNegocio(raw: string): TipoNegocio | null {
  const clave = normalizeKey(raw);
  if (!clave) return null;
  return ALIAS_TIPO[clave] ?? null;
}

export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-dominio.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/dominio.ts src/lib/__tests__/ventas-dominio.test.ts
git commit -m "feat(ventas): vocabulario del dominio y reglas de llamada"
```

---
### Task 3: CSV de leads, clasificación y lead de anuncio

Leer el CSV de una lista de prospección, separar nuevos/duplicados/excluidos, y convertir el cuerpo de un webhook de anuncios en un lead. Todo puro, lo usan la previsualización del navegador y el servidor.

**Files:**
- Create: `src/lib/ventas/leads-csv.ts`
- Create: `src/lib/ventas/anuncios.ts`
- Test: `src/lib/__tests__/ventas-leads-csv.test.ts`
- Test: `src/lib/__tests__/ventas-anuncios.test.ts`

**Interfaces:**
- Consumes: de `src/lib/leads-csv.ts`: `parseCsvRows(text: string): CsvRow[]`, `normalizeKey(raw: string): string`, `decodeCsvBytes(bytes): string`, `type CsvRowError = { line: number; message: string }`. De Task 2: `normalizarEmail`, `normalizarTelefono`, `normalizarCif`, `parseTipoNegocio`, `type TipoNegocio`.
- Produces:
  - `VENTAS_CSV_HEADERS`, `VENTAS_CSV_MAX_ROWS = 2000`, `EMAIL_RE: RegExp`
  - `interface LeadNuevo { negocio: string; tipo_negocio: TipoNegocio | null; contacto: string; telefono: string; email: string; ciudad: string; cif: string; web: string }`
  - `interface ParsedVentasCsv { filas: LeadNuevo[]; errores: CsvRowError[]; avisos: CsvRowError[]; cabecerasDesconocidas: string[] }`
  - `parseVentasLeadsCsv(text: string): ParsedVentasCsv`
  - `plantillaVentasCsv(): string`
  - `interface Contacto { email?: string | null; telefono?: string | null; cif?: string | null }`
  - `clavesContacto(c: Contacto): string[]`
  - `clasificarLeads<T extends Contacto>(entrantes: T[], existentes: Contacto[], exclusiones: Contacto[]): { nuevos: T[]; duplicados: T[]; excluidos: T[] }`
  - re-export `decodeCsvBytes`
  - `leadDesdeAnuncio(datos: Record<string, unknown>): { ok: true; lead: LeadNuevo; campana: string } | { ok: false; error: "falta_negocio" | "falta_contacto" | "email_invalido" }`

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/ventas-leads-csv.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  parseVentasLeadsCsv,
  clasificarLeads,
  clavesContacto,
  plantillaVentasCsv,
  VENTAS_CSV_HEADERS,
} from "../ventas/leads-csv";

describe("parseVentasLeadsCsv", () => {
  test("lee la plantilla con separador de coma", () => {
    const csv = "negocio,tipo_negocio,contacto,telefono,email,ciudad,cif,web\nGym Sol,gimnasio,Laura,600111222,laura@sol.es,Madrid,,";
    const r = parseVentasLeadsCsv(csv);
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      {
        negocio: "Gym Sol",
        tipo_negocio: "gimnasio",
        contacto: "Laura",
        telefono: "600111222",
        email: "laura@sol.es",
        ciudad: "Madrid",
        cif: "",
        web: "",
      },
    ]);
  });

  test("acepta cabeceras con otro nombre y punto y coma (Excel)", () => {
    const csv = "Empresa;Teléfono;Correo;Localidad\nFisio Norte;+34 611 22 33 44;;Bilbao";
    const r = parseVentasLeadsCsv(csv);
    expect(r.filas[0]).toMatchObject({ negocio: "Fisio Norte", telefono: "+34 611 22 33 44", ciudad: "Bilbao" });
  });

  test("sin columna de negocio no importa nada", () => {
    const r = parseVentasLeadsCsv("telefono,email\n600111222,a@b.es");
    expect(r.filas).toEqual([]);
    expect(r.errores[0].message).toContain("negocio");
  });

  test("cada fila mala se reporta con su línea", () => {
    const csv = "negocio,telefono,email\n,600111222,\nSin contacto,,\nMal email,,no-es-email";
    const r = parseVentasLeadsCsv(csv);
    expect(r.filas).toEqual([]);
    expect(r.errores.map((e) => e.line)).toEqual([2, 3, 4]);
  });

  test("un tipo de negocio desconocido no bloquea: queda vacío y avisa", () => {
    const r = parseVentasLeadsCsv("negocio,tipo_negocio,telefono\nPelu,peluquería,600111222");
    expect(r.errores).toEqual([]);
    expect(r.filas[0].tipo_negocio).toBeNull();
    expect(r.avisos[0]).toMatchObject({ line: 2 });
  });

  test("ignora filas vacías y avisa de cabeceras desconocidas", () => {
    const r = parseVentasLeadsCsv("negocio,telefono,notas\nGym,600111222,x\n,,\n");
    expect(r.filas).toHaveLength(1);
    expect(r.cabecerasDesconocidas).toEqual(["notas"]);
  });

  test("la plantilla se puede volver a leer sin errores", () => {
    const r = parseVentasLeadsCsv(plantillaVentasCsv());
    expect(r.errores).toEqual([]);
    expect(r.filas).toHaveLength(1);
    expect(plantillaVentasCsv().split("\n")[0]).toBe(VENTAS_CSV_HEADERS.join(","));
  });
});

describe("clasificarLeads", () => {
  const lead = (email: string, telefono = "") => ({ email, telefono, cif: "" });

  test("separa nuevos, duplicados en la marca y excluidos", () => {
    const r = clasificarLeads(
      [lead("nuevo@a.es"), lead("ya@a.es"), lead("cliente@a.es")],
      [{ email: "YA@a.es" }],
      [{ email: "cliente@a.es" }],
    );
    expect(r.nuevos.map((l) => l.email)).toEqual(["nuevo@a.es"]);
    expect(r.duplicados.map((l) => l.email)).toEqual(["ya@a.es"]);
    expect(r.excluidos.map((l) => l.email)).toEqual(["cliente@a.es"]);
  });

  test("detecta el duplicado por teléfono aunque cambie el formato", () => {
    const r = clasificarLeads([lead("", "+34 600 11 22 33")], [{ telefono: "600112233" }], []);
    expect(r.duplicados).toHaveLength(1);
  });

  test("dos filas iguales en el mismo fichero: la segunda es duplicado", () => {
    const r = clasificarLeads([lead("a@a.es"), lead("A@a.es")], [], []);
    expect(r.nuevos).toHaveLength(1);
    expect(r.duplicados).toHaveLength(1);
  });

  test("la exclusión también casa por CIF", () => {
    const r = clasificarLeads([{ email: "x@a.es", telefono: "", cif: "b-12345678" }], [], [{ cif: "B12345678" }]);
    expect(r.excluidos).toHaveLength(1);
  });

  test("excluido pesa más que duplicado", () => {
    const r = clasificarLeads([lead("c@a.es")], [{ email: "c@a.es" }], [{ email: "c@a.es" }]);
    expect(r.excluidos).toHaveLength(1);
    expect(r.duplicados).toHaveLength(0);
  });
});

describe("clavesContacto", () => {
  test("genera una clave por cada dato de contacto presente", () => {
    expect(clavesContacto({ email: "A@b.es", telefono: "600112233", cif: "b1" })).toEqual([
      "e:a@b.es",
      "t:600112233",
      "c:B1",
    ]);
    expect(clavesContacto({})).toEqual([]);
  });
});
```

`src/lib/__tests__/ventas-anuncios.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { leadDesdeAnuncio } from "../ventas/anuncios";

describe("leadDesdeAnuncio", () => {
  test("lee los campos de Meta Lead Ads vía Zapier", () => {
    const r = leadDesdeAnuncio({
      full_name: "Laura Pérez",
      company_name: "Gym Sol",
      phone_number: "+34600111222",
      email: "laura@sol.es",
      campaign_name: "Muestras gimnasios",
      city: "Madrid",
    });
    expect(r).toEqual({
      ok: true,
      campana: "Muestras gimnasios",
      lead: {
        negocio: "Gym Sol",
        contacto: "Laura Pérez",
        telefono: "+34600111222",
        email: "laura@sol.es",
        ciudad: "Madrid",
        cif: "",
        web: "",
        tipo_negocio: null,
      },
    });
  });

  test("sin nombre de negocio usa el de la persona", () => {
    const r = leadDesdeAnuncio({ nombre: "Pedro", telefono: "611222333" });
    expect(r.ok && r.lead.negocio).toBe("Pedro");
  });

  test("rechaza sin teléfono ni email, o con email inválido", () => {
    expect(leadDesdeAnuncio({ negocio: "Gym" })).toEqual({ ok: false, error: "falta_contacto" });
    expect(leadDesdeAnuncio({ negocio: "Gym", email: "nope" })).toEqual({ ok: false, error: "email_invalido" });
    expect(leadDesdeAnuncio({ telefono: "611222333" })).toEqual({ ok: false, error: "falta_negocio" });
  });

  test("reconoce el tipo de negocio si viene", () => {
    const r = leadDesdeAnuncio({ negocio: "Box X", tipo_negocio: "CrossFit", email: "a@b.es" });
    expect(r.ok && r.lead.tipo_negocio).toBe("box_crossfit");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/ventas-leads-csv.test.ts src/lib/__tests__/ventas-anuncios.test.ts`
Expected: FAIL — no se resuelven `../ventas/leads-csv` ni `../ventas/anuncios`.

- [ ] **Step 3: Implement `leads-csv.ts`**

`src/lib/ventas/leads-csv.ts`:

```ts
/**
 * Importación de listas de prospección (CSV) del módulo de ventas.
 *
 * Módulo puro: el panel lo usa para previsualizar el fichero y la server
 * action lo repite sobre el texto crudo antes de guardar, así que una
 * previsualización manipulada no cuela filas. Reutiliza el lector de CSV del
 * CRM (`src/lib/leads-csv.ts`), que ya resuelve comillas, BOM y Excel en
 * Windows-1252.
 */

import { decodeCsvBytes, normalizeKey, parseCsvRows, type CsvRowError } from "../leads-csv";
import {
  normalizarCif,
  normalizarEmail,
  normalizarTelefono,
  parseTipoNegocio,
  type TipoNegocio,
} from "./dominio";

export { decodeCsvBytes };

export const VENTAS_CSV_HEADERS = [
  "negocio",
  "tipo_negocio",
  "contacto",
  "telefono",
  "email",
  "ciudad",
  "cif",
  "web",
] as const;
type Cabecera = (typeof VENTAS_CSV_HEADERS)[number];

export const VENTAS_CSV_MAX_ROWS = 2000;

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export interface LeadNuevo {
  negocio: string;
  tipo_negocio: TipoNegocio | null;
  contacto: string;
  telefono: string;
  email: string;
  ciudad: string;
  cif: string;
  web: string;
}

export interface ParsedVentasCsv {
  filas: LeadNuevo[];
  /** Filas que impiden importar el fichero. */
  errores: CsvRowError[];
  /** Filas que se importan, pero con algo que conviene revisar. */
  avisos: CsvRowError[];
  cabecerasDesconocidas: string[];
}

const ALIAS: Record<string, Cabecera> = {
  negocio: "negocio",
  empresa: "negocio",
  nombre: "negocio",
  nombrenegocio: "negocio",
  razonsocial: "negocio",
  tiponegocio: "tipo_negocio",
  tipo: "tipo_negocio",
  categoria: "tipo_negocio",
  sector: "tipo_negocio",
  contacto: "contacto",
  personacontacto: "contacto",
  persona: "contacto",
  telefono: "telefono",
  tel: "telefono",
  movil: "telefono",
  phone: "telefono",
  email: "email",
  correo: "email",
  mail: "email",
  ciudad: "ciudad",
  localidad: "ciudad",
  poblacion: "ciudad",
  city: "ciudad",
  cif: "cif",
  nif: "cif",
  web: "web",
  website: "web",
  url: "web",
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseVentasLeadsCsv(text: string): ParsedVentasCsv {
  const rows = parseCsvRows(text);
  const vacio: ParsedVentasCsv = { filas: [], errores: [], avisos: [], cabecerasDesconocidas: [] };
  if (rows.length === 0) {
    return { ...vacio, errores: [{ line: 1, message: "El fichero está vacío." }] };
  }

  const [cabecera, ...datos] = rows;
  const columnas = new Map<Cabecera, number>();
  const desconocidas: string[] = [];
  cabecera.cells.forEach((celda, i) => {
    const col = ALIAS[normalizeKey(celda)];
    if (col && !columnas.has(col)) columnas.set(col, i);
    else if (!col && celda.trim()) desconocidas.push(celda.trim());
  });

  if (!columnas.has("negocio")) {
    return {
      ...vacio,
      cabecerasDesconocidas: desconocidas,
      errores: [{ line: 1, message: "Falta la columna «negocio». Descarga la plantilla para ver el formato." }],
    };
  }

  const filas: LeadNuevo[] = [];
  const errores: CsvRowError[] = [];
  const avisos: CsvRowError[] = [];

  for (const row of datos) {
    if (row.cells.every((c) => c.trim() === "")) continue;
    const celda = (col: Cabecera) => {
      const i = columnas.get(col);
      return i === undefined ? "" : (row.cells[i] ?? "").trim();
    };

    const lead: LeadNuevo = {
      negocio: celda("negocio"),
      tipo_negocio: null,
      contacto: celda("contacto"),
      telefono: celda("telefono"),
      email: celda("email"),
      ciudad: celda("ciudad"),
      cif: celda("cif"),
      web: celda("web"),
    };

    const problemas: string[] = [];
    if (!lead.negocio) problemas.push("falta el nombre del negocio");
    if (!normalizarTelefono(lead.telefono) && !lead.email) problemas.push("hace falta teléfono o email");
    if (lead.email && !EMAIL_RE.test(lead.email)) problemas.push(`email no válido («${lead.email}»)`);
    if (problemas.length > 0) {
      errores.push({ line: row.line, message: capitalizar(problemas.join("; ")) + "." });
      continue;
    }

    const tipoCrudo = celda("tipo_negocio");
    if (tipoCrudo) {
      lead.tipo_negocio = parseTipoNegocio(tipoCrudo);
      if (!lead.tipo_negocio) {
        avisos.push({ line: row.line, message: `Tipo de negocio desconocido («${tipoCrudo}»): se importa sin tipo.` });
      }
    }
    filas.push(lead);
  }

  if (filas.length + errores.length > VENTAS_CSV_MAX_ROWS) {
    errores.unshift({ line: 1, message: `Como máximo ${VENTAS_CSV_MAX_ROWS} filas por fichero: divídelo en varios.` });
  }

  return { filas, errores, avisos, cabecerasDesconocidas: desconocidas };
}

export function plantillaVentasCsv(): string {
  return (
    VENTAS_CSV_HEADERS.join(",") +
    "\n" +
    "Gimnasio Ejemplo,gimnasio,Laura Pérez,600111222,laura@ejemplo.com,Madrid,B12345678,https://ejemplo.com\n"
  );
}

export interface Contacto {
  email?: string | null;
  telefono?: string | null;
  cif?: string | null;
}

export function clavesContacto(c: Contacto): string[] {
  const claves: string[] = [];
  const email = normalizarEmail(c.email);
  if (email) claves.push(`e:${email}`);
  const telefono = normalizarTelefono(c.telefono);
  if (telefono) claves.push(`t:${telefono}`);
  const cif = normalizarCif(c.cif);
  if (cif) claves.push(`c:${cif}`);
  return claves;
}

/**
 * Reparte los leads entrantes. Excluido (ya era cliente de la marca, por
 * email, teléfono o CIF) pesa más que duplicado. Los duplicados se buscan solo
 * por email y teléfono, que son los índices únicos de la tabla; también cuentan
 * las repeticiones dentro del propio lote.
 */
export function clasificarLeads<T extends Contacto>(
  entrantes: T[],
  existentes: Contacto[],
  exclusiones: Contacto[],
): { nuevos: T[]; duplicados: T[]; excluidos: T[] } {
  const excluidas = new Set(exclusiones.flatMap(clavesContacto));
  const vistas = new Set(existentes.flatMap((c) => clavesContacto({ email: c.email, telefono: c.telefono })));
  const out = { nuevos: [] as T[], duplicados: [] as T[], excluidos: [] as T[] };

  for (const lead of entrantes) {
    if (clavesContacto(lead).some((k) => excluidas.has(k))) {
      out.excluidos.push(lead);
      continue;
    }
    const claves = clavesContacto({ email: lead.email, telefono: lead.telefono });
    if (claves.some((k) => vistas.has(k))) {
      out.duplicados.push(lead);
      continue;
    }
    claves.forEach((k) => vistas.add(k));
    out.nuevos.push(lead);
  }
  return out;
}
```

- [ ] **Step 4: Implement `anuncios.ts`**

`src/lib/ventas/anuncios.ts`:

```ts
/**
 * Convierte el cuerpo del webhook de anuncios (Zapier con Meta Lead Ads, o el
 * formulario de una landing) en un lead. Acepta los nombres de campo de Meta
 * y los nuestros en español, para no depender de cómo se configure el Zap.
 */

import { normalizarTelefono, parseTipoNegocio } from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

export function leadDesdeAnuncio(
  datos: Record<string, unknown>,
):
  | { ok: true; lead: LeadNuevo; campana: string }
  | { ok: false; error: "falta_negocio" | "falta_contacto" | "email_invalido" } {
  const texto = (...claves: string[]): string => {
    for (const clave of claves) {
      const valor = datos[clave];
      if (typeof valor === "string" && valor.trim()) return valor.trim();
      if (typeof valor === "number") return String(valor);
    }
    return "";
  };

  const contacto = texto("contacto", "full_name", "nombre", "name");
  const negocio = texto("negocio", "empresa", "company_name", "business_name") || contacto;
  const telefono = texto("telefono", "phone_number", "phone", "movil");
  const email = texto("email", "correo");

  if (!negocio) return { ok: false, error: "falta_negocio" };
  if (!normalizarTelefono(telefono) && !email) return { ok: false, error: "falta_contacto" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "email_invalido" };

  return {
    ok: true,
    campana: texto("campana", "campaign_name", "campaign"),
    lead: {
      negocio,
      contacto,
      telefono,
      email,
      ciudad: texto("ciudad", "city"),
      cif: texto("cif", "nif"),
      web: texto("web", "website"),
      tipo_negocio: parseTipoNegocio(texto("tipo_negocio", "tipo", "sector")),
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ventas-leads-csv.test.ts src/lib/__tests__/ventas-anuncios.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ventas/leads-csv.ts src/lib/ventas/anuncios.ts src/lib/__tests__/ventas-leads-csv.test.ts src/lib/__tests__/ventas-anuncios.test.ts
git commit -m "feat(ventas): CSV de listas, clasificación de leads y lead desde anuncio"
```

---
### Task 4: Validación de formularios

Esquemas zod y lectores de `FormData` para todo lo que se escribe desde el panel. Puros y testeables.

**Files:**
- Create: `src/lib/ventas/validacion.ts`
- Create: `src/lib/ventas/resultado.ts`
- Test: `src/lib/__tests__/ventas-validacion.test.ts`

**Interfaces:**
- Consumes: Task 2 (`ROLES`, `TIPOS_NEGOCIO`, `RESULTADOS_LLAMADA`, `FASES`, `ESTADOS_MARCA`, `normalizarTelefono`, `normalizarEmail`, `normalizarCif`, tipos), Task 3 (`EMAIL_RE`, `LeadNuevo`).
- Produces:
  - `resultado.ts`: `type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string }`
  - `type Leido<T> = { ok: true; datos: T } | { ok: false; error: string }`
  - `eurosACentimos(raw: string): number | null`
  - `interface NuevaUsuaria { nombre: string; email: string; password: string; rol: Rol }` + `leerNuevaUsuaria(fd: FormData): Leido<NuevaUsuaria>`
  - `leerPassword(raw: string): Leido<string>`
  - `interface NuevaMarca { nombre: string; slug: string }` + `leerNuevaMarca(fd: FormData): Leido<NuevaMarca>`
  - `interface Condiciones { estado: EstadoMarca; fecha_inicio: string | null; cuota_mensual_cts: number; comision_pct: number; plazo_meses: number | null; pago_por_cliente_cts: number; skus_b2b: string[] }` + `leerCondiciones(fd: FormData): Leido<Condiciones>`
  - `interface NuevaExclusion { nombre: string; email: string; telefono: string; cif: string }` + `leerExclusion(fd: FormData): Leido<NuevaExclusion>`
  - `leerDatosLead(fd: FormData): Leido<LeadNuevo>`
  - `interface Llamada { resultado: ResultadoLlamada; nota: string; proximo_seguimiento: string | null }` + `leerLlamada(fd: FormData): Leido<Llamada>`
  - `interface NotaSeguimiento { nota: string; proximo_seguimiento: string | null }` + `leerNotaSeguimiento(fd: FormData): Leido<NotaSeguimiento>`
  - `interface CambioFase { fase: Fase; nota: string }` + `leerCambioFase(fd: FormData): Leido<CambioFase>`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-validacion.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  eurosACentimos,
  leerNuevaUsuaria,
  leerPassword,
  leerNuevaMarca,
  leerCondiciones,
  leerExclusion,
  leerDatosLead,
  leerLlamada,
  leerNotaSeguimiento,
  leerCambioFase,
} from "../ventas/validacion";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("eurosACentimos", () => {
  test("acepta formato español y con símbolo", () => {
    expect(eurosACentimos("1.234,56")).toBe(123456);
    expect(eurosACentimos("12,5 €")).toBe(1250);
    expect(eurosACentimos("12.5")).toBe(1250);
    expect(eurosACentimos("")).toBe(0);
  });

  test("devuelve null si no es un número", () => {
    expect(eurosACentimos("doce")).toBeNull();
  });
});

describe("leerNuevaUsuaria", () => {
  test("normaliza el email y valida contraseña y rol", () => {
    const ok = leerNuevaUsuaria(fd({ nombre: "Paula", email: " Paula@Dinkbit.com ", password: "1234567890", rol: "comercial" }));
    expect(ok).toEqual({ ok: true, datos: { nombre: "Paula", email: "paula@dinkbit.com", password: "1234567890", rol: "comercial" } });
    expect(leerNuevaUsuaria(fd({ nombre: "Paula", email: "x@y.es", password: "corta", rol: "comercial" }))).toMatchObject({ ok: false });
    expect(leerNuevaUsuaria(fd({ nombre: "Paula", email: "x@y.es", password: "1234567890", rol: "jefa" }))).toMatchObject({ ok: false });
  });

  test("leerPassword exige 10 caracteres", () => {
    expect(leerPassword("123")).toMatchObject({ ok: false });
    expect(leerPassword("1234567890")).toEqual({ ok: true, datos: "1234567890" });
  });
});

describe("leerNuevaMarca", () => {
  test("genera el slug desde el nombre si viene vacío", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hydrup", slug: "" }))).toEqual({ ok: true, datos: { nombre: "Hydrup", slug: "hydrup" } });
  });

  test("rechaza slugs con mayúsculas o espacios", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hydrup", slug: "Hy drup" }))).toMatchObject({ ok: false });
  });

  test("rechaza los identificadores que ya son rutas del panel", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hoy", slug: "" }))).toEqual({ ok: false, error: "Ese identificador está reservado: elige otro." });
    expect(leerNuevaMarca(fd({ nombre: "X", slug: "usuarias" }))).toMatchObject({ ok: false });
  });
});

describe("leerCondiciones", () => {
  test("condiciones de Hydrup: 4 % para siempre, sin cuota", () => {
    const r = leerCondiciones(
      fd({ estado: "activa", fecha_inicio: "2026-09-17", cuota_mensual: "", comision_pct: "4", plazo_meses: "", pago_por_cliente: "0", skus_b2b: "PACK-MUESTRAS\nPACK-24, PACK-48" }),
    );
    expect(r).toEqual({
      ok: true,
      datos: {
        estado: "activa",
        fecha_inicio: "2026-09-17",
        cuota_mensual_cts: 0,
        comision_pct: 4,
        plazo_meses: null,
        pago_por_cliente_cts: 0,
        skus_b2b: ["PACK-MUESTRAS", "PACK-24", "PACK-48"],
      },
    });
  });

  test("acepta la coma decimal en el porcentaje y rechaza más de 100", () => {
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4,5" }))).toMatchObject({ ok: true, datos: { comision_pct: 4.5 } });
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "120" }))).toMatchObject({ ok: false });
  });

  test("plazo en meses debe ser entero positivo", () => {
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4", plazo_meses: "0" }))).toMatchObject({ ok: false });
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4", plazo_meses: "12" }))).toMatchObject({ ok: true, datos: { plazo_meses: 12 } });
  });
});

describe("leerExclusion", () => {
  test("pide al menos email, teléfono o CIF", () => {
    expect(leerExclusion(fd({ nombre: "Gym antiguo" }))).toMatchObject({ ok: false });
    expect(leerExclusion(fd({ nombre: "Gym antiguo", cif: "B123" }))).toMatchObject({ ok: true });
  });
});

describe("leerDatosLead", () => {
  test("acepta un lead con teléfono y tipo", () => {
    const r = leerDatosLead(fd({ negocio: "Gym Sol", tipo_negocio: "gimnasio", telefono: "600111222" }));
    expect(r).toEqual({
      ok: true,
      datos: { negocio: "Gym Sol", tipo_negocio: "gimnasio", contacto: "", telefono: "600111222", email: "", ciudad: "", cif: "", web: "" },
    });
  });

  test("tipo vacío es null; sin teléfono ni email es error", () => {
    expect(leerDatosLead(fd({ negocio: "Gym", tipo_negocio: "", email: "a@b.es" }))).toMatchObject({ ok: true, datos: { tipo_negocio: null } });
    expect(leerDatosLead(fd({ negocio: "Gym" }))).toEqual({ ok: false, error: "Hace falta teléfono o email." });
  });
});

describe("leerLlamada y compañía", () => {
  test("llamada con seguimiento", () => {
    expect(leerLlamada(fd({ resultado: "volver_a_llamar", nota: " Llamar tarde ", proximo_seguimiento: "2026-09-20" }))).toEqual({
      ok: true,
      datos: { resultado: "volver_a_llamar", nota: "Llamar tarde", proximo_seguimiento: "2026-09-20" },
    });
  });

  test("sin resultado es error; fecha vacía es null", () => {
    expect(leerLlamada(fd({ resultado: "" }))).toMatchObject({ ok: false });
    expect(leerLlamada(fd({ resultado: "no_contesta", proximo_seguimiento: "" }))).toMatchObject({ ok: true, datos: { proximo_seguimiento: null } });
  });

  test("nota y cambio de fase", () => {
    expect(leerNotaSeguimiento(fd({ nota: "Hola", proximo_seguimiento: "" }))).toEqual({ ok: true, datos: { nota: "Hola", proximo_seguimiento: null } });
    expect(leerCambioFase(fd({ fase: "perdido", nota: "Cerró el local" }))).toEqual({ ok: true, datos: { fase: "perdido", nota: "Cerró el local" } });
    expect(leerCambioFase(fd({ fase: "otra" }))).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-validacion.test.ts`
Expected: FAIL — no se resuelve `../ventas/validacion`.

- [ ] **Step 3: Implement**

`src/lib/ventas/resultado.ts`:

```ts
/** Respuesta de las server actions del módulo de ventas. Vive fuera de los
 *  ficheros "use server", que solo pueden exportar funciones asíncronas. */
export type ResultadoAccion = { ok: true; mensaje?: string } | { ok: false; error: string };
```

`src/lib/ventas/validacion.ts`:

```ts
/**
 * Validación de lo que llega de los formularios de /panel/ventas. Cada lector
 * recibe el FormData tal cual y devuelve datos limpios o el primer error en
 * español, listo para enseñarlo. Las server actions nunca escriben nada que
 * no haya pasado por aquí.
 */

import { z } from "zod";
import {
  ESTADOS_MARCA,
  FASES,
  RESULTADOS_LLAMADA,
  ROLES,
  TIPOS_NEGOCIO,
  normalizarCif,
  normalizarEmail,
  normalizarTelefono,
  slugify,
  type EstadoMarca,
  type Fase,
  type ResultadoLlamada,
  type Rol,
} from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

export type Leido<T> = { ok: true; datos: T } | { ok: false; error: string };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function campo(fd: FormData, clave: string): string {
  return String(fd.get(clave) ?? "").trim();
}

function leer<T>(schema: z.ZodType<T>, valor: unknown): Leido<T> {
  const r = schema.safeParse(valor);
  return r.success
    ? { ok: true, datos: r.data }
    : { ok: false, error: r.error.issues[0]?.message ?? "Datos no válidos." };
}

/** «1.234,56», «12,5 €» o «12.5» → céntimos. Vacío es 0; basura es null. */
export function eurosACentimos(raw: string): number | null {
  const limpio = raw
    .trim()
    .replace(/[\s€]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!limpio) return 0;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/* Usuarias ------------------------------------------------------------------ */

export interface NuevaUsuaria {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

const passwordSchema = z.string().min(10, "La contraseña necesita al menos 10 caracteres.");

export function leerPassword(raw: string): Leido<string> {
  return leer(passwordSchema, raw);
}

export function leerNuevaUsuaria(fd: FormData): Leido<NuevaUsuaria> {
  return leer(
    z.object({
      nombre: z.string().min(2, "Pon el nombre.").max(60, "Nombre demasiado largo."),
      email: z.string().toLowerCase().pipe(z.email("Email no válido.")),
      password: passwordSchema,
      rol: z.enum(ROLES, { message: "Elige un rol." }),
    }),
    {
      nombre: campo(fd, "nombre"),
      email: campo(fd, "email"),
      password: String(fd.get("password") ?? ""),
      rol: campo(fd, "rol"),
    },
  );
}

/* Marcas -------------------------------------------------------------------- */

export interface NuevaMarca {
  nombre: string;
  slug: string;
}

/** Rutas fijas de /panel/ventas: una marca con ese slug quedaría tapada. */
const SLUGS_RESERVADOS = ["hoy", "usuarias", "login"];

export function leerNuevaMarca(fd: FormData): Leido<NuevaMarca> {
  const nombre = campo(fd, "nombre");
  const slug = campo(fd, "slug") || slugify(nombre);
  if (SLUGS_RESERVADOS.includes(slug)) return { ok: false, error: "Ese identificador está reservado: elige otro." };
  return leer(
    z.object({
      nombre: z.string().min(2, "Pon el nombre de la marca.").max(80, "Nombre demasiado largo."),
      slug: z
        .string()
        .max(40, "Identificador demasiado largo.")
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El identificador solo admite minúsculas, números y guiones."),
    }),
    { nombre, slug },
  );
}

export interface Condiciones {
  estado: EstadoMarca;
  fecha_inicio: string | null;
  cuota_mensual_cts: number;
  comision_pct: number;
  plazo_meses: number | null;
  pago_por_cliente_cts: number;
  skus_b2b: string[];
}

export function leerCondiciones(fd: FormData): Leido<Condiciones> {
  const cuota = eurosACentimos(campo(fd, "cuota_mensual"));
  const pago = eurosACentimos(campo(fd, "pago_por_cliente"));
  if (cuota === null || pago === null) return { ok: false, error: "Importe no válido." };
  const plazo = campo(fd, "plazo_meses");
  return leer(
    z.object({
      estado: z.enum(ESTADOS_MARCA, { message: "Estado no válido." }),
      fecha_inicio: z.string().regex(FECHA_RE, "Fecha de inicio no válida.").nullable(),
      cuota_mensual_cts: z.number().int().min(0, "La cuota no puede ser negativa."),
      comision_pct: z
        .number({ message: "Porcentaje no válido." })
        .min(0, "El porcentaje no puede ser negativo.")
        .max(100, "El porcentaje no puede pasar de 100."),
      plazo_meses: z
        .number({ message: "Plazo no válido." })
        .int("El plazo va en meses enteros.")
        .positive("El plazo debe ser de al menos un mes (vacío = para siempre).")
        .nullable(),
      pago_por_cliente_cts: z.number().int().min(0, "El pago por cliente no puede ser negativo."),
      skus_b2b: z.array(z.string().min(1).max(80, "SKU demasiado largo.")).max(200, "Demasiados SKU."),
    }),
    {
      estado: campo(fd, "estado"),
      fecha_inicio: campo(fd, "fecha_inicio") || null,
      cuota_mensual_cts: cuota,
      comision_pct: Number(campo(fd, "comision_pct").replace(",", ".") || "0"),
      plazo_meses: plazo ? Number(plazo) : null,
      pago_por_cliente_cts: pago,
      skus_b2b: campo(fd, "skus_b2b")
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
  );
}

export interface NuevaExclusion {
  nombre: string;
  email: string;
  telefono: string;
  cif: string;
}

export function leerExclusion(fd: FormData): Leido<NuevaExclusion> {
  const datos = {
    nombre: campo(fd, "nombre"),
    email: campo(fd, "email"),
    telefono: campo(fd, "telefono"),
    cif: campo(fd, "cif"),
  };
  if (!normalizarEmail(datos.email) && !normalizarTelefono(datos.telefono) && !normalizarCif(datos.cif)) {
    return { ok: false, error: "Indica al menos email, teléfono o CIF." };
  }
  if (datos.email && !EMAIL_RE.test(datos.email)) return { ok: false, error: "Email no válido." };
  return { ok: true, datos };
}

/* Leads --------------------------------------------------------------------- */

export function leerDatosLead(fd: FormData): Leido<LeadNuevo> {
  const tipo = campo(fd, "tipo_negocio");
  const r = leer(
    z.object({
      negocio: z.string().min(1, "Falta el nombre del negocio.").max(120, "Nombre demasiado largo."),
      tipo_negocio: z.enum(TIPOS_NEGOCIO, { message: "Tipo de negocio no válido." }).nullable(),
      contacto: z.string().max(120),
      telefono: z.string().max(40),
      email: z.string().max(120).refine((v) => !v || EMAIL_RE.test(v), "Email no válido."),
      ciudad: z.string().max(80),
      cif: z.string().max(20),
      web: z.string().max(200),
    }),
    {
      negocio: campo(fd, "negocio"),
      tipo_negocio: tipo || null,
      contacto: campo(fd, "contacto"),
      telefono: campo(fd, "telefono"),
      email: campo(fd, "email"),
      ciudad: campo(fd, "ciudad"),
      cif: campo(fd, "cif"),
      web: campo(fd, "web"),
    },
  );
  if (r.ok && !normalizarTelefono(r.datos.telefono) && !r.datos.email) {
    return { ok: false, error: "Hace falta teléfono o email." };
  }
  return r;
}

const proximoSchema = z.string().regex(FECHA_RE, "Fecha de seguimiento no válida.").nullable();
const notaSchema = z.string().max(2000, "La nota es demasiado larga.");

export interface Llamada {
  resultado: ResultadoLlamada;
  nota: string;
  proximo_seguimiento: string | null;
}

export function leerLlamada(fd: FormData): Leido<Llamada> {
  return leer(
    z.object({
      resultado: z.enum(RESULTADOS_LLAMADA, { message: "Elige el resultado de la llamada." }),
      nota: notaSchema,
      proximo_seguimiento: proximoSchema,
    }),
    {
      resultado: campo(fd, "resultado"),
      nota: campo(fd, "nota"),
      proximo_seguimiento: campo(fd, "proximo_seguimiento") || null,
    },
  );
}

export interface NotaSeguimiento {
  nota: string;
  proximo_seguimiento: string | null;
}

export function leerNotaSeguimiento(fd: FormData): Leido<NotaSeguimiento> {
  return leer(z.object({ nota: notaSchema, proximo_seguimiento: proximoSchema }), {
    nota: campo(fd, "nota"),
    proximo_seguimiento: campo(fd, "proximo_seguimiento") || null,
  });
}

export interface CambioFase {
  fase: Fase;
  nota: string;
}

export function leerCambioFase(fd: FormData): Leido<CambioFase> {
  return leer(z.object({ fase: z.enum(FASES, { message: "Fase no válida." }), nota: notaSchema }), {
    fase: campo(fd, "fase"),
    nota: campo(fd, "nota"),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-validacion.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio. Si zod 4 rechaza alguna firma (`z.enum(..., { message })`, `z.email(msg)`), consultar la documentación de zod 4 con context7 y ajustar sin cambiar los mensajes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/validacion.ts src/lib/ventas/resultado.ts src/lib/__tests__/ventas-validacion.test.ts
git commit -m "feat(ventas): validación de formularios del panel de ventas"
```

---
### Task 5: Métricas, fechas de Madrid e historial legible

Embudo, resumen del mes, seguimientos de hoy y textos del historial. Puro.

**Files:**
- Create: `src/lib/ventas/metricas.ts`
- Create: `src/lib/ventas/historial.ts`
- Test: `src/lib/__tests__/ventas-metricas.test.ts`
- Test: `src/lib/__tests__/ventas-historial.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Fase`, `esFaseActiva`, `FASE_LABELS`, `RESULTADO_LABELS`, `ORIGEN_LABELS`, `esFase`, tipos).
- Produces:
  - `hoyMadrid(now?: Date): string` (`YYYY-MM-DD`)
  - `mesDe(iso: string): string` (`YYYY-MM` en Madrid)
  - `esMes(v: unknown): v is string`
  - `mesAnterior(mes: string): string`, `mesSiguiente(mes: string): string`
  - `nombreMes(mes: string): string` («septiembre de 2026»)
  - `rangoConsultaMes(mes: string): { desde: string; hasta: string }` (ISO con un día de margen a cada lado)
  - `formatoFecha(fecha: string): string` («20/09/2026»), `formatoFechaHora(iso: string): string` («17/09/2026, 12:30»)
  - `ETAPAS_EMBUDO = ["contactado", "interesado", "muestras", "cliente"] as const`, `type EtapaEmbudo`
  - `interface Embudo { total: number; alcanzaron: Record<EtapaEmbudo, number>; porFase: Record<Fase, number> }`
  - `calcularEmbudo(leads: { id: string; fase: Fase }[], cambios: { lead_id: string; datos: Record<string, unknown> }[]): Embudo`
  - `pctPaso(parte: number, total: number): number | null`
  - `interface ResumenMes { leadsNuevos: number; llamadas: number; interesados: number; muestras: number; seguimientosAtrasados: number }`
  - `resumenMes(mes: string, leads: { created_at: string; fase: Fase; proximo_seguimiento: string | null }[], actividad: { tipo: string; datos: Record<string, unknown>; created_at: string }[], hoy: string): ResumenMes`
  - `agruparSeguimientos<T extends { proximo_seguimiento: string | null }>(leads: T[], hoy: string): { atrasados: T[]; hoy: T[] }`
  - `historial.ts`: `describirActividad(a: { tipo: string; resultado: string | null; nota: string | null; datos: Record<string, unknown>; usuaria_id: string | null }, nombres: Record<string, string>): { titulo: string; detalle: string | null; autora: string }`

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/ventas-metricas.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  hoyMadrid,
  mesDe,
  esMes,
  mesAnterior,
  mesSiguiente,
  nombreMes,
  rangoConsultaMes,
  formatoFecha,
  calcularEmbudo,
  pctPaso,
  resumenMes,
  agruparSeguimientos,
} from "../ventas/metricas";

describe("fechas en hora de Madrid", () => {
  test("a las 23:30 UTC del 30 de septiembre en Madrid ya es 1 de octubre", () => {
    expect(hoyMadrid(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(mesDe("2026-09-30T23:30:00Z")).toBe("2026-10");
  });

  test("navegación y validación de meses", () => {
    expect(esMes("2026-09")).toBe(true);
    expect(esMes("2026-13")).toBe(false);
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(nombreMes("2026-09")).toBe("septiembre de 2026");
  });

  test("el rango de consulta cubre el mes con un día de margen", () => {
    expect(rangoConsultaMes("2026-09")).toEqual({
      desde: "2026-08-31T00:00:00.000Z",
      hasta: "2026-10-02T00:00:00.000Z",
    });
  });

  test("formato de fecha corto", () => {
    expect(formatoFecha("2026-09-20")).toBe("20/09/2026");
  });
});

describe("calcularEmbudo", () => {
  test("cuenta a cada lead en todas las etapas que alcanzó, aunque luego se cerrara", () => {
    const leads = [
      { id: "a", fase: "nuevo" as const },
      { id: "b", fase: "interesado" as const },
      { id: "c", fase: "no_interesa" as const },
      { id: "d", fase: "muestras" as const },
    ];
    const cambios = [{ lead_id: "c", datos: { fase_anterior: "muestras", fase_nueva: "no_interesa" } }, { lead_id: "c", datos: { fase_nueva: "muestras" } }];
    const e = calcularEmbudo(leads, cambios);
    expect(e.total).toBe(4);
    expect(e.alcanzaron).toEqual({ contactado: 3, interesado: 3, muestras: 2, cliente: 0 });
    expect(e.porFase.no_interesa).toBe(1);
  });

  test("un lead cerrado sin historial cuenta al menos como contactado", () => {
    const e = calcularEmbudo([{ id: "x", fase: "ilocalizable" }], []);
    expect(e.alcanzaron.contactado).toBe(1);
    expect(e.alcanzaron.interesado).toBe(0);
  });

  test("pctPaso", () => {
    expect(pctPaso(1, 4)).toBe(25);
    expect(pctPaso(0, 0)).toBeNull();
  });
});

describe("resumenMes", () => {
  test("cuenta lo del mes y los seguimientos atrasados de fases activas", () => {
    const leads = [
      { created_at: "2026-09-02T10:00:00Z", fase: "contactado" as const, proximo_seguimiento: "2026-09-10" },
      { created_at: "2026-08-20T10:00:00Z", fase: "no_interesa" as const, proximo_seguimiento: "2026-09-01" },
      { created_at: "2026-09-15T10:00:00Z", fase: "nuevo" as const, proximo_seguimiento: "2026-09-17" },
    ];
    const actividad = [
      { tipo: "llamada", datos: {}, created_at: "2026-09-05T09:00:00Z" },
      { tipo: "llamada", datos: {}, created_at: "2026-08-31T09:00:00Z" },
      { tipo: "cambio_fase", datos: { fase_nueva: "interesado" }, created_at: "2026-09-06T09:00:00Z" },
      { tipo: "muestras_enviadas", datos: {}, created_at: "2026-09-07T09:00:00Z" },
    ];
    expect(resumenMes("2026-09", leads, actividad, "2026-09-17")).toEqual({
      leadsNuevos: 2,
      llamadas: 1,
      interesados: 1,
      muestras: 1,
      seguimientosAtrasados: 1,
    });
  });
});

describe("agruparSeguimientos", () => {
  test("separa atrasados (ordenados) de los de hoy e ignora futuros", () => {
    const r = agruparSeguimientos(
      [
        { id: 1, proximo_seguimiento: "2026-09-17" },
        { id: 2, proximo_seguimiento: "2026-09-15" },
        { id: 3, proximo_seguimiento: "2026-09-10" },
        { id: 4, proximo_seguimiento: "2026-09-20" },
        { id: 5, proximo_seguimiento: null },
      ],
      "2026-09-17",
    );
    expect(r.atrasados.map((l) => l.id)).toEqual([3, 2]);
    expect(r.hoy.map((l) => l.id)).toEqual([1]);
  });
});
```

`src/lib/__tests__/ventas-historial.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { describirActividad } from "../ventas/historial";

const nombres = { u1: "Paula" };
const base = { resultado: null, nota: null, datos: {}, usuaria_id: "u1" };

describe("describirActividad", () => {
  test("llamada con resultado, nota y seguimiento", () => {
    expect(
      describirActividad(
        { ...base, tipo: "llamada", resultado: "volver_a_llamar", nota: "Mejor por la tarde", datos: { proximo_seguimiento: "2026-09-20" } },
        nombres,
      ),
    ).toEqual({ titulo: "Llamada · Volver a llamar", detalle: "Mejor por la tarde · Próximo seguimiento: 20/09/2026", autora: "Paula" });
  });

  test("cambio de fase", () => {
    expect(describirActividad({ ...base, tipo: "cambio_fase", datos: { fase_anterior: "nuevo", fase_nueva: "interesado" } }, nombres).titulo).toBe(
      "Fase: Nuevo → Interesado",
    );
  });

  test("lead creado por el sistema desde un anuncio", () => {
    expect(
      describirActividad({ ...base, usuaria_id: null, tipo: "lead_creado", datos: { origen: "anuncio", origen_detalle: "Muestras gimnasios" } }, nombres),
    ).toEqual({ titulo: "Lead creado · Anuncio (Muestras gimnasios)", detalle: null, autora: "Sistema" });
  });

  test("usuaria desconocida y seguimiento borrado", () => {
    const d = describirActividad({ ...base, usuaria_id: "otra", tipo: "muestras_enviadas", datos: { proximo_seguimiento: null } }, nombres);
    expect(d).toEqual({ titulo: "Muestras enviadas", detalle: "Sin seguimiento pendiente", autora: "Usuaria eliminada" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/ventas-metricas.test.ts src/lib/__tests__/ventas-historial.test.ts`
Expected: FAIL — módulos no encontrados.

- [ ] **Step 3: Implement `metricas.ts`**

`src/lib/ventas/metricas.ts`:

```ts
/**
 * Cálculos de los paneles de ventas. Puro: recibe filas ya leídas y devuelve
 * números, así se prueba sin base de datos. Los meses y «hoy» se cuentan en
 * hora de Madrid, que es donde trabajan las comerciales.
 */

import { FASES, esFase, esFaseActiva, type Fase } from "./dominio";

const ZONA = "Europe/Madrid";

function fechaMadrid(d: Date): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function hoyMadrid(now: Date = new Date()): string {
  return fechaMadrid(now);
}

export function mesDe(iso: string): string {
  return fechaMadrid(new Date(iso)).slice(0, 7);
}

export function esMes(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

function desplazarMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function mesAnterior(mes: string): string {
  return desplazarMes(mes, -1);
}

export function mesSiguiente(mes: string): string {
  return desplazarMes(mes, 1);
}

export function nombreMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

/** Rango UTC holgado para pedir a la base la actividad de un mes; el filtro
 *  exacto (hora de Madrid) se hace después con `mesDe`. */
export function rangoConsultaMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const DIA = 86_400_000;
  return {
    desde: new Date(Date.UTC(y, m - 1, 1) - DIA).toISOString(),
    hasta: new Date(Date.UTC(y, m, 1) + DIA).toISOString(),
  };
}

/** «2026-09-20» → «20/09/2026». Para columnas `date`, sin zona horaria. */
export function formatoFecha(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* Embudo -------------------------------------------------------------------- */

export const ETAPAS_EMBUDO = ["contactado", "interesado", "muestras", "cliente"] as const;
export type EtapaEmbudo = (typeof ETAPAS_EMBUDO)[number];

/** Hasta dónde llega cada fase en el embudo. Las fases cerradas cuentan como
 *  «contactado»: para cerrar un lead alguien tuvo que hablar (o intentarlo). */
const RANGO: Record<Fase, number> = {
  nuevo: 0,
  contactado: 1,
  perdido: 1,
  no_interesa: 1,
  ilocalizable: 1,
  interesado: 2,
  muestras: 3,
  cliente: 4,
};
const RANGO_ETAPA: Record<EtapaEmbudo, number> = { contactado: 1, interesado: 2, muestras: 3, cliente: 4 };

export interface Embudo {
  total: number;
  alcanzaron: Record<EtapaEmbudo, number>;
  porFase: Record<Fase, number>;
}

/**
 * Cuántos leads llegaron alguna vez a cada etapa. Se mira la fase actual y
 * todas las fases por las que pasó (entradas `cambio_fase` del historial):
 * alguien que recibió muestras y luego dijo que no sigue contando en «muestras».
 */
export function calcularEmbudo(
  leads: { id: string; fase: Fase }[],
  cambios: { lead_id: string; datos: Record<string, unknown> }[],
): Embudo {
  const maximo = new Map<string, number>();
  const porFase = Object.fromEntries(FASES.map((f) => [f, 0])) as Record<Fase, number>;
  for (const lead of leads) {
    maximo.set(lead.id, RANGO[lead.fase]);
    porFase[lead.fase]++;
  }
  for (const cambio of cambios) {
    const fase = cambio.datos?.fase_nueva;
    const actual = maximo.get(cambio.lead_id);
    if (actual !== undefined && esFase(fase)) maximo.set(cambio.lead_id, Math.max(actual, RANGO[fase]));
  }
  const alcanzaron = { contactado: 0, interesado: 0, muestras: 0, cliente: 0 };
  for (const rango of maximo.values()) {
    for (const etapa of ETAPAS_EMBUDO) if (rango >= RANGO_ETAPA[etapa]) alcanzaron[etapa]++;
  }
  return { total: leads.length, alcanzaron, porFase };
}

export function pctPaso(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

/* Resumen del mes --------------------------------------------------------- */

export interface ResumenMes {
  leadsNuevos: number;
  llamadas: number;
  interesados: number;
  muestras: number;
  seguimientosAtrasados: number;
}

export function resumenMes(
  mes: string,
  leads: { created_at: string; fase: Fase; proximo_seguimiento: string | null }[],
  actividad: { tipo: string; datos: Record<string, unknown>; created_at: string }[],
  hoy: string,
): ResumenMes {
  const delMes = actividad.filter((a) => mesDe(a.created_at) === mes);
  return {
    leadsNuevos: leads.filter((l) => mesDe(l.created_at) === mes).length,
    llamadas: delMes.filter((a) => a.tipo === "llamada").length,
    interesados: delMes.filter((a) => a.tipo === "cambio_fase" && a.datos?.fase_nueva === "interesado").length,
    muestras: delMes.filter((a) => a.tipo === "muestras_enviadas").length,
    seguimientosAtrasados: leads.filter(
      (l) => esFaseActiva(l.fase) && l.proximo_seguimiento !== null && l.proximo_seguimiento < hoy,
    ).length,
  };
}

export function agruparSeguimientos<T extends { proximo_seguimiento: string | null }>(
  leads: T[],
  hoy: string,
): { atrasados: T[]; hoy: T[] } {
  const conFecha = leads.filter((l): l is T & { proximo_seguimiento: string } => l.proximo_seguimiento !== null);
  return {
    atrasados: conFecha
      .filter((l) => l.proximo_seguimiento < hoy)
      .sort((a, b) => a.proximo_seguimiento.localeCompare(b.proximo_seguimiento)),
    hoy: conFecha.filter((l) => l.proximo_seguimiento === hoy),
  };
}
```

- [ ] **Step 4: Implement `historial.ts`**

`src/lib/ventas/historial.ts`:

```ts
/** Texto legible de cada entrada del historial de un lead. Puro. */

import { FASE_LABELS, ORIGEN_LABELS, RESULTADO_LABELS, esFase, type Origen, type ResultadoLlamada } from "./dominio";
import { formatoFecha } from "./metricas";

export function describirActividad(
  a: {
    tipo: string;
    resultado: string | null;
    nota: string | null;
    datos: Record<string, unknown>;
    usuaria_id: string | null;
  },
  nombres: Record<string, string>,
): { titulo: string; detalle: string | null; autora: string } {
  const autora = a.usuaria_id === null ? "Sistema" : (nombres[a.usuaria_id] ?? "Usuaria eliminada");
  const datos = a.datos ?? {};

  let titulo: string;
  switch (a.tipo) {
    case "llamada":
      titulo = `Llamada · ${RESULTADO_LABELS[a.resultado as ResultadoLlamada] ?? "sin resultado"}`;
      break;
    case "nota":
      titulo = "Nota";
      break;
    case "muestras_enviadas":
      titulo = "Muestras enviadas";
      break;
    case "pedido_vinculado":
      titulo = "Pedido vinculado";
      break;
    case "cambio_fase": {
      const antes = esFase(datos.fase_anterior) ? FASE_LABELS[datos.fase_anterior] : "—";
      const despues = esFase(datos.fase_nueva) ? FASE_LABELS[datos.fase_nueva] : "—";
      titulo = `Fase: ${antes} → ${despues}`;
      break;
    }
    case "lead_creado": {
      const origen = ORIGEN_LABELS[datos.origen as Origen] ?? "Origen desconocido";
      const detalleOrigen = typeof datos.origen_detalle === "string" && datos.origen_detalle ? ` (${datos.origen_detalle})` : "";
      titulo = `Lead creado · ${origen}${detalleOrigen}`;
      break;
    }
    default:
      titulo = a.tipo;
  }

  const partes: string[] = [];
  if (a.nota) partes.push(a.nota);
  if ("proximo_seguimiento" in datos) {
    const proximo = datos.proximo_seguimiento;
    partes.push(typeof proximo === "string" && proximo ? `Próximo seguimiento: ${formatoFecha(proximo)}` : "Sin seguimiento pendiente");
  }

  return { titulo, detalle: partes.length > 0 ? partes.join(" · ") : null, autora };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ventas-metricas.test.ts src/lib/__tests__/ventas-historial.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ventas/metricas.ts src/lib/ventas/historial.ts src/lib/__tests__/ventas-metricas.test.ts src/lib/__tests__/ventas-historial.test.ts
git commit -m "feat(ventas): embudo, resumen del mes y textos del historial"
```

---
### Task 6: Capa de datos

Todas las lecturas y escrituras de `ventas_*` en un único módulo servidor. Las lecturas lanzan si Supabase falla (un panel vacío por error engañaría al cobrar); las escrituras devuelven `{ ok, error }`.

**Files:**
- Create: `src/lib/ventas/db.ts`
- Test: `src/lib/__tests__/ventas-db.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin(): SupabaseClient | null` de `src/lib/supabase-admin.ts`; Task 2 tipos y normalizadores; Task 3 `Contacto`, `LeadNuevo`; Task 4 `Condiciones`, `NuevaExclusion`, `NuevaUsuaria`.
- Produces (tipos):
  - `interface Usuaria { id: string; nombre: string; email: string; rol: Rol; activa: boolean; created_at: string }`
  - `interface Marca { id: string; nombre: string; slug: string; estado: EstadoMarca; fecha_inicio: string | null; cuota_mensual_cts: number; comision_pct: number; plazo_meses: number | null; pago_por_cliente_cts: number; skus_b2b: string[]; webhook_secret: string; created_at: string }`
  - `interface Exclusion { id: string; marca_id: string; nombre: string | null; email: string | null; telefono: string | null; cif: string | null; created_at: string }`
  - `interface Lead { id: string; marca_id: string; negocio: string; tipo_negocio: TipoNegocio | null; contacto: string | null; telefono: string | null; email: string | null; ciudad: string | null; cif: string | null; web: string | null; origen: Origen; origen_detalle: string | null; fase: Fase; asignada_a: string | null; proximo_seguimiento: string | null; codigo_cliente: string; excluido: boolean; created_by: string | null; created_at: string; updated_at: string }`
  - `interface Actividad { id: string; lead_id: string; marca_id: string; usuaria_id: string | null; tipo: TipoActividad; resultado: ResultadoLlamada | null; nota: string | null; datos: Record<string, unknown>; created_at: string }`
  - `type LeadConMarca = Lead & { marca: { nombre: string; slug: string } | null }`
  - `type Escritura = { ok: true } | { ok: false; error: string }`
- Produces (funciones):
  - Usuarias: `getUsuaria(id: string): Promise<Usuaria | null>`, `listUsuarias(): Promise<Usuaria[]>`, `crearUsuariaCompleta(u: NuevaUsuaria): Promise<{ ok: true; id: string } | { ok: false; error: string }>`, `setUsuariaActiva(id: string, activa: boolean): Promise<Escritura>`, `setPasswordUsuaria(id: string, password: string): Promise<Escritura>`
  - Marcas: `listMarcas(): Promise<Marca[]>`, `getMarcaPorSlug(slug: string): Promise<Marca | null>`, `crearMarca(m: { nombre: string; slug: string }): Promise<{ ok: true; marca: Marca } | { ok: false; error: string }>`, `actualizarCondiciones(id: string, c: Condiciones): Promise<Escritura>`, `regenerarSecretoWebhook(id: string): Promise<Escritura>`
  - Exclusiones: `listExclusiones(marcaId: string): Promise<Exclusion[]>`, `crearExclusion(marcaId: string, e: NuevaExclusion, usuariaId: string): Promise<Escritura>`, `borrarExclusion(id: string, marcaId: string): Promise<Escritura>`
  - Leads: `listLeads(marcaId: string, filtro?: { fase?: Fase; asignadaA?: string }): Promise<Lead[]>`, `getLead(id: string): Promise<Lead | null>`, `listContactosLeads(marcaId: string): Promise<Contacto[]>`, `buscarLeadPorContacto(marcaId: string, c: Contacto): Promise<Lead | null>`, `actualizarDatosLead(id: string, d: LeadNuevo): Promise<Escritura>`, `asignarLead(id: string, usuariaId: string | null): Promise<Escritura>`
  - RPC: `crearLeads(input: { marcaId: string; usuariaId: string | null; origen: Origen; origenDetalle: string | null; leads: Array<LeadNuevo & { excluido: boolean }> }): Promise<{ ok: true; creados: number } | { ok: false; error: string }>`, `registrarActividad(input: { leadId: string; usuariaId: string | null; tipo: TipoActividad; resultado?: ResultadoLlamada | null; nota?: string | null; faseNueva?: Fase | null; proximoSeguimiento?: string | null }): Promise<Escritura>` (`proximoSeguimiento` ausente = no tocar el seguimiento)
  - Actividad: `listActividadLead(leadId: string): Promise<Actividad[]>`, `listActividadMarca(marcaId: string, desde: string, hasta: string): Promise<Actividad[]>`, `listCambiosFaseMarca(marcaId: string): Promise<{ lead_id: string; datos: Record<string, unknown> }[]>`, `listSeguimientosUsuaria(usuariaId: string, hasta: string): Promise<LeadConMarca[]>`
  - `registrarImportacion(fila: { marca_id: string; tipo: "leads" | "pedidos"; nombre_fichero: string; filas_totales: number; filas_guardadas: number; resumen: Record<string, unknown>; usuaria_id: string }): Promise<void>`

- [ ] **Step 1: Write the failing test**

Se prueban las piezas con lógica propia: el mapeo a las RPC, la paginación y la marcha atrás al crear usuaria. El resto son consultas directas que se verifican en el recorrido de la tarea 16.

`src/lib/__tests__/ventas-db.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { rpcMock, fromMock, authAdmin } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  authAdmin: { createUser: vi.fn(), deleteUser: vi.fn(), updateUserById: vi.fn() },
}));

vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock, from: fromMock, auth: { admin: authAdmin } }),
}));

import { crearLeads, registrarActividad, crearUsuariaCompleta, listLeads } from "../ventas/db";

const LEAD = { negocio: "Gym", tipo_negocio: null, contacto: "", telefono: "600111222", email: "", ciudad: "", cif: "", web: "", excluido: false };

describe("crearLeads", () => {
  beforeEach(() => rpcMock.mockReset());

  test("llama a la RPC con los nombres de parámetro de la migración", async () => {
    rpcMock.mockResolvedValue({ data: 1, error: null });
    const r = await crearLeads({ marcaId: "m1", usuariaId: "u1", origen: "lista", origenDetalle: "Gimnasios", leads: [LEAD] });
    expect(r).toEqual({ ok: true, creados: 1 });
    expect(rpcMock).toHaveBeenCalledWith("ventas_crear_leads", {
      p_marca_id: "m1",
      p_usuaria_id: "u1",
      p_origen: "lista",
      p_origen_detalle: "Gimnasios",
      p_leads: [LEAD],
    });
  });

  test("un error de la RPC no se da por bueno", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await crearLeads({ marcaId: "m1", usuariaId: null, origen: "anuncio", origenDetalle: null, leads: [LEAD] })).toEqual({ ok: false, error: "boom" });
  });
});

describe("registrarActividad", () => {
  beforeEach(() => rpcMock.mockReset().mockResolvedValue({ data: "contactado", error: null }));

  test("sin proximoSeguimiento no toca el seguimiento", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "nota", nota: "Hola" });
    expect(rpcMock).toHaveBeenCalledWith("ventas_registrar_actividad", {
      p_lead_id: "l1",
      p_usuaria_id: "u1",
      p_tipo: "nota",
      p_resultado: null,
      p_nota: "Hola",
      p_fase_nueva: null,
      p_cambiar_seguimiento: false,
      p_proximo_seguimiento: null,
    });
  });

  test("proximoSeguimiento null borra el seguimiento", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "llamada", resultado: "no_interesa", faseNueva: "no_interesa", proximoSeguimiento: null });
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_cambiar_seguimiento: true, p_proximo_seguimiento: null, p_fase_nueva: "no_interesa" });
  });
});

describe("crearUsuariaCompleta", () => {
  beforeEach(() => {
    authAdmin.createUser.mockReset();
    authAdmin.deleteUser.mockReset().mockResolvedValue({ error: null });
    fromMock.mockReset();
  });

  test("si falla el perfil, borra la cuenta de Auth para no dejarla huérfana", async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: "u9" } }, error: null });
    fromMock.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: "dup" } }) });
    const r = await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial" });
    expect(r.ok).toBe(false);
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("u9");
  });

  test("email repetido en Auth da un mensaje claro", async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: null }, error: { message: "A user with this email address has already been registered" } });
    expect(await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial" })).toEqual({
      ok: false,
      error: "Ya existe una cuenta con ese email.",
    });
  });
});

describe("listLeads", () => {
  test("pagina de 1000 en 1000 hasta agotar", async () => {
    const pagina = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
    const range = vi.fn().mockResolvedValueOnce({ data: pagina(1000), error: null }).mockResolvedValueOnce({ data: pagina(3), error: null });
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => ({ range }));
    fromMock.mockReset().mockReturnValue(builder);
    const leads = await listLeads("m1");
    expect(leads).toHaveLength(1003);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-db.test.ts`
Expected: FAIL — no se resuelve `../ventas/db`.

- [ ] **Step 3: Implement**

`src/lib/ventas/db.ts`:

```ts
import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "../supabase-admin";
import {
  FASES_ACTIVAS,
  normalizarEmail,
  normalizarTelefono,
  type EstadoMarca,
  type Fase,
  type Origen,
  type ResultadoLlamada,
  type Rol,
  type TipoActividad,
  type TipoNegocio,
} from "./dominio";
import type { Contacto, LeadNuevo } from "./leads-csv";
import type { Condiciones, NuevaExclusion, NuevaUsuaria } from "./validacion";

/**
 * Acceso a las tablas `ventas_*` con la clave de servicio. Las lecturas lanzan
 * si Supabase falla: un panel que enseña «0 leads» por un error de red
 * engañaría justo en lo que sirve para cobrar. Las escrituras devuelven
 * `{ ok, error }` para enseñar el problema en el formulario.
 */

export interface Usuaria {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activa: boolean;
  created_at: string;
}

export interface Marca {
  id: string;
  nombre: string;
  slug: string;
  estado: EstadoMarca;
  fecha_inicio: string | null;
  cuota_mensual_cts: number;
  comision_pct: number;
  plazo_meses: number | null;
  pago_por_cliente_cts: number;
  skus_b2b: string[];
  webhook_secret: string;
  created_at: string;
}

export interface Exclusion {
  id: string;
  marca_id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  cif: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  marca_id: string;
  negocio: string;
  tipo_negocio: TipoNegocio | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  cif: string | null;
  web: string | null;
  origen: Origen;
  origen_detalle: string | null;
  fase: Fase;
  asignada_a: string | null;
  proximo_seguimiento: string | null;
  codigo_cliente: string;
  excluido: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Actividad {
  id: string;
  lead_id: string;
  marca_id: string;
  usuaria_id: string | null;
  tipo: TipoActividad;
  resultado: ResultadoLlamada | null;
  nota: string | null;
  datos: Record<string, unknown>;
  created_at: string;
}

export type LeadConMarca = Lead & { marca: { nombre: string; slug: string } | null };

export type Escritura = { ok: true } | { ok: false; error: string };

type Respuesta<T> = { data: T | null; error: { message: string; code?: string } | null };

const PAGINA = 1000;

function db() {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return sb;
}

function comprobar<T>(r: Respuesta<T>, contexto: string): T | null {
  if (r.error) throw new Error(`[ventas/db] ${contexto}: ${r.error.message}`);
  return r.data;
}

function escritura(r: { error: { message: string; code?: string } | null }, contexto: string, duplicado?: string): Escritura {
  if (!r.error) return { ok: true };
  console.error(`[ventas/db] ${contexto}:`, r.error.message);
  if (duplicado && r.error.code === "23505") return { ok: false, error: duplicado };
  return { ok: false, error: "No se pudo guardar. Vuelve a intentarlo." };
}

/** Lee todas las filas de una consulta, de PAGINA en PAGINA (PostgREST corta en 1000). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<Respuesta<T[]>>, contexto: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = comprobar(await consulta(desde, desde + PAGINA - 1), contexto) ?? [];
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

function vacioANull(v: string): string | null {
  return v.trim() ? v.trim() : null;
}

/* Usuarias ------------------------------------------------------------------ */

export async function getUsuaria(id: string): Promise<Usuaria | null> {
  const r = await db().from("ventas_usuarias").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Usuaria>, "getUsuaria");
}

export async function listUsuarias(): Promise<Usuaria[]> {
  const r = await db().from("ventas_usuarias").select("*").order("nombre");
  return comprobar(r as Respuesta<Usuaria[]>, "listUsuarias") ?? [];
}

export async function crearUsuariaCompleta(u: NuevaUsuaria): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sb = db();
  const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
  if (error || !data.user) {
    console.error("[ventas/db] crearUsuariaCompleta auth:", error?.message);
    const repetido = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, error: repetido ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta." };
  }
  const perfil = await sb.from("ventas_usuarias").insert({ id: data.user.id, nombre: u.nombre, email: u.email, rol: u.rol });
  if (perfil.error) {
    // Sin perfil la cuenta no sirve para nada: se deshace para poder reintentar.
    await sb.auth.admin.deleteUser(data.user.id);
    console.error("[ventas/db] crearUsuariaCompleta perfil:", perfil.error.message);
    return { ok: false, error: "No se pudo crear el perfil de la usuaria." };
  }
  return { ok: true, id: data.user.id };
}

export async function setUsuariaActiva(id: string, activa: boolean): Promise<Escritura> {
  const sb = db();
  // Además de marcar el perfil, se bloquea la cuenta en Auth: así no puede ni
  // iniciar sesión, no solo quedarse fuera de las pantallas.
  const auth = await sb.auth.admin.updateUserById(id, { ban_duration: activa ? "none" : "876000h" });
  if (auth.error) return escritura(auth, "setUsuariaActiva auth");
  return escritura(await sb.from("ventas_usuarias").update({ activa }).eq("id", id), "setUsuariaActiva");
}

export async function setPasswordUsuaria(id: string, password: string): Promise<Escritura> {
  return escritura(await db().auth.admin.updateUserById(id, { password }), "setPasswordUsuaria");
}

/* Marcas -------------------------------------------------------------------- */

export async function listMarcas(): Promise<Marca[]> {
  const r = await db().from("ventas_marcas").select("*").order("nombre");
  return comprobar(r as Respuesta<Marca[]>, "listMarcas") ?? [];
}

export async function getMarcaPorSlug(slug: string): Promise<Marca | null> {
  const r = await db().from("ventas_marcas").select("*").eq("slug", slug).maybeSingle();
  return comprobar(r as Respuesta<Marca>, "getMarcaPorSlug");
}

export async function crearMarca(m: { nombre: string; slug: string }): Promise<{ ok: true; marca: Marca } | { ok: false; error: string }> {
  const r = await db().from("ventas_marcas").insert({ nombre: m.nombre, slug: m.slug }).select("*").single();
  if (r.error) {
    const e = escritura(r, "crearMarca", "Ya existe una marca con ese identificador.");
    return e.ok ? { ok: false, error: "No se pudo crear la marca." } : e;
  }
  return { ok: true, marca: r.data as Marca };
}

export async function actualizarCondiciones(id: string, c: Condiciones): Promise<Escritura> {
  return escritura(await db().from("ventas_marcas").update(c).eq("id", id), "actualizarCondiciones");
}

export async function regenerarSecretoWebhook(id: string): Promise<Escritura> {
  const secreto = randomBytes(32).toString("hex");
  return escritura(await db().from("ventas_marcas").update({ webhook_secret: secreto }).eq("id", id), "regenerarSecretoWebhook");
}

/* Exclusiones ------------------------------------------------------------- */

export async function listExclusiones(marcaId: string): Promise<Exclusion[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_exclusiones").select("*").eq("marca_id", marcaId).order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Exclusion[]>>,
    "listExclusiones",
  );
}

export async function crearExclusion(marcaId: string, e: NuevaExclusion, usuariaId: string): Promise<Escritura> {
  return escritura(
    await db().from("ventas_exclusiones").insert({
      marca_id: marcaId,
      nombre: vacioANull(e.nombre),
      email: vacioANull(e.email),
      telefono: vacioANull(e.telefono),
      cif: vacioANull(e.cif),
      created_by: usuariaId,
    }),
    "crearExclusion",
  );
}

export async function borrarExclusion(id: string, marcaId: string): Promise<Escritura> {
  return escritura(await db().from("ventas_exclusiones").delete().eq("id", id).eq("marca_id", marcaId), "borrarExclusion");
}

/* Leads --------------------------------------------------------------------- */

export async function listLeads(marcaId: string, filtro: { fase?: Fase; asignadaA?: string } = {}): Promise<Lead[]> {
  return todas((desde, hasta) => {
    let q = db().from("ventas_leads").select("*").eq("marca_id", marcaId);
    if (filtro.fase) q = q.eq("fase", filtro.fase);
    if (filtro.asignadaA) q = q.eq("asignada_a", filtro.asignadaA);
    return q.order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Lead[]>>;
  }, "listLeads");
}

export async function getLead(id: string): Promise<Lead | null> {
  const r = await db().from("ventas_leads").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Lead>, "getLead");
}

export async function listContactosLeads(marcaId: string): Promise<Contacto[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_leads").select("email,telefono").eq("marca_id", marcaId).order("id").range(desde, hasta) as PromiseLike<Respuesta<Contacto[]>>,
    "listContactosLeads",
  );
}

export async function buscarLeadPorContacto(marcaId: string, c: Contacto): Promise<Lead | null> {
  const email = normalizarEmail(c.email);
  if (email) {
    const r = await db().from("ventas_leads").select("*").eq("marca_id", marcaId).eq("email_norm", email).maybeSingle();
    const lead = comprobar(r as Respuesta<Lead>, "buscarLeadPorContacto email");
    if (lead) return lead;
  }
  const telefono = normalizarTelefono(c.telefono);
  if (telefono) {
    const r = await db().from("ventas_leads").select("*").eq("marca_id", marcaId).eq("telefono_norm", telefono).maybeSingle();
    return comprobar(r as Respuesta<Lead>, "buscarLeadPorContacto teléfono");
  }
  return null;
}

export async function actualizarDatosLead(id: string, d: LeadNuevo): Promise<Escritura> {
  return escritura(
    await db()
      .from("ventas_leads")
      .update({
        negocio: d.negocio,
        tipo_negocio: d.tipo_negocio,
        contacto: vacioANull(d.contacto),
        telefono: vacioANull(d.telefono),
        email: vacioANull(d.email),
        ciudad: vacioANull(d.ciudad),
        cif: vacioANull(d.cif),
        web: vacioANull(d.web),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    "actualizarDatosLead",
    "Ya hay otro lead de esta marca con ese email o teléfono.",
  );
}

export async function asignarLead(id: string, usuariaId: string | null): Promise<Escritura> {
  return escritura(
    await db().from("ventas_leads").update({ asignada_a: usuariaId, updated_at: new Date().toISOString() }).eq("id", id),
    "asignarLead",
  );
}

/* RPC ----------------------------------------------------------------------- */

export async function crearLeads(input: {
  marcaId: string;
  usuariaId: string | null;
  origen: Origen;
  origenDetalle: string | null;
  leads: Array<LeadNuevo & { excluido: boolean }>;
}): Promise<{ ok: true; creados: number } | { ok: false; error: string }> {
  const { data, error } = await db().rpc("ventas_crear_leads", {
    p_marca_id: input.marcaId,
    p_usuaria_id: input.usuariaId,
    p_origen: input.origen,
    p_origen_detalle: input.origenDetalle,
    p_leads: input.leads.map((l) => ({
      negocio: l.negocio,
      tipo_negocio: l.tipo_negocio,
      contacto: l.contacto,
      telefono: l.telefono,
      email: l.email,
      ciudad: l.ciudad,
      cif: l.cif,
      web: l.web,
      excluido: l.excluido,
    })),
  });
  if (error) {
    console.error("[ventas/db] crearLeads:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, creados: Number(data ?? 0) };
}

export async function registrarActividad(input: {
  leadId: string;
  usuariaId: string | null;
  tipo: TipoActividad;
  resultado?: ResultadoLlamada | null;
  nota?: string | null;
  faseNueva?: Fase | null;
  proximoSeguimiento?: string | null;
}): Promise<Escritura> {
  const cambiarSeguimiento = input.proximoSeguimiento !== undefined;
  const { error } = await db().rpc("ventas_registrar_actividad", {
    p_lead_id: input.leadId,
    p_usuaria_id: input.usuariaId,
    p_tipo: input.tipo,
    p_resultado: input.resultado ?? null,
    p_nota: input.nota ?? null,
    p_fase_nueva: input.faseNueva ?? null,
    p_cambiar_seguimiento: cambiarSeguimiento,
    p_proximo_seguimiento: cambiarSeguimiento ? input.proximoSeguimiento : null,
  });
  return escritura({ error }, "registrarActividad");
}

/* Actividad ----------------------------------------------------------------- */

export async function listActividadLead(leadId: string): Promise<Actividad[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_actividad").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Actividad[]>>,
    "listActividadLead",
  );
}

export async function listActividadMarca(marcaId: string, desde: string, hasta: string): Promise<Actividad[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("*")
        .eq("marca_id", marcaId)
        .gte("created_at", desde)
        .lt("created_at", hasta)
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<Actividad[]>>,
    "listActividadMarca",
  );
}

export async function listCambiosFaseMarca(marcaId: string): Promise<{ lead_id: string; datos: Record<string, unknown> }[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("lead_id,datos")
        .eq("marca_id", marcaId)
        .eq("tipo", "cambio_fase")
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<{ lead_id: string; datos: Record<string, unknown> }[]>>,
    "listCambiosFaseMarca",
  );
}

export async function listSeguimientosUsuaria(usuariaId: string, hasta: string): Promise<LeadConMarca[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_leads")
        .select("*, marca:ventas_marcas(nombre,slug)")
        .eq("asignada_a", usuariaId)
        .lte("proximo_seguimiento", hasta)
        .in("fase", [...FASES_ACTIVAS])
        .order("proximo_seguimiento")
        .range(d, h) as PromiseLike<Respuesta<LeadConMarca[]>>,
    "listSeguimientosUsuaria",
  );
}

export async function registrarImportacion(fila: {
  marca_id: string;
  tipo: "leads" | "pedidos";
  nombre_fichero: string;
  filas_totales: number;
  filas_guardadas: number;
  resumen: Record<string, unknown>;
  usuaria_id: string;
}): Promise<void> {
  const r = await db().from("ventas_importaciones").insert(fila);
  // El registro es informativo: si falla, los leads ya están guardados.
  if (r.error) console.error("[ventas/db] registrarImportacion:", r.error.message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-db.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio. Si el tipado de supabase-js no acepta alguna cadena, usar el cast `as PromiseLike<Respuesta<...>>` como en el resto del fichero; no cambiar la lógica.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/db.ts src/lib/__tests__/ventas-db.test.ts
git commit -m "feat(ventas): capa de datos sobre Supabase"
```

---
### Task 7: Sesión, proxy y login

Login por persona con Supabase Auth. El proxy manda `/panel/ventas/*` a la sesión de Supabase y deja el resto del panel con su contraseña compartida.

**Files:**
- Create: `src/lib/ventas/rutas.ts`
- Create: `src/lib/ventas/auth-config.ts`
- Create: `src/lib/ventas/sesion-proxy.ts`
- Create: `src/lib/ventas/auth.ts`
- Modify: `src/proxy.ts`
- Create: `src/app/(site)/panel/ventas/login/page.tsx`
- Create: `src/app/(site)/panel/ventas/login/actions.ts`
- Test: `src/lib/__tests__/ventas-rutas.test.ts`
- Test: `src/lib/__tests__/ventas-auth.test.ts`

**Interfaces:**
- Consumes: Task 6 `getUsuaria`, `Usuaria`; `@supabase/ssr` (`createServerClient`).
- Produces:
  - `rutas.ts`: `type RutaPanel = "ventas-login" | "ventas" | "panel-login" | "panel"`, `clasificarRutaPanel(pathname: string): RutaPanel`, `destinoTrasLogin(raw: unknown): string`, `type Acceso = "ok" | "login" | "permiso"`, `evaluarAcceso(usuaria: { rol: string; activa: boolean } | null, rol?: "admin"): Acceso`
  - `auth-config.ts`: `ventasAuthConfig(): { url: string; key: string } | null`
  - `sesion-proxy.ts`: `proxyVentas(req: NextRequest, esLogin: boolean): Promise<NextResponse>`
  - `auth.ts`: `crearClienteSesion(): Promise<SupabaseClient | null>`, `getUsuariaActual(): Promise<Usuaria | null>`, `requireUsuaria(rol?: "admin"): Promise<Usuaria>` (redirige a login o a `/panel/ventas?aviso=permiso`)
  - `login/actions.ts`: `ventasLogin(fd: FormData): Promise<void>`, `ventasLogout(): Promise<void>`

- [ ] **Step 1: Write the failing tests**

`src/lib/__tests__/ventas-rutas.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { clasificarRutaPanel, destinoTrasLogin, evaluarAcceso } from "../ventas/rutas";

describe("clasificarRutaPanel", () => {
  test("separa ventas del panel de leads", () => {
    expect(clasificarRutaPanel("/panel/ventas")).toBe("ventas");
    expect(clasificarRutaPanel("/panel/ventas/hydrup/leads")).toBe("ventas");
    expect(clasificarRutaPanel("/panel/ventas/login")).toBe("ventas-login");
    expect(clasificarRutaPanel("/panel/login")).toBe("panel-login");
    expect(clasificarRutaPanel("/panel/campanas")).toBe("panel");
  });

  test("una ruta que solo empieza igual no es de ventas", () => {
    expect(clasificarRutaPanel("/panel/ventasx")).toBe("panel");
  });
});

describe("destinoTrasLogin", () => {
  test("solo deja volver a rutas de ventas", () => {
    expect(destinoTrasLogin("/panel/ventas/hoy")).toBe("/panel/ventas/hoy");
    expect(destinoTrasLogin("/panel/ventas?mes=2026-09")).toBe("/panel/ventas?mes=2026-09");
    expect(destinoTrasLogin("https://evil.com")).toBe("/panel/ventas");
    expect(destinoTrasLogin("//evil.com/panel/ventas")).toBe("/panel/ventas");
    expect(destinoTrasLogin("/panel/campanas")).toBe("/panel/ventas");
    expect(destinoTrasLogin("/panel/ventas/login")).toBe("/panel/ventas");
    expect(destinoTrasLogin(null)).toBe("/panel/ventas");
  });
});

describe("evaluarAcceso", () => {
  test("sin sesión o inactiva → login; comercial en zona admin → permiso", () => {
    expect(evaluarAcceso(null)).toBe("login");
    expect(evaluarAcceso({ rol: "admin", activa: false })).toBe("login");
    expect(evaluarAcceso({ rol: "comercial", activa: true }, "admin")).toBe("permiso");
    expect(evaluarAcceso({ rol: "comercial", activa: true })).toBe("ok");
    expect(evaluarAcceso({ rol: "admin", activa: true }, "admin")).toBe("ok");
  });
});
```

`src/lib/__tests__/ventas-auth.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const { getUserMock, getUsuariaMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getUsuariaMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: getUserMock } }) }));
vi.mock("../ventas/db", () => ({ getUsuaria: getUsuariaMock }));

import { requireUsuaria, getUsuariaActual } from "../ventas/auth";

const ACTIVA = { id: "u1", nombre: "Paula", email: "p@d.com", rol: "comercial", activa: true, created_at: "" };

describe("requireUsuaria", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    getUserMock.mockReset();
    getUsuariaMock.mockReset();
    redirectMock.mockClear();
  });

  test("sin sesión redirige al login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(requireUsuaria()).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/login");
  });

  test("sesión válida pero sin perfil activo redirige al login", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue({ ...ACTIVA, activa: false });
    await expect(requireUsuaria()).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/login");
  });

  test("una comercial no pasa donde se pide admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue(ACTIVA);
    await expect(requireUsuaria("admin")).rejects.toThrow("NEXT_REDIRECT:/panel/ventas?aviso=permiso");
  });

  test("devuelve la usuaria cuando todo cuadra", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue(ACTIVA);
    await expect(requireUsuaria()).resolves.toEqual(ACTIVA);
  });

  test("sin clave publicable no hay sesión posible", async () => {
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    await expect(getUsuariaActual()).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/ventas-rutas.test.ts src/lib/__tests__/ventas-auth.test.ts`
Expected: FAIL — módulos no encontrados.

- [ ] **Step 3: Implement `rutas.ts` and `auth-config.ts`**

`src/lib/ventas/rutas.ts`:

```ts
/** Reglas de acceso de /panel/ventas. Puro: lo usan el proxy, el login y los tests. */

export type RutaPanel = "ventas-login" | "ventas" | "panel-login" | "panel";

function bajo(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function clasificarRutaPanel(pathname: string): RutaPanel {
  if (bajo(pathname, "/panel/ventas/login")) return "ventas-login";
  if (bajo(pathname, "/panel/ventas")) return "ventas";
  if (pathname.startsWith("/panel/login")) return "panel-login";
  return "panel";
}

/** A dónde volver tras iniciar sesión. Solo rutas internas de ventas: nunca
 *  otra web (open redirect) ni el propio login. */
export function destinoTrasLogin(raw: unknown): string {
  const porDefecto = "/panel/ventas";
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return porDefecto;
  const ruta = raw.split(/[?#]/)[0];
  return clasificarRutaPanel(ruta) === "ventas" ? raw : porDefecto;
}

export type Acceso = "ok" | "login" | "permiso";

export function evaluarAcceso(usuaria: { rol: string; activa: boolean } | null, rol?: "admin"): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  if (rol === "admin" && usuaria.rol !== "admin") return "permiso";
  return "ok";
}
```

`src/lib/ventas/auth-config.ts`:

```ts
/** URL y clave publicable para Supabase Auth. Sin ellas nadie puede entrar
 *  en /panel/ventas (se falla cerrado, nunca abierto). */
export function ventasAuthConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}
```

- [ ] **Step 4: Implement `sesion-proxy.ts` and `auth.ts`**

Antes de escribir, confirmar la API vigente de `@supabase/ssr` (cookies `getAll`/`setAll`) con context7 (`resolve-library-id` «supabase ssr», tema «nextjs middleware createServerClient»). El código de abajo sigue esa API.

`src/lib/ventas/sesion-proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ventasAuthConfig } from "./auth-config";

/**
 * Parte del proxy para /panel/ventas: refresca la sesión de Supabase (reescribe
 * sus cookies si ha caducado el token) y manda al login a quien no la tenga.
 * Es solo la primera barrera: cada página y cada acción vuelve a comprobar la
 * usuaria y su perfil con `requireUsuaria`.
 */
export async function proxyVentas(req: NextRequest, esLogin: boolean): Promise<NextResponse> {
  let respuesta = NextResponse.next({ request: req });
  const config = ventasAuthConfig();
  if (!config) return esLogin ? respuesta : alLogin(req);

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => req.cookies.set(name, value));
        respuesta = NextResponse.next({ request: req });
        cookies.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (esLogin || data.user) return respuesta;
  return alLogin(req);
}

function alLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/panel/ventas/login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
```

`src/lib/ventas/auth.ts`:

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ventasAuthConfig } from "./auth-config";
import { getUsuaria, type Usuaria } from "./db";
import { evaluarAcceso } from "./rutas";

export async function crearClienteSesion() {
  const config = ventasAuthConfig();
  if (!config) return null;
  const almacen = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Usuaria con sesión válida Y perfil activo en ventas_usuarias, o null. */
export async function getUsuariaActual(): Promise<Usuaria | null> {
  const supabase = await crearClienteSesion();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const usuaria = await getUsuaria(data.user.id);
  return usuaria?.activa ? usuaria : null;
}

/** Para páginas y server actions: devuelve la usuaria o redirige. */
export async function requireUsuaria(rol?: "admin"): Promise<Usuaria> {
  const usuaria = await getUsuariaActual();
  const acceso = evaluarAcceso(usuaria, rol);
  if (acceso === "login") redirect("/panel/ventas/login");
  if (acceso === "permiso") redirect("/panel/ventas?aviso=permiso");
  return usuaria as Usuaria;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/ventas-rutas.test.ts src/lib/__tests__/ventas-auth.test.ts`
Expected: PASS.

- [ ] **Step 6: Connect the proxy**

Reemplazar la función `proxy` de `src/proxy.ts` (el `config.matcher` no cambia):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { PANEL_COOKIE, verifySessionToken } from "@/lib/panel-auth";
import { clasificarRutaPanel } from "@/lib/ventas/rutas";
import { proxyVentas } from "@/lib/ventas/sesion-proxy";

// Protege todo /panel. Dos accesos distintos (Next 16, convención "proxy"):
// - /panel/ventas: login por persona con Supabase Auth (módulo de ventas B2B).
// - resto de /panel: contraseña compartida con cookie firmada.
export async function proxy(req: NextRequest) {
  const ruta = clasificarRutaPanel(req.nextUrl.pathname);
  if (ruta === "ventas" || ruta === "ventas-login") return proxyVentas(req, ruta === "ventas-login");
  if (ruta === "panel-login") return NextResponse.next();

  const token = req.cookies.get(PANEL_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/panel/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panel/:path*"],
};
```

- [ ] **Step 7: Login page and actions**

`src/app/(site)/panel/ventas/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { crearClienteSesion } from "@/lib/ventas/auth";
import { getUsuaria } from "@/lib/ventas/db";
import { destinoTrasLogin } from "@/lib/ventas/rutas";

export async function ventasLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const destino = destinoTrasLogin(formData.get("next"));
  const volver = (error: string): never =>
    redirect(`/panel/ventas/login?error=${error}&next=${encodeURIComponent(destino)}`);

  const supabase = await crearClienteSesion();
  if (!supabase) return volver("config");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return volver("credenciales");

  const usuaria = await getUsuaria(data.user.id);
  if (!usuaria?.activa) {
    await supabase.auth.signOut();
    return volver("inactiva");
  }
  redirect(destino);
}

export async function ventasLogout(): Promise<void> {
  const supabase = await crearClienteSesion();
  await supabase?.auth.signOut();
  redirect("/panel/ventas/login");
}
```

`src/app/(site)/panel/ventas/login/page.tsx`:

```tsx
import { ventasLogin } from "./actions";

export const metadata = {
  title: "Ventas B2B — Acceso",
  robots: { index: false, follow: false },
};

const ERRORES: Record<string, string> = {
  credenciales: "Email o contraseña incorrectos.",
  inactiva: "Tu cuenta está desactivada. Habla con Yael.",
  config: "El acceso no está configurado en el servidor (falta SUPABASE_PUBLISHABLE_KEY).",
};

export default async function VentasLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? (ERRORES[sp.error] ?? "No se pudo iniciar sesión.") : null;

  const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 } as const;
  const campo = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 14,
    color: "#0f172a",
    boxSizing: "border-box",
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <form
        action={ventasLogin}
        style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 16, padding: 28 }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: "#187bef", textTransform: "uppercase" }}>
          dinkbit
        </div>
        <h1 style={{ margin: "10px 0 18px", fontSize: 22, color: "#0f172a" }}>Ventas B2B</h1>
        {error && <p style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>{error}</p>}
        <input type="hidden" name="next" value={sp.next ?? "/panel/ventas"} />
        <label style={etiqueta} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required style={campo} />
        <label style={etiqueta} htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required style={campo} />
        <button
          type="submit"
          style={{ width: "100%", background: "#187bef", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npx vitest run src/lib/__tests__/ventas-* && npm run typecheck`
Expected: PASS y typecheck limpio.

Run: `npx vitest run src/lib/__tests__ && npm run build 2>&1 | tail -20`
Expected: la suite de `src/lib` sigue en verde (el proxy del panel actual no ha cambiado de comportamiento) y el build compila.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ventas/rutas.ts src/lib/ventas/auth-config.ts src/lib/ventas/sesion-proxy.ts src/lib/ventas/auth.ts src/proxy.ts "src/app/(site)/panel/ventas/login" src/lib/__tests__/ventas-rutas.test.ts src/lib/__tests__/ventas-auth.test.ts
git commit -m "feat(ventas): login por persona con Supabase Auth"
```

---
### Task 8: Servicios (importar, anuncio, llamada, muestras, fase, alta manual)

La lógica que combina reglas y datos. Las server actions solo validan permisos y llaman aquí.

**Files:**
- Create: `src/lib/ventas/servicios.ts`
- Test: `src/lib/__tests__/ventas-servicios.test.ts`

**Interfaces:**
- Consumes: Task 2 (`faseTrasLlamada`, `seguimientoTrasLlamada`), Task 3 (`parseVentasLeadsCsv`, `clasificarLeads`, `LeadNuevo`, `CsvRowError` vía `ParsedVentasCsv`), Task 3 `leadDesdeAnuncio`, Task 4 (`Llamada`, `NotaSeguimiento`, `CambioFase`), Task 6 (`Marca`, `Usuaria`, `getMarcaPorSlug`, `listContactosLeads`, `listExclusiones`, `crearLeads`, `registrarImportacion`, `buscarLeadPorContacto`, `getLead`, `registrarActividad`), `secretMatches(provided: string | null, expected: string): boolean` de `src/lib/webhook-auth.ts`.
- Produces:
  - `type ResultadoImportacion = { ok: true; creados: number; duplicados: number; excluidos: number } | { ok: false; error: string; errores: { line: number; message: string }[] }`
  - `importarLeadsCsv(input: { marca: Marca; usuaria: Usuaria; csv: string; nombreFichero: string; nombreLista: string }): Promise<ResultadoImportacion>`
  - `recibirLeadAnuncio(input: { slug: string; secreto: string | null; datos: unknown }): Promise<{ status: number; body: Record<string, unknown> }>`
  - `crearLeadManual(input: { marca: Marca; usuaria: Usuaria; datos: LeadNuevo }): Promise<{ ok: true; leadId: string } | { ok: false; error: string }>`
  - `registrarLlamada(input: { usuaria: Usuaria; leadId: string; llamada: Llamada }): Promise<Escritura>`
  - `marcarMuestrasEnviadas(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura>`
  - `anadirNota(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura>`
  - `cambiarFaseManual(input: { usuaria: Usuaria; leadId: string; cambio: CambioFase }): Promise<Escritura>`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-servicios.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  getMarcaPorSlug: vi.fn(),
  listContactosLeads: vi.fn(),
  listExclusiones: vi.fn(),
  crearLeads: vi.fn(),
  registrarImportacion: vi.fn(),
  buscarLeadPorContacto: vi.fn(),
  getLead: vi.fn(),
  registrarActividad: vi.fn(),
}));
vi.mock("../ventas/db", () => m);

import {
  importarLeadsCsv,
  recibirLeadAnuncio,
  crearLeadManual,
  registrarLlamada,
  marcarMuestrasEnviadas,
  cambiarFaseManual,
} from "../ventas/servicios";

const MARCA = { id: "m1", slug: "hydrup", nombre: "Hydrup", webhook_secret: "secreto-largo" } as never;
const USUARIA = { id: "u1", nombre: "Paula", rol: "comercial", activa: true } as never;
const CSV = "negocio,telefono,email\nGym Sol,600111222,\nFisio Norte,,fisio@norte.es\nYa Existe,,ya@a.es\nCliente,,cliente@a.es";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.listContactosLeads.mockResolvedValue([{ email: "ya@a.es", telefono: null }]);
  m.listExclusiones.mockResolvedValue([{ email: "cliente@a.es", telefono: null, cif: null }]);
  m.crearLeads.mockResolvedValue({ ok: true, creados: 2 });
  m.registrarActividad.mockResolvedValue({ ok: true });
});

describe("importarLeadsCsv", () => {
  test("guarda solo los nuevos, con origen lista, y registra la importación", async () => {
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "gyms.csv", nombreLista: "Gimnasios Madrid" });
    expect(r).toEqual({ ok: true, creados: 2, duplicados: 1, excluidos: 1 });
    const arg = m.crearLeads.mock.calls[0][0];
    expect(arg).toMatchObject({ marcaId: "m1", usuariaId: "u1", origen: "lista", origenDetalle: "Gimnasios Madrid" });
    expect(arg.leads.map((l: { negocio: string }) => l.negocio)).toEqual(["Gym Sol", "Fisio Norte"]);
    expect(m.registrarImportacion).toHaveBeenCalledWith(expect.objectContaining({ tipo: "leads", filas_totales: 4, filas_guardadas: 2 }));
  });

  test("con una sola fila errónea no se guarda nada", async () => {
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: "negocio,telefono\nGym,600111222\n,600333444", nombreFichero: "x.csv", nombreLista: "L" });
    expect(r).toMatchObject({ ok: false, errores: [{ line: 3 }] });
    expect(m.crearLeads).not.toHaveBeenCalled();
  });

  test("pide nombre de lista", async () => {
    expect(await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "x.csv", nombreLista: "  " })).toMatchObject({ ok: false });
  });

  test("si la base rechaza el lote, se informa y no se registra importación", async () => {
    m.crearLeads.mockResolvedValue({ ok: false, error: "boom" });
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "x.csv", nombreLista: "L" });
    expect(r.ok).toBe(false);
    expect(m.registrarImportacion).not.toHaveBeenCalled();
  });
});

describe("recibirLeadAnuncio", () => {
  test("marca desconocida o secreto incorrecto dan el mismo 401", async () => {
    m.getMarcaPorSlug.mockResolvedValueOnce(null).mockResolvedValueOnce(MARCA);
    expect((await recibirLeadAnuncio({ slug: "nope", secreto: "x", datos: {} })).status).toBe(401);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "otro", datos: {} })).status).toBe(401);
  });

  test("cuerpo sin contacto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Gym" } })).status).toBe(400);
  });

  test("lead nuevo → se crea con origen anuncio y la campaña", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", campaign_name: "Muestras" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: false } });
    expect(m.crearLeads.mock.calls[0][0]).toMatchObject({ usuariaId: null, origen: "anuncio", origenDetalle: "Muestras", leads: [{ negocio: "Box X", excluido: false }] });
  });

  test("lead de un cliente previo → se guarda marcado como excluido", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Cliente", email: "cliente@a.es" } });
    expect(m.crearLeads.mock.calls[0][0].leads[0].excluido).toBe(true);
  });

  test("lead repetido → nota en su historial, 200 y sin crear otro", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l7" });
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es", campana: "Muestras" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.crearLeads).not.toHaveBeenCalled();
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "l7", usuariaId: null, tipo: "nota" }));
  });

  test("un cuerpo que no es un objeto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: [1, 2] })).status).toBe(400);
  });
});

describe("crearLeadManual", () => {
  const DATOS = { negocio: "Gym Nuevo", tipo_negocio: null, contacto: "", telefono: "622333444", email: "", ciudad: "", cif: "", web: "" };

  test("crea y devuelve el id del lead", async () => {
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l9" });
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: DATOS })).toEqual({ ok: true, leadId: "l9" });
    expect(m.crearLeads.mock.calls[0][0]).toMatchObject({ origen: "manual", origenDetalle: null });
  });

  test("rechaza excluidos y duplicados con un mensaje claro", async () => {
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: { ...DATOS, telefono: "", email: "cliente@a.es" } })).toMatchObject({ ok: false });
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: { ...DATOS, telefono: "", email: "ya@a.es" } })).toMatchObject({ ok: false });
    expect(m.crearLeads).not.toHaveBeenCalled();
  });
});

describe("registro de trabajo sobre un lead", () => {
  test("la llamada mueve la fase y borra el seguimiento si cierra el lead", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "muestras" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_interesa", nota: "Ya tienen proveedor", proximo_seguimiento: "2026-09-30" } });
    expect(m.registrarActividad).toHaveBeenCalledWith({
      leadId: "l1",
      usuariaId: "u1",
      tipo: "llamada",
      resultado: "no_interesa",
      nota: "Ya tienen proveedor",
      faseNueva: "no_interesa",
      proximoSeguimiento: null,
    });
  });

  test("si la fase no cambia no se pide cambio de fase", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: "2026-09-20" } });
    expect(m.registrarActividad.mock.calls[0][0]).toMatchObject({ faseNueva: null, proximoSeguimiento: "2026-09-20" });
  });

  test("lead inexistente", async () => {
    m.getLead.mockResolvedValue(null);
    expect(await registrarLlamada({ usuaria: USUARIA, leadId: "x", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: null } })).toEqual({
      ok: false,
      error: "Lead no encontrado.",
    });
  });

  test("muestras enviadas pasa a fase muestras salvo si ya es cliente", async () => {
    m.getLead.mockResolvedValueOnce({ id: "l1", fase: "interesado" }).mockResolvedValueOnce({ id: "l2", fase: "cliente" });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: "2026-09-25" } });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l2", datos: { nota: "", proximo_seguimiento: null } });
    expect(m.registrarActividad.mock.calls[0][0]).toMatchObject({ tipo: "muestras_enviadas", faseNueva: "muestras" });
    expect(m.registrarActividad.mock.calls[1][0]).toMatchObject({ faseNueva: null });
  });

  test("cambio de fase manual queda firmado; a la misma fase no hace nada", async () => {
    m.getLead.mockResolvedValueOnce({ id: "l1", fase: "nuevo" }).mockResolvedValueOnce({ id: "l1", fase: "perdido" });
    await cambiarFaseManual({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "Cerró" } });
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l1", usuariaId: "u1", tipo: "cambio_fase", nota: "Cerró", faseNueva: "perdido" });
    expect(await cambiarFaseManual({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "" } })).toEqual({ ok: true });
    expect(m.registrarActividad).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-servicios.test.ts`
Expected: FAIL — no se resuelve `../ventas/servicios`.

- [ ] **Step 3: Implement**

`src/lib/ventas/servicios.ts`:

```ts
import "server-only";
import { secretMatches } from "../webhook-auth";
import { leadDesdeAnuncio } from "./anuncios";
import {
  buscarLeadPorContacto,
  crearLeads,
  getLead,
  getMarcaPorSlug,
  listContactosLeads,
  listExclusiones,
  registrarActividad,
  registrarImportacion,
  type Escritura,
  type Marca,
  type Usuaria,
} from "./db";
import { faseTrasLlamada, seguimientoTrasLlamada } from "./dominio";
import { clasificarLeads, parseVentasLeadsCsv, type LeadNuevo } from "./leads-csv";
import type { CambioFase, Llamada, NotaSeguimiento } from "./validacion";

export type ResultadoImportacion =
  | { ok: true; creados: number; duplicados: number; excluidos: number }
  | { ok: false; error: string; errores: { line: number; message: string }[] };

/**
 * Importa una lista de prospección. Todo o nada: con una sola fila errónea no
 * se guarda ninguna (se corrige el fichero y se vuelve a subir). Duplicados y
 * excluidos no se importan: un excluido ya es cliente de la marca.
 */
export async function importarLeadsCsv(input: {
  marca: Marca;
  usuaria: Usuaria;
  csv: string;
  nombreFichero: string;
  nombreLista: string;
}): Promise<ResultadoImportacion> {
  const nombreLista = input.nombreLista.trim();
  if (!nombreLista) {
    return { ok: false, error: "Ponle nombre a la lista (por ejemplo «Gimnasios Madrid septiembre»).", errores: [] };
  }

  const parsed = parseVentasLeadsCsv(input.csv);
  if (parsed.errores.length > 0) {
    return { ok: false, error: "El fichero tiene filas con errores. Corrígelas y vuelve a subirlo: no se ha guardado nada.", errores: parsed.errores };
  }
  if (parsed.filas.length === 0) {
    return { ok: false, error: "No hay ninguna fila que importar.", errores: [] };
  }

  const [existentes, exclusiones] = await Promise.all([listContactosLeads(input.marca.id), listExclusiones(input.marca.id)]);
  const clasificacion = clasificarLeads(parsed.filas, existentes, exclusiones);

  let creados = 0;
  if (clasificacion.nuevos.length > 0) {
    const res = await crearLeads({
      marcaId: input.marca.id,
      usuariaId: input.usuaria.id,
      origen: "lista",
      origenDetalle: nombreLista,
      leads: clasificacion.nuevos.map((l) => ({ ...l, excluido: false })),
    });
    if (!res.ok) {
      return { ok: false, error: "No se pudo guardar la importación. No se ha guardado ninguna fila.", errores: [] };
    }
    creados = res.creados;
  }

  // Lo que la base saltó por un duplicado que apareció entre la lectura y el insert.
  const duplicados = clasificacion.duplicados.length + (clasificacion.nuevos.length - creados);
  await registrarImportacion({
    marca_id: input.marca.id,
    tipo: "leads",
    nombre_fichero: input.nombreFichero,
    filas_totales: parsed.filas.length,
    filas_guardadas: creados,
    resumen: { lista: nombreLista, duplicados, excluidos: clasificacion.excluidos.length },
    usuaria_id: input.usuaria.id,
  });

  return { ok: true, creados, duplicados, excluidos: clasificacion.excluidos.length };
}

/**
 * Webhook de anuncios. Marca desconocida y secreto incorrecto responden igual
 * (401), para no revelar qué marcas existen. Un lead repetido no se duplica:
 * se apunta en su historial que ha vuelto a llegar. Un cliente previo se
 * guarda marcado como excluido, para que se vea que ha pedido información.
 */
export async function recibirLeadAnuncio(input: {
  slug: string;
  secreto: string | null;
  datos: unknown;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const marca = await getMarcaPorSlug(input.slug);
  if (!marca || !secretMatches(input.secreto, marca.webhook_secret)) {
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }
  if (typeof input.datos !== "object" || input.datos === null || Array.isArray(input.datos)) {
    return { status: 400, body: { ok: false, error: "invalid_body" } };
  }

  const leido = leadDesdeAnuncio(input.datos as Record<string, unknown>);
  if (!leido.ok) return { status: 400, body: { ok: false, error: leido.error } };

  const [existentes, exclusiones] = await Promise.all([listContactosLeads(marca.id), listExclusiones(marca.id)]);
  const clasificacion = clasificarLeads([leido.lead], existentes, exclusiones);

  if (clasificacion.duplicados.length > 0) {
    const existente = await buscarLeadPorContacto(marca.id, leido.lead);
    if (existente) {
      await registrarActividad({
        leadId: existente.id,
        usuariaId: null,
        tipo: "nota",
        nota: `Ha vuelto a llegar desde anuncios${leido.campana ? ` (${leido.campana})` : ""}.`,
      });
    }
    return { status: 200, body: { ok: true, duplicado: true } };
  }

  const res = await crearLeads({
    marcaId: marca.id,
    usuariaId: null,
    origen: "anuncio",
    origenDetalle: leido.campana || null,
    leads: [{ ...leido.lead, excluido: clasificacion.excluidos.length > 0 }],
  });
  if (!res.ok) return { status: 500, body: { ok: false, error: "not_saved" } };
  return { status: 200, body: { ok: true, duplicado: res.creados === 0 } };
}

export async function crearLeadManual(input: {
  marca: Marca;
  usuaria: Usuaria;
  datos: LeadNuevo;
}): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  const [existentes, exclusiones] = await Promise.all([listContactosLeads(input.marca.id), listExclusiones(input.marca.id)]);
  const clasificacion = clasificarLeads([input.datos], existentes, exclusiones);
  if (clasificacion.excluidos.length > 0) {
    return { ok: false, error: "Este negocio está en la lista de exclusión: ya era cliente de la marca." };
  }
  if (clasificacion.duplicados.length > 0) {
    return { ok: false, error: "Ya existe un lead de esta marca con ese email o teléfono." };
  }
  const res = await crearLeads({
    marcaId: input.marca.id,
    usuariaId: input.usuaria.id,
    origen: "manual",
    origenDetalle: null,
    leads: [{ ...input.datos, excluido: false }],
  });
  if (!res.ok || res.creados === 0) return { ok: false, error: "No se pudo crear el lead." };
  const lead = await buscarLeadPorContacto(input.marca.id, input.datos);
  return lead ? { ok: true, leadId: lead.id } : { ok: false, error: "Lead creado, pero no se ha podido abrir. Búscalo en la lista." };
}

export async function registrarLlamada(input: { usuaria: Usuaria; leadId: string; llamada: Llamada }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  const fase = faseTrasLlamada(lead.fase, input.llamada.resultado);
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "llamada",
    resultado: input.llamada.resultado,
    nota: input.llamada.nota,
    faseNueva: fase === lead.fase ? null : fase,
    proximoSeguimiento: seguimientoTrasLlamada(input.llamada.resultado, input.llamada.proximo_seguimiento),
  });
}

export async function marcarMuestrasEnviadas(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "muestras_enviadas",
    nota: input.datos.nota,
    faseNueva: lead.fase === "cliente" || lead.fase === "muestras" ? null : "muestras",
    proximoSeguimiento: input.datos.proximo_seguimiento,
  });
}

export async function anadirNota(input: { usuaria: Usuaria; leadId: string; datos: NotaSeguimiento }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (!input.datos.nota) return { ok: false, error: "Escribe la nota." };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "nota",
    nota: input.datos.nota,
    proximoSeguimiento: input.datos.proximo_seguimiento,
  });
}

export async function cambiarFaseManual(input: { usuaria: Usuaria; leadId: string; cambio: CambioFase }): Promise<Escritura> {
  const lead = await getLead(input.leadId);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (lead.fase === input.cambio.fase) return { ok: true };
  return registrarActividad({
    leadId: lead.id,
    usuariaId: input.usuaria.id,
    tipo: "cambio_fase",
    nota: input.cambio.nota,
    faseNueva: input.cambio.fase,
  });
}
```

Nota sobre la prueba de muestras: el test espera `faseNueva: "muestras"` desde `interesado` y `null` desde `cliente`; el código también devuelve `null` si ya está en `muestras` (reenvío de muestras sin cambio de fase).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-servicios.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/servicios.ts src/lib/__tests__/ventas-servicios.test.ts
git commit -m "feat(ventas): servicios de importación, anuncios y registro de llamadas"
```

---
### Task 9: Webhook de leads de anuncios

**Files:**
- Create: `src/app/api/ventas/leads/[slug]/route.ts`
- Test: `src/lib/__tests__/ventas-webhook-route.test.ts`

**Interfaces:**
- Consumes: `recibirLeadAnuncio` (Task 8), `providedSecret(req: NextRequest): string | null` de `src/lib/webhook-auth.ts` (lee `x-webhook-secret` o `Authorization: Bearer`).
- Produces: `POST /api/ventas/leads/[slug]` → JSON con el status de `recibirLeadAnuncio`.

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-webhook-route.test.ts` (entorno `node`: el `FormData` de jsdom no es compatible con el `Request` que usa `NextRequest`):

```ts
// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const { recibirMock } = vi.hoisted(() => ({ recibirMock: vi.fn() }));
vi.mock("@/lib/ventas/servicios", () => ({ recibirLeadAnuncio: recibirMock }));

import { POST } from "@/app/api/ventas/leads/[slug]/route";

const params = Promise.resolve({ slug: "hydrup" });

describe("POST /api/ventas/leads/[slug]", () => {
  beforeEach(() => recibirMock.mockReset().mockResolvedValue({ status: 200, body: { ok: true, duplicado: false } }));

  test("pasa slug, secreto de cabecera y cuerpo JSON al servicio", async () => {
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": "s3cret" },
      body: JSON.stringify({ negocio: "Gym", email: "a@b.es" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(200);
    expect(recibirMock).toHaveBeenCalledWith({ slug: "hydrup", secreto: "s3cret", datos: { negocio: "Gym", email: "a@b.es" } });
  });

  test("acepta formularios", async () => {
    const body = new URLSearchParams({ negocio: "Gym", telefono: "600111222" });
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Bearer s3cret" },
      body,
    });
    await POST(req, { params });
    expect(recibirMock.mock.calls[0][0]).toMatchObject({ secreto: "s3cret", datos: { negocio: "Gym", telefono: "600111222" } });
  });

  test("JSON roto → 400 sin llamar al servicio", async () => {
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{roto",
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    expect(recibirMock).not.toHaveBeenCalled();
  });

  test("devuelve el status del servicio", async () => {
    recibirMock.mockResolvedValue({ status: 401, body: { ok: false, error: "unauthorized" } });
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await POST(req, { params })).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-webhook-route.test.ts`
Expected: FAIL — no se resuelve la ruta.

- [ ] **Step 3: Implement**

`src/app/api/ventas/leads/[slug]/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { providedSecret } from "@/lib/webhook-auth";
import { recibirLeadAnuncio } from "@/lib/ventas/servicios";

// Entrada de leads de anuncios para una marca del servicio de ventas B2B.
// Zapier (Meta Lead Ads) o una landing hacen POST con el secreto de la marca en
// `x-webhook-secret` (o `Authorization: Bearer`). El secreto está en
// /panel/ventas/[slug]/condiciones.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let datos: unknown;
  try {
    const tipo = req.headers.get("content-type") ?? "";
    datos = tipo.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const res = await recibirLeadAnuncio({ slug, secreto: providedSecret(req), datos });
  return NextResponse.json(res.body, { status: res.status });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-webhook-route.test.ts && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/ventas/leads/[slug]/route.ts" src/lib/__tests__/ventas-webhook-route.test.ts
git commit -m "feat(ventas): webhook de leads de anuncios por marca"
```

---

### Task 10: Estructura del panel y gestión de usuarias

Marco común de todas las pantallas (cabecera, navegación, salir) y la pantalla de usuarias (solo admin).

**Files:**
- Create: `src/app/(site)/panel/ventas/_componentes/estilos.ts`
- Create: `src/app/(site)/panel/ventas/_componentes/VentasShell.tsx`
- Create: `src/app/(site)/panel/ventas/_componentes/Mensaje.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/layout.tsx`
- Create: `src/app/(site)/panel/ventas/acciones-usuarias.ts`
- Create: `src/app/(site)/panel/ventas/(app)/usuarias/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/usuarias/NuevaUsuariaForm.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/usuarias/AccionesUsuaria.tsx`
- Test: `src/lib/__tests__/ventas-acciones-usuarias.test.ts`

**Interfaces:**
- Consumes: `requireUsuaria` (Task 7), `ventasLogout` (Task 7), `listUsuarias`, `crearUsuariaCompleta`, `setUsuariaActiva`, `setPasswordUsuaria`, `Usuaria` (Task 6), `leerNuevaUsuaria`, `leerPassword` (Task 4), `ResultadoAccion` (Task 4), `ROL_LABELS` (Task 2).
- Produces:
  - `estilos.ts`: `tarjeta`, `campo`, `etiqueta`, `botonPrimario`, `botonSecundario`, `th`, `td`, `titulo` (objetos de estilo `as const`)
  - `VentasShell({ usuaria, children }: { usuaria: Usuaria; children: React.ReactNode })`
  - `Mensaje({ resultado }: { resultado: ResultadoAccion | null })`
  - `acciones-usuarias.ts`: `crearUsuariaAction(prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`, `setUsuariaActivaAction(id: string, activa: boolean): Promise<ResultadoAccion>`, `cambiarPasswordAction(id: string, password: string): Promise<ResultadoAccion>`

- [ ] **Step 1: Write the failing permission test**

`src/lib/__tests__/ventas-acciones-usuarias.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  crearUsuariaCompleta: vi.fn(),
  setUsuariaActiva: vi.fn(),
  setPasswordUsuaria: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  crearUsuariaCompleta: m.crearUsuariaCompleta,
  setUsuariaActiva: m.setUsuariaActiva,
  setPasswordUsuaria: m.setPasswordUsuaria,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { crearUsuariaAction, setUsuariaActivaAction, cambiarPasswordAction } from "@/app/(site)/panel/ventas/acciones-usuarias";

const ADMIN = { id: "a1", rol: "admin", activa: true };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

describe("acciones de usuarias", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.requireUsuaria.mockResolvedValue(ADMIN);
    m.crearUsuariaCompleta.mockResolvedValue({ ok: true, id: "u2" });
    m.setUsuariaActiva.mockResolvedValue({ ok: true });
    m.setPasswordUsuaria.mockResolvedValue({ ok: true });
  });

  test("todas exigen rol admin y no tocan nada si se deniega", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearUsuariaAction(null, fd({ nombre: "P", email: "p@d.com", password: "1234567890", rol: "comercial" }))).rejects.toThrow();
    await expect(setUsuariaActivaAction("u2", false)).rejects.toThrow();
    await expect(cambiarPasswordAction("u2", "1234567890")).rejects.toThrow();
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(m.crearUsuariaCompleta).not.toHaveBeenCalled();
    expect(m.setUsuariaActiva).not.toHaveBeenCalled();
    expect(m.setPasswordUsuaria).not.toHaveBeenCalled();
  });

  test("crea la usuaria con los datos validados", async () => {
    const r = await crearUsuariaAction(null, fd({ nombre: "Paula", email: "Paula@Dinkbit.com", password: "1234567890", rol: "comercial" }));
    expect(r.ok).toBe(true);
    expect(m.crearUsuariaCompleta).toHaveBeenCalledWith({ nombre: "Paula", email: "paula@dinkbit.com", password: "1234567890", rol: "comercial" });
  });

  test("una admin no puede desactivarse a sí misma", async () => {
    expect(await setUsuariaActivaAction("a1", false)).toEqual({ ok: false, error: "No puedes desactivar tu propia cuenta." });
    expect(m.setUsuariaActiva).not.toHaveBeenCalled();
  });

  test("contraseña corta rechazada antes de llamar a Supabase", async () => {
    expect((await cambiarPasswordAction("u2", "corta")).ok).toBe(false);
    expect(m.setPasswordUsuaria).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-usuarias.test.ts`
Expected: FAIL — no se resuelve `acciones-usuarias`.

- [ ] **Step 3: Implement the actions**

`src/app/(site)/panel/ventas/acciones-usuarias.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUsuaria } from "@/lib/ventas/auth";
import { crearUsuariaCompleta, setPasswordUsuaria, setUsuariaActiva } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerNuevaUsuaria, leerPassword } from "@/lib/ventas/validacion";

const RUTA = "/panel/ventas/usuarias";

export async function crearUsuariaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerNuevaUsuaria(fd);
  if (!leido.ok) return leido;
  const res = await crearUsuariaCompleta(leido.datos);
  if (!res.ok) return res;
  revalidatePath(RUTA);
  return { ok: true, mensaje: `Cuenta creada para ${leido.datos.email}. Pásale la contraseña por un canal privado.` };
}

export async function setUsuariaActivaAction(id: string, activa: boolean): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  if (id === admin.id && !activa) return { ok: false, error: "No puedes desactivar tu propia cuenta." };
  const res = await setUsuariaActiva(id, activa);
  if (!res.ok) return res;
  revalidatePath(RUTA);
  return { ok: true, mensaje: activa ? "Acceso reactivado." : "Acceso desactivado." };
}

export async function cambiarPasswordAction(id: string, password: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerPassword(password);
  if (!leido.ok) return leido;
  const res = await setPasswordUsuaria(id, leido.datos);
  return res.ok ? { ok: true, mensaje: "Contraseña cambiada." } : res;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-usuarias.test.ts`
Expected: PASS.

- [ ] **Step 5: Shared components**

`src/app/(site)/panel/ventas/_componentes/estilos.ts`:

```ts
/** Estilos compartidos del panel de ventas: los mismos tonos que el panel de leads. */

export const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" } as const;

export const titulo = { margin: "0 0 14px", fontSize: 18, color: "#0f172a" } as const;

export const etiqueta = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569", fontWeight: 600 } as const;

export const campo = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
  fontFamily: "inherit",
} as const;

export const botonPrimario = {
  background: "#187bef",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
} as const;

export const botonSecundario = {
  background: "#fff",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
} as const;

export const th = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  whiteSpace: "nowrap",
} as const;

export const td = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#1e293b", verticalAlign: "top" } as const;
```

`src/app/(site)/panel/ventas/_componentes/Mensaje.tsx`:

```tsx
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function Mensaje({ resultado }: { resultado: ResultadoAccion | null }) {
  if (!resultado) return null;
  const texto = resultado.ok ? resultado.mensaje : resultado.error;
  if (!texto) return null;
  return (
    <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: resultado.ok ? "#16a34a" : "#b91c1c" }}>
      {texto}
    </p>
  );
}
```

`src/app/(site)/panel/ventas/_componentes/VentasShell.tsx`:

```tsx
import Link from "next/link";
import type { Usuaria } from "@/lib/ventas/db";
import { ROL_LABELS } from "@/lib/ventas/dominio";
import { ventasLogout } from "../login/actions";

export function VentasShell({ usuaria, children }: { usuaria: Usuaria; children: React.ReactNode }) {
  const enlace = { color: "#cbd5e1", textDecoration: "none", fontSize: 14 } as const;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#f1f5f9",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 22px",
          background: "#0b1220",
          color: "#fff",
        }}
      >
        <nav style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, letterSpacing: 2, color: "#187bef", textTransform: "uppercase", fontSize: 12 }}>dinkbit</span>
          <strong style={{ fontSize: 16 }}>Ventas B2B</strong>
          <Link href="/panel/ventas" style={enlace}>Panel</Link>
          <Link href="/panel/ventas/hoy" style={enlace}>Mi día</Link>
          {usuaria.rol === "admin" && <Link href="/panel/ventas/usuarias" style={enlace}>Usuarias</Link>}
        </nav>
        <form action={ventasLogout} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#cbd5e1" }}>
            {usuaria.nombre} · {ROL_LABELS[usuaria.rol]}
          </span>
          <button type="submit" style={{ background: "none", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 13, cursor: "pointer" }}>
            Salir
          </button>
        </form>
      </header>
      <main style={{ padding: 22, maxWidth: 1240, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
```

`src/app/(site)/panel/ventas/(app)/layout.tsx`:

```tsx
import { requireUsuaria } from "@/lib/ventas/auth";
import { VentasShell } from "../_componentes/VentasShell";

export const metadata = {
  title: "Ventas B2B — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  const usuaria = await requireUsuaria();
  return <VentasShell usuaria={usuaria}>{children}</VentasShell>;
}
```

- [ ] **Step 6: Users page**

`src/app/(site)/panel/ventas/(app)/usuarias/NuevaUsuariaForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { crearUsuariaAction } from "../../acciones-usuarias";
import { ROLES, ROL_LABELS } from "@/lib/ventas/dominio";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../_componentes/estilos";

export function NuevaUsuariaForm() {
  const [resultado, accion, pendiente] = useActionState(crearUsuariaAction, null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <h2 style={{ ...titulo, flexBasis: "100%", margin: 0 }}>Nueva usuaria</h2>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Nombre
        <input name="nombre" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 200px" }}>
        Email
        <input name="email" type="email" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Contraseña inicial
        <input name="password" type="text" minLength={10} required autoComplete="off" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 140px" }}>
        Rol
        <select name="rol" defaultValue="comercial" style={campo}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROL_LABELS[r]}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
        {pendiente ? "Creando…" : "Crear cuenta"}
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/usuarias/AccionesUsuaria.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { cambiarPasswordAction, setUsuariaActivaAction } from "../../acciones-usuarias";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonSecundario, campo } from "../../_componentes/estilos";

export function AccionesUsuaria({ id, activa }: { id: string; activa: boolean }) {
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [password, setPassword] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => empezar(async () => setResultado(await setUsuariaActivaAction(id, !activa)))}
          style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
        >
          {activa ? "Desactivar" : "Reactivar"}
        </button>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          autoComplete="off"
          style={{ ...campo, padding: "5px 8px", fontSize: 13, width: 160 }}
        />
        <button
          type="button"
          disabled={pendiente || password.length === 0}
          onClick={() =>
            empezar(async () => {
              const r = await cambiarPasswordAction(id, password);
              setResultado(r);
              if (r.ok) setPassword("");
            })
          }
          style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
        >
          Cambiar
        </button>
      </div>
      <Mensaje resultado={resultado} />
    </div>
  );
}
```

`src/app/(site)/panel/ventas/(app)/usuarias/page.tsx`:

```tsx
import { requireUsuaria } from "@/lib/ventas/auth";
import { listUsuarias } from "@/lib/ventas/db";
import { ROL_LABELS } from "@/lib/ventas/dominio";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";
import { AccionesUsuaria } from "./AccionesUsuaria";
import { NuevaUsuariaForm } from "./NuevaUsuariaForm";

export default async function UsuariasPage() {
  await requireUsuaria("admin");
  const usuarias = await listUsuarias();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <NuevaUsuariaForm />
      <section style={tarjeta}>
        <h2 style={titulo}>Usuarias ({usuarias.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>Email</th>
                <th style={th}>Rol</th>
                <th style={th}>Acceso</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarias.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.nombre}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{ROL_LABELS[u.rol]}</td>
                  <td style={{ ...td, color: u.activa ? "#16a34a" : "#b91c1c", fontWeight: 600 }}>{u.activa ? "Activa" : "Desactivada"}</td>
                  <td style={td}>
                    <AccionesUsuaria id={u.id} activa={u.activa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx vitest run src/lib/__tests__/ventas-* && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(site)/panel/ventas" src/lib/__tests__/ventas-acciones-usuarias.test.ts
git commit -m "feat(ventas): estructura del panel y gestión de usuarias"
```

---
### Task 11: Marcas, condiciones, exclusiones y secreto del webhook

**Files:**
- Create: `src/app/(site)/panel/ventas/acciones-marcas.ts`
- Create: `src/app/(site)/panel/ventas/_componentes/cargarMarca.ts`
- Create: `src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/page.tsx` (versión inicial; la tarea 15 añade métricas)
- Create: `src/app/(site)/panel/ventas/(app)/NuevaMarcaForm.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/page.tsx` (versión inicial; la tarea 15 la sustituye)
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/condiciones/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/condiciones/CondicionesForm.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/condiciones/Exclusiones.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/condiciones/WebhookInfo.tsx`
- Test: `src/lib/__tests__/ventas-acciones-marcas.test.ts`

**Interfaces:**
- Consumes: `requireUsuaria` (Task 7); `listMarcas`, `getMarcaPorSlug`, `crearMarca`, `actualizarCondiciones`, `listExclusiones`, `crearExclusion`, `borrarExclusion`, `regenerarSecretoWebhook`, `Marca`, `Exclusion` (Task 6); `leerNuevaMarca`, `leerCondiciones`, `leerExclusion` (Task 4); `ResultadoAccion`; `ESTADOS_MARCA` (Task 2); estilos y `Mensaje` (Task 10).
- Produces:
  - `acciones-marcas.ts`: `crearMarcaAction(prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>` (redirige a condiciones si va bien), `actualizarCondicionesAction(marcaId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`, `crearExclusionAction(marcaId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`, `borrarExclusionAction(marcaId: string, exclusionId: string): Promise<ResultadoAccion>`, `regenerarSecretoAction(marcaId: string): Promise<ResultadoAccion>`
  - `cargarMarca(slug: string): Promise<Marca>` (404 si no existe)
  - `MarcaCabecera({ marca, activa }: { marca: Marca; activa: "resumen" | "leads" | "condiciones" })`

- [ ] **Step 1: Write the failing permission test**

`src/lib/__tests__/ventas-acciones-marcas.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  crearMarca: vi.fn(),
  actualizarCondiciones: vi.fn(),
  crearExclusion: vi.fn(),
  borrarExclusion: vi.fn(),
  regenerarSecretoWebhook: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  crearMarca: m.crearMarca,
  actualizarCondiciones: m.actualizarCondiciones,
  crearExclusion: m.crearExclusion,
  borrarExclusion: m.borrarExclusion,
  regenerarSecretoWebhook: m.regenerarSecretoWebhook,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  crearMarcaAction,
  actualizarCondicionesAction,
  crearExclusionAction,
  borrarExclusionAction,
  regenerarSecretoAction,
} from "@/app/(site)/panel/ventas/acciones-marcas";

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

describe("acciones de marcas", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockClear());
    m.requireUsuaria.mockReset().mockResolvedValue({ id: "a1", rol: "admin", activa: true });
    m.crearMarca.mockReset().mockResolvedValue({ ok: true, marca: { slug: "hydrup" } });
    m.actualizarCondiciones.mockReset().mockResolvedValue({ ok: true });
    m.crearExclusion.mockReset().mockResolvedValue({ ok: true });
    m.borrarExclusion.mockReset().mockResolvedValue({ ok: true });
    m.regenerarSecretoWebhook.mockReset().mockResolvedValue({ ok: true });
  });

  test("todas exigen admin y no escriben si se deniega", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearMarcaAction(null, fd({ nombre: "Hydrup" }))).rejects.toThrow();
    await expect(actualizarCondicionesAction("m1", null, fd({ estado: "activa", comision_pct: "4" }))).rejects.toThrow();
    await expect(crearExclusionAction("m1", null, fd({ email: "a@b.es" }))).rejects.toThrow();
    await expect(borrarExclusionAction("m1", "e1")).rejects.toThrow();
    await expect(regenerarSecretoAction("m1")).rejects.toThrow();
    for (const call of m.requireUsuaria.mock.calls) expect(call).toEqual(["admin"]);
    expect(m.crearMarca).not.toHaveBeenCalled();
    expect(m.actualizarCondiciones).not.toHaveBeenCalled();
    expect(m.crearExclusion).not.toHaveBeenCalled();
    expect(m.borrarExclusion).not.toHaveBeenCalled();
    expect(m.regenerarSecretoWebhook).not.toHaveBeenCalled();
  });

  test("crear marca lleva a sus condiciones", async () => {
    await expect(crearMarcaAction(null, fd({ nombre: "Hydrup", slug: "" }))).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/hydrup/condiciones");
    expect(m.crearMarca).toHaveBeenCalledWith({ nombre: "Hydrup", slug: "hydrup" });
  });

  test("condiciones inválidas no llegan a la base", async () => {
    const r = await actualizarCondicionesAction("m1", null, fd({ estado: "activa", comision_pct: "150" }));
    expect(r.ok).toBe(false);
    expect(m.actualizarCondiciones).not.toHaveBeenCalled();
  });

  test("la exclusión se guarda firmada por la admin", async () => {
    await crearExclusionAction("m1", null, fd({ nombre: "Gym viejo", email: "viejo@gym.es" }));
    expect(m.crearExclusion).toHaveBeenCalledWith("m1", { nombre: "Gym viejo", email: "viejo@gym.es", telefono: "", cif: "" }, "a1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-marcas.test.ts`
Expected: FAIL — no se resuelve `acciones-marcas`.

- [ ] **Step 3: Implement the actions**

`src/app/(site)/panel/ventas/acciones-marcas.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { actualizarCondiciones, borrarExclusion, crearExclusion, crearMarca, regenerarSecretoWebhook } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerCondiciones, leerExclusion, leerNuevaMarca } from "@/lib/ventas/validacion";

function refrescar() {
  revalidatePath("/panel/ventas", "layout");
}

export async function crearMarcaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerNuevaMarca(fd);
  if (!leido.ok) return leido;
  const res = await crearMarca(leido.datos);
  if (!res.ok) return res;
  refrescar();
  redirect(`/panel/ventas/${res.marca.slug}/condiciones`);
}

export async function actualizarCondicionesAction(marcaId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerCondiciones(fd);
  if (!leido.ok) return leido;
  const res = await actualizarCondiciones(marcaId, leido.datos);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Condiciones guardadas." };
}

export async function crearExclusionAction(marcaId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  const leido = leerExclusion(fd);
  if (!leido.ok) return leido;
  const res = await crearExclusion(marcaId, leido.datos, admin.id);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Añadido a la lista de exclusión." };
}

export async function borrarExclusionAction(marcaId: string, exclusionId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const res = await borrarExclusion(exclusionId, marcaId);
  if (!res.ok) return res;
  refrescar();
  return { ok: true };
}

export async function regenerarSecretoAction(marcaId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const res = await regenerarSecretoWebhook(marcaId);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Secreto nuevo generado. Actualízalo en Zapier: el anterior ya no funciona." };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-marcas.test.ts`
Expected: PASS.

- [ ] **Step 5: Brand helpers**

`src/app/(site)/panel/ventas/_componentes/cargarMarca.ts`:

```ts
import "server-only";
import { notFound } from "next/navigation";
import { getMarcaPorSlug, type Marca } from "@/lib/ventas/db";

export async function cargarMarca(slug: string): Promise<Marca> {
  const marca = await getMarcaPorSlug(slug);
  if (!marca) notFound();
  return marca;
}
```

`src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx`:

```tsx
import Link from "next/link";
import type { Marca } from "@/lib/ventas/db";

const PESTANAS = [
  { clave: "resumen", texto: "Resumen", ruta: "" },
  { clave: "leads", texto: "Leads", ruta: "/leads" },
  { clave: "condiciones", texto: "Condiciones", ruta: "/condiciones" },
] as const;

export function MarcaCabecera({ marca, activa }: { marca: Marca; activa: (typeof PESTANAS)[number]["clave"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <Link href="/panel/ventas" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Panel</Link>
        <h1 style={{ margin: 0, fontSize: 24 }}>{marca.nombre}</h1>
        {marca.estado !== "activa" && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "2px 8px" }}>
            {marca.estado === "pausada" ? "Pausada" : "Finalizada"}
          </span>
        )}
      </div>
      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {PESTANAS.map((p) => (
          <Link
            key={p.clave}
            href={`/panel/ventas/${marca.slug}${p.ruta}`}
            style={{
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              color: p.clave === activa ? "#187bef" : "#64748b",
              borderBottom: `2px solid ${p.clave === activa ? "#187bef" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {p.texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 6: Panel inicial y alta de marca**

`src/app/(site)/panel/ventas/(app)/NuevaMarcaForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { crearMarcaAction } from "../acciones-marcas";
import { Mensaje } from "../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta } from "../_componentes/estilos";

export function NuevaMarcaForm() {
  const [resultado, accion, pendiente] = useActionState(crearMarcaAction, null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ ...etiqueta, flex: "1 1 200px" }}>
        Nueva marca
        <input name="nombre" placeholder="Hydrup" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Identificador en la URL (opcional)
        <input name="slug" placeholder="hydrup" style={campo} />
      </label>
      <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
        Crear marca
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/page.tsx`:

```tsx
import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listMarcas } from "@/lib/ventas/db";
import { tarjeta } from "../_componentes/estilos";
import { NuevaMarcaForm } from "./NuevaMarcaForm";

export default async function PanelVentasPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const usuaria = await requireUsuaria();
  const [marcas, sp] = await Promise.all([listMarcas(), searchParams]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sp.aviso === "permiso" && (
        <p style={{ margin: 0, color: "#b45309", fontWeight: 600 }}>Esa sección es solo para admin.</p>
      )}
      <h1 style={{ margin: 0, fontSize: 24 }}>Marcas</h1>
      {marcas.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay ninguna marca.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {marcas.map((m) => (
          <Link key={m.id} href={`/panel/ventas/${m.slug}`} style={{ ...tarjeta, textDecoration: "none", color: "#0f172a" }}>
            <strong style={{ fontSize: 17 }}>{m.nombre}</strong>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{m.estado}</div>
          </Link>
        ))}
      </div>
      {usuaria.rol === "admin" && <NuevaMarcaForm />}
    </div>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/panel/ventas/${slug}/leads`);
}
```

- [ ] **Step 7: Página de condiciones**

`src/app/(site)/panel/ventas/(app)/[slug]/condiciones/CondicionesForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { actualizarCondicionesAction } from "../../../acciones-marcas";
import type { Marca } from "@/lib/ventas/db";
import { ESTADOS_MARCA } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

const euros = (cts: number) => (cts / 100).toString().replace(".", ",");

export function CondicionesForm({ marca, editable }: { marca: Marca; editable: boolean }) {
  const [resultado, accion, pendiente] = useActionState(actualizarCondicionesAction.bind(null, marca.id), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      <h2 style={{ ...titulo, gridColumn: "1 / -1", margin: 0 }}>Condiciones</h2>
      <fieldset disabled={!editable} style={{ display: "contents" }}>
        <label style={etiqueta}>
          Estado
          <select name="estado" defaultValue={marca.estado} style={campo}>
            {ESTADOS_MARCA.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label style={etiqueta}>
          Fecha de inicio
          <input name="fecha_inicio" type="date" defaultValue={marca.fecha_inicio ?? ""} style={campo} />
        </label>
        <label style={etiqueta}>
          Comisión (%)
          <input name="comision_pct" inputMode="decimal" defaultValue={String(marca.comision_pct).replace(".", ",")} style={campo} />
        </label>
        <label style={etiqueta}>
          Plazo de comisión (meses, vacío = para siempre)
          <input name="plazo_meses" inputMode="numeric" defaultValue={marca.plazo_meses ?? ""} style={campo} />
        </label>
        <label style={etiqueta}>
          Cuota mensual fija (€)
          <input name="cuota_mensual" inputMode="decimal" defaultValue={euros(marca.cuota_mensual_cts)} style={campo} />
        </label>
        <label style={etiqueta}>
          Pago por cliente conseguido (€)
          <input name="pago_por_cliente" inputMode="decimal" defaultValue={euros(marca.pago_por_cliente_cts)} style={campo} />
        </label>
        <label style={{ ...etiqueta, gridColumn: "1 / -1" }}>
          SKU de los packs B2B (uno por línea; se usan al importar pedidos en la fase 2)
          <textarea name="skus_b2b" rows={3} defaultValue={marca.skus_b2b.join("\n")} style={campo} />
        </label>
        {editable && (
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
            <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
              Guardar condiciones
            </button>
            <Mensaje resultado={resultado} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/condiciones/Exclusiones.tsx`:

```tsx
"use client";

import { useActionState, useTransition } from "react";
import { borrarExclusionAction, crearExclusionAction } from "../../../acciones-marcas";
import type { Exclusion } from "@/lib/ventas/db";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, td, th, titulo } from "../../../_componentes/estilos";

export function Exclusiones({ marcaId, exclusiones, editable }: { marcaId: string; exclusiones: Exclusion[]; editable: boolean }) {
  const [resultado, accion, pendiente] = useActionState(crearExclusionAction.bind(null, marcaId), null);
  const [borrando, empezar] = useTransition();

  return (
    <section style={tarjeta}>
      <h2 style={titulo}>Lista de exclusión ({exclusiones.length})</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
        Clientes B2B que la marca ya tenía antes de empezar. No se importan como leads y nunca cuentan para la comisión.
      </p>
      {editable && (
        <form action={accion} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <label style={{ ...etiqueta, flex: "1 1 160px" }}>Nombre<input name="nombre" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 180px" }}>Email<input name="email" type="email" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 140px" }}>Teléfono<input name="telefono" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 120px" }}>CIF<input name="cif" style={campo} /></label>
          <button type="submit" disabled={pendiente} style={botonPrimario}>Añadir</button>
          <div style={{ flexBasis: "100%" }}><Mensaje resultado={resultado} /></div>
        </form>
      )}
      {exclusiones.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th><th style={th}>Email</th><th style={th}>Teléfono</th><th style={th}>CIF</th>
                {editable && <th style={th} />}
              </tr>
            </thead>
            <tbody>
              {exclusiones.map((e) => (
                <tr key={e.id}>
                  <td style={td}>{e.nombre ?? "—"}</td>
                  <td style={td}>{e.email ?? "—"}</td>
                  <td style={td}>{e.telefono ?? "—"}</td>
                  <td style={td}>{e.cif ?? "—"}</td>
                  {editable && (
                    <td style={td}>
                      <button
                        type="button"
                        disabled={borrando}
                        onClick={() => empezar(async () => void (await borrarExclusionAction(marcaId, e.id)))}
                        style={{ ...botonSecundario, padding: "4px 10px", fontSize: 12 }}
                      >
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/condiciones/WebhookInfo.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { regenerarSecretoAction } from "../../../acciones-marcas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonSecundario, tarjeta, titulo } from "../../../_componentes/estilos";

export function WebhookInfo({ marcaId, slug, secreto }: { marcaId: string; slug: string; secreto: string }) {
  const [visible, setVisible] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  const codigo = { background: "#f1f5f9", borderRadius: 6, padding: "6px 8px", fontSize: 13, wordBreak: "break-all" } as const;

  return (
    <section style={tarjeta}>
      <h2 style={titulo}>Entrada de leads de anuncios</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#475569" }}>
        En Zapier (o en la landing), un POST a esta dirección con el secreto en la cabecera <code>x-webhook-secret</code>:
      </p>
      <p style={codigo}>https://www.dinkbit.es/api/ventas/leads/{slug}</p>
      <p style={codigo}>{visible ? secreto : "•".repeat(24)}</p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
        Campos que entiende: negocio o company_name, contacto o full_name, telefono o phone_number, email, ciudad, tipo_negocio, campana o campaign_name.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setVisible((v) => !v)} style={botonSecundario}>
          {visible ? "Ocultar secreto" : "Ver secreto"}
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("El secreto actual dejará de funcionar y habrá que cambiarlo en Zapier. ¿Seguir?")) return;
            empezar(async () => setResultado(await regenerarSecretoAction(marcaId)));
          }}
          style={botonSecundario}
        >
          Generar secreto nuevo
        </button>
        <Mensaje resultado={resultado} />
      </div>
    </section>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/condiciones/page.tsx`:

```tsx
import { requireUsuaria } from "@/lib/ventas/auth";
import { listExclusiones } from "@/lib/ventas/db";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { CondicionesForm } from "./CondicionesForm";
import { Exclusiones } from "./Exclusiones";
import { WebhookInfo } from "./WebhookInfo";

export default async function CondicionesPage({ params }: { params: Promise<{ slug: string }> }) {
  const usuaria = await requireUsuaria();
  const { slug } = await params;
  const marca = await cargarMarca(slug);
  const exclusiones = await listExclusiones(marca.id);
  const admin = usuaria.rol === "admin";

  return (
    <div>
      <MarcaCabecera marca={marca} activa="condiciones" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CondicionesForm marca={marca} editable={admin} />
        <Exclusiones marcaId={marca.id} exclusiones={exclusiones} editable={admin} />
        {admin && <WebhookInfo marcaId={marca.id} slug={marca.slug} secreto={marca.webhook_secret} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npx vitest run src/lib/__tests__/ventas-* && npm run typecheck`
Expected: PASS, typecheck limpio. Si TypeScript no infiere el tipo de `useActionState` con `.bind`, tipar el estado: `useActionState<ResultadoAccion | null, FormData>(...)`.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(site)/panel/ventas" src/lib/__tests__/ventas-acciones-marcas.test.ts
git commit -m "feat(ventas): marcas, condiciones, exclusiones y secreto del webhook"
```

---
### Task 12: Acciones sobre leads, lista, importación y alta manual

**Files:**
- Create: `src/app/(site)/panel/ventas/acciones-leads.ts`
- Create: `src/app/(site)/panel/ventas/_componentes/FaseEtiqueta.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/ImportarLeads.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/NuevoLeadForm.tsx`
- Test: `src/lib/__tests__/ventas-acciones-leads.test.ts`

**Interfaces:**
- Consumes: `requireUsuaria` (Task 7); `getMarcaPorSlug`, `getLead`, `getUsuaria`, `listLeads`, `listUsuarias`, `actualizarDatosLead`, `asignarLead` (Task 6); servicios de Task 8; lectores de Task 4; `parseVentasLeadsCsv`, `decodeCsvBytes`, `plantillaVentasCsv`, `VENTAS_CSV_MAX_ROWS` (Task 3); `FASES`, `FASE_LABELS`, `FASE_COLORES`, `TIPOS_NEGOCIO`, `TIPO_NEGOCIO_LABELS`, `ORIGEN_LABELS`, `esFase` (Task 2); `formatoFecha`, `hoyMadrid` (Task 5); estilos y `Mensaje` (Task 10); `cargarMarca`, `MarcaCabecera` (Task 11).
- Produces:
  - `importarLeadsAction(slug: string, prev: ResultadoImportacion | null, fd: FormData): Promise<ResultadoImportacion>`
  - `crearLeadManualAction(slug: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>` (redirige a la ficha si va bien)
  - `actualizarLeadAction(slug: string, leadId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`
  - `asignarLeadAction(slug: string, leadId: string, usuariaId: string): Promise<ResultadoAccion>` (`""` = sin asignar)
  - `registrarLlamadaAction(slug: string, leadId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`
  - `muestrasEnviadasAction(slug: string, leadId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`
  - `notaAction(slug: string, leadId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`
  - `cambiarFaseAction(slug: string, leadId: string, prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion>`
  - `FaseEtiqueta({ fase }: { fase: Fase })`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-acciones-leads.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  getMarcaPorSlug: vi.fn(),
  getLead: vi.fn(),
  getUsuaria: vi.fn(),
  actualizarDatosLead: vi.fn(),
  asignarLead: vi.fn(),
  importarLeadsCsv: vi.fn(),
  crearLeadManual: vi.fn(),
  registrarLlamada: vi.fn(),
  marcarMuestrasEnviadas: vi.fn(),
  anadirNota: vi.fn(),
  cambiarFaseManual: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  getMarcaPorSlug: m.getMarcaPorSlug,
  getLead: m.getLead,
  getUsuaria: m.getUsuaria,
  actualizarDatosLead: m.actualizarDatosLead,
  asignarLead: m.asignarLead,
}));
vi.mock("@/lib/ventas/servicios", () => ({
  importarLeadsCsv: m.importarLeadsCsv,
  crearLeadManual: m.crearLeadManual,
  registrarLlamada: m.registrarLlamada,
  marcarMuestrasEnviadas: m.marcarMuestrasEnviadas,
  anadirNota: m.anadirNota,
  cambiarFaseManual: m.cambiarFaseManual,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  importarLeadsAction,
  crearLeadManualAction,
  actualizarLeadAction,
  asignarLeadAction,
  registrarLlamadaAction,
  muestrasEnviadasAction,
  notaAction,
  cambiarFaseAction,
} from "@/app/(site)/panel/ventas/acciones-leads";

const USUARIA = { id: "u1", rol: "comercial", activa: true };
const MARCA = { id: "m1", slug: "hydrup" };
const LEAD = { id: "l1", marca_id: "m1", fase: "nuevo" };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockClear());
  m.requireUsuaria.mockReset().mockResolvedValue(USUARIA);
  m.getMarcaPorSlug.mockReset().mockResolvedValue(MARCA);
  m.getLead.mockReset().mockResolvedValue(LEAD);
  m.getUsuaria.mockReset().mockResolvedValue({ id: "u2", activa: true });
  for (const f of [m.actualizarDatosLead, m.asignarLead, m.registrarLlamada, m.marcarMuestrasEnviadas, m.anadirNota, m.cambiarFaseManual]) {
    f.mockReset().mockResolvedValue({ ok: true });
  }
  m.importarLeadsCsv.mockReset().mockResolvedValue({ ok: true, creados: 1, duplicados: 0, excluidos: 0 });
  m.crearLeadManual.mockReset().mockResolvedValue({ ok: true, leadId: "l9" });
});

describe("acciones de leads", () => {
  test("sin sesión no se ejecuta ninguna", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(importarLeadsAction("hydrup", null, fd({ csv: "x" }))).rejects.toThrow();
    await expect(registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).rejects.toThrow();
    await expect(asignarLeadAction("hydrup", "l1", "u2")).rejects.toThrow();
    expect(m.importarLeadsCsv).not.toHaveBeenCalled();
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    expect(m.asignarLead).not.toHaveBeenCalled();
  });

  test("importar pasa el CSV, el fichero y la lista al servicio", async () => {
    await importarLeadsAction("hydrup", null, fd({ csv: "negocio\nGym", nombre_fichero: "g.csv", nombre_lista: "Gyms" }));
    expect(m.importarLeadsCsv).toHaveBeenCalledWith({ marca: MARCA, usuaria: USUARIA, csv: "negocio\nGym", nombreFichero: "g.csv", nombreLista: "Gyms" });
  });

  test("un lead de otra marca no se toca", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, marca_id: "otra" });
    expect(await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.registrarLlamada).not.toHaveBeenCalled();
  });

  test("llamada inválida no llega al servicio; válida sí", async () => {
    expect((await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "" }))).ok).toBe(false);
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22" }));
    expect(m.registrarLlamada).toHaveBeenCalledWith({
      usuaria: USUARIA,
      leadId: "l1",
      llamada: { resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22" },
    });
  });

  test("alta manual lleva a la ficha del lead", async () => {
    await expect(crearLeadManualAction("hydrup", null, fd({ negocio: "Gym", telefono: "600111222" }))).rejects.toThrow(
      "NEXT_REDIRECT:/panel/ventas/hydrup/leads/l9",
    );
  });

  test("asignar a una usuaria desactivada no se permite; vacío desasigna", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u2", activa: false });
    expect((await asignarLeadAction("hydrup", "l1", "u2")).ok).toBe(false);
    await asignarLeadAction("hydrup", "l1", "");
    expect(m.asignarLead).toHaveBeenCalledWith("l1", null);
  });

  test("editar datos, muestras, nota y fase validan y delegan", async () => {
    await actualizarLeadAction("hydrup", "l1", null, fd({ negocio: "Gym", email: "a@b.es" }));
    expect(m.actualizarDatosLead).toHaveBeenCalledWith("l1", expect.objectContaining({ negocio: "Gym", email: "a@b.es" }));
    await muestrasEnviadasAction("hydrup", "l1", null, fd({ nota: "Pack 6", proximo_seguimiento: "" }));
    expect(m.marcarMuestrasEnviadas).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: null } });
    await notaAction("hydrup", "l1", null, fd({ nota: "Hola", proximo_seguimiento: "" }));
    expect(m.anadirNota).toHaveBeenCalled();
    expect((await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "inventada" }))).ok).toBe(false);
    await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "perdido", nota: "" }));
    expect(m.cambiarFaseManual).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-leads.test.ts`
Expected: FAIL — no se resuelve `acciones-leads`.

- [ ] **Step 3: Implement the actions**

`src/app/(site)/panel/ventas/acciones-leads.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { actualizarDatosLead, asignarLead, getLead, getMarcaPorSlug, getUsuaria, type Lead } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import {
  anadirNota,
  cambiarFaseManual,
  crearLeadManual,
  importarLeadsCsv,
  marcarMuestrasEnviadas,
  registrarLlamada,
  type ResultadoImportacion,
} from "@/lib/ventas/servicios";
import { leerCambioFase, leerDatosLead, leerLlamada, leerNotaSeguimiento } from "@/lib/ventas/validacion";

const NO_ENCONTRADO = { ok: false, error: "Lead no encontrado." } as const;

/** El lead existe y es de la marca de la URL. */
async function leadDeMarca(slug: string, leadId: string): Promise<Lead | null> {
  const [marca, lead] = await Promise.all([getMarcaPorSlug(slug), getLead(leadId)]);
  return marca && lead && lead.marca_id === marca.id ? lead : null;
}

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}`, "layout");
  revalidatePath("/panel/ventas/hoy");
}

export async function importarLeadsAction(slug: string, _prev: ResultadoImportacion | null, fd: FormData): Promise<ResultadoImportacion> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada.", errores: [] };
  const res = await importarLeadsCsv({
    marca,
    usuaria,
    csv: String(fd.get("csv") ?? ""),
    nombreFichero: String(fd.get("nombre_fichero") ?? ""),
    nombreLista: String(fd.get("nombre_lista") ?? ""),
  });
  if (res.ok) refrescar(slug);
  return res;
}

export async function crearLeadManualAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada." };
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const res = await crearLeadManual({ marca, usuaria, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  redirect(`/panel/ventas/${slug}/leads/${res.leadId}`);
}

export async function actualizarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const res = await actualizarDatosLead(leadId, leido.datos);
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Datos guardados." };
}

export async function asignarLeadAction(slug: string, leadId: string, usuariaId: string): Promise<ResultadoAccion> {
  await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  if (usuariaId) {
    const destino = await getUsuaria(usuariaId);
    if (!destino?.activa) return { ok: false, error: "Esa usuaria no existe o está desactivada." };
  }
  const res = await asignarLead(leadId, usuariaId || null);
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Asignación guardada." };
}

export async function registrarLlamadaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerLlamada(fd);
  if (!leido.ok) return leido;
  const res = await registrarLlamada({ usuaria, leadId, llamada: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Llamada registrada." };
}

export async function muestrasEnviadasAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await marcarMuestrasEnviadas({ usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Muestras apuntadas." };
}

export async function notaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await anadirNota({ usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Nota añadida." };
}

export async function cambiarFaseAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerCambioFase(fd);
  if (!leido.ok) return leido;
  const res = await cambiarFaseManual({ usuaria, leadId, cambio: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Fase cambiada." };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-acciones-leads.test.ts`
Expected: PASS.

- [ ] **Step 5: Lead list UI**

`src/app/(site)/panel/ventas/_componentes/FaseEtiqueta.tsx`:

```tsx
import { FASE_COLORES, FASE_LABELS, type Fase } from "@/lib/ventas/dominio";

export function FaseEtiqueta({ fase }: { fase: Fase }) {
  const c = FASE_COLORES[fase];
  return (
    <span style={{ display: "inline-block", background: c.bg, color: c.text, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {FASE_LABELS[fase]}
    </span>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/leads/ImportarLeads.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { importarLeadsAction } from "../../../acciones-leads";
import { decodeCsvBytes, parseVentasLeadsCsv, plantillaVentasCsv, type ParsedVentasCsv } from "@/lib/ventas/leads-csv";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

const MAX_LISTADOS = 10;

export function ImportarLeads({ slug }: { slug: string }) {
  const [csv, setCsv] = useState("");
  const [nombreFichero, setNombreFichero] = useState("");
  const [previa, setPrevia] = useState<ParsedVentasCsv | null>(null);
  const [resultado, accion, pendiente] = useActionState(importarLeadsAction.bind(null, slug), null);

  async function elegir(fichero: File | undefined) {
    if (!fichero) return;
    const texto = decodeCsvBytes(await fichero.arrayBuffer());
    setCsv(texto);
    setNombreFichero(fichero.name);
    setPrevia(parseVentasLeadsCsv(texto));
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob([plantillaVentasCsv()], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-leads-ventas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const lista = (items: { line: number; message: string }[], color: string) => (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color }}>
      {items.slice(0, MAX_LISTADOS).map((e, i) => (
        <li key={i}>Línea {e.line}: {e.message}</li>
      ))}
      {items.length > MAX_LISTADOS && <li>y {items.length - MAX_LISTADOS} más</li>}
    </ul>
  );

  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Importar lista (CSV)</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ ...etiqueta, flex: "1 1 220px" }}>
          Fichero
          <input type="file" accept=".csv,text/csv" onChange={(e) => elegir(e.target.files?.[0])} style={campo} />
        </label>
        <label style={{ ...etiqueta, flex: "1 1 220px" }}>
          Nombre de la lista
          <input name="nombre_lista" placeholder="Gimnasios Madrid septiembre" required style={campo} />
        </label>
        <button type="button" onClick={descargarPlantilla} style={botonSecundario}>Descargar plantilla</button>
      </div>
      <input type="hidden" name="csv" value={csv} />
      <input type="hidden" name="nombre_fichero" value={nombreFichero} />

      {previa && (
        <div style={{ fontSize: 14 }}>
          <strong>{previa.filas.length} filas válidas</strong>
          {previa.errores.length > 0 && <> · <strong style={{ color: "#b91c1c" }}>{previa.errores.length} con errores</strong></>}
          {previa.cabecerasDesconocidas.length > 0 && (
            <div style={{ fontSize: 13, color: "#64748b" }}>Columnas que se ignoran: {previa.cabecerasDesconocidas.join(", ")}</div>
          )}
          {previa.errores.length > 0 && lista(previa.errores, "#b91c1c")}
          {previa.avisos.length > 0 && lista(previa.avisos, "#b45309")}
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            Los duplicados y los clientes de la lista de exclusión se detectan al importar y no se guardan.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pendiente || !previa || previa.filas.length === 0 || previa.errores.length > 0}
          style={{ ...botonPrimario, opacity: pendiente || !previa || previa.errores.length > 0 ? 0.6 : 1 }}
        >
          {pendiente ? "Importando…" : "Importar"}
        </button>
        {resultado?.ok && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>
            {resultado.creados} leads nuevos · {resultado.duplicados} duplicados · {resultado.excluidos} excluidos
          </span>
        )}
        {resultado && !resultado.ok && <span style={{ fontSize: 14, fontWeight: 600, color: "#b91c1c" }}>{resultado.error}</span>}
      </div>
      {resultado && !resultado.ok && resultado.errores.length > 0 && lista(resultado.errores, "#b91c1c")}
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/leads/NuevoLeadForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { crearLeadManualAction } from "../../../acciones-leads";
import { TIPOS_NEGOCIO, TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

export function NuevoLeadForm({ slug }: { slug: string }) {
  const [resultado, accion, pendiente] = useActionState(crearLeadManualAction.bind(null, slug), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      <h2 style={{ ...titulo, gridColumn: "1 / -1", margin: 0 }}>Añadir lead a mano</h2>
      <label style={etiqueta}>Negocio<input name="negocio" required style={campo} /></label>
      <label style={etiqueta}>
        Tipo
        <select name="tipo_negocio" defaultValue="" style={campo}>
          <option value="">—</option>
          {TIPOS_NEGOCIO.map((t) => (
            <option key={t} value={t}>{TIPO_NEGOCIO_LABELS[t]}</option>
          ))}
        </select>
      </label>
      <label style={etiqueta}>Contacto<input name="contacto" style={campo} /></label>
      <label style={etiqueta}>Teléfono<input name="telefono" style={campo} /></label>
      <label style={etiqueta}>Email<input name="email" type="email" style={campo} /></label>
      <label style={etiqueta}>Ciudad<input name="ciudad" style={campo} /></label>
      <label style={etiqueta}>CIF<input name="cif" style={campo} /></label>
      <label style={etiqueta}>Web<input name="web" style={campo} /></label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Crear lead</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/leads/page.tsx`:

```tsx
import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listLeads, listUsuarias } from "@/lib/ventas/db";
import { FASES, FASE_LABELS, ORIGEN_LABELS, TIPO_NEGOCIO_LABELS, esFase, esFaseActiva } from "@/lib/ventas/dominio";
import { formatoFecha, hoyMadrid } from "@/lib/ventas/metricas";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { FaseEtiqueta } from "../../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, td, th } from "../../../_componentes/estilos";
import { ImportarLeads } from "./ImportarLeads";
import { NuevoLeadForm } from "./NuevoLeadForm";

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fase?: string; mias?: string; q?: string }>;
}) {
  const usuaria = await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);
  const fase = esFase(sp.fase) ? sp.fase : undefined;
  const mias = sp.mias === "1";
  const q = (sp.q ?? "").trim().toLowerCase();

  const [todos, usuarias] = await Promise.all([
    listLeads(marca.id, { fase, asignadaA: mias ? usuaria.id : undefined }),
    listUsuarias(),
  ]);
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  const leads = q
    ? todos.filter((l) => [l.negocio, l.ciudad, l.contacto, l.email, l.telefono].some((v) => v?.toLowerCase().includes(q)))
    : todos;
  const hoy = hoyMadrid();

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { fase, mias: mias ? "1" : undefined, q: q || undefined, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/panel/ventas/${slug}/leads${s ? `?${s}` : ""}`;
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
      <MarcaCabecera marca={marca} activa="leads" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={filtro({ fase: undefined })} style={chip(!fase)}>Todas</Link>
          {FASES.map((f) => (
            <Link key={f} href={filtro({ fase: f })} style={chip(fase === f)}>{FASE_LABELS[f]}</Link>
          ))}
          <Link href={filtro({ mias: mias ? undefined : "1" })} style={chip(mias)}>Solo mías</Link>
          <form action={`/panel/ventas/${slug}/leads`} style={{ marginLeft: "auto" }}>
            {fase && <input type="hidden" name="fase" value={fase} />}
            {mias && <input type="hidden" name="mias" value="1" />}
            <input name="q" defaultValue={q} placeholder="Buscar negocio, ciudad…" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
          </form>
        </div>

        <section style={{ ...tarjeta, padding: 0, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Negocio</th>
                <th style={th}>Tipo</th>
                <th style={th}>Ciudad</th>
                <th style={th}>Fase</th>
                <th style={th}>Asignada</th>
                <th style={th}>Seguimiento</th>
                <th style={th}>Origen</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td style={{ ...td, color: "#64748b" }} colSpan={7}>No hay leads con este filtro.</td></tr>
              )}
              {leads.map((l) => {
                const atrasado = l.proximo_seguimiento !== null && l.proximo_seguimiento < hoy && esFaseActiva(l.fase);
                return (
                  <tr key={l.id}>
                    <td style={td}>
                      <Link href={`/panel/ventas/${slug}/leads/${l.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                        {l.negocio}
                      </Link>
                      {l.excluido && <span style={{ marginLeft: 6, fontSize: 11, color: "#b91c1c", fontWeight: 700 }}>EXCLUIDO</span>}
                    </td>
                    <td style={td}>{l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : "—"}</td>
                    <td style={td}>{l.ciudad ?? "—"}</td>
                    <td style={td}><FaseEtiqueta fase={l.fase} /></td>
                    <td style={td}>{l.asignada_a ? (nombres[l.asignada_a] ?? "—") : "—"}</td>
                    <td style={{ ...td, color: atrasado ? "#b91c1c" : td.color, fontWeight: atrasado ? 700 : 400 }}>
                      {l.proximo_seguimiento ? formatoFecha(l.proximo_seguimiento) : "—"}
                    </td>
                    <td style={td}>
                      {ORIGEN_LABELS[l.origen]}
                      {l.origen_detalle && <div style={{ fontSize: 12, color: "#64748b" }}>{l.origen_detalle}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{leads.length} leads</p>

        <ImportarLeads slug={slug} />
        <NuevoLeadForm slug={slug} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx vitest run src/lib/__tests__/ventas-* && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/panel/ventas" src/lib/__tests__/ventas-acciones-leads.test.ts
git commit -m "feat(ventas): lista de leads, importación CSV y alta manual"
```

---
### Task 13: Ficha del lead

Datos editables, asignación, registro de llamada, muestras, nota, cambio de fase e historial.

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/DatosLead.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/Asignacion.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/AccionesLead.tsx`

**Interfaces:**
- Consumes: acciones de Task 12 (`actualizarLeadAction`, `asignarLeadAction`, `registrarLlamadaAction`, `muestrasEnviadasAction`, `notaAction`, `cambiarFaseAction`); `getLead`, `listActividadLead`, `listUsuarias`, `Lead`, `Usuaria` (Task 6); `describirActividad` (Task 5); `formatoFecha`, `formatoFechaHora` (Task 5); `FASES`, `FASE_LABELS`, `RESULTADOS_LLAMADA`, `RESULTADO_LABELS`, `TIPOS_NEGOCIO`, `TIPO_NEGOCIO_LABELS`, `ORIGEN_LABELS` (Task 2); `cargarMarca`, `MarcaCabecera`, `FaseEtiqueta`, estilos, `Mensaje`.
- Produces: la pantalla `/panel/ventas/[slug]/leads/[id]`.

- [ ] **Step 1: Datos y asignación**

`src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/DatosLead.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { actualizarLeadAction } from "../../../../acciones-leads";
import type { Lead } from "@/lib/ventas/db";
import { TIPOS_NEGOCIO, TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../../_componentes/estilos";

export function DatosLead({ slug, lead }: { slug: string; lead: Lead }) {
  const [resultado, accion, pendiente] = useActionState(actualizarLeadAction.bind(null, slug, lead.id), null);
  const texto = (nombre: keyof Lead, rotulo: string, tipo = "text") => (
    <label style={etiqueta}>
      {rotulo}
      <input name={nombre} type={tipo} defaultValue={(lead[nombre] as string | null) ?? ""} style={campo} />
    </label>
  );
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Datos</h2>
      {texto("negocio", "Negocio")}
      <label style={etiqueta}>
        Tipo de negocio
        <select name="tipo_negocio" defaultValue={lead.tipo_negocio ?? ""} style={campo}>
          <option value="">—</option>
          {TIPOS_NEGOCIO.map((t) => (
            <option key={t} value={t}>{TIPO_NEGOCIO_LABELS[t]}</option>
          ))}
        </select>
      </label>
      {texto("contacto", "Persona de contacto")}
      {texto("telefono", "Teléfono", "tel")}
      {texto("email", "Email", "email")}
      {texto("ciudad", "Ciudad")}
      {texto("cif", "CIF")}
      {texto("web", "Web")}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Guardar datos</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
```

`src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/Asignacion.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { asignarLeadAction } from "../../../../acciones-leads";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { campo, etiqueta } from "../../../../_componentes/estilos";

export function Asignacion({
  slug,
  leadId,
  asignadaA,
  usuarias,
}: {
  slug: string;
  leadId: string;
  asignadaA: string | null;
  usuarias: { id: string; nombre: string }[];
}) {
  const [valor, setValor] = useState(asignadaA ?? "");
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <label style={etiqueta}>
      Asignada a
      <select
        value={valor}
        disabled={pendiente}
        onChange={(e) => {
          const nuevo = e.target.value;
          setValor(nuevo);
          empezar(async () => setResultado(await asignarLeadAction(slug, leadId, nuevo)));
        }}
        style={campo}
      >
        <option value="">Sin asignar</option>
        {usuarias.map((u) => (
          <option key={u.id} value={u.id}>{u.nombre}</option>
        ))}
      </select>
      <Mensaje resultado={resultado} />
    </label>
  );
}
```

- [ ] **Step 2: Acciones de trabajo sobre el lead**

`src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/AccionesLead.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { cambiarFaseAction, muestrasEnviadasAction, notaAction, registrarLlamadaAction } from "../../../../acciones-leads";
import { FASES, FASE_LABELS, RESULTADOS_LLAMADA, RESULTADO_LABELS, type Fase } from "@/lib/ventas/dominio";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta } from "../../../../_componentes/estilos";

type Pestana = "llamada" | "muestras" | "nota" | "fase";

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "llamada", texto: "Registrar llamada" },
  { clave: "muestras", texto: "Muestras enviadas" },
  { clave: "nota", texto: "Nota" },
  { clave: "fase", texto: "Cambiar fase" },
];

function Seguimiento() {
  return (
    <label style={etiqueta}>
      Próximo seguimiento
      <input name="proximo_seguimiento" type="date" style={campo} />
    </label>
  );
}

function Nota({ requerida = false }: { requerida?: boolean }) {
  return (
    <label style={etiqueta}>
      Nota
      <textarea name="nota" rows={3} required={requerida} style={campo} />
    </label>
  );
}

export function AccionesLead({ slug, leadId, fase }: { slug: string; leadId: string; fase: Fase }) {
  const [pestana, setPestana] = useState<Pestana>("llamada");
  const [rLlamada, aLlamada, pLlamada] = useActionState(registrarLlamadaAction.bind(null, slug, leadId), null);
  const [rMuestras, aMuestras, pMuestras] = useActionState(muestrasEnviadasAction.bind(null, slug, leadId), null);
  const [rNota, aNota, pNota] = useActionState(notaAction.bind(null, slug, leadId), null);
  const [rFase, aFase, pFase] = useActionState(cambiarFaseAction.bind(null, slug, leadId), null);

  const formulario = { display: "flex", flexDirection: "column", gap: 10 } as const;

  return (
    <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            onClick={() => setPestana(p.clave)}
            style={{ ...(pestana === p.clave ? botonPrimario : botonSecundario), padding: "6px 12px", fontSize: 13 }}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === "llamada" && (
        <form action={aLlamada} style={formulario}>
          <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <legend style={{ ...etiqueta, marginBottom: 6 }}>Resultado</legend>
            {RESULTADOS_LLAMADA.map((r) => (
              <label key={r} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 8px" }}>
                <input type="radio" name="resultado" value={r} required /> {RESULTADO_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <Nota />
          <Seguimiento />
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            «No le interesa» y «Número erróneo» cierran el lead y borran el seguimiento.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pLlamada} style={botonPrimario}>Guardar llamada</button>
            <Mensaje resultado={rLlamada} />
          </div>
        </form>
      )}

      {pestana === "muestras" && (
        <form action={aMuestras} style={formulario}>
          <Nota />
          <Seguimiento />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pMuestras} style={botonPrimario}>Apuntar envío de muestras</button>
            <Mensaje resultado={rMuestras} />
          </div>
        </form>
      )}

      {pestana === "nota" && (
        <form action={aNota} style={formulario}>
          <Nota requerida />
          <Seguimiento />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pNota} style={botonPrimario}>Añadir nota</button>
            <Mensaje resultado={rNota} />
          </div>
        </form>
      )}

      {pestana === "fase" && (
        <form action={aFase} style={formulario}>
          <label style={etiqueta}>
            Nueva fase
            <select name="fase" defaultValue={fase} style={campo}>
              {FASES.map((f) => (
                <option key={f} value={f}>{FASE_LABELS[f]}</option>
              ))}
            </select>
          </label>
          <Nota />
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Queda registrado en el historial con tu nombre.</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={pFase} style={botonPrimario}>Cambiar fase</button>
            <Mensaje resultado={rFase} />
          </div>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Página de la ficha**

`src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getLead, listActividadLead, listUsuarias } from "@/lib/ventas/db";
import { ORIGEN_LABELS } from "@/lib/ventas/dominio";
import { describirActividad } from "@/lib/ventas/historial";
import { formatoFecha, formatoFechaHora } from "@/lib/ventas/metricas";
import { cargarMarca } from "../../../../_componentes/cargarMarca";
import { FaseEtiqueta } from "../../../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../../_componentes/estilos";
import { AccionesLead } from "./AccionesLead";
import { Asignacion } from "./Asignacion";
import { DatosLead } from "./DatosLead";

export default async function FichaLeadPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  await requireUsuaria();
  const { slug, id } = await params;
  const marca = await cargarMarca(slug);
  const lead = await getLead(id);
  if (!lead || lead.marca_id !== marca.id) notFound();

  const [actividad, usuarias] = await Promise.all([listActividadLead(lead.id), listUsuarias()]);
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  const activas = usuarias.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre }));

  return (
    <div>
      <MarcaCabecera marca={marca} activa="leads" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href={`/panel/ventas/${slug}/leads`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Leads</Link>
        <h2 style={{ margin: 0, fontSize: 22 }}>{lead.negocio}</h2>
        <FaseEtiqueta fase={lead.fase} />
        {lead.excluido && <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>EXCLUIDO · ya era cliente de la marca</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><strong>Código de cliente:</strong> <code>{lead.codigo_cliente}</code></div>
            <div><strong>Origen:</strong> {ORIGEN_LABELS[lead.origen]}{lead.origen_detalle ? ` · ${lead.origen_detalle}` : ""}</div>
            <div><strong>Alta:</strong> {formatoFechaHora(lead.created_at)}</div>
            <div><strong>Próximo seguimiento:</strong> {lead.proximo_seguimiento ? formatoFecha(lead.proximo_seguimiento) : "—"}</div>
            {lead.telefono && <a href={`tel:${lead.telefono}`} style={{ color: "#187bef", fontWeight: 600 }}>Llamar a {lead.telefono}</a>}
            <Asignacion slug={slug} leadId={lead.id} asignadaA={lead.asignada_a} usuarias={activas} />
          </section>
          <DatosLead slug={slug} lead={lead} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AccionesLead slug={slug} leadId={lead.id} fase={lead.fase} />
          <section style={tarjeta}>
            <h2 style={titulo}>Historial</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {actividad.map((a) => {
                const d = describirActividad(a, nombres);
                return (
                  <li key={a.id} style={{ borderLeft: "3px solid #e2e8f0", paddingLeft: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.titulo}</div>
                    {d.detalle && <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{d.detalle}</div>}
                    <div style={{ fontSize: 12, color: "#64748b" }}>{d.autora} · {formatoFechaHora(a.created_at)}</div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run src/lib/__tests__/ventas-*`
Expected: typecheck limpio, tests en verde.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(site)/panel/ventas/(app)/[slug]/leads/[id]"
git commit -m "feat(ventas): ficha del lead con llamadas, muestras, notas e historial"
```

---

### Task 14: Mi día

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/hoy/page.tsx`

**Interfaces:**
- Consumes: `requireUsuaria` (Task 7); `listSeguimientosUsuaria`, `LeadConMarca` (Task 6); `agruparSeguimientos`, `hoyMadrid`, `formatoFecha` (Task 5); `TIPO_NEGOCIO_LABELS` (Task 2); `FaseEtiqueta`, estilos.
- Produces: la pantalla `/panel/ventas/hoy`.

- [ ] **Step 1: Implement**

`src/app/(site)/panel/ventas/(app)/hoy/page.tsx`:

```tsx
import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listSeguimientosUsuaria, type LeadConMarca } from "@/lib/ventas/db";
import { TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { agruparSeguimientos, formatoFecha, hoyMadrid } from "@/lib/ventas/metricas";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";

function Tabla({ leads, mostrarFecha }: { leads: LeadConMarca[]; mostrarFecha: boolean }) {
  if (leads.length === 0) return <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
        <thead>
          <tr>
            <th style={th}>Negocio</th>
            <th style={th}>Marca</th>
            <th style={th}>Tipo</th>
            <th style={th}>Fase</th>
            <th style={th}>Teléfono</th>
            {mostrarFecha && <th style={th}>Tocaba</th>}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td style={td}>
                <Link href={`/panel/ventas/${l.marca?.slug}/leads/${l.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                  {l.negocio}
                </Link>
              </td>
              <td style={td}>{l.marca?.nombre ?? "—"}</td>
              <td style={td}>{l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : "—"}</td>
              <td style={td}><FaseEtiqueta fase={l.fase} /></td>
              <td style={td}>{l.telefono ? <a href={`tel:${l.telefono}`} style={{ color: "#0f172a" }}>{l.telefono}</a> : "—"}</td>
              {mostrarFecha && <td style={{ ...td, color: "#b91c1c", fontWeight: 600 }}>{l.proximo_seguimiento ? formatoFecha(l.proximo_seguimiento) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MiDiaPage() {
  const usuaria = await requireUsuaria();
  const hoy = hoyMadrid();
  const grupos = agruparSeguimientos(await listSeguimientosUsuaria(usuaria.id, hoy), hoy);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Mi día · {formatoFecha(hoy)}</h1>
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        Leads asignados a ti con seguimiento para hoy o atrasado. Al registrar la llamada, pon la fecha del siguiente paso para que vuelva a salir aquí.
      </p>
      <section style={tarjeta}>
        <h2 style={titulo}>Atrasados ({grupos.atrasados.length})</h2>
        <Tabla leads={grupos.atrasados} mostrarFecha />
      </section>
      <section style={tarjeta}>
        <h2 style={titulo}>Para hoy ({grupos.hoy.length})</h2>
        <Tabla leads={grupos.hoy} mostrarFecha={false} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: limpio.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/panel/ventas/(app)/hoy"
git commit -m "feat(ventas): pantalla Mi día con seguimientos atrasados y de hoy"
```

---
### Task 15: Paneles con embudo y esfuerzo

Panel general (una tarjeta por marca) y resumen de cada marca, con selector de mes.

**Files:**
- Create: `src/lib/ventas/paneles.ts`
- Create: `src/app/(site)/panel/ventas/_componentes/SelectorMes.tsx`
- Create: `src/app/(site)/panel/ventas/_componentes/EmbudoVista.tsx`
- Modify: `src/app/(site)/panel/ventas/(app)/page.tsx` (sustituye la versión de la tarea 11)
- Modify: `src/app/(site)/panel/ventas/(app)/[slug]/page.tsx` (sustituye la redirección de la tarea 11)
- Test: `src/lib/__tests__/ventas-paneles.test.ts`

**Interfaces:**
- Consumes: `listLeads`, `listActividadMarca`, `listCambiosFaseMarca`, `listMarcas`, `Marca` (Task 6); `calcularEmbudo`, `resumenMes`, `rangoConsultaMes`, `hoyMadrid`, `mesDe`, `esMes`, `mesAnterior`, `mesSiguiente`, `nombreMes`, `pctPaso`, `ETAPAS_EMBUDO`, `Embudo`, `ResumenMes` (Task 5); `FASES`, `FASE_LABELS` (Task 2); `requireUsuaria`; `cargarMarca`, `MarcaCabecera`, `NuevaMarcaForm`, estilos.
- Produces:
  - `paneles.ts`: `interface DatosPanelMarca { marca: Marca; embudo: Embudo; resumen: ResumenMes }`, `cargarPanelMarca(marca: Marca, mes: string, hoy: string): Promise<DatosPanelMarca>`, `mesDeConsulta(raw: unknown, now?: Date): string`
  - `SelectorMes({ mes, ruta }: { mes: string; ruta: string })`
  - `EmbudoVista({ embudo }: { embudo: Embudo })`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/ventas-paneles.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ listLeads: vi.fn(), listActividadMarca: vi.fn(), listCambiosFaseMarca: vi.fn() }));
vi.mock("../ventas/db", () => m);

import { cargarPanelMarca, mesDeConsulta } from "../ventas/paneles";

describe("cargarPanelMarca", () => {
  beforeEach(() => {
    m.listLeads.mockReset().mockResolvedValue([
      { id: "a", fase: "interesado", created_at: "2026-09-03T10:00:00Z", proximo_seguimiento: "2026-09-01" },
    ]);
    m.listActividadMarca.mockReset().mockResolvedValue([{ tipo: "llamada", datos: {}, created_at: "2026-09-03T11:00:00Z" }]);
    m.listCambiosFaseMarca.mockReset().mockResolvedValue([{ lead_id: "a", datos: { fase_nueva: "interesado" } }]);
  });

  test("pide la actividad del rango del mes y combina embudo y resumen", async () => {
    const datos = await cargarPanelMarca({ id: "m1" } as never, "2026-09", "2026-09-17");
    expect(m.listActividadMarca).toHaveBeenCalledWith("m1", "2026-08-31T00:00:00.000Z", "2026-10-02T00:00:00.000Z");
    expect(datos.embudo.alcanzaron.interesado).toBe(1);
    expect(datos.resumen).toEqual({ leadsNuevos: 1, llamadas: 1, interesados: 0, muestras: 0, seguimientosAtrasados: 1 });
  });
});

describe("mesDeConsulta", () => {
  test("usa el mes de la URL si es válido; si no, el actual en Madrid", () => {
    expect(mesDeConsulta("2026-08")).toBe("2026-08");
    expect(mesDeConsulta("basura", new Date("2026-09-30T23:30:00Z"))).toBe("2026-10");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ventas-paneles.test.ts`
Expected: FAIL — no se resuelve `../ventas/paneles`.

- [ ] **Step 3: Implement `paneles.ts`**

`src/lib/ventas/paneles.ts`:

```ts
import "server-only";
import { listActividadMarca, listCambiosFaseMarca, listLeads, type Marca } from "./db";
import { calcularEmbudo, esMes, mesDe, rangoConsultaMes, resumenMes, type Embudo, type ResumenMes } from "./metricas";

export interface DatosPanelMarca {
  marca: Marca;
  embudo: Embudo;
  resumen: ResumenMes;
}

export async function cargarPanelMarca(marca: Marca, mes: string, hoy: string): Promise<DatosPanelMarca> {
  const rango = rangoConsultaMes(mes);
  const [leads, actividad, cambios] = await Promise.all([
    listLeads(marca.id),
    listActividadMarca(marca.id, rango.desde, rango.hasta),
    listCambiosFaseMarca(marca.id),
  ]);
  return { marca, embudo: calcularEmbudo(leads, cambios), resumen: resumenMes(mes, leads, actividad, hoy) };
}

export function mesDeConsulta(raw: unknown, now: Date = new Date()): string {
  return esMes(raw) ? raw : mesDe(now.toISOString());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ventas-paneles.test.ts`
Expected: PASS.

- [ ] **Step 5: Shared view components**

`src/app/(site)/panel/ventas/_componentes/SelectorMes.tsx`:

```tsx
import Link from "next/link";
import { mesAnterior, mesSiguiente, nombreMes } from "@/lib/ventas/metricas";

export function SelectorMes({ mes, ruta }: { mes: string; ruta: string }) {
  const boton = { padding: "4px 10px", border: "1px solid #cbd5e1", borderRadius: 6, textDecoration: "none", color: "#334155", background: "#fff" } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Link href={`${ruta}?mes=${mesAnterior(mes)}`} style={boton} aria-label="Mes anterior">←</Link>
      <strong style={{ minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>{nombreMes(mes)}</strong>
      <Link href={`${ruta}?mes=${mesSiguiente(mes)}`} style={boton} aria-label="Mes siguiente">→</Link>
    </div>
  );
}
```

`src/app/(site)/panel/ventas/_componentes/EmbudoVista.tsx`:

```tsx
import { ETAPAS_EMBUDO, pctPaso, type Embudo } from "@/lib/ventas/metricas";

const TEXTO: Record<(typeof ETAPAS_EMBUDO)[number], string> = {
  contactado: "Contactados",
  interesado: "Interesados",
  muestras: "Con muestras",
  cliente: "Clientes",
};

export function EmbudoVista({ embudo }: { embudo: Embudo }) {
  const pasos = [{ clave: "total", texto: "Leads", valor: embudo.total }, ...ETAPAS_EMBUDO.map((e) => ({ clave: e, texto: TEXTO[e], valor: embudo.alcanzaron[e] }))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {pasos.map((p, i) => {
        const anterior = i === 0 ? null : pasos[i - 1].valor;
        const ancho = embudo.total > 0 ? Math.max(4, (p.valor / embudo.total) * 100) : 4;
        const paso = anterior === null ? null : pctPaso(p.valor, anterior);
        return (
          <div key={p.clave} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 8, alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "#475569" }}>{p.texto}</span>
            <div style={{ background: "#f1f5f9", borderRadius: 4, height: 18 }}>
              <div style={{ width: `${ancho}%`, height: "100%", background: "#187bef", borderRadius: 4 }} />
            </div>
            <span style={{ textAlign: "right" }}>
              <strong>{p.valor}</strong>
              {paso !== null && <span style={{ color: "#64748b" }}> · {paso} %</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

`EmbudoVista` enseña el embudo acumulado (todas las épocas); el % es el paso desde la etapa anterior.

- [ ] **Step 6: Panel general con métricas**

Sustituir por completo `src/app/(site)/panel/ventas/(app)/page.tsx`:

```tsx
import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listMarcas } from "@/lib/ventas/db";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { cargarPanelMarca, mesDeConsulta } from "@/lib/ventas/paneles";
import { EmbudoVista } from "../_componentes/EmbudoVista";
import { SelectorMes } from "../_componentes/SelectorMes";
import { tarjeta } from "../_componentes/estilos";
import { NuevaMarcaForm } from "./NuevaMarcaForm";

function Cifra({ texto, valor, alerta = false }: { texto: string; valor: number; alerta?: boolean }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{texto}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alerta && valor > 0 ? "#b91c1c" : "#0f172a" }}>{valor}</div>
    </div>
  );
}

export default async function PanelVentasPage({ searchParams }: { searchParams: Promise<{ aviso?: string; mes?: string }> }) {
  const usuaria = await requireUsuaria();
  const sp = await searchParams;
  const mes = mesDeConsulta(sp.mes);
  const hoy = hoyMadrid();
  const marcas = (await listMarcas()).filter((m) => m.estado !== "finalizada");
  const paneles = await Promise.all(marcas.map((m) => cargarPanelMarca(m, mes, hoy)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sp.aviso === "permiso" && <p style={{ margin: 0, color: "#b45309", fontWeight: 600 }}>Esa sección es solo para admin.</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Marcas</h1>
        <SelectorMes mes={mes} ruta="/panel/ventas" />
      </div>
      {paneles.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay ninguna marca activa.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {paneles.map(({ marca, embudo, resumen }) => (
          <section key={marca.id} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Link href={`/panel/ventas/${marca.slug}?mes=${mes}`} style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                {marca.nombre}
              </Link>
              {marca.estado === "pausada" && <span style={{ fontSize: 12, color: "#92400e" }}>Pausada</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Cifra texto="Leads nuevos" valor={resumen.leadsNuevos} />
              <Cifra texto="Llamadas" valor={resumen.llamadas} />
              <Cifra texto="Interesados" valor={resumen.interesados} />
              <Cifra texto="Muestras" valor={resumen.muestras} />
              <Cifra texto="Seguim. atrasados" valor={resumen.seguimientosAtrasados} alerta />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Embudo acumulado</div>
              <EmbudoVista embudo={embudo} />
            </div>
          </section>
        ))}
      </div>
      {usuaria.rol === "admin" && <NuevaMarcaForm />}
    </div>
  );
}
```

- [ ] **Step 7: Resumen de la marca**

Sustituir por completo `src/app/(site)/panel/ventas/(app)/[slug]/page.tsx`:

```tsx
import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { FASES, FASE_LABELS } from "@/lib/ventas/dominio";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { cargarPanelMarca, mesDeConsulta } from "@/lib/ventas/paneles";
import { cargarMarca } from "../../_componentes/cargarMarca";
import { EmbudoVista } from "../../_componentes/EmbudoVista";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../_componentes/MarcaCabecera";
import { SelectorMes } from "../../_componentes/SelectorMes";
import { tarjeta, titulo } from "../../_componentes/estilos";

export default async function MarcaResumenPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);
  const mes = mesDeConsulta(sp.mes);
  const { embudo, resumen } = await cargarPanelMarca(marca, mes, hoyMadrid());

  const filas: [string, number][] = [
    ["Leads nuevos", resumen.leadsNuevos],
    ["Llamadas hechas", resumen.llamadas],
    ["Pasaron a interesado", resumen.interesados],
    ["Envíos de muestras", resumen.muestras],
    ["Seguimientos atrasados (ahora)", resumen.seguimientosAtrasados],
  ];

  return (
    <div>
      <MarcaCabecera marca={marca} activa="resumen" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <section style={tarjeta}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h2 style={{ ...titulo, margin: 0 }}>Actividad del mes</h2>
            <SelectorMes mes={mes} ruta={`/panel/ventas/${slug}`} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {filas.map(([texto, valor]) => (
                <tr key={texto}>
                  <td style={{ padding: "6px 0", color: "#475569" }}>{texto}</td>
                  <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700 }}>{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={tarjeta}>
          <h2 style={titulo}>Embudo acumulado</h2>
          <EmbudoVista embudo={embudo} />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            Cuenta cada lead en todas las etapas a las que llegó alguna vez. El % es el paso desde la etapa anterior.
          </p>
        </section>

        <section style={tarjeta}>
          <h2 style={titulo}>Leads por fase (ahora)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {FASES.map((f) => (
              <Link key={f} href={`/panel/ventas/${slug}/leads?fase=${f}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "#0f172a" }}>
                <FaseEtiqueta fase={f} />
                <strong aria-label={FASE_LABELS[f]}>{embudo.porFase[f]}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npx vitest run src/lib/__tests__/ventas-* && npm run typecheck`
Expected: PASS, typecheck limpio.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ventas/paneles.ts src/lib/__tests__/ventas-paneles.test.ts "src/app/(site)/panel/ventas"
git commit -m "feat(ventas): paneles con embudo y actividad del mes"
```

---

### Task 16: Verificación completa y puesta en producción

**Files:**
- Modify: ninguno salvo correcciones que salgan de la verificación (cada una con su test).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: fase 1 verificada en local y, con el visto bueno de Yael, en producción.

- [ ] **Step 1: Suite, tipos y build**

Run: `npx vitest run && npm run typecheck && npm run build 2>&1 | tail -30`
Expected: todo en verde salvo los 2 tests de `PromoPopup` que ya fallaban en `main` antes de este trabajo (confirmar que siguen siendo solo esos). Build compila y lista las rutas `/panel/ventas/*` y `/api/ventas/leads/[slug]`.

- [ ] **Step 2: Datos de prueba**

Con el servidor local (`npx next dev -p 3123`) y la admin de la tarea 1, crear desde el panel una marca **`prueba-qa`** (nunca usar Hydrup para pruebas). Crear una segunda usuaria comercial `qa-comercial@dinkbit.com`.

- [ ] **Step 3: Recorrido en el navegador (Playwright)**

Comprobar cada punto y hacer captura de las pantallas principales en el scratchpad:
1. `/panel/ventas` sin sesión → redirige a `/panel/ventas/login?next=%2Fpanel%2Fventas`. `/panel` sigue pidiendo la contraseña compartida.
2. Login con contraseña mala → «Email o contraseña incorrectos.». Login bueno → panel.
3. Como comercial: `/panel/ventas/usuarias` → vuelve al panel con «Esa sección es solo para admin.»; en Condiciones los campos están deshabilitados y no se ve el secreto.
4. Condiciones (admin): guardar 4 %, plazo vacío, un SKU; añadir una exclusión con `cliente@qa.es`.
5. Leads: descargar plantilla; importar un CSV con 3 filas buenas, 1 duplicada dentro del fichero y 1 con `cliente@qa.es` → resultado «2/3 nuevos · duplicados · 1 excluido» coherente. Subir un CSV con una fila sin teléfono ni email → no se importa nada y sale la línea.
6. Alta manual de un lead → abre su ficha con código `PRU-XXXXXX`.
7. Ficha: registrar llamada «Volver a llamar» con seguimiento hoy → fase Contactado, historial con autora y fecha; asignar a la comercial; como comercial, aparece en Mi día → Para hoy.
8. Muestras enviadas → fase Muestras. Llamada «No le interesa» → fase No le interesa y seguimiento vacío.
9. Webhook: `curl -X POST http://localhost:3123/api/ventas/leads/prueba-qa -H "x-webhook-secret: <secreto>" -H "Content-Type: application/json" -d '{"company_name":"Box QA","email":"box@qa.es","campaign_name":"QA"}'` → 200 `duplicado:false`; repetir → 200 `duplicado:true` y nota «Ha vuelto a llegar desde anuncios (QA).» en su historial; secreto malo → 401.
10. Panel general y resumen de `prueba-qa`: los números cuadran con lo hecho (leads nuevos, llamadas, muestras, embudo).
11. Inmutabilidad: en el SQL Editor, `update public.ventas_actividad set nota = 'x' where true;` → error «ventas_actividad es de solo inserción…».

- [ ] **Step 4: Limpiar los datos de prueba**

Los leads con historial no se pueden borrar (por diseño). Dejar la marca `prueba-qa` en estado **finalizada** desde Condiciones (desaparece del panel general) y desactivar `qa-comercial`. Decírselo a Yael.

- [ ] **Step 5: Revisión de código**

Invocar `superpowers:requesting-code-review` sobre la rama/commits de la fase 1 y aplicar lo que salga (con test si es un bug).

- [ ] **Step 6: Producción (solo con OK explícito de Yael)**

Checklist antes del push:
- [ ] `SUPABASE_PUBLISHABLE_KEY` en Vercel (Production).
- [ ] Alta de usuarios desactivada en Supabase Auth.
- [ ] Migración aplicada (ya se hizo en la tarea 1).

```bash
git push origin main
```

Tras el deploy: `curl -s -o /dev/null -w "%{http_code}\n" https://www.dinkbit.es/panel/ventas` → 307 hacia el login; `curl -s -X POST https://www.dinkbit.es/api/ventas/leads/hydrup -H "Content-Type: application/json" -d '{}' -w " %{http_code}\n"` → 401. Crear la marca **Hydrup** con sus condiciones reales (4 %, plazo vacío) y dar de alta a las comerciales.
