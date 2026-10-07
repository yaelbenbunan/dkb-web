# Prospección: buscar empresas y escribirles 1:1

Fecha: 2026-10-07 · Estado: diseño aprobado en conversación, pendiente de revisión escrita

## Para qué

Hoy el CRM de `/panel` solo trabaja con leads que llegan solos (formularios,
anuncios, CSV). Queremos poder salir a buscarlos: localizar empresas de un tipo
concreto —restaurantes de una ciudad, sociedades recién constituidas— y
escribirles un correo individual ofreciéndoles un servicio, por ejemplo una web.

Éxito: desde una pestaña nueva se puede lanzar una búsqueda, ver las empresas
encontradas con su contacto, y enviar a cada una un correo personalizado con una
plantilla, sin salir del panel y sin poner en riesgo el dominio de las campañas.

## Decisiones tomadas

- **Dos fuentes desde el inicio**: Google Places (negocios locales) y BORME
  (sociedades recién constituidas).
- **Redacción con plantilla y variables**, sin IA.
- **Prospectos en tablas propias**, separados de `leads`: no han dado
  consentimiento y las campañas solo envían a `consent = true`. Mezclarlos
  rompería esa garantía.
- **Todo dentro del panel**, sin scraper externo de pago.

## Fuera de alcance

- Redacción con IA y secuencias de seguimiento automáticas.
- Envío programado o por cron: los envíos los lanza una persona.
- WhatsApp o llamadas a prospectos (el teléfono se muestra, nada más).
- Detección automática de respuestas: se marca a mano.

## Flujo

Pestaña «Prospección» en `PanelShell`, ruta `/panel/prospeccion`, tras el mismo
login que el resto del panel.

1. **Buscar.** Se elige fuente y parámetros:
   - *Negocios locales*: categoría (texto libre, p. ej. «restaurante») + ciudad.
   - *Recién constituidas*: rango de fechas (máx. 7 días por búsqueda) + provincia.
2. **Enriquecer.** Se busca el email de cada empresa (ver más abajo). Avanza por
   tandas con una barra de progreso; se puede cerrar y retomar.
3. **Lista.** Tabla de prospectos con nombre, sector, ciudad, web, email,
   teléfono y estado. Filtros: búsqueda de origen, estado, con/sin email,
   con/sin web.
4. **Enviar.** Se elige plantilla, se ve la vista previa con los datos de esa
   empresa y se envía; a una, o a las seleccionadas. Cada correo es un envío
   individual con un solo destinatario.
5. **Seguir.** Si responden, «Convertir en lead» crea el lead en el CRM.

## Fuentes

### Google Places

Places API (New), Text Search: `"{categoría} en {ciudad}"`, con
`regionCode=ES` y `languageCode=es`. Campos pedidos: id, nombre, dirección,
teléfono, web, tipo principal, valoración y nº de reseñas. Se paginan hasta
3 páginas (60 resultados) por búsqueda.

Clave en `GOOGLE_PLACES_API_KEY`, solo servidor. Sin clave, la pestaña lo dice y
la fuente queda deshabilitada.

### BORME

Datos abiertos del BOE: sumario diario → PDF de la Sección A de la provincia
elegida → extracción de los actos de «Constitución» (denominación, objeto
social, domicilio, fecha).

Como BORME no trae contacto, cada sociedad se busca después en Places por
denominación + municipio. Si hay coincidencia razonable de nombre, se toman web
y teléfono; si no, queda «sin contacto».

**Riesgo principal del proyecto.** Los actos están en PDF y el formato hay que
extraerlo del texto. Antes de construir la fase 2 se hace una prueba corta sobre
un día real para confirmar que el parseo es fiable y elegir librería de lectura
de PDF (`pdf-lib`, ya instalada, no extrae texto). Si la prueba falla, se
replantea la fase 2 sin tocar la 1. Expectativa realista: pocas sociedades
recién creadas tendrán email localizable.

## Enriquecimiento: de la web al email

Para cada prospecto con web se leen la portada y, si existen, las páginas de
contacto y aviso legal (enlaces internos cuyo texto o ruta contenga `contact`,
`contacto`, `aviso-legal`, `legal`). Máximo 3 páginas por empresa.

