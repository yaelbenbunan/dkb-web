-- Corrige las rutas de los botones de las dos secuencias de captación de
-- «dinkbit»: mueve `avisar`/`fase` de la ruta del paso de cierre a la ruta de
-- cada botón del paso de inicio, que es donde el motor la aplica de verdad.
-- Hacía falta porque `aplicarRuta` (src/lib/ventas/simulador.ts) NO aplica la
-- ruta del paso al que entra con `ir_a`: con la forma que dejó el refundido
-- del 24-09, el lead pulsaba su problema, recibía el cierre que le promete
-- «Le digo a mi compañera que te escriba», y la conversación se quedaba viva
-- en `bot` sin aviso, sin nota en la ficha y sin cambio de fase — un lead
-- pagado en Meta del que nadie se enteraba.
--
-- Pensado para una base donde YA se aplicó
-- docs/sql/2026-09-24-refundir-secuencias-dinkbit.sql (ese fichero también se
-- ha corregido, pero no se vuelve a ejecutar: pisaría cualquier edición que se
-- haya hecho en el panel desde entonces).
--
-- IDEMPOTENTE, y a propósito por el `where pasos = <forma rota>`: solo toca
-- las filas que siguen exactamente como las dejó el refundido. Ejecutarlo dos
-- veces no cambia nada la segunda, y una secuencia editada en el panel desde
-- entonces no se pisa (manda el panel, ver la cabecera del refundido). La
-- comparación es de `jsonb`, no de texto: el orden de las claves da igual.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
--
-- El contenido sale de src/lib/ventas/secuencias-plantilla.ts, que es donde
-- está testeado (SECUENCIA_DENTAL y SECUENCIA_PSICOLOGIA).

update public.ventas_secuencias s
set pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Faltan pacientes","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_faltan"}},{"texto":"Primera visita y ya","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_no_arrancan"}},{"texto":"Vienen y no vuelven","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_no_vuelven"}}],"guardar_respuesta_en":"problema_principal"},"cierre_faltan":{"tipo":"mensaje","texto":"Entendido. Ahí lo primero es saber cuánto te cuesta traer un paciente y cuánto te deja, porque sin eso invertir es apostar.\n\nTenemos una calculadora que lo hace con tus propios números en un minuto: dinkbit.es/escala/dental\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"terminar":true}},"cierre_no_arrancan":{"tipo":"mensaje","texto":"Ese es el bueno, y es el más caro: pagas por traer a alguien que se queda en la primera visita.\n\nPasa cuando una campaña se mide por citas. Nosotros la medimos por lo que factura cada paciente, así que a los dos meses sabes qué tratamiento te está pagando las campañas y cuál no. Suelen salir menos pacientes y más beneficio.\n\nLe digo a mi compañera que te escriba y te lo enseña con tus cifras.","botones":[],"ruta":{"terminar":true}},"cierre_no_vuelven":{"tipo":"mensaje","texto":"Entonces el problema no está en la entrada, está en el seguimiento: cada paciente que no vuelve es beneficio que ya habías pagado por traer.\n\nEso se ve en el panel mes a mes, con su origen y su ficha, y se corrige. Le digo a mi compañera que te escriba y lo vemos con tu caso.","botones":[],"ruta":{"terminar":true}}}}'::jsonb
from public.ventas_marcas m
where s.marca_id = m.id
  and m.slug = 'dinkbit'
  and s.nombre = 'Captación clínicas dentales'
  and s.pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Faltan pacientes","ruta":{"ir_a":"cierre_faltan"}},{"texto":"Primera visita y ya","ruta":{"ir_a":"cierre_no_arrancan"}},{"texto":"Vienen y no vuelven","ruta":{"ir_a":"cierre_no_vuelven"}}],"guardar_respuesta_en":"problema_principal"},"cierre_faltan":{"tipo":"mensaje","texto":"Entendido. Ahí lo primero es saber cuánto te cuesta traer un paciente y cuánto te deja, porque sin eso invertir es apostar.\n\nTenemos una calculadora que lo hace con tus propios números en un minuto: dinkbit.es/escala/dental\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}},"cierre_no_arrancan":{"tipo":"mensaje","texto":"Ese es el bueno, y es el más caro: pagas por traer a alguien que se queda en la primera visita.\n\nPasa cuando una campaña se mide por citas. Nosotros la medimos por lo que factura cada paciente, así que a los dos meses sabes qué tratamiento te está pagando las campañas y cuál no. Suelen salir menos pacientes y más beneficio.\n\nLe digo a mi compañera que te escriba y te lo enseña con tus cifras.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}},"cierre_no_vuelven":{"tipo":"mensaje","texto":"Entonces el problema no está en la entrada, está en el seguimiento: cada paciente que no vuelve es beneficio que ya habías pagado por traer.\n\nEso se ve en el panel mes a mes, con su origen y su ficha, y se corrige. Le digo a mi compañera que te escriba y lo vemos con tu caso.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}}}}'::jsonb;

