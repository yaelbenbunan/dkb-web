-- Texto previo (preheader) de las campañas (panel /panel/campanas).
--
-- Es la línea que las aplicaciones de correo enseñan junto al asunto en la
-- bandeja de entrada. Sin ella, el cliente la rellena por su cuenta: repite el
-- asunto —y se lee dos veces seguidas— o arrastra las primeras palabras del
-- cuerpo del mensaje.
--
-- NULL = sin texto propio: al enviar se usa la primera línea con contenido del
-- propio correo (ver fallbackPreheader en src/lib/email-preheader.ts). Nunca el
-- asunto.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente: se puede lanzar dos veces sin romper nada.

alter table public.campaigns
  add column if not exists preheader text;

comment on column public.campaigns.preheader is
  'Texto previo que se ve junto al asunto en la bandeja de entrada. NULL = se usa la primera línea del cuerpo.';
