# WhatsApp por marca con coexistencia

Fecha: 2026-10-20 · Estado: borrador para aprobar

## Para qué

Que cada marca del panel de ventas (`/panel/ventas`) tenga **su propio número de
WhatsApp**, conectado desde el panel con la ventana oficial de Meta (Embedded
Signup), en **coexistencia**: el número sigue funcionando en la app WhatsApp
Business del móvil y, a la vez, sus conversaciones viven en la bandeja del panel,
donde las ven y contestan el equipo de Dinkbit y la usuaria cliente de esa marca,
y donde las secuencias automáticas responden a los leads.

Primer caso: **Hydrup**, con un número de Lebara que es de Dinkbit y se le asigna
a Hydrup. Se usará también desde un móvil con WhatsApp Business. Todo su
historial puede subirse al panel y todas sus conversaciones pueden aparecer y
convertirse en leads.

Lo mismo tiene que servir **desde el principio para cualquier cliente** que
conecte su propio número desde su propio portfolio de Meta: Dinkbit está
registrada como Independent Tech Provider (app «dinkbit comunicacion», App ID
`1444585017092524`, configuración de Embedded Signup `971972375349049`, App Review
enviado el 2026-10-20). Nada del diseño puede quedar atado a «el número de
Dinkbit» ni a «el portfolio de Dinkbit».

Después de esto (otro proyecto, fuera de este diseño): campañas para iniciar
conversación con plantillas aprobadas, que arranquen secuencias.

## Objetivos

1. **Conectar un número a una marca desde el panel.** Un admin abre la marca, pulsa
   «Conectar WhatsApp», completa la ventana de Meta en modo coexistencia (escanear el
   QR con la app WhatsApp Business del móvil) y, al terminar, la marca queda con su
   número, su cuenta de WhatsApp (WABA) y su llave de acceso, y nuestra app suscrita
   a los webhooks de esa cuenta.
2. **Cada mensaje entrante va a su marca**, por el número que lo recibió
   (`metadata.phone_number_id`). El número de Dinkbit actual (variable de entorno)
   sigue siendo Dinkbit, sin que haya que tocar nada.
3. **Cada envío sale del número y con la llave de su marca**: respuestas desde la
   bandeja, pasos de secuencias.
4. **Los mensajes que se escriben desde el móvil** (`smb_message_echoes`) aparecen en
   la bandeja como salientes, y **paran la secuencia** de esa conversación (pasa a
   `humana`), igual que si un humano contestase: el lead no puede recibir a la vez
   el bot y la persona.
5. **Historial y contactos**: justo después de conectar, el panel pide a Meta los
   contactos (`smb_app_state_sync`) y el historial (`history`, hasta 180 días) —
   Meta solo lo permite una vez y en las 24 h siguientes a la conexión— y los guarda:
   conversaciones con sus mensajes en su fecha original, y el nombre de cada
   contacto. Para Hydrup, todo eso se importa.
6. **Toda conversación nueva crea un lead** en el tablero de la marca, venga o no de
   un anuncio (decisión de Yael, 2026-10-20). También las del historial. Si el teléfono
   ya es un lead de la marca, se vincula a ese lead en vez de crear otro; los nuevos
   pasan por las mismas exclusiones de la marca que el resto de entradas de leads y
   entran en la fase «nuevo».
6b. **La secuencia automática solo arranca cuando el contacto entra por una campaña
   de Meta de iniciar conversación** (anuncio de clic a WhatsApp, que llega con
   `referral`), como hoy. Cualquier otra conversación entra en `humana` y no la toca
   el bot (decisión de Yael, 2026-10-20). Las futuras campañas con plantilla también
   arrancarán secuencia, pero son del siguiente proyecto.
7. **La bandeja se actualiza sola** mientras está abierta, sin recargar.
8. **La usuaria cliente ve Conversaciones de su marca** (hoy no: `SECCIONES_CLIENTE`
   en `src/lib/ventas/rutas.ts` no incluye `conversaciones`) y puede contestar.
9. **Saber si el número sigue conectado**: si Meta avisa de una desconexión
   (`account_update` con `PARTNER_REMOVED`, p. ej. por no abrir la app del móvil en
   ~14 días), la marca lo muestra y el admin puede reconectar.

## No objetivos

- Campañas de iniciar conversación y gestión de plantillas desde el panel (siguiente
  proyecto).
- Los recordatorios automáticos a 3 h y 8 h (`src/lib/whatsapp/recordatorio.ts`)
  siguen siendo solo de Dinkbit: sus textos son de Dinkbit.
- Grupos, llamadas, estados, multimedia (fotos, audios, documentos): se guarda que
  llegó un mensaje de ese tipo, sin descargar el archivo.
