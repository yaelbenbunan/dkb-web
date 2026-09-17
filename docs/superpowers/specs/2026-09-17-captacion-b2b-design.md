# Captación B2B con comisión: diseño

Fecha: 2026-09-17 · Estado: pendiente de revisión

## Objetivo

dinkbit ofrece a marcas de producto un servicio integral de venta B2B:
campañas de captación, llamadas, seguimiento y cierre. Cobra un porcentaje de
lo que compra cada cliente que consigue. El piloto es **Hydrup** (electrolitos).
Si funciona, el servicio se ofrecerá a otras marcas con cuota fija más variable.

El sistema es interno: solo lo usan empleadas de dinkbit. Sirve para dos cosas:

1. **Trabajar:** gestionar leads, llamadas y seguimientos de cada marca.
2. **Cobrar y aprender:** saber qué ha generado cada cliente conseguido, con
   trazabilidad suficiente para facturar sin discusiones, y medir el esfuerzo
   (llamadas, coste por cliente) para poner precio al servicio en la siguiente
   marca.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dónde vive | Módulo nuevo en dkb-web, en `/panel/ventas`. Mismo Supabase (`wnboyesnlrbtwfmhcxmc`) y mismo Vercel. Tablas con prefijo `ventas_`. |
| Acceso | Usuario y contraseña por persona (Supabase Auth). Sin registro público: la admin da de alta a las usuarias. |
| Roles | `admin` (usuarias, marcas, condiciones, cerrar liquidaciones) y `comercial` (leads, llamadas, importaciones). |
| Panel de leads actual (`/panel`) | No se toca: sigue con su contraseña compartida. Migrarlo es un proyecto aparte. |
| Registro de llamadas | Manual en el panel. Sin centralita. |
| Origen de los leads | Listas de prospección (CSV) y formularios de anuncios (webhook), en paralelo desde la fase 1. |
| Publicidad | La paga siempre la marca. El sistema solo registra la inversión mensual, para calcular costes. |
| Pedidos | Llegan por el CSV de pedidos de Shopify de la marca, o se introducen a mano. |
| Condiciones de Hydrup | 4 % para siempre de lo que compre cada cliente conseguido. Sin cuota fija ni pago por cliente. |
| Base de la comisión | Importe de productos **sin IVA ni envío**, con los descuentos ya restados. |
| Facturación | El sistema genera la liquidación mensual (PDF y CSV). La factura la emite dinkbit con su propio programa; en la liquidación se apunta el número de factura. |

## Conceptos

- **Marca:** empresa a la que dinkbit presta el servicio (Hydrup).
- **Lead:** negocio al que se intenta vender (un gimnasio, una farmacia…).
- **Cliente conseguido:** lead con al menos un pedido B2B vinculado. La fecha
  de su primer pedido marca el inicio del plazo de comisión.
- **Pedido B2B:** pedido que contiene al menos un producto de la lista de
  productos B2B de la marca.
- **Excluido:** negocio que ya era cliente de la marca antes de empezar el
  servicio. Nunca genera comisión.

## Modelo de datos

Todas las tablas tienen RLS activado y se acceden desde el servidor. Los
importes se guardan en **céntimos** (`bigint`). Las fechas, en `timestamptz`.

### `ventas_usuarias`
Perfil de cada usuaria de Supabase Auth.
- `id` (uuid, = `auth.users.id`), `nombre`, `email`, `rol` (`admin` | `comercial`),
  `activa` (bool), `created_at`.
- Desactivar a una usuaria le impide entrar, pero conserva su nombre en el historial.

### `ventas_marcas`
- `id`, `nombre`, `slug`, `estado` (`activa` | `pausada` | `finalizada`),
  `fecha_inicio`, `created_at`.
- Condiciones: `cuota_mensual_cts` (0 en Hydrup), `comision_pct` (numeric,
  4.00), `plazo_meses` (null = para siempre), `pago_por_cliente_cts` (0 en Hydrup).
- `skus_b2b` (text[]): SKU de los packs B2B.
- `webhook_secret`: secreto propio para la entrada de leads de anuncios.

### `ventas_exclusiones`
Clientes previos de la marca.
- `id`, `marca_id`, `nombre`, `email`, `telefono`, `cif` (al menos uno de
  email, teléfono o CIF), `created_by`, `created_at`.

