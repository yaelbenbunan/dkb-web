# Ejecución de secuencias por WhatsApp: diseño

Fecha: 2026-09-24 · Estado: pendiente de revisión · Módulo: `/panel/ventas`

Entrega 2 del canal de WhatsApp
([2026-09-23-whatsapp-canal-design.md](2026-09-23-whatsapp-canal-design.md)),
que dejó como trabajo futuro «el motor de secuencias completo: botones, rutas,
esperas y avisos».

## Objetivo

Que la conversación con un lead de anuncio la lleve **la secuencia**, no un
texto en código: el lead pulsa un botón y recibe la respuesta que corresponde a
esa rama, sin que intervenga nadie. Cuando la secuencia lo indica, se avisa a
una persona y la conversación pasa a manos humanas.

Éxito: cambiar lo que dice el bot es editar la secuencia en el panel, sin
desplegar. Hoy cada retoque pasa por un cambio de código.

## Lo que ya existe y no hay que construir

`src/lib/ventas/simulador.ts` **ya es el motor**: una máquina de estados pura y
testeada, hoy usada solo por el simulador del editor en el navegador.

- `iniciarSimulacion(secuencia, ctx)` → estado inicial, con el primer paso ya
  «dicho».
- `responderBoton(secuencia, estado, indiceBoton, ctx)` → estado siguiente.
- `responderTexto(secuencia, estado, texto, ctx)` → estado siguiente; con
  botones delante, para la secuencia y avisa.

`EstadoSimulacion` lleva `pasoActual`, `fase`, `datos`, `avisos`, `esperaDias`,
`terminada` y el hilo `conversacion`.

Esta entrega **no reescribe nada de eso**. Persiste ese estado y lo acciona
desde el webhook en lugar de desde el navegador.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Qué se persiste | Solo lo esencial: secuencia, paso, datos, terminada. El hilo ya vive en `ventas_mensajes` y duplicarlo crecería sin límite |
| Qué secuencia corre | La que declare servir al anuncio del lead; si ninguna, la activa de la marca |
| Arranque | El primer paso de la secuencia ES el saludo con los botones de problema. Desaparecen los pasos de presentación y de publicidad |
| Esperas por cron | **Fuera de alcance.** Al refundir el arranque no queda ningún `esperar_dias` en el camino |
| Sin secuencia que sirva | Cae en la autorespuesta en código de la entrega 1. El canal nunca se queda mudo |
| Texto libre con botones delante | La secuencia se para y se avisa. Ya decidido en el spec de secuencias |

## Modelo de datos

Migración manual en `docs/sql/`, como el resto del módulo.

**`ventas_conversaciones`** gana cuatro columnas:

| Columna | Para qué |
|---|---|
| `secuencia_id` | referencia a `ventas_secuencias`; qué guion sigue esta conversación |
| `paso_actual` | id del paso donde quedó; `null` si terminó o se paró |
| `datos` | jsonb con las respuestas guardadas por `guardar_respuesta_en` |
| `reanudar_en` | timestamptz; solo se escribe si una ruta usa `esperar_dias`. Sin cron todavía: sirve para que una persona vea que hay algo parado |

**`ventas_secuencias`** gana una:

| Columna | Para qué |
|---|---|
| `anuncios` | `text[]` con los identificadores de anuncio de Meta a los que sirve esta secuencia |

### Por qué `anuncios` y no «la secuencia activa de la marca»

Hoy `activarSecuencia` **archiva las demás activas de la marca**
(`servicios.ts:436-442`): solo puede haber una. Con dos campañas vivas —dental
y psicología bajo la marca `dinkbit`— eso obliga a archivar una para activar la
otra, y el lead de la campaña archivada se queda sin guion.

Con `anuncios`, la selección es: la secuencia activa cuyo `anuncios` contenga
el `referral.source_id` del lead; si ninguna, la activa de la marca. Con una
sola campaña viva la regla se cumple sola y no se nota.

Esto además **sustituye a `VERTICAL_POR_ANUNCIO`**, el mapa que hoy vive en
`src/lib/whatsapp/autorespuesta.ts`: asignar un anuncio pasa a ser un campo del
editor en vez de un cambio de código.

