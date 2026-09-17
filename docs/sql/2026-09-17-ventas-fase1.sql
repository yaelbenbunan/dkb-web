-- Módulo de ventas B2B con comisión (/panel/ventas), fase 1.
-- Spec: docs/superpowers/specs/2026-09-17-captacion-b2b-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Todas las tablas llevan RLS sin políticas: solo las lee la clave de servicio
-- desde el servidor. Las funciones revocan execute a anon/authenticated, porque
-- la clave publicable (que usa el login) podría llamarlas por la API.

-- Normalización de contacto -----------------------------------------------
-- Funciones compartidas para normalizar email y teléfono.
-- IMPORTANTE: deben mantenerse idénticas a normalizarEmail/normalizarTelefono
-- en src/lib/ventas/dominio.ts
create or replace function public.ventas_norm_email(p text)
returns text
language sql immutable as $$
  select nullif(lower(btrim(p)), '')
$$;

create or replace function public.ventas_norm_telefono(p text)
returns text
language sql immutable as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 6
    then right(regexp_replace(p, '\D', '', 'g'), 9) end
$$;

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
  email_norm text generated always as (public.ventas_norm_email(email)) stored,
  telefono_norm text generated always as (public.ventas_norm_telefono(telefono)) stored,
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
  email_norm text generated always as (public.ventas_norm_email(email)) stored,
  telefono_norm text generated always as (public.ventas_norm_telefono(telefono)) stored,
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
revoke execute on function public.ventas_norm_email(text) from public, anon, authenticated;
revoke execute on function public.ventas_norm_telefono(text) from public, anon, authenticated;