### `ventas_inversion_anuncios`
- `marca_id`, `mes` (date, día 1), `importe_cts`, `nota`, `updated_by`, `updated_at`.
  Único por (`marca_id`, `mes`).

### `ventas_leads`
- `id`, `marca_id`, `negocio`, `tipo_negocio` (lista cerrada editable en código:
  gimnasio, box/crossfit, club deportivo, fisioterapia, farmacia/parafarmacia,
  tienda de deporte, herbolario, empresa, otro), `contacto`, `telefono`,
  `email`, `ciudad`, `cif`, `web`.
- `origen` (`lista` | `anuncio` | `manual`) y `origen_detalle` (nombre de la
  lista importada o de la campaña).
- `fase` (`nuevo` | `contactado` | `interesado` | `muestras` | `cliente` |
  `perdido` | `no_interesa` | `ilocalizable`).
- `asignada_a` (usuaria), `proximo_seguimiento` (date).
- `codigo_cliente`: único por marca, generado al crear el lead (por ejemplo
  `HYD-7K3P`).
- `primer_pedido_at`: se rellena con el primer pedido vinculado.
- `excluido` (bool): coincide con la lista de exclusión.
- `created_by`, `created_at`, `updated_at`.
- Duplicados: único por (`marca_id`, teléfono normalizado) y por (`marca_id`,
  email en minúsculas) cuando existen.

### `ventas_actividad` (solo se añade)
Historial de cada lead. Es la prueba de trabajo.
- `id`, `lead_id`, `marca_id`, `usuaria_id` (null si la genera el sistema),
  `tipo` (`llamada` | `nota` | `cambio_fase` | `muestras_enviadas` |
  `pedido_vinculado` | `lead_creado`), `resultado` (en llamadas: `no_contesta`
  | `volver_a_llamar` | `interesado` | `pide_muestras` | `no_interesa` |
  `numero_erroneo`), `nota`, `datos` (jsonb: fase anterior y nueva, pedido…),
  `created_at`.
- **Un trigger impide `UPDATE` y `DELETE`** sobre esta tabla.

### `ventas_importaciones`
Registro de cada fichero subido.
- `id`, `marca_id`, `tipo` (`leads` | `pedidos`), `nombre_fichero`,
  `filas_totales`, `filas_guardadas`, `resumen` (jsonb), `usuaria_id`, `created_at`.

### `ventas_pedidos`
- `id`, `marca_id`, `lead_id` (null si se descartó), `numero_pedido` (el de
  Shopify, por ejemplo `#1042`), `fecha_pedido`, `email_comprador`,
  `nombre_comprador`, `codigo_descuento`.
- `base_comision_cts`: productos sin IVA ni envío, con descuentos.
- `total_pedido_cts`: informativo.
- `vinculo` (`codigo` | `email` | `manual`).
- `importacion_id` (null si se metió a mano), `created_by`, `created_at`.
- `liquidacion_id`: la liquidación en la que se cobró (null = pendiente).
- Único por (`marca_id`, `numero_pedido`).

### `ventas_liquidaciones`
- `id`, `marca_id`, `mes` (date, día 1), `estado` (`borrador` | `cerrada`),
  `lineas` (jsonb congelado al cerrar: pedido, cliente, fecha, base, %,
  comisión, si es regularización), `total_comision_cts`, `cuota_cts`,
  `pagos_por_cliente_cts`, `total_cts`, `numero_factura`, `cerrada_por`,
  `cerrada_at`.
- Único por (`marca_id`, `mes`).
- **Un trigger impide modificar una liquidación cerrada**, salvo apuntar
  `numero_factura`.

## Reglas de negocio

### Comisión de un pedido
Un pedido genera comisión si se cumplen las tres condiciones:
1. Está vinculado a un lead que no está excluido.
2. Contiene productos B2B de la marca.
3. `plazo_meses` es null, o `fecha_pedido` es anterior a `primer_pedido_at +
   plazo_meses`.

Comisión del pedido = `round(base_comision_cts × comision_pct / 100)`,
redondeada **por pedido** al céntimo. El total es la suma de las líneas.

