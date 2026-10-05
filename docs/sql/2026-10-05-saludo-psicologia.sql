-- El primer mensaje de la secuencia de psicología responde a la pregunta del
-- anuncio en vez de repetirla.
--
-- Desde el 05-10-2026 el anuncio de «Iniciar conversación» deja escrito «Hola,
-- ¿me contáis cómo hacéis para llenar la agenda de mi consulta?» y el saludo
-- automático de Meta ya da las gracias. Con el saludo anterior el lead leía
-- «gracias» y «llenar la agenda» tres veces seguidas.
--
-- El saludo lo manda la fila de `ventas_secuencias`, no el código, así que
-- cambiar src/lib/ventas/secuencias-plantilla.ts no basta.
--
-- IDEMPOTENTE: la segunda vez el `where` ya no encaja y no cambia nada. Solo
-- toca el texto del paso de inicio, y solo si sigue siendo el anterior.
--
-- Proyecto wnboyesnlrbtwfmhcxmc. Aplicado el 05-10-2026.

update public.ventas_secuencias
set pasos = jsonb_set(
  pasos,
  '{pasos,inicio,texto}',
  to_jsonb(E'¡Hola! Soy Paula, de Growth. Claro, te lo cuento 😊\n\nPara darte la respuesta que te sirve, dime: ¿cuál es el principal problema que estás teniendo?'::text)
)
where pasos #>> '{pasos,inicio,texto}' like '%Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.%';

-- Comprobación.
select nombre, estado, pasos #>> '{pasos,inicio,texto}' as saludo
from public.ventas_secuencias
order by nombre;
