-- Prospección: la fuente de negocios pasa de Google Places a OpenStreetMap.
--
-- Las condiciones de Google Maps Platform (cláusula 3.3.2) prohíben copiar y
-- guardar nombres y direcciones de negocios, que es lo que hace esta pestaña.
-- OpenStreetMap publica sus datos con licencia abierta (ODbL) y sí lo permite.
--
-- Solo cambia qué valores admite la columna `source`. Ejecutar una vez en el
-- SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc). Es idempotente.

alter table public.prospect_searches drop constraint if exists prospect_searches_source_check;
alter table public.prospect_searches
  add constraint prospect_searches_source_check check (source in ('osm', 'borme'));

alter table public.prospects drop constraint if exists prospects_source_check;
alter table public.prospects
  add constraint prospects_source_check check (source in ('osm', 'borme'));
