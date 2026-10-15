# Unificación del CRM, proyecto 1: leads, fases y agenda en /panel/ventas

Fecha: 2026-10-15 · Estado: diseño aprobado en conversación, pendiente de revisión escrita

## Para qué

dinkbit tiene dos CRM: el viejo `/panel` (tabla `imagina_leads`, contraseña
compartida) y `/panel/ventas` (tablas `ventas_*`, usuarios con login, marcas).
Tener los leads de dinkbit en uno y los de las marcas en otro «hace ruido». La
decisión del 2026-10-15 es que **todo quede en `/panel/ventas`**.

La unificación va en cuatro proyectos, cada uno con su spec:

1. **Este: leads, fases y agenda.**
2. Campañas como módulo opcional por marca.
3. Prospección con Overture Maps en ventas.
4. Retirar el `/panel` viejo. Calculadora no se migra.

Éxito de este proyecto:
- Todos los leads de `imagina_leads` están en la marca `dinkbit` de ventas,
  con su fase, responsable, notas, seguimiento, canal, campaña, etiquetas,
  consentimiento y estado de email.
- Todo lead nuevo de la web entra directamente en ventas.
- El tablero de dinkbit tiene sus fases propias, sin «Muestras».
- La agenda vieja son ahora las tareas de ventas.
- Las campañas siguen enviando, ahora a leads de ventas.
- Los enlaces de baja y los PDF de preview ya enviados siguen funcionando.

## Decisiones tomadas

- **Fases por marca.**
  - dinkbit: Nuevo · Contactado · Volver a llamar · Interesado · **Propuesta
    enviada** · Cliente. Descartes: Perdido / No le interesa / Ilocalizable /
    Fuera de perfil.
  - Hydrup y Proveedores deportivos conservan «Muestras enviadas».
- **Kit Digital es una etiqueta, no una fase.**
  - «Interés en Kit Digital» → Interesado + etiqueta `kit-digital`.
  - «Cliente Kit Digital» → Cliente + etiqueta `kit-digital`.
- **La agenda son las tareas.**
  - El `followup_at` del lead pasa a `proximo_seguimiento` y genera la tarea
    automática «Llamar».
  - El texto libre `followup` va al historial como nota.
- **Responsables por email, con una tabla fija.** En `/panel` los
  responsables son textos cortos; en ventas, usuarios. La migración usa esta
  correspondencia (en `dominio.ts` y copiada en el SQL):

  | `account_manager` | Usuario de ventas |
  |---|---|
  | Yael | yael.benbunan@dinkbit.com |
  | Paula G | paula.garcia@dinkbit.com |
  | Paula L | paula.lopez@dinkbit.com |
  | Alicia | alicia.ruiz@dinkbit.com |

  - Yael y Paula Garcia ya tienen usuario. Yael crea antes del SQL de datos los
    de paula.lopez@ y alicia.ruiz@.
  - Si el usuario no existe o está desactivado, o el texto no está en la tabla,
    el lead queda sin asignar.
- **`imagina_leads` no se borra.** Se queda como copia de seguridad de solo
  lectura hasta el proyecto 4.
- **Las fases por marca viven en código**, como `TIPOS_POR_MARCA`. Con tres
  marcas no compensa una tabla.

## Fuera de alcance

- Mover la pantalla de Campañas a ventas y el interruptor por marca
  (proyecto 2). Aquí solo cambia de dónde salen los destinatarios.
- Prospección (proyecto 3). Su «convertir en lead» se redirige a ventas, pero la
  pantalla sigue en `/panel/prospeccion`.
- Borrar `/panel` y `imagina_leads` (proyecto 4).

## 1. Fases por marca

**Base de datos.** El `CHECK` `ventas_leads_fase_check` admite además
`propuesta`.

