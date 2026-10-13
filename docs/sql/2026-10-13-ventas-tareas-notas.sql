-- Notas en las tareas manuales: un texto libre opcional que se escribe al
-- crear la tarea (contexto, qué llevar, con quién hablar) y se ve bajo el título.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc),
-- después de 2026-10-09-ventas-tareas-rol-cliente.sql, que crea la tabla.
-- Idempotente. El código funciona sin esto (las tareas sin notas se crean
-- igual), pero una tarea con notas se rechaza hasta que se ejecute.

alter table public.ventas_tareas add column if not exists notas text;

alter table public.ventas_tareas drop constraint if exists ventas_tareas_notas_cortas;
alter table public.ventas_tareas
  add constraint ventas_tareas_notas_cortas
  check (char_length(coalesce(notas, '')) <= 2000);

-- PostgREST cachea las columnas: sin recargar, rechazaría la nueva.
notify pgrst, 'reload schema';
