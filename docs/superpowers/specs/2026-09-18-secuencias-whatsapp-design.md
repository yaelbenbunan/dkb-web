# Secuencias de WhatsApp: diseño

Fecha: 2026-09-18 · Estado: pendiente de revisión · Módulo: `/panel/ventas`

## Objetivo

Cualificar leads B2B por WhatsApp antes (o en vez) de llamarles: saber si el
negocio tiene interés, recoger datos que la llamada tardaría en sacar (volumen,
quién decide, por qué vía prefiere que le contacten) y llevarle hasta pedir
muestras o hacer un pedido.

La conversación la define **cada marca**: los textos, los botones y las ramas se
editan en el panel, sin tocar código, porque lo que funciona con gimnasios no
sirve para farmacias.

Ejemplo de argumento (Hydrup): al por mayor cada stick sale a X, se vende a Y,
así que una caja en recepción deja Z € de margen al mes sin hacer nada.

## Lo que impone WhatsApp

Esto no es una decisión nuestra, condiciona todo el diseño:

- **Para escribir primero hay que usar una plantilla aprobada por Meta.** Se
  envía de una en una y se paga por conversación (unos 0,03–0,05 € en España).
- **Cuando la persona responde se abre una ventana de 24 horas** en la que se
  puede escribir libremente: ahí viven las ramas, los botones y las preguntas.
- **Pasadas las 24 horas** hay que volver a empezar con otra plantilla.
- **Botones:** hasta 3 de respuesta rápida por mensaje, o una lista de hasta 10
  opciones.
- Hace falta una **cuenta de WhatsApp Business API**, un número dedicado y la
  empresa verificada con Meta.

Por eso el primer paso de una secuencia es siempre una plantilla, y el editor
avisa de qué textos necesitan aprobación y cuáles son libres.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Quién arranca la secuencia | **A mano**, desde el tablero o la ficha del lead («Enviar secuencia»). Nada automático en esta fase. |
| Respuesta libre (no un botón) | **Se para la secuencia y se avisa a la comercial**: el lead aparece en «Mi día» con el mensaje. La conversación sigue una persona. |
| Edición | Todo (textos, botones, esperas y ramas) se edita por marca en el panel. |
| Envío real | Detrás de una pieza intercambiable. Hasta que haya cuenta de Meta, funciona en **modo simulación**: se registra lo que se habría enviado, sin enviar nada. |
| IA contestando | Fuera de alcance. Se decidirá cuando haya conversaciones reales que leer. |

## Conceptos

- **Secuencia:** conversación completa de una marca («Captación gimnasios»).
  Tiene una versión editable (borrador) y, cuando se activa, es la que se manda.
- **Paso:** un mensaje con sus botones, o una espera.
- **Ruta:** qué ocurre tras cada botón: ir a otro paso, mover de fase, guardar un
  dato, avisar a la comercial o terminar.
- **Conversación:** el recorrido de un lead concreto por una secuencia.
- **Dato recogido:** respuesta guardada en el lead (volumen, preferencia de
  contacto, horario…).

## Modelo de datos

Tablas nuevas con prefijo `ventas_`, RLS activado sin políticas, como el resto
del módulo. Migración manual en `docs/sql`.

### `ventas_secuencias`
- `id`, `marca_id`, `nombre`, `estado` (`borrador` | `activa` | `archivada`).
- `pasos` (jsonb): la secuencia entera (ver «Forma de los pasos»).
- `creada_por`, `created_at`, `updated_at`.
- Una marca puede tener varias secuencias; solo las `activa` se pueden enviar.

### `ventas_conversaciones`
- `id`, `marca_id`, `lead_id`, `secuencia_id`, `pasos_version` (copia de los
  pasos tal y como estaban al arrancar: si luego se edita la secuencia, la
  conversación en curso no cambia de guion a mitad).
- `estado` (`en_curso` | `esperando` | `terminada` | `parada_por_respuesta` |
  `fallida`), `paso_actual`, `proximo_envio_at`, `ventana_abierta_hasta`.
- `telefono` (el usado), `iniciada_por`, `created_at`, `updated_at`.
- Única por (`lead_id`, `estado = en_curso`): un lead no está en dos
  conversaciones a la vez.

### `ventas_mensajes`
- `id`, `conversacion_id`, `lead_id`, `direccion` (`saliente` | `entrante`),
  `texto`, `botones` (jsonb), `respuesta` (el botón pulsado o el texto libre),
  `estado_envio` (`simulado` | `enviado` | `entregado` | `leido` | `fallido`),
  `id_externo` (el de WhatsApp), `created_at`.
- Solo se añade: es la prueba de qué se dijo. Mismo trigger de inmutabilidad
  que `ventas_actividad`.

Cada mensaje enviado y cada respuesta escriben además una entrada en
`ventas_actividad` (tipos nuevos `whatsapp_enviado` y `whatsapp_respuesta`),
para que el historial del lead siga siendo el sitio único donde se ve todo.

### Forma de los pasos (jsonb)