**Código** (`src/lib/ventas/dominio.ts`):
- `FASES` gana `propuesta`, con la etiqueta «Propuesta enviada».
- Nueva función `fasesDeMarca(slug): readonly Fase[]`:
  - `dinkbit` → `nuevo, contactado, volver_a_llamar, interesado, propuesta,
    cliente` + descartes;
  - el resto de marcas → la lista actual, con `muestras` y sin `propuesta`.
- `fasesActivasDeMarca(slug)` hace lo mismo para las fases activas.

**Quién las usa:**
- tablero (`tablero.ts`): columnas;
- embudo (`metricas.ts`, `EmbudoVista`): etapas;
- desplegables de fase en la ficha;
- `moverLead`.

En la marca dinkbit:
- desaparecen la tarea automática «Enviar muestras», el resultado de llamada
  «Pide muestras» y el botón «Marcar muestras enviadas»;
- mover a `propuesta` es un cambio de fase normal.

Un lead cuya fase no está en la lista de su marca (dato antiguo) se pinta en
la columna «Otros» del tablero en vez de desaparecer.

**Panel general** (`/panel/ventas`, resumen de marcas): cada marca se resume
con sus propias fases.

## 2. Datos nuevos en los leads de ventas

Columnas nuevas en `ventas_leads`, todas opcionales:

| Columna | Tipo | Para qué |
|---|---|---|
| `id_externo` | text | Id de `imagina_leads` o del preview de Imagina. Único por marca. Mantiene vivos los enlaces de baja y los PDF ya enviados. |
| `canal` | text | Meta, Web, WhatsApp, Prospección, Google Ads… (lo que hoy es `channel`). |
| `campana` | text | Lo que hoy es `campaign`; sale de los UTM. |
| `etiquetas` | text[] default `{}` | Por ahora `kit-digital`. |
| `consentimiento` | boolean | Comunicaciones comerciales. `null` = sin definir. |
| `email_estado` | text | `sent`, `delivered`, `bounced`, `complained`… (lo que hoy es `email_status`). |
| `email_mensaje_id` | text | Id de Resend del último correo automático. |
| `email_actualizado_at` | timestamptz | — |
| `archivado` | boolean default false | Ocultar sin borrar. |
| `extra` | jsonb default `{}` | Lo que es solo de los flujos de la web: datos del preview de Imagina (`template`, `style`, `palette`, `value_prop`, `pdf_path`, `review_*`) y `sector`. |

`origen` admite además `web`, para los leads que llegan por formularios del
sitio.

Índices nuevos:
- `(marca_id, id_externo)` único donde `id_externo` no es nulo;
- `(email_mensaje_id)`.

**Interfaz:**
- La lista y el tablero de cada marca ganan filtros por canal, campaña y
  etiqueta.
- Los archivados se ocultan por defecto, con un interruptor «Archivados (N)».
- La ficha muestra canal, campaña, etiquetas, consentimiento y estado del
  email, y deja editar canal, campaña, etiquetas y consentimiento.
- La ficha deja archivar y desarchivar.
- Si hay `extra.pdf_path`, la ficha enlaza al PDF del preview.

## 3. Entradas de leads: de `imagina_leads` a ventas

Las funciones de `src/lib/imagina-leads.ts` que **crean o actualizan** leads
se reescriben sobre ventas, en un módulo nuevo `src/lib/ventas/leads-web.ts`,
**con la misma firma**. Así los ~15 llamantes (formularios, landings,
webhooks, preview, panel) cambian solo el import.

Cada una escribe en la marca `dinkbit` (`MARCA_DINKBIT_SLUG`):

| Función actual | Qué hace ahora |
|---|---|
| `createWebhookLead`, `saveLead`, `upsertKitDigital2026Lead`, `savePromoQuestionnaire` | Alta o actualización por `id_externo` (si el flujo trae id) o por contacto (email o teléfono), con `origen = 'web'`, canal y campaña de los UTM, y consentimiento. Lo que no tiene columna va a una nota inicial o a `extra`. |
| `createManualLead`, `createLeadsBulk` | Las usan el `/panel` viejo y Prospección. Pasan a crear en dinkbit con `origen = 'manual'` / `'lista'`. |
| `setLeadEmailSent`, `setLeadEmailStatus`, actualizaciones de consentimiento | Actualizan `email_*` y `consentimiento` buscando el lead por `id` (uuid) o por `id_externo`. |
| `listEmailableLeads`, `emailsDeLeads`, `buscarLeadPorEmail` | Leen de los leads de dinkbit: consentimiento sí, con email, no rebotado ni con queja, no archivados. |

