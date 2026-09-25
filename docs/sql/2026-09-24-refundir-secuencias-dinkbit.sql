-- Refundido del arranque de las dos secuencias de captación de la marca
-- «dinkbit»: el paso de inicio pasa a ser directamente la pregunta (el texto
-- que hoy manda `whatsapp/autorespuesta.ts`), sin los dos mensajes de
-- presentación previos. Ver `.superpowers/sdd/2026-09-24-secuencias-ejecucion/task-10-brief.md`.
--
-- ATENCIÓN: este `update` PISA lo que se haya editado en el panel para estas
-- dos secuencias. Aplicarlo solo si no se han tocado desde que se sembraron
-- (docs/sql/2026-09-24-secuencias-dinkbit.sql); si ya se editaron en el
-- panel, manda el panel y este fichero no debe ejecutarse.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
--
-- El contenido sale de src/lib/ventas/secuencias-plantilla.ts, que es donde
-- está testeado.
--
-- CORREGIDO EL 25-09-2026: el JSON que llevaba este fichero ponía
-- `avisar`/`fase` en la ruta del paso de cierre, donde el motor nunca la
-- aplica (ver la cabecera de secuencias-plantilla.ts y el orden de
-- `aplicarRuta`), así que pulsar un botón no avisaba a nadie. Si ya lo
-- ejecutaste con el JSON viejo, lo que hay que aplicar es
-- docs/sql/2026-09-25-corregir-rutas-de-botones.sql, no este fichero otra vez.

update public.ventas_secuencias s
set pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Faltan pacientes","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_faltan"}},{"texto":"Primera visita y ya","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_no_arrancan"}},{"texto":"Vienen y no vuelven","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_no_vuelven"}}],"guardar_respuesta_en":"problema_principal"},"cierre_faltan":{"tipo":"mensaje","texto":"Entendido. Ahí lo primero es saber cuánto te cuesta traer un paciente y cuánto te deja, porque sin eso invertir es apostar.\n\nTenemos una calculadora que lo hace con tus propios números en un minuto: dinkbit.es/escala/dental\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"terminar":true}},"cierre_no_arrancan":{"tipo":"mensaje","texto":"Ese es el bueno, y es el más caro: pagas por traer a alguien que se queda en la primera visita.\n\nPasa cuando una campaña se mide por citas. Nosotros la medimos por lo que factura cada paciente, así que a los dos meses sabes qué tratamiento te está pagando las campañas y cuál no. Suelen salir menos pacientes y más beneficio.\n\nLe digo a mi compañera que te escriba y te lo enseña con tus cifras.","botones":[],"ruta":{"terminar":true}},"cierre_no_vuelven":{"tipo":"mensaje","texto":"Entonces el problema no está en la entrada, está en el seguimiento: cada paciente que no vuelve es beneficio que ya habías pagado por traer.\n\nEso se ve en el panel mes a mes, con su origen y su ficha, y se corrige. Le digo a mi compañera que te escriba y lo vemos con tu caso.","botones":[],"ruta":{"terminar":true}}}}'::jsonb
from public.ventas_marcas m
where s.marca_id = m.id
  and m.slug = 'dinkbit'
  and s.nombre = 'Captación clínicas dentales';

-- La de psicología, además, se asigna al anuncio de la campaña que está
-- corriendo (24-09-2026): con esto se sirve automáticamente a quien escriba
-- desde ese anuncio.
update public.ventas_secuencias s
set pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Huecos en la agenda","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_huecos"}},{"texto":"Vienen 1 vez y ya","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_abandono"}},{"texto":"Solo boca a boca","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_boca_a_boca"}}],"guardar_respuesta_en":"problema_principal"},"cierre_huecos":{"tipo":"mensaje","texto":"Es lo más habitual. Una consulta privada tiene unas 25 sesiones de hueco a la semana y con el boca a boca se queda en torno al 60 % de ocupación.\n\nTrabajamos justo eso: traer pacientes nuevos cada mes hasta llenar la agenda. Puedes ver cómo salen los números con los tuyos aquí: dinkbit.es/escala/psicologia\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"terminar":true}},"cierre_abandono":{"tipo":"mensaje","texto":"Eso cambia mucho la cuenta: si el paciente no sigue, cada hueco vuelve a abrirse al mes siguiente y hay que llenarlo otra vez.\n\nPor eso medimos no solo cuántos llegan, sino cuántos se quedan a seguir, y de qué campaña viene cada uno. Le digo a mi compañera que te escriba y lo vemos con tu agenda.","botones":[],"ruta":{"terminar":true}},"cierre_boca_a_boca":{"tipo":"mensaje","texto":"El boca a boca es la mejor señal de que lo haces bien, pero no lo puedes abrir el día que tienes la agenda floja.\n\nLa idea es dejarlo donde está y sumarle un canal que sí puedas regular. Le digo a mi compañera que te escriba y te cuenta cómo se empieza sin liarse.","botones":[],"ruta":{"terminar":true}}}}'::jsonb,
    anuncios = '{120252112386740343}'
from public.ventas_marcas m
where s.marca_id = m.id
  and m.slug = 'dinkbit'
  and s.nombre = 'Captación consultas de psicología';
