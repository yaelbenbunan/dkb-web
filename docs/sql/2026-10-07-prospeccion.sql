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
