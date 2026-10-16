-- Prospección: negocios de Overture Maps Places.
-- Spec: docs/superpowers/specs/2026-10-16-prospeccion-overture-design.md
--
-- 1. `prospect_lugares`: los lugares de España que importa
--    `scripts/prospeccion/importar-overture.ts` (uno por id de Overture). La
--    búsqueda de Prospección lee de aquí; si la tabla no existe o no tiene nada
--    para una búsqueda, sigue buscando en OpenStreetMap como hasta ahora.
-- 2. `prospects.source` y `prospect_searches.source` admiten 'overture'.
--
-- Licencia de los datos: CDLA Permissive 2.0 (Foursquare: Apache 2.0;
-- AllThePlaces: CC0 1.0). Se pueden guardar citando la fuente; por eso cada
-- fila guarda sus fuentes y licencias.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente. RLS sin políticas: solo lee la clave de servicio, como el
-- resto de tablas prospect_*.

create table if not exists public.prospect_lugares (
  id text primary key,                         -- id (GERS) de Overture
  nombre text not null,
  categorias text[] not null default '{}',     -- claves de src/lib/prospeccion/categorias.ts
  categoria_overture text,                     -- taxonomy.primary
  direccion text,
  municipio text,
  municipio_clave text,                        -- municipio sin tildes y en minúsculas
  provincia text,                              -- por el código postal
  cp text,
  lat double precision,
  lon double precision,
  telefono text,
  telefono_clave text,                         -- nueve dígitos, para comparar
  web text,
  email text,
  redes text[] not null default '{}',
  fuentes text[] not null default '{}',        -- sources[].dataset (meta, foursquare…)
  licencias text[] not null default '{}',
  confianza real not null,
  release text not null,                       -- release de Overture, p. ej. 2026-09-23.1
  actualizado_en timestamptz not null default now()
);

create index if not exists prospect_lugares_categorias_idx on public.prospect_lugares using gin (categorias);
create index if not exists prospect_lugares_municipio_idx on public.prospect_lugares (municipio_clave, confianza desc);
create index if not exists prospect_lugares_provincia_idx on public.prospect_lugares (provincia, confianza desc);
create index if not exists prospect_lugares_release_idx on public.prospect_lugares (release);
create index if not exists prospect_lugares_telefono_idx on public.prospect_lugares (telefono_clave);

alter table public.prospect_lugares enable row level security;

alter table public.prospect_searches drop constraint if exists prospect_searches_source_check;
alter table public.prospect_searches
  add constraint prospect_searches_source_check check (source in ('osm', 'overture', 'borme'));

alter table public.prospects drop constraint if exists prospects_source_check;
alter table public.prospects
  add constraint prospects_source_check check (source in ('osm', 'overture', 'borme'));

-- Comprobación: debe devolver una fila con `prospect_lugares` y la RLS activa,
-- y los dos CHECK con 'overture'.
select c.relname as tabla, c.relrowsecurity as rls
from pg_class c
where c.relname = 'prospect_lugares';

select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conname in ('prospects_source_check', 'prospect_searches_source_check');