- Facturación de los mensajes de plantilla a cada cliente (la paga cada cliente a
  Meta en su cuenta).

## Antiobjetivos (sería un fracaso aunque funcione)

- Que un mensaje de una marca acabe en otra, o que se envíe desde el número de otra.
- Que conectar a un cliente le saque el número de la app del móvil o le haga perder
  sus chats.
- Que la llave de acceso de un cliente quede legible en la base de datos, en los
  logs o en el navegador.
- Que un lead reciba en paralelo mensajes del bot y de una persona.
- Que el número de Dinkbit que funciona hoy deje de funcionar en algún momento del
  despliegue.
- Que la usuaria cliente o la agente vea o mande en una marca que no es la suya.

## Restricciones

- **Coexistencia solo con la ventana propia.** El enlace «alojado por Meta» no
  documenta la coexistencia (dice que no se puede personalizar y que solo da de alta
  en Cloud API). Hay que usar el SDK de Facebook en nuestra página con
  `FB.login({ config_id: "971972375349049", response_type: "code",
  override_default_response_type: true, extras: { setup: {}, sessionInfoVersion: "3",
  version: "v4", featureType: "whatsapp_business_app_onboarding" } })`. Meta
  retiró las versiones v2/v3 el 2026-10-15: usar `v4`. Dominios ya autorizados en
  Meta: `https://www.dinkbit.es` y `https://dinkbit.es`.
- **En coexistencia no se registra el número** (`/register`) ni hay PIN: ya está
  registrado en la app. Sí hay que suscribir la app a la WABA
  (`POST /{waba_id}/subscribed_apps`).
- **Sincronización**: `POST /{phone_number_id}/smb_app_data` con
  `sync_type: "smb_app_state_sync"` (contactos) y después `sync_type: "history"`.
  Una sola vez por conexión y dentro de las 24 h; si se pierde, hay que desconectar
  el número desde la app del móvil y repetir. Si el negocio no aceptó compartir el
  historial, llega un error `2593109` en el webhook `history`.
- **Webhooks**: además de `messages`, hay que suscribir en el panel de la app los
  campos `account_update`, `history`, `smb_app_state_sync` y `smb_message_echoes`
  (lo hace Yael a mano; el diseño debe decirle cuándo). Todos llegan al mismo
  endpoint `src/app/api/whatsapp/webhook/route.ts`, con la misma firma. Formas
  (documentación de Meta, «Onboarding WhatsApp Business app users»):
  - `smb_message_echoes`: `value.message_echoes[]` con `from`, `to`, `id` (wamid),
    `timestamp`, `type`, `text.body`.
  - `history`: `value.history[]` con `metadata.{phase, chunk_order, progress}` y
    `threads[]` (`id` = número del cliente final) con `messages[]` (`from`, `id`,
    `timestamp`, `type`, `text`, `history_context.status`). Llega en varios trozos.
  - `smb_app_state_sync`: `value.state_sync[]` con `type: "contact"`,
    `contact.{full_name, first_name, phone_number}`, `action` (`add`/`remove`).
  - `account_update`: `value.event` (`PARTNER_ADDED`, `PARTNER_REMOVED`, …) y
    `value.waba_info.{waba_id, owner_business_id}`.
  - Todos traen `value.metadata.phone_number_id` salvo `account_update`, que se
    asocia por `waba_id`.
- **La llave**: al terminar la ventana, Meta devuelve un `code` que el servidor
  canjea por un token de negocio (`GET /oauth/access_token` con app id, app secret y
  code). Ese token se guarda por marca, **cifrado** con una clave que solo está en
  las variables de entorno del servidor. La marca Dinkbit sigue con el token global
  actual (`WHATSAPP_TOKEN`) mientras no se reconecte.
- **Meta y el App Review**: para números en portfolios de **otros** negocios hace
  falta el acceso avanzado a `whatsapp_business_messaging` y
  `whatsapp_business_management` (en revisión). El número de Hydrup está en el
  portfolio de Dinkbit, así que debería poder conectarse antes; no está confirmado y
  se comprueba en el ensayo. El diseño no puede depender de ello.
- **Migraciones a mano**: Yael ejecuta el SQL en Supabase y no se puede comprobar
  desde la sesión. El código tiene que seguir funcionando para Dinkbit aunque la
  migración no se haya ejecutado, y antes de desplegar algo que dependa de ella se
  pide el resultado de una consulta de comprobación (patrón `tolerarMigracionPendiente`
  en `src/lib/ventas/db.ts`).
- **Seguridad de las acciones del panel**: toda server action resuelve la marca con
  `accesoMarcaAccion(slug, seccion)`, nunca solo con el slug que manda el cliente.
