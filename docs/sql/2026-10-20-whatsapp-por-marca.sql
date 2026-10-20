-- WhatsApp: un número por marca con coexistencia (Embedded Signup).
-- Plan: docs/superpowers/plans (coexistencia por marca).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente y va en una transacción. Todo lo nuevo es aditivo: el código
-- ya desplegado sigue funcionando con esta migración aplicada.
-- RLS activada sin políticas en las tablas nuevas: solo la lee la clave de
-- servicio desde el servidor (el token cifrado nunca llega al navegador).

begin;

-- Número conectado de cada marca.
alter table public.ventas_marcas
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_waba_id text,
  add column if not exists whatsapp_conectado_en timestamptz,
  add column if not exists whatsapp_estado text,
  add column if not exists whatsapp_motivo text,
  add column if not exists whatsapp_historial text;

alter table public.ventas_marcas drop constraint if exists ventas_marcas_whatsapp_estado_check;
alter table public.ventas_marcas
  add constraint ventas_marcas_whatsapp_estado_check
  check (whatsapp_estado in ('conectado', 'desconectado'));

alter table public.ventas_marcas drop constraint if exists ventas_marcas_whatsapp_historial_check;
alter table public.ventas_marcas
  add constraint ventas_marcas_whatsapp_historial_check
  check (whatsapp_historial in ('pedido', 'completo', 'rechazado'));

-- Un número solo puede pertenecer a una marca.
create unique index if not exists ventas_marcas_whatsapp_phone_number_id_key
  on public.ventas_marcas (whatsapp_phone_number_id);

-- Token de acceso de cada marca, cifrado.
create table if not exists public.ventas_whatsapp_credenciales (
  marca_id uuid primary key references public.ventas_marcas(id) on delete cascade,
  token_cifrado text not null,
  actualizado_en timestamptz not null default now()
);

-- Nombres de contacto que llegan por la sincronización de coexistencia.
create table if not exists public.ventas_whatsapp_contactos (
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  wa_id text not null,
  nombre text not null,
  actualizado_en timestamptz not null default now(),
  primary key (marca_id, wa_id)
);

alter table public.ventas_whatsapp_credenciales enable row level security;
alter table public.ventas_whatsapp_contactos enable row level security;

revoke all on public.ventas_whatsapp_credenciales from anon, authenticated;
revoke all on public.ventas_whatsapp_contactos from anon, authenticated;
grant all on public.ventas_whatsapp_credenciales to service_role;
grant all on public.ventas_whatsapp_contactos to service_role;

-- Conversaciones y mensajes.
alter table public.ventas_conversaciones add column if not exists nombre_contacto text;

alter table public.ventas_mensajes add column if not exists origen text;
alter table public.ventas_mensajes drop constraint if exists ventas_mensajes_origen_check;
alter table public.ventas_mensajes
  add constraint ventas_mensajes_origen_check
  check (origen in ('cliente', 'bot', 'panel', 'movil', 'historial'));

-- Los leads que nacen de un chat de WhatsApp tienen origen propio.
alter table public.ventas_leads drop constraint if exists ventas_leads_origen_check;
alter table public.ventas_leads
  add constraint ventas_leads_origen_check
  check (origen in ('lista', 'anuncio', 'manual', 'web', 'whatsapp'));

commit;

-- Comprobación: debe devolver las columnas nuevas (15 filas) y, después, la
-- restricción de origen con 'whatsapp' dentro.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'ventas_marcas' and column_name like 'whatsapp\_%')
    or (table_name = 'ventas_conversaciones' and column_name = 'nombre_contacto')
    or (table_name = 'ventas_mensajes' and column_name = 'origen')
    or (table_name = 'ventas_whatsapp_credenciales')
    or (table_name = 'ventas_whatsapp_contactos'))
order by table_name, column_name;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.ventas_leads'::regclass
  and conname = 'ventas_leads_origen_check';