### Base de la comisión desde Shopify
Por cada pedido, la suma de las líneas de productos: precio × cantidad menos
el descuento de la línea, sin IVA. El envío no cuenta. Si los precios de la
tienda incluyen IVA, se descuenta usando el impuesto que trae el propio CSV.
La lectura exacta de columnas se fija con una exportación real de Hydrup
antes de implementar (ver «Pendiente antes de construir»).

### Liquidación mensual
- El borrador del mes M incluye todos los pedidos que generan comisión, con
  `fecha_pedido` hasta el último día de M y sin `liquidacion_id`. Los de meses
  anteriores a M salen marcados como **regularización** (por ejemplo, un
  pedido de agosto importado después de cerrar agosto).
- No se puede crear la liquidación de un mes si la del mes anterior sigue en
  borrador.
- Suma además la cuota fija y los pagos por cliente conseguido en M (0 en Hydrup).
- Al cerrarla se congelan las líneas, se marca `liquidacion_id` en sus
  pedidos y ya no cambia.
- Se descarga en PDF (con `pdf-lib`, como el PDF actual del panel) y en CSV.

### Fases del lead
- Registrar una llamada mueve la fase según el resultado:
  - `interesado` → `interesado`
  - `pide_muestras` → `interesado` (la fase `muestras` se marca con el botón
    Muestras enviadas)
  - `no_interesa` → `no_interesa`
  - `numero_erroneo` → `ilocalizable`
  - `no_contesta` y `volver_a_llamar` → `contactado` si era `nuevo`
- El primer pedido vinculado pasa el lead a `cliente` y rellena `primer_pedido_at`.
- Todo cambio de fase escribe una entrada `cambio_fase` en el historial.
- La fase se puede cambiar a mano, y queda registrado igual.

## Entrada de datos

### Leads por CSV (listas de prospección)
- Plantilla descargable con las columnas: negocio, tipo_negocio, contacto,
  telefono, email, ciudad, cif, web.
- Al subir se pide la marca y el nombre de la lista (se guarda en `origen_detalle`).
- Previsualización antes de guardar, fila a fila: válidas, con errores,
  duplicadas (ya existen en la marca) y excluidas.
- Se guarda todo o nada. Se registra en `ventas_importaciones`.
- Se reutiliza el patrón de `src/lib/leads-csv.ts`: parseo puro compartido y
  repetido en el servidor.

### Leads de anuncios (webhook)
- `POST /api/ventas/leads/[slug]`, autenticado con el `webhook_secret` de la
  marca (mismo patrón que `/api/leads/kit-digital-2026`, comparación en tiempo
  constante).
- Zapier (Meta Lead Ads) o el formulario de una landing envían: negocio,
  contacto, teléfono, email, tipo de negocio y campaña.
- Se crea el lead con `origen = anuncio`, sin duplicar si ya existe (en ese
  caso se añade una nota al historial) y marcado como excluido si procede.

### Pedidos por CSV de Shopify
1. Se sube la exportación de pedidos de Shopify de la marca.
2. Se agrupan las filas por pedido (Shopify exporta una fila por producto).
3. Se descartan los pedidos sin productos B2B.
4. Se vincula cada pedido: primero por código de descuento = `codigo_cliente`;
   si no, por email del comprador = email del lead.
5. Revisión antes de guardar, en cuatro grupos: vinculados, sin vincular
   (asignar a un lead a mano o descartar), excluidos y ya importados (se ignoran).
6. Al confirmar, se guardan los pedidos, se escribe `pedido_vinculado` en el
   historial de cada lead y se actualiza su fase.

### Pedidos a mano
Formulario en la ficha del lead: número, fecha, base sin IVA ni envío y total.
Queda firmado por la usuaria.

## Pantallas

Todas bajo `/panel/ventas`, con login propio en `/panel/ventas/login`.

1. **Panel general** (`/panel/ventas`). Una tarjeta por marca activa, con
   selector de mes:
   - embudo del mes (leads nuevos, contactados, muestras, clientes conseguidos);
   - ventas generadas (del mes y acumuladas) y comisión;
   - llamadas hechas y seguimientos atrasados;
   - coste por lead y por cliente conseguido.
