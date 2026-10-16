-- Unificación del CRM, proyecto 3: Prospección dentro de /panel/ventas.
-- Spec: docs/superpowers/specs/2026-10-16-ventas-prospeccion-design.md
--
-- La pestaña no necesita cambios de estructura: las tablas `prospect_*` se
-- quedan como están, con los prospectos, búsquedas, plantillas y bajas ya
-- guardados. Esto solo reenlaza los prospectos que se convirtieron en lead
-- ANTES de la unificación: su `lead_id` es el id de `imagina_leads`, y desde el
-- proyecto 1 ese lead vive en `ventas_leads` (marca dinkbit) con ese id en
-- `id_externo`. Tras esto, `lead_id` es el id de ventas.
--
-- OPCIONAL: el código ya traduce los ids viejos al pintar la página. Ejecutar
-- DESPUÉS de `2026-10-15-crm-unificacion-datos.sql` (antes no hay nada que
-- reenlazar y no cambia ninguna fila). Idempotente: una segunda vez no cambia
-- nada. Proyecto Supabase wnboyesnlrbtwfmhcxmc, SQL Editor.

begin;

-- Lo que se va a reenlazar, para comprobarlo antes del update.
select count(*) as prospectos_con_id_viejo
from public.prospects p
join public.ventas_leads v on v.id_externo = p.lead_id
join public.ventas_marcas m on m.id = v.marca_id and m.slug = 'dinkbit'
where p.lead_id is not null
  and p.lead_id <> v.id::text;

update public.prospects p
set lead_id = v.id::text
from public.ventas_leads v
join public.ventas_marcas m on m.id = v.marca_id and m.slug = 'dinkbit'
where p.lead_id is not null
  and v.id_externo = p.lead_id
  and p.lead_id <> v.id::text;

-- Comprobación: cuántos prospectos enlazados apuntan ya a un lead de ventas y
-- cuántos a nada conocido (un lead viejo que la migración no copió, o borrado).
select
  count(*) filter (where v.id is not null) as enlazados_a_ventas,
  count(*) filter (where v.id is null) as enlazados_a_nada
from public.prospects p
left join public.ventas_leads v on v.id::text = p.lead_id
where p.lead_id is not null;

commit;