Se extraen direcciones de enlaces `mailto:` y del texto visible, se descartan
las de dominios ajenos al negocio que sean claramente de terceros (plantillas,
`sentry`, `wixpress`, imágenes tipo `logo@2x.png`) y se elige una:

1. Genérica del propio dominio (`info@`, `contacto@`, `hola@`, `reservas@`,
   `administracion@`…).
2. Genérica en proveedor gratuito (`restaurantex@gmail.com`).
3. Personal (`nombre.apellido@`), marcada como tal.

Las peticiones salen por la misma protección SSRF de `website-extract.ts`
(se extrae a un módulo compartido el `fetch` protegido, hoy privado de ese
fichero). Tiempo límite de 6 s y tope de bytes por página, como ahora.

El enriquecimiento se ejecuta en tandas de 10 prospectos por llamada, lanzadas
desde el cliente, para no depender de una función larga.

## Plantillas

`prospect_templates`: nombre, asunto, cuerpo en texto plano (los saltos de línea
se respetan; las URLs se convierten en enlaces).

Variables: `{{empresa}}`, `{{ciudad}}`, `{{sector}}`, `{{web}}`.

Si la plantilla usa una variable que al prospecto le falta, ese correo **no se
envía** y la fila lo explica. Nunca sale un `{{empresa}}` sin sustituir.

El correo es deliberadamente sobrio —texto, firma y pie—, sin el diseño de las
campañas: debe leerse como un correo de persona a persona.

## Envío

- **Remitente**: lista blanca propia en `PROSPECT_SENDERS`, pensada para un
  subdominio aparte (p. ej. `hola@mail.dinkbit.es`). `Reply-To` a
  `hola@dinkbit.es`. Sin esa variable configurada no se puede enviar: no se cae
  al remitente de las campañas, para no mezclar reputaciones por descuido.
- **Tope diario**: 30 correos por día natural (Europe/Madrid), configurable con
  `PROSPECT_DAILY_LIMIT`. Se cuenta sobre `prospects.sent_at`. Un envío múltiple
  que lo supere manda hasta el tope y deja el resto sin tocar.
- **Direcciones personales**: no entran en envíos múltiples; exigen confirmación
  explícita, una a una.
- **Pie obligatorio**: quién escribe (dinkbit, datos de contacto), de dónde sale
  la dirección («publicada en su web») y enlace de baja.
- **Baja**: `/api/prospeccion/baja?id=…&token=…`, token HMAC con el mismo
  esquema que `unsubscribe-token.ts`. Marca el prospecto como `baja` y añade el
  email a la lista de supresión.
- **Rebotes y quejas**: el webhook de Resend ya existente reconoce los correos
  de prospección por una etiqueta (`tipo=prospeccion`, `prospect_id`) y marca
  `rebotado` o `baja`, añadiendo a supresión.
- **Supresión**: antes de cada envío se comprueba email y dominio contra
  `prospect_suppressions`, y que el email no pertenezca ya a un lead del CRM
  (a esos se les escribe por los cauces normales).
- **Sin doble envío**: el envío reclama la fila con un `update … where
  status = 'listo'` antes de llamar a Resend; si falla el envío, se revierte.

### Marco legal

La LSSI (art. 21) exige consentimiento previo para comunicaciones comerciales
por correo, también entre empresas. Escribir a direcciones genéricas publicadas
por la propia empresa es una zona gris tolerada; a direcciones personales, no.
Las salvaguardas de arriba (solo genéricas por defecto, identificación, origen
del dato, baja en un clic, supresión permanente, volumen bajo) reducen el riesgo
pero no lo eliminan. La decisión de enviar es de dinkbit.

## Datos

Proyecto Supabase `dinkbit-leads`. Migración en
`docs/sql/2026-10-07-prospeccion.sql`. RLS activado sin políticas: solo accede
el `service_role` desde el servidor, como el resto del panel.

**`prospect_searches`** — `id`, `source` (`places` | `borme`), `params` (jsonb),
`status` (`buscando` | `lista` | `error`), `error`, `total`, `created_at`.