2. **Marca** (`/panel/ventas/[slug]`):
   - embudo con % de paso entre fases;
   - ventas generadas mes a mes;
   - clientes conseguidos (primer pedido, total comprado, comisión acumulada);
   - resultados por tipo de negocio y por origen.
   - Pestañas: Leads, Pedidos, Liquidaciones y Condiciones (esta última solo
     editable por admin, e incluye exclusiones e inversión en anuncios).
3. **Mi día** (`/panel/ventas/hoy`). Seguimientos de hoy y atrasados de la
   usuaria, de todas las marcas, con acceso directo a registrar la llamada.
4. **Ficha del lead** (`/panel/ventas/[slug]/leads/[id]`): datos editables,
   historial, Registrar llamada, Muestras enviadas y Añadir pedido.
5. **Importar** leads y pedidos (desde la pestaña correspondiente de la marca).
6. **Usuarias** (`/panel/ventas/usuarias`, solo admin): alta, rol y desactivar.

Estilo visual: el del panel actual (estilos en línea, paleta slate y azul
`#187bef`).

## Seguridad

- Supabase Auth con email y contraseña, con sesión en cookies httpOnly
  mediante `@supabase/ssr`. Sin registro público: la admin crea las cuentas
  con la API de administración.
- Un middleware protege `/panel/ventas/*`. Además, cada server action
  comprueba de nuevo la sesión, que la usuaria está activa y su rol.
- Las lecturas y escrituras se hacen desde el servidor con la clave de
  servicio, como el resto del panel. Las tablas tienen RLS activado y sin
  políticas públicas.
- La inmutabilidad del historial y de las liquidaciones cerradas se garantiza
  con triggers en la base de datos, no solo en la aplicación.
- Webhook de leads con secreto por marca.
- El CSV nunca se confía desde el cliente: el servidor recibe el texto y lo
  vuelve a parsear.

## Errores

- Importaciones: todo o nada, con los errores mostrados por fila y nada
  guardado hasta confirmar.
- Si una operación de varios pasos falla (guardar pedidos y actualizar fases),
  se hace en una función de Postgres (RPC) transaccional.
- Webhook: responde 200 con datos válidos aunque sea un duplicado, 400 con
  datos inválidos y 401 con secreto incorrecto.

## Pruebas

- Tests unitarios (vitest):
  - cálculo de comisión (plazo, sin plazo, excluidos, redondeo por pedido);
  - armado de la liquidación (regularizaciones, pedidos ya liquidados);
  - parseo del CSV de leads;
  - parseo del CSV de Shopify y cálculo de la base sin IVA ni envío, con una
    exportación real anonimizada como fixture;
  - vinculación por código y por email;
  - transiciones de fase.
- Tests de las server actions con Supabase simulado, como los actuales.
- Recorrido completo en el navegador (Playwright) con datos de prueba antes de
  dar por terminada cada fase.

## Fases de entrega

Cada fase es usable por sí sola.

1. **Arrancar.** Login y usuarias, marcas y condiciones, exclusiones,
   importación de leads por CSV, webhook de leads de anuncios, ficha con
   historial y registro de llamadas, Mi día, panel de la marca con embudo, y
   panel general con embudo y esfuerzo.
2. **Pedidos.** Importación del CSV de Shopify con revisión, pedidos a mano,
   clientes conseguidos, y ventas y comisión en los paneles.
3. **Cobrar y medir.** Liquidaciones cerradas en PDF y CSV, inversión en
   anuncios, coste por lead y por cliente, y resultados por tipo de negocio y
   por origen.

## Fuera de alcance

- Centralita, grabación de llamadas o marcación desde el panel.
- Acceso para las marcas.
- Emitir facturas.
- Integración directa con la API de Shopify (se usa el CSV).
- Migrar el panel de leads actual al login nuevo.
- Envío de emails a los leads desde este módulo.

## Pendiente antes de construir

- **Exportación real de pedidos de Shopify de Hydrup** (aunque tenga pocos
  pedidos), para fijar columnas y la base sin IVA ni envío en la fase 2. No
  bloquea la fase 1.
- **SKU de los packs B2B** de Hydrup, cuando estén creados.
- **Lista de clientes B2B previos** de Hydrup, para las exclusiones.
- Fuera del sistema: contrato de encargado del tratamiento con Hydrup y
  confirmación legal sobre llamadas comerciales a autónomos.
