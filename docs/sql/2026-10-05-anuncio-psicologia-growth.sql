-- La secuencia de psicología atiende también al anuncio nuevo de la campaña
-- «Iniciar conversación - growth» (05-10-2026).
--
-- El anuncio se rehízo y nació con otro identificador. Sin esto, el clic de un
-- psicólogo no encontraba su guion y caía en la secuencia general de la marca,
-- que desde hoy es la dental. El identificador anterior se conserva.
--
-- El anuncio dental (120252271546580343) no se apunta en ninguna secuencia: lo
-- recoge la general.
--
-- IDEMPOTENTE. Proyecto wnboyesnlrbtwfmhcxmc. Aplicado el 05-10-2026.

update public.ventas_secuencias
set anuncios = array_append(anuncios, '120252271546570343')
where nombre = 'Captación consultas de psicología'
  and not ('120252271546570343' = any(anuncios));

select nombre, estado, anuncios from public.ventas_secuencias order by nombre;