update public.ventas_secuencias s
set pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Huecos en la agenda","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_huecos"}},{"texto":"Vienen 1 vez y ya","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_abandono"}},{"texto":"Solo boca a boca","ruta":{"avisar":true,"fase":"interesado","ir_a":"cierre_boca_a_boca"}}],"guardar_respuesta_en":"problema_principal"},"cierre_huecos":{"tipo":"mensaje","texto":"Es lo más habitual. Una consulta privada tiene unas 25 sesiones de hueco a la semana y con el boca a boca se queda en torno al 60 % de ocupación.\n\nTrabajamos justo eso: traer pacientes nuevos cada mes hasta llenar la agenda. Puedes ver cómo salen los números con los tuyos aquí: dinkbit.es/escala/psicologia\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"terminar":true}},"cierre_abandono":{"tipo":"mensaje","texto":"Eso cambia mucho la cuenta: si el paciente no sigue, cada hueco vuelve a abrirse al mes siguiente y hay que llenarlo otra vez.\n\nPor eso medimos no solo cuántos llegan, sino cuántos se quedan a seguir, y de qué campaña viene cada uno. Le digo a mi compañera que te escriba y lo vemos con tu agenda.","botones":[],"ruta":{"terminar":true}},"cierre_boca_a_boca":{"tipo":"mensaje","texto":"El boca a boca es la mejor señal de que lo haces bien, pero no lo puedes abrir el día que tienes la agenda floja.\n\nLa idea es dejarlo donde está y sumarle un canal que sí puedas regular. Le digo a mi compañera que te escriba y te cuenta cómo se empieza sin liarse.","botones":[],"ruta":{"terminar":true}}}}'::jsonb
from public.ventas_marcas m
where s.marca_id = m.id
  and m.slug = 'dinkbit'
  and s.nombre = 'Captación consultas de psicología'
  and s.pasos = '{"version":1,"inicio":"inicio","pasos":{"inicio":{"tipo":"mensaje","texto":"¡Hola! Soy Paula, de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\nPara poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?","botones":[{"texto":"Huecos en la agenda","ruta":{"ir_a":"cierre_huecos"}},{"texto":"Vienen 1 vez y ya","ruta":{"ir_a":"cierre_abandono"}},{"texto":"Solo boca a boca","ruta":{"ir_a":"cierre_boca_a_boca"}}],"guardar_respuesta_en":"problema_principal"},"cierre_huecos":{"tipo":"mensaje","texto":"Es lo más habitual. Una consulta privada tiene unas 25 sesiones de hueco a la semana y con el boca a boca se queda en torno al 60 % de ocupación.\n\nTrabajamos justo eso: traer pacientes nuevos cada mes hasta llenar la agenda. Puedes ver cómo salen los números con los tuyos aquí: dinkbit.es/escala/psicologia\n\nLe digo a mi compañera que te escriba para verlo contigo.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}},"cierre_abandono":{"tipo":"mensaje","texto":"Eso cambia mucho la cuenta: si el paciente no sigue, cada hueco vuelve a abrirse al mes siguiente y hay que llenarlo otra vez.\n\nPor eso medimos no solo cuántos llegan, sino cuántos se quedan a seguir, y de qué campaña viene cada uno. Le digo a mi compañera que te escriba y lo vemos con tu agenda.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}},"cierre_boca_a_boca":{"tipo":"mensaje","texto":"El boca a boca es la mejor señal de que lo haces bien, pero no lo puedes abrir el día que tienes la agenda floja.\n\nLa idea es dejarlo donde está y sumarle un canal que sí puedas regular. Le digo a mi compañera que te escriba y te cuenta cómo se empieza sin liarse.","botones":[],"ruta":{"avisar":true,"fase":"interesado","terminar":true}}}}'::jsonb;

-- Comprobación: las seis rutas de botón tienen que avisar y mover la fase, y
-- ninguna llevar `terminar` (con `terminar` en el botón, `aplicarRuta` cortaría
-- antes del `ir_a` y el mensaje de cierre no se enviaría nunca). Debe devolver
-- una fila por secuencia con avisan = 3, con_fase = 3 y con_terminar = 0.
select s.nombre,
       count(*) filter (where b->'ruta' ? 'ir_a')                as botones,
       count(*) filter (where (b->'ruta'->>'avisar')::boolean)   as avisan,
       count(*) filter (where b->'ruta'->>'fase' = 'interesado') as con_fase,
       count(*) filter (where b->'ruta' ? 'terminar')            as con_terminar
from public.ventas_secuencias s
join public.ventas_marcas m on m.id = s.marca_id
cross join lateral jsonb_array_elements(s.pasos->'pasos'->(s.pasos->>'inicio')->'botones') as b
where m.slug = 'dinkbit'
  and s.nombre in ('Captación clínicas dentales', 'Captación consultas de psicología')
group by s.nombre;
