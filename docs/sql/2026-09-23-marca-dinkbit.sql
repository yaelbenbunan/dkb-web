-- Alta de la marca «Dinkbit» en el módulo de ventas B2B (/panel/ventas):
-- los leads que entran por anuncios de WhatsApp (CTWA) viven aquí antes de
-- que una persona decida pasarlos al embudo del CRM principal.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc),
-- después de docs/sql/2026-09-23-whatsapp-canal.sql.

insert into public.ventas_marcas (nombre, slug, estado)
values ('Dinkbit', 'dinkbit', 'activa')
on conflict (slug) do nothing;
