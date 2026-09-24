-- Dos fases nuevas en el embudo del módulo de ventas B2B (/panel/ventas),
-- para las dos marcas:
--
--   volver_a_llamar  Columna propia entre Contactado e Interesado. Es fase
--                    activa, así que conserva el seguimiento y el orden por
--                    urgencia. Entra sola al registrar una llamada con ese
--                    resultado; salir de ahí lo decide la comercial a mano.
--
--   fuera_de_perfil  El lead que nunca fue válido: no es nuestro público, no
--                    entiende el servicio. Distinto de `no_interesa`, que sí
--                    entendió y dijo que no. No lo recoge ninguna columna, así
--                    que queda archivado fuera del tablero y no cuenta en el
--                    embudo; se sigue viendo en la lista de leads.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Solo amplía los valores admitidos: no toca ninguna fila existente.

alter table public.ventas_leads
  drop constraint if exists ventas_leads_fase_check;

alter table public.ventas_leads
  add constraint ventas_leads_fase_check check (fase in (
    'nuevo', 'contactado', 'volver_a_llamar', 'interesado', 'muestras',
    'cliente', 'perdido', 'no_interesa', 'ilocalizable', 'fuera_de_perfil'
  ));