## El flujo

Dentro de `procesar.ts`, en la fase B (después de persistir el entrante):

**Lead de anuncio (`crear_lead_y_responder` / `responder`)**
1. Elegir secuencia por anuncio.
2. `iniciarSimulacion`.
3. Enviar los mensajes que el estado haya añadido (con botones si el paso los
   tiene).
4. Guardar `secuencia_id`, `paso_actual` y `datos` en la conversación.

**Respuesta del lead (conversación en `bot`)**
1. Cargar la secuencia y el estado guardado.
2. Si el entrante trae un id de botón (`opcion_N`, que es lo que ya mandamos
   desde la entrega 1), traducirlo a índice y llamar a `responderBoton`. Si no,
   `responderTexto`.
3. Enviar lo nuevo, guardar el estado.

**En ambos casos**, tras aplicar el estado:
- Cada aviso del motor registra actividad en la ficha del lead y pasa la
  conversación a `humana`.
- Si la ruta cambió de fase, se mueve el lead.
- Si `terminada`, la conversación queda sin paso y no se vuelve a accionar.

### Qué mensajes se envían

Los que el estado nuevo añadió al hilo respecto del anterior, filtrando los del
lado del negocio (esos ya los escribió él). Un paso con botones se manda con
`enviarBotones`; uno sin botones, con `enviarTexto`.

### Errores

Todo esto ocurre en fase B: el mensaje entrante ya está guardado, así que un
fallo aquí se registra y se responde 200. Un mensaje del bot que no sale es
malo; perder el mensaje del lead y forzar a Meta a reintentar en bucle es peor.

Si la secuencia guardada ya no tiene el paso donde estaba la conversación
—alguien la editó en vuelo—, el motor ya termina con un aviso en vez de
romperse. Ese aviso llega a la comercial por el mismo camino que los demás.

## El arranque refundido

Las dos secuencias sembradas pasan a empezar por el saludo con los tres
botones de problema, el que está hoy en `autorespuesta.ts` y que se afinó con
el canal ya en marcha. Desaparecen `inicio` (presentación), `publicidad`,
`ahora_no` y `reintento`: eran del flujo saliente, que hoy no se usa, y son los
que metían dos mensajes antes de cualificar.

Queda: **saludo con botones → tres cierres, todos terminales**. Sin esperas, de
ahí que el cron no haga falta.

Se entrega como SQL de actualización. **Pisa lo que se haya editado en el panel
para esas dos secuencias**, así que se ejecuta solo si se quiere.

## Pruebas

Lógica pura, sin base ni red:

- Traducción de la pulsación (`opcion_2`) al índice que espera el motor, y qué
  pasa con un id desconocido.
- Qué mensajes hay que enviar tras una transición: los nuevos del lado marca,
  ninguno del lado negocio.
- Elección de secuencia: por anuncio, por defecto de la marca, y ninguna.
- Traducción del estado del motor a las columnas persistidas y vuelta.

De punta a punta, con las dependencias falsas que `procesar.ts` ya tiene: un
lead de anuncio recibe el primer paso; pulsa un botón y recibe el cierre de esa
rama; un texto libre con botones delante para la secuencia y avisa; un reintento
de Meta no avanza la secuencia dos veces.

## Fuera de alcance

- **Esperas por cron.** Se persiste `reanudar_en` pero nada lo dispara.
- Campo en el editor para asignar anuncios a una secuencia: por ahora se asigna
  por SQL. Se valorará cuando haya más de dos campañas.
- Plantillas de Meta para reenganchar fuera de la ventana.
- IA respondiendo.

## Riesgos

- **Una secuencia mal editada deja leads a medias.** El motor termina con aviso,
  así que se detecta, pero el lead recibe menos de lo previsto. Lo mitiga el
  validador, que ya bloquea activar una secuencia con avisos graves.
- **El id de botón viaja entre dos sistemas.** Si alguien cambia el formato
  `opcion_N` en el mensajero sin tocar la traducción, las pulsaciones dejarían
  de avanzar la secuencia y caerían en el camino de texto libre — que avisa a
  una persona, así que se nota, pero conviene un test que ate las dos puntas.
