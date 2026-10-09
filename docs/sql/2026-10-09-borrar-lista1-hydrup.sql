-- De un solo uso: quita de Hydrup los leads de la importación de prueba
-- «lista1» (135 el 2026-10-09). Ejecutar DESPUÉS de
-- 2026-10-09-ventas-tareas-rol-cliente.sql. Devuelve cuántos ha borrado.
select public.ventas_eliminar_leads(
  m.id,
  array(
    select l.id from public.ventas_leads l
    where l.marca_id = m.id and l.origen = 'lista' and l.origen_detalle = 'lista1'
  )
) as leads_borrados
from public.ventas_marcas m
where m.slug = 'hydrup';
