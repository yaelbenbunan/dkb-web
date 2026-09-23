# Canal de WhatsApp: diseño

Fecha: 2026-09-23 · Estado: pendiente de revisión · Módulo: `/panel/ventas`

Entrega 1 de la fase 2 del spec
[2026-09-18-secuencias-whatsapp-design.md](2026-09-18-secuencias-whatsapp-design.md),
que dejó anotado como trabajo futuro: *«Envío real: `MensajeroWhatsApp`, webhook
de respuestas, ventana de 24 horas, esperas por cron y avisos a Mi día»*.

## Objetivo

Un anuncio Click-to-WhatsApp lleva a una persona a escribir al número de Dinkbit.
El canal recibe ese mensaje, crea el lead atribuido a su campaña y le contesta al
momento con un acuse de recibo y una primera pregunta de cualificación. Quien
escribe sin venir de un anuncio no recibe ningún bot: se guarda su mensaje y se
avisa a una persona. Las comerciales leen y responden desde el panel.

Éxito: un lead que llega de un anuncio recibe respuesta en segundos, queda
atribuido, y ninguna conversación se queda sin contestar.

## Prerrequisitos, ya resueltos

Completados el 2026-09-23 (ver memoria `whatsapp-cloud-api`):

- App de Meta `dinkbit comunicacion`, WABA «Dinkbit» `1058918150452294`.
- Número `+34 604 35 75 87`, Phone Number ID `1385086741345422`, verificado y
  servido por Cloud API.
- Token permanente del usuario del sistema `Employee`, con la WABA «Dinkbit»
  asignada con control total. **Sin esa asignación el token lee el número pero
  el `POST /messages` devuelve un `(#100) Authorization Error` sin más pistas.**
- Variables en Vercel Production: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.

Queda pendiente y **bloquea el despliegue**: publicar la app en Meta. Mientras
esté «sin publicar» solo se entregan webhooks de prueba, nunca mensajes reales.

## Lo que impone WhatsApp

- Para escribir primero hace falta una **plantilla aprobada**. Pero si la persona
  escribe ella, se abre una ventana en la que se puede responder con texto libre:
  **24 horas** normalmente, **72 horas** si el mensaje vino de un anuncio CTWA.
  Por eso esta entrega no necesita ninguna plantilla aprobada para funcionar.
- Meta **reintenta el webhook** si no recibe un 200 rápido, así que el mismo
  mensaje puede llegar varias veces.
- Un número registrado en Cloud API **ya no se puede usar desde la app de
  WhatsApp del móvil**. Sin bandeja en el panel, las conversaciones quedarían sin
  responder.
- Los mensajes que vienen de un anuncio traen un objeto `referral` con el
  anuncio, la campaña y el texto del anuncio.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Quién dispara la autorespuesta | **Solo los mensajes con `referral`** (vienen de un anuncio). Evita soltarle un bot a un cliente que responde a una conversación en curso. |
| Mensajes sin `referral` | Se guardan, se busca si el teléfono ya es un lead y se marca la conversación como `humana`. No se responde nada automático. |
| Dónde viven estos leads | Como una **marca más del módulo de ventas** (slug `dinkbit`), reutilizando tablero, fases, actividad y métricas. |
| Paso al CRM principal | **Explícito**, con un botón en la ficha. Decidir qué lead es interesante es criterio humano. Las dos bases son la misma, así que es una escritura entre tablas vecinas. |
| Alcance del bot en esta entrega | **Un solo turno**: acuse + una pregunta. Las ramas, botones y esperas son la entrega 2. |
| Respuesta manual | Bandeja en `/panel/ventas/[slug]/conversaciones`. |
| Tiempo real | Fuera. La lista se refresca al navegar. |

Las dos primeras filas **cambian decisiones del spec de secuencias**, que decía
que las secuencias se arrancan a mano y que una respuesta libre detiene la
secuencia. Es un cambio deliberado: aquella decisión se tomó sin número real y
para un flujo saliente (nosotros escribimos primero). Aquí el flujo es entrante.

## Modelo de datos

Migración manual en `docs/sql/2026-09-23-whatsapp-canal.sql`, prefijo `ventas_`,
RLS activada sin políticas como el resto del módulo.

**`ventas_conversaciones`** — una por (marca, teléfono).

| Columna | Notas |
|---|---|
| `marca_id` | referencia a `ventas_marcas` |
| `lead_id` | referencia a `ventas_leads`, nullable hasta que se identifica |
| `wa_id` | teléfono en E.164 sin `+`, como lo manda Meta. Único junto a `marca_id` |
| `estado` | `bot` \| `humana` \| `cerrada` |
| `ventana_hasta` | cuándo caduca la ventana de texto libre |
| `ultimo_mensaje_at` | para ordenar la bandeja |

**`ventas_mensajes`** — el hilo.

| Columna | Notas |
|---|---|
| `conversacion_id` | referencia con `on delete cascade` |
| `direccion` | `entrante` \| `saliente` |
| `wamid` | id de Meta, **único** |
| `texto` | el cuerpo, si es de texto |
| `payload` | jsonb con el mensaje crudo, por si luego hacen falta adjuntos |
| `estado` | `enviado` \| `entregado` \| `leido` \| `fallido` |
| `error` | motivo cuando Meta rechaza |

El índice único en `wamid` es lo que hace el webhook idempotente: el insert va con
`on conflict do nothing` y, si no inserta fila, no se procesa nada más. Sin eso,
un reintento de Meta provocaría una segunda autorespuesta al mismo mensaje.

