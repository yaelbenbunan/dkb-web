-- Importación semanal de las sociedades constituidas del BORME (Prospección).
-- pg_cron llama a /api/cron/borme los lunes a las 06:00 UTC con el mismo
-- secreto que el cron de campañas (vault: cron_secret = CRON_SECRET de Vercel).
-- Idempotente: si el trabajo ya existe, cron.schedule lo actualiza.
--
-- Comprobar: select status_code, content, created from net._http_response order by created desc limit 5;

select cron.schedule(
  'importar-borme-semanal',
  '0 6 * * 1',
  $$
  select net.http_get(
    url := 'https://www.dinkbit.es/api/cron/borme',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);

select jobname, schedule, active from cron.job where jobname = 'importar-borme-semanal';
