-- Ejecución de secuencias por WhatsApp (entrega 2 del canal).
-- Spec: docs/superpowers/specs/2026-09-24-secuencias-ejecucion-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Solo añade columnas: no toca ninguna fila existente.

-- Dónde va cada conversación dentro de su guion. El hilo de mensajes NO se
-- guarda aquí: ya está en `ventas_mensajes`, y duplicarlo crecería sin límite.
alter table public.ventas_conversaciones
  add column if not exists secuencia_id uuid references public.ventas_secuencias(id) on delete set null,
  add column if not exists paso_actual text,
  add column if not exists datos jsonb not null default '{}'::jsonb,
  -- Solo se escribe si una ruta usa `esperar_dias`. No hay cron todavía: sirve
  -- para que una persona vea que hay una conversación parada esperando.
  add column if not exists reanudar_en timestamptz;

-- A qué anuncios de Meta sirve cada secuencia.
--
-- Hace falta porque `activarSecuencia` archiva las demás activas de la marca:
-- con dos campañas vivas bajo `dinkbit`, activar dental archivaría psicología y
-- sus leads se quedarían sin guion. Con esto, cada lead encuentra el suyo.
alter table public.ventas_secuencias
  add column if not exists anuncios text[] not null default '{}';

create index if not exists ventas_secuencias_anuncios_idx
  on public.ventas_secuencias using gin (anuncios);