`negocio` es obligatorio en ventas. Si el flujo no trae nombre de negocio, se
usa el nombre de la persona, y si tampoco hay, el email. `codigo_cliente` lo
sigue generando la RPC `ventas_crear_leads`.

Un repetido (mismo email o teléfono en dinkbit):
- completa los campos vacíos;
- apunta la vuelta en el historial, como ya hace `guardarLeadEntrante`;
- no crea otro lead.

Si el flujo trae un `id_externo` nuevo, se guarda en el lead existente solo si
este aún no tiene uno; si ya tiene otro distinto, se apunta en `extra.ids`.
Así el enlace de baja del correo nuevo también funciona.

**«Pasar al embudo» de WhatsApp** se quita: el lead ya está en el mismo CRM.
El botón, `pasarLeadAlEmbudo` y `promocionado_at` dejan de usarse. La columna
se queda.

**Webhook de Resend, baja y queja.** Buscan el lead por `email_mensaje_id` y
por `id` / `id_externo` en `ventas_leads`. Mientras dure la transición también
consultan `imagina_leads`: una baja de un correo enviado antes de la migración
apunta a un id viejo, que ya está guardado como `id_externo`.

**Campañas** (`campaign-send.ts`, `StepRecipients`):
- los destinatarios salen de `listEmailableLeads`, ahora sobre ventas;
- `campaign_recipients.lead_id` guarda el `id` de ventas;
- el enlace de baja lleva ese `id`;
- la pantalla sigue en `/panel/campanas` hasta el proyecto 2.

## 4. Migración de datos

Dos SQL en `docs/sql/`, idempotentes. Los ejecuta Yael en el SQL Editor del
proyecto `wnboyesnlrbtwfmhcxmc`.

**`2026-10-15-crm-unificacion-estructura.sql`:**
- añade `propuesta` al CHECK de fase y `web` al de origen;
- añade las columnas e índices de la sección 2;
- amplía `ventas_crear_leads` para aceptar los campos nuevos.

Comprobación que Yael pasa antes de desplegar el código:

```sql
select count(*) from information_schema.columns
where table_name = 'ventas_leads'
  and column_name in ('id_externo','canal','campana','etiquetas','consentimiento','email_estado','archivado','extra');
```

Debe devolver `8`.

**`2026-10-15-crm-unificacion-datos.sql`** (después del despliegue): copia
`imagina_leads` → `ventas_leads` de la marca dinkbit, en una transacción.

- `id_externo` = `imagina_leads.id`. Si ya existe en dinkbit un lead con ese
  `id_externo`, o con el mismo email o teléfono, no se duplica: se completan
  sus campos vacíos.
- `negocio` = `business_name`, o `name`, o `email`.
- `contacto` = `name`; `telefono`, `email`, `web` = `current_website`.
- `canal`, `campana`, `consentimiento`, `email_*`, `archivado` se copian tal
  cual.
- `extra` = los campos del preview y `sector`.
- `etiquetas` = `{kit-digital}` si el estado era `kit-digital` o
  `cliente-kit-digital`.
- Fase según el estado:

  | Estado en /panel | Fase en ventas |
  |---|---|
  | nuevo | nuevo |
  | contactado | contactado |
  | seguimiento | volver_a_llamar |
  | kit-digital | interesado |
  | propuesta | propuesta |
  | ganado | cliente |
  | cliente-kit-digital | cliente |
  | perdido | perdido |
  | ilocalizable | ilocalizable |
  | cualquier otro | nuevo |

