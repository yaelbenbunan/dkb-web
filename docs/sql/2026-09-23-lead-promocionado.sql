-- Marca de "ya promocionado" en un lead del módulo de ventas: cuándo se pasó
-- al embudo del CRM principal (botón "Pasar al embudo", solo marca dinkbit).
-- null = todavía no se ha promocionado. Es la fuente de verdad de la
-- idempotencia del botón: comparar contra el texto de una nota daba falsos
-- positivos si alguien escribía esa misma frase a mano.
--
-- `ventas_leads` ya existe en producción (la crea
-- docs/sql/2026-09-17-ventas-fase1.sql), así que esta columna va en su
-- propia migración con `if not exists`, sin tocar la de fase 1.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc),
-- después de docs/sql/2026-09-17-ventas-fase1.sql.

alter table public.ventas_leads
  add column if not exists promocionado_at timestamptz;
