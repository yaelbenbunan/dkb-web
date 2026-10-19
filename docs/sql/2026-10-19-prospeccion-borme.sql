-- Prospección: empresas recién constituidas, del BORME (sección A).
-- Spec: docs/superpowers/specs/2026-10-19-prospeccion-borme-design.md
--
-- `prospect_borme`: las constituciones que importa
-- `scripts/prospeccion/importar-borme.ts` (una por anuncio del BORME). La
-- búsqueda «Empresas nuevas» de Prospección lee de aquí y guarda lo que
-- encuentra en `prospects` con source = 'borme' (el CHECK ya lo admite desde
-- 2026-10-16-prospeccion-overture.sql).
--
-- Solo datos de la sociedad. A propósito NO hay columnas para administradores,
-- socios ni apoderados: son datos personales que no hacen falta para escribir
-- a la empresa, y el importador los descarta al leer.
--
-- Reutilización: condiciones del BOE (https://www.boe.es/informacion/aviso_legal/index.php#reutilizacion);
-- se cita «Basado en datos de la Agencia Estatal Boletín Oficial del Estado».
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente. RLS sin políticas: solo lee la clave de servicio, como el
-- resto de tablas prospect_*.

create table if not exists public.prospect_borme (
  id text primary key,                    -- {año}-{número de anuncio}, p. ej. 2026-460946
  nombre text not null,                   -- denominación social
  fecha_publicacion date not null,        -- día del BORME
  inicio_operaciones date,                -- «Comienzo de operaciones»
  objeto text,                            -- objeto social (el BORME ya lo trunca)
  domicilio text,                         -- domicilio social, sin el municipio
  municipio text,
  municipio_clave text,                   -- municipio sin tildes y en minúsculas
  provincia text not null,                -- nombre de src/lib/prospeccion/provincias.ts
  capital numeric(14,2),                  -- euros
  web text,                               -- la que declara la sociedad, si la declara
  borme_id text not null,                 -- documento de origen, p. ej. BORME-A-2026-200-28
  url_pdf text,
  actualizado_en timestamptz not null default now()
);

create index if not exists prospect_borme_municipio_idx on public.prospect_borme (municipio_clave, fecha_publicacion desc);
create index if not exists prospect_borme_provincia_idx on public.prospect_borme (provincia, fecha_publicacion desc);

alter table public.prospect_borme enable row level security;

-- Por si la migración de Overture no se ejecutó: los CHECK con 'borme'.
alter table public.prospect_searches drop constraint if exists prospect_searches_source_check;
alter table public.prospect_searches
  add constraint prospect_searches_source_check check (source in ('osm', 'overture', 'borme'));

alter table public.prospects drop constraint if exists prospects_source_check;
alter table public.prospects
  add constraint prospects_source_check check (source in ('osm', 'overture', 'borme'));

-- Comprobación: una fila con `prospect_borme` y la RLS activa, y los dos CHECK con 'borme'.
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c
where c.relname = 'prospect_borme';

select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conname in ('prospects_source_check', 'prospect_searches_source_check');