- `asignada_a` = la usuaria activa cuyo email corresponde a `account_manager`
  según la tabla de responsables (comparación sin mayúsculas ni espacios
  sobrantes). Si no hay, nula.
- `proximo_seguimiento` = `followup_at`.
- `created_at` = el original.
- `origen` = `web`, `origen_detalle` = `campaign`.
- Historial (`ventas_actividad`, una nota por lead, `usuaria_id` nulo):
  - `notes` → «Notas de /panel: …»;
  - `followup` → «Seguimiento: …».
- `campaign_recipients.lead_id` antiguos **no se tocan**: el histórico de
  campañas sigue apuntando a ids viejos, que se resuelven por `id_externo`.

Al final imprime los recuentos: leads leídos, creados, fusionados con uno
existente, por fase, con responsable y sin responsable. Yael pasa ese resultado.

## 5. El /panel viejo durante la transición

- Leads, Tablero y Agenda de `/panel` muestran un aviso «Los leads se gestionan
  ahora en /panel/ventas» con enlace, y dejan de permitir crear, editar e
  importar. Siguen visibles como consulta hasta el proyecto 4.
- Campañas, Prospección y Calculadora siguen igual.
- El botón «Pasar al embudo» desaparece de la ficha de ventas.

## Orden de despliegue

1. Yael crea los usuarios paula.lopez@dinkbit.com y alicia.ruiz@dinkbit.com.
2. Yael ejecuta el SQL de estructura y pasa la comprobación (`8`).
3. Despliegue del código. Desde este momento los leads nuevos entran en ventas.
4. Yael ejecuta el SQL de datos y pasa los recuentos.
5. Revisión en `/panel/ventas/dinkbit`: tablero, lista, tareas, una campaña de
   prueba a un solo destinatario interno.

Entre los pasos 3 y 4, los leads viejos solo se ven en `/panel`, en modo
consulta, y los nuevos en ventas. El paso 4 va justo después del 3.

**El código tolera que falten las columnas nuevas.** Las lecturas usan
`tolerarMigracionPendiente`. Las escrituras de los formularios, si fallan por
columna inexistente, reintentan sin los campos nuevos. Así ningún formulario
pierde un lead si el SQL no se ha ejecutado.

## Errores

- Un formulario cuyo alta en ventas falla responde al visitante como hoy (error
  genérico) y lo registra en el log. No hay escritura de respaldo en
  `imagina_leads`: duplicaría la fuente de verdad.
- Un lead de la migración con email y teléfono vacíos se crea igual, con
  `negocio` = `(sin nombre) <id>`, para no perderlo.
- Responsable sin usuario activo en la tabla: queda sin asignar; el recuento lo
  dice, por cada valor de `account_manager`.

## Pruebas

- `dominio`:
  - `fasesDeMarca` para dinkbit y para otra marca;
  - `propuesta` solo en dinkbit.
- `tablero` y `metricas`: columnas y embudo por marca; un lead con fase ajena
  cae en «Otros».
- `tareas`: dinkbit no genera «Enviar muestras».
- `leads-web`, una prueba por función reescrita, con la base simulada:
  - alta nueva;
  - repetido por email;
  - repetido por `id_externo`;
  - sin nombre de negocio;
  - UTM → canal y campaña;
  - consentimiento;
  - email de estado por `id` y por `id_externo`;
  - `listEmailableLeads` excluye sin consentimiento, rebotados y archivados.
- Webhook de Resend y baja: encuentran el lead por id nuevo, por id viejo
  (`id_externo`) y por `email_mensaje_id`.
- Campañas: el envío usa ids de ventas en el enlace de baja.
- Los tests existentes de cada formulario siguen en verde, cambiando solo el
  módulo simulado.
- Un test de la tabla de correspondencia estado → fase, con la misma tabla que
  usa el SQL (exportada desde `dominio.ts` y copiada en el SQL con un
  comentario que lo dice).
- Typecheck, lint, build y la suite completa.