**`prospects`** — `id`, `search_id`, `source`, `external_id` (ID de Places o
identificador del acto de BORME; único junto a `source`), `name`, `sector`,
`address`, `city`, `province`, `phone`, `website`, `email`, `email_kind`
(`generica` | `personal`), `rating`, `reviews`, `extra` (jsonb: objeto social,
fecha de constitución…), `status`, `enriched_at`, `template_id`, `sent_at`,
`resend_id`, `send_error`, `lead_id`, `created_at`.

Estados: `nuevo` (sin enriquecer) → `listo` (con email) | `sin_contacto` →
`enviado` → `respondido` | `rebotado` | `baja`; y `descartado` (manual, desde
cualquiera).

Una empresa que ya existe (`source` + `external_id`) no se duplica ni vuelve a
`nuevo` al aparecer en otra búsqueda.

**`prospect_templates`** — `id`, `name`, `subject`, `body`, `created_at`,
`updated_at`.

**`prospect_suppressions`** — `value` (email o dominio, en minúsculas, clave
primaria), `kind` (`email` | `dominio`), `reason` (`baja` | `rebote` | `queja` |
`manual`), `created_at`.

## Convertir en lead

Crea una fila en `leads` con nombre, email, teléfono, web y ciudad del
prospecto, canal «Prospección» (se añade a la lista de canales) y
`consent = null`: que haya respondido no es consentimiento para campañas.
Guarda `lead_id` en el prospecto y lo pasa a `respondido`. Si ya hay un lead con
ese email, enlaza con él en vez de duplicar.

## Piezas

Lógica pura, probada sin red:

| Módulo (`src/lib/prospeccion/`) | Responsabilidad |
|---|---|
| `emails.ts` | Extraer y clasificar direcciones a partir de HTML |
| `plantilla.ts` | Sustituir variables, detectar las que faltan, texto → HTML |
| `reglas-envio.ts` | Si un prospecto es enviable y por qué no; tope diario |
| `places.ts` | Montar la petición y normalizar la respuesta de Places |
| `borme.ts` | Sumario → PDF de provincia → actos de constitución |
| `baja-token.ts` | Token de baja para prospectos |

Con efectos:

| Módulo | Responsabilidad |
|---|---|
| `fetch-seguro.ts` (extraído de `website-extract.ts`) | `fetch` con guardia SSRF |
| `enriquecer.ts` | Leer las páginas de una web y devolver el mejor email |
| `db.ts` | Lecturas y escrituras de las cuatro tablas |
| `enviar.ts` | Reclamar, renderizar, enviar por Resend, registrar |

Interfaz: `src/app/(site)/panel/prospeccion/` con `page.tsx`, `actions.ts`,
`Buscador.tsx`, `TablaProspectos.tsx`, `Plantillas.tsx`, `VistaPrevia.tsx`.
Ruta de baja en `src/app/api/prospeccion/baja/route.ts`.

## Errores

- Places sin clave, con cuota agotada o con error: la búsqueda queda en `error`
  con el mensaje visible; no se guardan resultados a medias.
- Una web que no responde o está bloqueada por la guardia: el prospecto queda
  `sin_contacto` con el motivo, y la tanda sigue.
- Fallo de Resend en un envío: la fila vuelve a `listo` con `send_error`; no
  cuenta para el tope.
- BORME sin publicación ese día (festivos, fines de semana): se omite sin error.

## Pruebas

Vitest, como el resto del repo, con las APIs externas simuladas:

- `emails`: `mailto:`, texto, ofuscaciones simples, falsos positivos,
  prioridad genérica/personal.
- `plantilla`: sustitución, variable ausente, escape de HTML.
- `reglas-envio`: cada motivo de bloqueo y el tope en el cambio de día.
- `places` y `borme`: sobre respuestas y un PDF reales guardados como fixtures.
- `enviar`: no hay doble envío, reversión si Resend falla, supresión respetada.
- Ruta de baja: token válido, caducado y manipulado.

## Fases

1. **Places, enriquecimiento, plantillas y envío.** Entregable y útil por sí
   sola.
2. **BORME**, empezando por la prueba de parseo.

## Requisitos externos

- Clave de Google Places API con facturación activa (`GOOGLE_PLACES_API_KEY`).
- Subdominio de envío verificado en Resend y `PROSPECT_SENDERS` configurada.
- Ejecutar la migración SQL en Supabase.
