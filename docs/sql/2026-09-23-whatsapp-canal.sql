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
  -- Desnormalizado a propósito: sin esto, pintar la bandeja de conversaciones
  -- obligaría a leer el historial completo de mensajes de la marca solo para
  -- quedarse con uno por conversación (degrada con el total de mensajes, no
  -- con el número de conversaciones). Lo mantienen guardarEntrante y
  -- guardarSaliente cada vez que escriben un mensaje.
  ultimo_texto text,
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
-- Único NO parcial a propósito: en Postgres los NULL son distintos entre sí en
-- un índice único, así que los salientes simulados sin wamid no chocan igual
-- que con un índice parcial (`where wamid is not null`). La diferencia es que
-- este SÍ lo puede inferir `ON CONFLICT (wamid)` / `upsert(..., { onConflict:
-- "wamid" })`: Postgres solo usa un índice parcial como árbitro de un
-- ON CONFLICT si el predicado se repite literalmente en la cláusula, y
-- PostgREST no permite expresar eso a través de `onConflict`. Con el índice
-- parcial, TODO upsert (no solo los duplicados) fallaba con
-- "42P10 there is no unique or exclusion constraint matching the ON CONFLICT
-- specification".
create unique index if not exists ventas_mensajes_wamid_idx
  on public.ventas_mensajes (wamid);
create index if not exists ventas_mensajes_hilo_idx
  on public.ventas_mensajes (conversacion_id, created_at);

alter table public.ventas_conversaciones enable row level security;
alter table public.ventas_mensajes enable row level security;

-- Comprobación manual obligatoria al aplicar esta migración (ningún test con
-- mocks puede verificar esto: valida la llamada de JS, no la semántica SQL
-- real de ON CONFLICT contra este índice). En el SQL Editor de Supabase:
--
--   insert into ventas_mensajes (conversacion_id, direccion, wamid, texto)
--     values ('<id de una conversación real>', 'entrante', 'wamid-test-1', 'primero');
--   insert into ventas_mensajes (conversacion_id, direccion, wamid, texto)
--     values ('<misma conversación>', 'entrante', 'wamid-test-2', 'segundo');
--   -- repetir el primer wamid con upsert + onConflict: no debe dar 42P10 y
--   -- no debe insertar una segunda fila.
--   insert into ventas_mensajes (conversacion_id, direccion, wamid, texto)
--     values ('<misma conversación>', 'entrante', 'wamid-test-1', 'repetido')
--     on conflict (wamid) do nothing;
--   select count(*) from ventas_mensajes where wamid = 'wamid-test-1'; -- debe dar 1
--
-- Limpiar las filas de prueba después.
