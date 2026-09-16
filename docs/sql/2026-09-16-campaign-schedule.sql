-- Envío programado de campañas (panel /panel/campanas).
--
-- Al programar, la campaña pasa a status 'scheduled' con la hora de envío y la
-- lista de destinatarios elegidos en el wizard (que no se guardan en ningún
-- otro sitio). Cada 5 minutos se llama a /api/cron/campaigns, que envía las
-- programadas cuya hora ya llegó (el disparador está en
-- 2026-09-16-campaign-schedule-cron.sql).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente: se puede lanzar dos veces sin romper nada.

alter table public.campaigns
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_lead_ids uuid[];

comment on column public.campaigns.scheduled_at is
  'Hora de envío de una campaña programada (status = scheduled). NULL = no programada.';
comment on column public.campaigns.scheduled_lead_ids is
  'Leads elegidos al programar. Al enviar se vuelve a filtrar por consentimiento y rebotes.';

-- El cron busca las programadas vencidas en cada pasada.
create index if not exists campaigns_scheduled_due_idx
  on public.campaigns (scheduled_at)
  where status = 'scheduled';
