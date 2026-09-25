-- El bot de WhatsApp se presenta como Growth, no como Escala.
--
-- La landing vuelve a llamarse Growth el 25-09-2026 y deja de vender «ganar
-- más»: vende llenar la agenda. El saludo de las dos secuencias de captación
-- de «dinkbit» lo manda la fila de `ventas_secuencias`, no el código, así que
-- cambiar src/lib/ventas/secuencias-plantilla.ts no basta: hay que cambiar la
-- base.
--
-- Solo toca dos cosas, y por eso no pisa nada más de lo que se haya editado
-- en el panel:
--   1. El texto del paso de inicio, y solo si sigue siendo exactamente el de
--      Escala.
--   2. Los enlaces dinkbit.es/escala/… de los cierres, que pasan a /growth/…
--      (los viejos siguen funcionando por el 301, esto es por limpieza).
--
-- IDEMPOTENTE: la segunda vez el `where` ya no encaja y no cambia nada.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc)
-- DESPUÉS de publicar la landing de Growth: si se ejecuta antes, el bot
-- presentaría un nombre que la página todavía no lleva.

begin;

update public.ventas_secuencias
set pasos = jsonb_set(
  pasos,
  '{pasos,inicio,texto}',
  to_jsonb(replace(
    pasos #>> '{pasos,inicio,texto}',
    'de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.',
    'de Growth. Gracias por interesarte en nuestro proceso para llenar la agenda de tu clínica.'
  ))
)
where pasos #>> '{pasos,inicio,texto}' like '%de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.%';

update public.ventas_secuencias
set pasos = jsonb_set(
  pasos,
  '{pasos,inicio,texto}',
  to_jsonb(replace(pasos #>> '{pasos,inicio,texto}', 'de Escala.', 'de Growth.'))
)
where pasos #>> '{pasos,inicio,texto}' like '%de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.%';

update public.ventas_secuencias
set pasos = replace(pasos::text, 'dinkbit.es/escala/', 'dinkbit.es/growth/')::jsonb
where pasos::text like '%dinkbit.es/escala/%';

commit;

-- Comprobación: tiene que salir «de Growth» en las dos y ningún /escala/.
select nombre,
       pasos #>> '{pasos,inicio,texto}' as saludo,
       pasos::text like '%dinkbit.es/escala/%' as quedan_enlaces_viejos
from public.ventas_secuencias
order by nombre;
