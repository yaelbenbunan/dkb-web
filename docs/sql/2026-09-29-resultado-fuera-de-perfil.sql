-- Nuevo resultado de llamada en el módulo de ventas B2B (/panel/ventas):
--
--   fuera_de_perfil  «No busca lo que ofrecemos». Se le localizó y se le
--                    explicó, pero nunca fue un lead válido para nosotros.
--                    Distinto de `no_interesa`, que sí lo entendió y dijo que
--                    no: aquel cuenta como oportunidad perdida y este no.
--
-- La FASE `fuera_de_perfil` ya existía desde
-- docs/sql/2026-09-24-fases-volver-a-llamar-y-fuera-de-perfil.sql, pero solo se
-- podía poner entrando en la ficha del lead y usando el desplegable de fases.
-- El momento en que de verdad se descubre es al teléfono, así que ahora es un
-- resultado de llamada más y el lead se archiva solo al registrarla.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Solo amplía los valores admitidos: no toca ninguna fila existente, y volver a
-- ejecutarlo no cambia nada.

alter table public.ventas_actividad
  drop constraint if exists ventas_actividad_resultado_check;

alter table public.ventas_actividad
  add constraint ventas_actividad_resultado_check check (
    resultado is null or resultado in (
      'no_contesta', 'volver_a_llamar', 'interesado', 'pide_muestras',
      'no_interesa', 'fuera_de_perfil', 'numero_erroneo'
    )
  );

-- Comprobación: debe devolver una fila con el check ya ampliado.
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.ventas_actividad'::regclass
  and conname = 'ventas_actividad_resultado_check';