## El webhook

`src/app/api/whatsapp/webhook/route.ts`, `runtime = "nodejs"`,
`dynamic = "force-dynamic"`.

**`GET`** — alta de la URL en Meta. Compara `hub.verify_token` con
`WHATSAPP_VERIFY_TOKEN` y devuelve `hub.challenge` en texto plano, o 403.

**`POST`** — misma forma que
[resend/webhook/route.ts](../../../src/app/api/resend/webhook/route.ts):

1. Leer el **cuerpo crudo** (`req.text()`), necesario para la firma.
2. Verificar `X-Hub-Signature-256` (HMAC-SHA256 con `WHATSAPP_APP_SECRET`) con
   comparación en tiempo constante. Sin firma válida, **401 y no se parsea nada**.
3. Recorrer `entry[].changes[].value`:
   - `statuses[]` → actualizar el estado del mensaje saliente por `wamid`.
   - `messages[]` → clasificar y actuar (abajo).
4. Devolver **200 siempre que la firma sea válida**, aunque no case nada. Un 500
   solo provoca reintentos.

La clasificación de cada mensaje entrante, en `src/lib/whatsapp/entrante.ts` como
función pura y testeable:

| Caso | Acción |
|---|---|
| Trae `referral` y no hay lead con ese teléfono | Crear lead (origen `anuncio`, fase `nuevo`, campaña del referral), conversación en `bot`, responder acuse + pregunta |
| Trae `referral` y el lead ya existe | Reutilizar el lead, registrar actividad, responder igual |
| Sin `referral`, sin conversación previa | Guardar, buscar lead por teléfono, estado `humana`, registrar actividad. **No responder** |
| Conversación en `bot` (está contestando la pregunta) | Guardar la respuesta en la ficha del lead, pasar a `humana`, registrar actividad |
| Conversación en `humana` | Solo guardar y actualizar la ventana |

El envío de la autorespuesta ocurre dentro de la misma petición: es una llamada
HTTP corta y Meta tolera de sobra el tiempo. Si el envío falla, el mensaje
entrante ya está guardado y la conversación queda marcada para que una persona lo
vea; nunca se pierde un lead por un fallo de envío.

## El mensajero

`src/lib/whatsapp/mensajero.ts`. Es la «pieza intercambiable» que el spec de
secuencias ya preveía, de modo que la entrega 2 la enchufa sin rediseñar nada.

- `enviarTexto(waId, texto)` — texto libre, solo válido con la ventana abierta.
- `enviarPlantilla(...)` — se declara ahora, se usa en la entrega 2.
- **Modo simulación** cuando faltan las variables de entorno: registra lo que
  habría enviado y no llama a Meta. Mantiene tests y previews sin gastar
  conversaciones ni escribir a personas reales.
- Antes de enviar texto libre comprueba `ventana_hasta`. Si está cerrada no
  llama a Meta: devuelve un error tipado que la bandeja entiende.

## La bandeja

`/panel/ventas/[slug]/conversaciones`.

Lista ordenada por `ultimo_mensaje_at`, con nombre del lead, extracto del último
mensaje e indicador de ventana abierta o cerrada. Al abrir una conversación, el
hilo completo y un campo para responder.

- **La ventana manda**: si está cerrada, el campo aparece deshabilitado con un
  aviso de que hace falta una plantilla. Mejor eso que dejar escribir un párrafo
  y que lo rechace Meta.
- Lectura desde el servidor, escritura con **server action**, como el resto del
  panel. El token no sale del servidor.
- Enlace a la ficha del lead, y desde ahí el botón **«Pasar al embudo»** que lo
  copia al CRM principal (`imagina-leads`).

## Pruebas

Con tests, como el resto del repo:

- Clasificación del mensaje entrante: los cinco casos de la tabla.
- Cálculo de `ventana_hasta`: 24 h normal, 72 h con referral, y el borde de
  caducidad.
- Normalización de teléfonos entre el formato de Meta (`34660415514`) y el del
  CRM, reutilizando `normalizarTelefono` de `ventas/dominio.ts`.
- Verificación de firma: payload real de ejemplo, firma buena, firma mala y
  cuerpo alterado.
- Idempotencia: el mismo `wamid` dos veces produce una sola respuesta.

De punta a punta, el mensajero en modo simulación permite ejercitar el webhook
completo sin tocar Meta.

Comprobación manual al desplegar, no automatizable: dar de alta la URL del
webhook en Meta y ver llegar un mensaje real desde un anuncio de prueba.

## Fuera de alcance

Entrega 2, con el motor de secuencias completo: botones, rutas, `esperar_dias`
por `pg_cron` (como las campañas, porque Vercel Hobby no da para más crons),
`guardar_respuesta_en` y avisos a «Mi día».

Más adelante, sin fecha: IA respondiendo, adjuntos, tiempo real en la bandeja,
otros canales.

## Riesgos

- **La app sin publicar no entrega mensajes reales.** Es el único bloqueo duro.
- El módulo de ventas se diseñó como servicio a comisión para marcas de terceros.
  Aplicado a Dinkbit, pantallas como condiciones o comisiones enseñarán campos sin
  sentido. Se acepta: no justifica duplicar el módulo.
- Las conversaciones de CTWA se pagan. El modo simulación y la restricción a
  mensajes con `referral` limitan el gasto accidental.
