# Unificación del CRM, proyecto 2: Campañas como módulo de ventas

Fecha: 2026-10-16 · Estado: diseño para revisión

Sigue a `2026-10-15-crm-unificacion-leads-fases-design.md` (proyecto 1, ya en
main). Allí las campañas pasaron a mandar a leads de ventas de la marca
`dinkbit`, pero la pantalla seguía en `/panel/campanas`. Aquí la pantalla entra
en `/panel/ventas/<marca>/campanas` y deja de ser solo de dinkbit.

## Para qué

- Campañas de email (el asistente de 4 pasos de
  `2026-07-27-mailing-campaigns-crm-design.md`) dentro de cada marca de ventas.
- Es un **servicio de pago** para las marcas clientes: **módulo opcional por
  marca** que solo un admin enciende o apaga. dinkbit lo tiene encendido.
- Los destinatarios salen de los `ventas_leads` de esa marca, con las reglas de
  siempre (consentimiento sí, con email, sin rebote ni queja, sin archivar).
- Bajas y seguimiento de Resend siguen funcionando con los ids viejos de
  `imagina_leads` (correos ya enviados) y con los de ventas de cualquier marca.

## Decisiones

- **Interruptor de módulos** en `ventas_marcas.modulos text[]` (hoy solo
  `campanas`). Una lista y no un booleano porque vendrán más servicios
  opcionales. El SQL enciende `campanas` en dinkbit.
  - Sin la migración (la fila no trae `modulos`): dinkbit cuenta como
    encendido —así nada de lo que ya funciona se apaga— y el resto, apagado.
  - Lo enciende y apaga un admin en la pestaña Condiciones de la marca.
  - Lo usan admin y comercial. La clienta no ve la pestaña (como Secuencias):
    el servicio lo opera dinkbit.
- **Campañas y plantillas guardan su marca**: `campaigns.marca_id` y
  `email_templates.marca_id` (nullable). `null` = dinkbit, que es lo que hay
  hoy; el SQL las rellena con la marca dinkbit igualmente.
  - Una marca ve sus campañas. dinkbit ve también las que no tienen marca.
  - Plantillas: cada marca ve las predefinidas (`is_builtin`) y las suyas.
  - Sin la columna: dinkbit lo ve todo como hoy; otra marca no ve nada y no
    puede crear (aviso «falta la migración»), para no crear campañas de
    Hydrup que el sistema trataría como de dinkbit.
- **Remitentes por marca**: `ventas_marcas.campanas_remitentes text[]`. Vacío
  = la lista global de siempre (`CAMPAIGN_SENDERS`, por defecto
  `hola@dinkbit.es`). El dominio tiene que estar verificado en Resend: lo
  avisa la pantalla de Condiciones.
- **El envío decide los destinatarios por la marca de la campaña**, no por la
  pantalla desde la que se pulsa. Así el cron, el /panel viejo y ventas no
  pueden mezclar leads de dos marcas. Si el módulo está apagado, la campaña no
  sale (manual: error; programada: queda en «Error»).
- **La baja y la propagación de rebotes** buscan el lead primero en dinkbit por
  id o id externo (correos viejos) y, si no, en cualquier marca por su uuid de
  ventas. Cada lead pertenece a una marca, así que darse de baja de Hydrup no
  da de baja en dinkbit.
- **Las pantallas se comparten**, no se copian. Los componentes del asistente
  pasan a `src/app/(site)/panel/_campanas/` y reciben sus acciones por un
  contexto (`AccionesCampana`). `/panel/campanas` les da las suyas; ventas,
  unas que comprueban marca, permiso y módulo antes de cada cosa.
- **El /panel viejo sigue igual** (proyecto 4 lo retira), pero solo enseña
  campañas de dinkbit.

## Fuera de alcance

- Retirar `/panel/campanas` (proyecto 4).
- Que la clienta vea sus campañas o sus métricas.
- Marca visual por marca en la plantilla (colores, logo): el asistente sigue
  con el estilo de dinkbit y se edita a mano.
- Página de baja con la marca del cliente (sigue diciendo «dinkbit.es»).

## Base de datos

`docs/sql/2026-10-16-ventas-campanas.sql`, idempotente:

- `ventas_marcas.modulos text[] not null default '{}'`,
  `ventas_marcas.campanas_remitentes text[] not null default '{}'`;
  dinkbit gana `campanas`.
- `campaigns.marca_id uuid references ventas_marcas(id)`, índice; las que no
  tienen marca pasan a dinkbit.
- `email_templates.marca_id uuid references ventas_marcas(id)`; las no
  predefinidas sin marca pasan a dinkbit.
- Comprobación final que devuelve los recuentos.

## Pruebas

- Puras: `tieneModulo`, `campanaEsDeMarca`, `remitentesDeMarca`.
- `campaigns`: filtro por marca, alta con marca, tolerancia sin columna.
- `campaign-send`: destinatarios de la marca de la campaña, módulo apagado,
  remitente de la marca, ids viejos en campañas programadas.
- `leads-web`: baja con uuid de otra marca y con id viejo de imagina.
- Acciones de ventas: permiso, módulo y campaña de otra marca rechazados; la
  de módulos exige admin.
- `rutas`: la clienta no entra en `campanas`.
