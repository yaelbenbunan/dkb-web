-- Dos datos del formulario del anuncio que cualifican al lead y hasta ahora
-- iban en una nota: cuántos socios o usuarios activos tiene el centro y qué
-- puesto ocupa quien deja sus datos. Texto libre a propósito: Meta los manda
-- como tramos («100 a 300») y cada formulario puede tener los suyos.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Idempotente. El código funciona sin esto (la ficha se guarda y los leads
-- entran), pero socios y cargo no se guardan hasta que se ejecute.

alter table public.ventas_leads add column if not exists socios text;
alter table public.ventas_leads add column if not exists cargo text;

alter table public.ventas_leads drop constraint if exists ventas_leads_extras_cortos;
alter table public.ventas_leads
  add constraint ventas_leads_extras_cortos
  check (char_length(coalesce(socios, '')) <= 80 and char_length(coalesce(cargo, '')) <= 80);

-- PostgREST cachea las columnas: sin recargar, rechazaría las nuevas.
notify pgrst, 'reload schema';
