-- Disparador de los envíos programados de campañas.
--
-- Cada 5 minutos, pg_cron hace una petición HTTP (pg_net) a
-- https://www.dinkbit.es/api/cron/campaigns, que envía las campañas programadas
-- cuya hora ya llegó. Va aquí y no en Vercel Cron porque el plan Hobby de
-- Vercel solo permite crons diarios.
--
-- ANTES de ejecutar esto, guardar el secreto en el Vault de Supabase
-- (Dashboard → Integrations → Vault → Add new secret):
--   Name:  cron_secret
--   Value: el mismo valor que CRON_SECRET en Vercel
-- Si algún día se cambia CRON_SECRET, hay que cambiarlo en los dos sitios.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente: cron.schedule con un nombre ya existente lo actualiza.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-scheduled-campaigns',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://www.dinkbit.es/api/cron/campaigns',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    -- Un envío grande tarda: no cortar la conexión antes de que termine.
    timeout_milliseconds := 300000
  );
  $$
);

-- Comprobar que quedó registrado:
--   select jobname, schedule, active from cron.job;
-- Ver las últimas ejecuciones (status_code 200 = bien, 401 = secreto distinto):
--   select status_code, content, created from net._http_response order by created desc limit 10;
-- Quitarlo:
--   select cron.unschedule('send-scheduled-campaigns');