- **Base de datos**: Supabase `wnboyesnlrbtwfmhcxmc`, plan Small. Tablas
  `ventas_conversaciones` (única por `marca_id, wa_id`; `estado` bot/humana/cerrada),
  `ventas_mensajes` (`direccion` entrante/saliente, `wamid` único, `payload` jsonb),
  `ventas_marcas`, `ventas_leads` (`origen` en `lista, anuncio, manual, web`).

## Lo que ya existe y se reutiliza

- Webhook con firma verificada y reintentos de Meta ante 500 (`route.ts`,
  `firma.ts`). Deduplicación por `wamid` (`guardarEntrante`).
- Motor de secuencias por marca (`eleccion.ts`, `arrancarSecuencia`,
  `avanzarSecuencia` en `procesar.ts`), modos `bot`/`humana`.
- Hoy **todo** se trata como Dinkbit: `procesarWebhook` llama siempre a
  `getMarcaPorSlug(MARCA_DINKBIT_SLUG)` y `crearMensajero()` usa un único número.
  `entrante.ts` no lee ni `change.field` ni `metadata.phone_number_id`, e ignora en
  silencio los campos de coexistencia.
- Un primer intento de «un número por marca» quedó escrito el 2026-10-06 sin commit
  en la rama vieja `feat/landing-web-299` (columna `ventas_marcas.whatsapp_phone_number_id`,
  `mensajeroDeNumero`, `marcaDeNumero`). Sirve de referencia, pero su `acciones.ts`
  quita el control de acceso por marca de `main`: no copiarlo tal cual. Su SQL
  (`docs/sql/2026-10-06-whatsapp-numero-por-marca.sql`) lleva el Phone ID de un
  número vetado: no usarlo.

## Decisiones tomadas

- Coexistencia, con la ventana propia en el panel, no con el enlace alojado.
- Diseño general para cualquier cliente desde el principio; Hydrup es el primero.
- Toda conversación nueva crea lead; el historial también se importa entero.
- **Quién conecta**: el admin, o **la usuaria cliente de esa marca** desde su propio
  panel (decisión de Yael, 2026-10-20). Con un número de otro negocio tiene que
  hacerlo el cliente, porque la ventana de Meta pide entrar con un Facebook que
  administre el portfolio de ese negocio. El botón aparece al admin en cualquier marca
  y a la clienta solo en la suya; la agente no lo ve. La WABA sigue siendo del cliente:
  solo se comparte con Dinkbit como socio, y el cliente puede retirarla cuando quiera.
- **El primer número es el Lebara de Hydrup**, que es de Dinkbit y nuevo: hace de
  ensayo, porque un fallo no afecta a ningún cliente externo. El número actual de
  Dinkbit (+34 604 35 75 87, Phone ID `1385086741345422`, solo Cloud API) **no pasa
  por coexistencia** ni se toca.
- **Regla de pertenencia**: un `phone_number_id` pertenece como mucho a una marca
  (único). El de la variable de entorno es de Dinkbit salvo que una marca lo tenga
  asignado explícitamente.

## Decisiones mías (Claude), revisables

- **Dónde está el botón**: una sección «WhatsApp» dentro de la marca, solo para
  admin, con el estado (sin conectar / conectado: número y desde cuándo /
  desconectado: motivo) y el botón «Conectar» o «Reconectar».
- **Origen del lead**: nuevo valor `whatsapp` para las conversaciones que no vienen
  de un anuncio (las de anuncio siguen siendo `anuncio`). Requiere ampliar el CHECK.
- **Nombre del lead** de una conversación importada o nueva: el nombre del contacto
  si llegó por `smb_app_state_sync`, si no el del perfil de WhatsApp
  (`contacts[].profile.name` del webhook de mensajes), si no «Lead de WhatsApp
  (teléfono)», como ahora.
- **Importar historial no dispara secuencias ni respuestas**: las conversaciones
  importadas entran en `humana`.
- **Mensajes del historial** se guardan con su `timestamp` original y no abren ni
  cierran la ventana de 24 h.
- **Bandeja en vivo** con un refresco periódico (unos 10 s, solo con la pestaña
  visible), no con Supabase Realtime: hoy nada usa Realtime y el refresco basta.
- **Cifrado del token**: AES-256-GCM con una clave nueva en variables de entorno de
  Vercel.

## Lo que se deja al constructor

- Esquema exacto de columnas y tablas nuevas, y si el token cifrado va en
  `ventas_marcas` o en una tabla aparte con acceso más restringido.
- Cómo se reparte el trabajo del historial (llega en trozos y puede ser grande)
  dentro del límite de tiempo de la función.
- Textos de la interfaz, siguiendo el estilo del panel.
- Orden de las fases y cuántos despliegues, siempre que Dinkbit no deje de funcionar
  en ninguno.
