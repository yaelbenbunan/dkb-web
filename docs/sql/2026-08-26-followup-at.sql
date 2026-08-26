-- Agenda de seguimiento del CRM (panel /panel).
--
-- Añade la fecha de la próxima llamada. Tipo `date` (no timestamptz) a
-- propósito: "a partir del lunes" o "a partir de septiembre" es información de
-- día, y así no hay que arrastrar la zona horaria en cada lectura.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente: se puede lanzar dos veces sin romper nada.

alter table public.imagina_leads
  add column if not exists followup_at date;

comment on column public.imagina_leads.followup_at is
  'Fecha (día) en la que toca volver a llamar al lead. NULL = no está en la agenda.';

-- Nota: el estado "seguimiento" ("Volver a llamar") NO necesita migración.
-- `status` es text sin CHECK ni enum, y la lista válida vive en
-- src/lib/lead-status.ts, que es la única fuente de verdad.