```json
{
  "version": 1,
  "inicio": "p1",
  "pasos": {
    "p1": {
      "tipo": "mensaje",
      "plantilla": true,
      "texto": "Hola {{contacto}}, soy {{remitente}} de {{marca}}. Trabajamos con negocios como {{negocio}}…",
      "botones": [
        { "texto": "Sí, cuéntame", "ruta": { "ir_a": "p2" } },
        { "texto": "Ahora no", "ruta": { "esperar_dias": 15, "ir_a": "p1" } },
        { "texto": "No me interesa", "ruta": { "fase": "no_interesa", "terminar": true } }
      ]
    },
    "p2": {
      "tipo": "mensaje",
      "texto": "Cada stick te sale a {{precio_mayorista}} y se vende a {{pvp}}…",
      "botones": [
        { "texto": "Quiero muestras", "ruta": { "ir_a": "p3", "fase": "interesado" } },
        { "texto": "Ver precios", "ruta": { "ir_a": "p4" } },
        { "texto": "Que me llaméis", "ruta": { "ir_a": "p5", "avisar": true } }
      ]
    },
    "p3": { "tipo": "mensaje", "texto": "¿A qué dirección te las mandamos?", "guardar_respuesta_en": "direccion_muestras", "ruta": { "fase": "muestras", "avisar": true, "terminar": true } }
  }
}
```

- **Variables:** `{{negocio}}`, `{{contacto}}`, `{{ciudad}}`, `{{marca}}`,
  `{{remitente}}` y las que defina la marca en sus condiciones (por ejemplo
  `{{precio_mayorista}}`). Si a un lead le falta una variable, se usa un texto
  alternativo definido en el propio paso; si tampoco lo hay, la secuencia no se
  puede enviar a ese lead y se dice por qué.
- **Esperas:** `esperar_dias` programa el siguiente paso; lo dispara el mismo
  cron de Supabase que ya envía las campañas programadas.
- **`avisar`:** pone el lead en «Mi día» de quien lo tenga asignado (o de quien
  arrancó la secuencia) con seguimiento para hoy.

## Reglas

- **Arranque:** solo un lead con teléfono móvil válido y consentimiento
  compatible. No se arranca si ya tiene una conversación en curso, si está
  excluido o si su fase es `cliente`, `no_interesa` o `ilocalizable`.
- **Un lead, una conversación a la vez.**
- **Respuesta libre:** la conversación pasa a `parada_por_respuesta`, se avisa a
  la comercial y no se envía nada más automáticamente.
- **Ventana de 24 horas:** si toca enviar un paso libre y la ventana está
  cerrada, no se envía: la conversación queda `esperando` y se avisa para que
  una persona decida (empezar otra plantilla o llamar).
- **Fases:** los movimientos que pida la ruta usan el mismo camino que el
  tablero (`registrarActividad`), así que cuentan igual en el embudo.
- **Baja:** cualquier mensaje entrante que sea «BAJA», «STOP» o equivalente
  termina la conversación, marca el lead como `no_interesa` y lo apunta.

## Pantallas

1. **Secuencias** (pestaña nueva de la marca): lista con estado, nº de pasos y
   cuántas conversaciones tiene en curso. Botones: nueva, duplicar, editar,
   activar/archivar.
2. **Editor de secuencia:** los pasos en una columna, el paso seleccionado a la
   derecha (texto, variables disponibles, botones y a dónde lleva cada uno).
   Marca en rojo los problemas: un botón sin destino, un paso al que no llega
   nadie, un texto de plantilla cambiado (hay que volver a pedir aprobación a
   Meta).
3. **Simulador** (dentro del editor): la conversación como la vería el negocio,
   con los botones pulsables. Enseña a la derecha qué se guardaría y a qué fase
   pasaría el lead. No envía nada ni escribe en la base.
4. **En el tablero y la ficha:** botón «Enviar secuencia» (elige cuál si hay
   varias activas). La ficha muestra la conversación completa dentro del
   historial.
5. **Panel de la marca:** cuántas conversaciones en curso, cuántos han
   respondido y cuántos han pedido muestras.

## Envío (pieza intercambiable)

Una interfaz `Mensajero` con dos implementaciones:

- **`MensajeroSimulado`** (ahora): registra el mensaje como `simulado`, no llama
  a nadie. Permite usar todo el sistema y ver el circuito completo.
- **`MensajeroWhatsApp`** (cuando haya cuenta): llama a la API de WhatsApp
  Business (Meta Cloud API) y recibe las respuestas por un webhook
  `/api/ventas/whatsapp/[slug]`, verificado con el secreto de la marca.

El resto del sistema no sabe cuál está activo: se elige por configuración de la
marca.

## Seguridad y legal

- Mismo acceso que el resto del módulo: sesión propia, rol comprobado en cada
  acción. Editar y activar secuencias, solo admin; enviarlas, cualquier comercial.
- El webhook de entrada verifica la firma de Meta antes de tocar nada.
- Los teléfonos ya están en el CRM; no se comparten con terceros más allá de
  Meta, que es quien transporta el mensaje.
- **Pendiente fuera del sistema:** confirmar con un abogado el envío a negocios
  sin contacto previo (igual que con las llamadas en frío) y añadir el
  tratamiento a los contratos con cada marca.

## Fases de entrega

1. **Editor y simulador** (sin enviar nada): tablas, editor, simulador,
   validaciones y `MensajeroSimulado`. Ya se puede escribir y afinar la
   conversación de Hydrup.
2. **Envío real:** `MensajeroWhatsApp`, webhook de respuestas, ventana de 24
   horas, esperas por cron y avisos a «Mi día».
3. **Medición:** respuestas, muestras pedidas y pedidos por secuencia, para
   comparar WhatsApp con la llamada a puerta fría.

## Fuera de alcance

- IA respondiendo conversaciones.
- Arranque automático por entrada de lead (se valorará cuando una secuencia esté
  rodada).
- Otros canales (email, SMS, Instagram).
- Pagos o pedidos dentro de WhatsApp.

## Pendiente antes de construir la fase 2

- Cuenta de WhatsApp Business API con número dedicado y empresa verificada.
- Plantillas iniciales aprobadas por Meta.
- Precio mayorista y PVP de Hydrup para el argumento del margen.
