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
