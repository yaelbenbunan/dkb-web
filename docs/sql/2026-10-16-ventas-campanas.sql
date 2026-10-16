-- Unificación del CRM, proyecto 2: Campañas como módulo opcional por marca de
-- ventas (docs/superpowers/specs/2026-10-16-ventas-campanas-design.md).
-- Ejecutar en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Idempotente: se puede volver a ejecutar sin efectos nuevos.
--
-- El código tolera que este SQL no se haya ejecutado: dinkbit sigue mandando
-- campañas como hoy, y el resto de marcas no puede activar el módulo hasta
-- que se ejecute.

-- 1. Módulos opcionales y remitentes de campañas por marca.
alter table public.ventas_marcas
  add column if not exists modulos text[] not null default '{}',
  add column if not exists campanas_remitentes text[] not null default '{}';

-- dinkbit ya tenía Campañas (en /panel): se le enciende el módulo.
update public.ventas_marcas
set modulos = array_append(modulos, 'campanas')
where slug = 'dinkbit' and not ('campanas' = any (modulos));

-- 2. Cada campaña y cada plantilla guardada es de una marca. Sin marca = dinkbit
--    (lo que había antes); se rellenan igualmente para que quede explícito.
alter table public.campaigns
  add column if not exists marca_id uuid references public.ventas_marcas (id);
create index if not exists campaigns_marca_id_idx on public.campaigns (marca_id);

alter table public.email_templates
  add column if not exists marca_id uuid references public.ventas_marcas (id);
create index if not exists email_templates_marca_id_idx on public.email_templates (marca_id);

update public.campaigns
set marca_id = (select id from public.ventas_marcas where slug = 'dinkbit')
where marca_id is null;

-- Las predefinidas (is_builtin) se quedan sin marca: las ven todas las marcas.
update public.email_templates
set marca_id = (select id from public.ventas_marcas where slug = 'dinkbit')
where marca_id is null and not is_builtin;

notify pgrst, 'reload schema';

-- 3. Comprobación. Debe salir:
--   columnas = 4, dinkbit_con_campanas = 1, campanas_sin_marca = 0,
--   plantillas_propias_sin_marca = 0.
select
  (select count(*) from information_schema.columns
    where (table_name = 'ventas_marcas' and column_name in ('modulos', 'campanas_remitentes'))
       or (table_name in ('campaigns', 'email_templates') and column_name = 'marca_id')) as columnas,
  (select count(*) from public.ventas_marcas where slug = 'dinkbit' and 'campanas' = any (modulos)) as dinkbit_con_campanas,
  (select count(*) from public.campaigns where marca_id is null) as campanas_sin_marca,
  (select count(*) from public.email_templates where marca_id is null and not is_builtin) as plantillas_propias_sin_marca;
