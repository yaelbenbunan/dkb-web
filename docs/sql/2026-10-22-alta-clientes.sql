-- Formulario de alta de clientes: /alta/<token> (público, sin cuenta) y
-- /panel/ventas/altas (solo admin).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente y va en una transacción. Todo es nuevo: no toca nada de lo
-- que ya existe. El código desplegado sin esta migración enseña un aviso en
-- /panel/ventas/altas y responde «Este enlace no es válido» en /alta/<token>.
--
-- Tabla y bucket solo para la clave de servicio: RLS activada SIN políticas
-- (como ventas_whatsapp_credenciales). El navegador del cliente nunca lee la
-- tabla; sube los archivos con una URL firmada que le da el servidor.

begin;

create table if not exists public.alta_clientes (
  id uuid primary key default gen_random_uuid(),
  -- 32 bytes aleatorios en base64url (43 caracteres): el único acceso del cliente.
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  cliente text not null check (length(btrim(cliente)) between 1 and 120),
  activa boolean not null default true,
  respuestas jsonb not null default '{}'::jsonb,
  -- [{campo, ruta, nombre, tamano, tipo}]; los archivos viven en el bucket altas-clientes.
  archivos jsonb not null default '[]'::jsonb check (jsonb_typeof(archivos) = 'array'),
  enviada_en timestamptz,
  created_at timestamptz not null default now(),
  creada_por uuid references public.ventas_usuarias(id) on delete set null
);

-- Firmas de subida aún sin confirmar ([{ruta, firmada, expira, subida?}]):
-- cuentan en el tope de 40 archivos / 1 GB (a 50 MB cada una) y para el límite
-- de 15 firmas cada 10 minutos. Va con alter para que el SQL se pueda volver a
-- ejecutar sobre una tabla creada con la versión anterior de este archivo.
alter table public.alta_clientes
  add column if not exists subidas_pendientes jsonb not null default '[]'::jsonb;

alter table public.alta_clientes drop constraint if exists alta_clientes_subidas_pendientes_check;
alter table public.alta_clientes
  add constraint alta_clientes_subidas_pendientes_check check (jsonb_typeof(subidas_pendientes) = 'array');

create index if not exists alta_clientes_created_at_idx on public.alta_clientes (created_at desc);

alter table public.alta_clientes enable row level security;
revoke all on public.alta_clientes from anon, authenticated;
grant all on public.alta_clientes to service_role;

-- Bucket PRIVADO: sin políticas en storage.objects para él, así que solo entra
-- la clave de servicio (y las URLs firmadas que genera el servidor: subida por
-- archivo y descarga de 1 h para el panel). 50 MB por archivo, igual que el
-- límite que comprueba el servidor. Sin lista de tipos MIME: el navegador no
-- sabe el tipo de un .ai, un .eps o un .heic; los tipos los filtra el servidor
-- por extensión antes de firmar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('altas-clientes', 'altas-clientes', false, 52428800, null)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;

-- Comprobación: debe devolver 10 columnas de alta_clientes (la última,
-- subidas_pendientes jsonb), rls = true y
-- el bucket con public = false y file_size_limit = 52428800.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'alta_clientes'
order by ordinal_position;

select relname, relrowsecurity as rls
from pg_class
where oid = 'public.alta_clientes'::regclass;

select id, public, file_size_limit
from storage.buckets
where id = 'altas-clientes';
