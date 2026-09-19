-- Secuencias de WhatsApp del módulo de ventas B2B (/panel/ventas), fase 1.
-- Spec: docs/superpowers/specs/2026-09-18-secuencias-whatsapp-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Fase 1 no envía nada ni habla con Meta: solo se guarda la secuencia en
-- borrador para poder escribirla y probarla. RLS activada sin políticas,
-- como el resto del módulo: solo la lee la clave de servicio desde el
-- servidor. Los pasos van en `pasos` (jsonb); la forma la valida zod en
-- src/lib/ventas/secuencias.ts, nunca la base.

create table if not exists public.ventas_secuencias (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  nombre text not null,
  estado text not null default 'borrador' check (estado in ('borrador', 'activa', 'archivada')),
  pasos jsonb not null default '{}'::jsonb,
  creada_por uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ventas_secuencias_marca_idx
  on public.ventas_secuencias (marca_id, created_at desc);

alter table public.ventas_secuencias enable row level security;
