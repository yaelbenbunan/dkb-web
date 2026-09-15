-- Nombre del remitente de las campañas (panel /panel/campanas).
--
-- Hasta ahora el remitente era solo una dirección, así que en la bandeja de
-- entrada se leía "hola@dinkbit.es". Con esta columna se guarda además el
-- nombre visible ("Alicia de dinkbit"), que es lo que acaba en la cabecera
-- `From` con la forma "Nombre" <email@dominio>.
--
-- NULL = sin nombre propio: al enviar se usa el de por defecto
-- (DEFAULT_SENDER_NAME en src/lib/email-from.ts).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente: se puede lanzar dos veces sin romper nada.

alter table public.campaigns
  add column if not exists from_name text;

comment on column public.campaigns.from_name is
  'Nombre visible del remitente (cabecera From). NULL = se usa el nombre por defecto.';

-- Nota: el espaciado entre secciones y los estilos por apartado del hero NO
-- necesitan migración. Viven dentro de `campaigns.blocks` (jsonb) y de
-- `email_templates.blocks`, y el esquema de bloques los valida en código
-- (src/lib/campaign-blocks.ts).
