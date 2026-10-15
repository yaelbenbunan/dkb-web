-- Recordatorio de la mañana (/panel/ventas): un correo de lunes a viernes, a
-- partir de las 8:00 de Madrid, a cada admin y clienta con lo que tiene
-- atrasado o para hoy. Lo envía /api/cron/campaigns, que Supabase llama cada
-- 5 minutos.
--
-- Esta tabla es el «ya se envió hoy»: antes de mandar, el cron inserta
-- (usuaria, fecha) y, si la fila ya estaba, no manda. Así sale uno solo al día
-- aunque se solapen dos pasadas. Sin esta tabla el cron NO envía nada (si no,
-- mandaría un correo cada 5 minutos).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Idempotente.

create table if not exists public.ventas_recordatorios_enviados (
  usuaria_id uuid not null references public.ventas_usuarias(id) on delete cascade,
  fecha date not null,
  created_at timestamptz not null default now(),
  primary key (usuaria_id, fecha)
);

comment on table public.ventas_recordatorios_enviados is
  'Un recordatorio diario de pendientes por usuaria y día (fecha de Madrid). Lo escribe el cron.';

-- Como el resto del módulo: solo el service_role la toca.
alter table public.ventas_recordatorios_enviados enable row level security;

notify pgrst, 'reload schema';
