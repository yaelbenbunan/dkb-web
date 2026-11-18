# Panel: separar lo nuestro (Dinkbit) de lo de los clientes

Fecha: 2026-11-18 · Estado: aprobado el prototipo, fase 1 pendiente de revisión

Prototipo aprobado: https://claude.ai/artifact/C842CjKtyZuNTX23xVHW48

## El problema

`/panel/ventas` mezcla todo:

- La portada es una cuadrícula de «Marcas» donde dinkbit es una tarjeta más, al lado de Hydrup.
- Dinkbit y los clientes tienen las mismas 10 pestañas (Resumen, Tablero, Tabla, Tareas, Secuencias, Conversaciones, WhatsApp, Mailing, Prospección, Condiciones).
- «Altas» está en la barra de arriba junto a «Usuarios», como si fuera un ajuste, cuando es el último paso de nuestra venta.
- Las tareas solo se ven entrando marca por marca; «Mi día» las junta pero sin separar lo nuestro de lo de los clientes.

## La estructura (las tres fases)

```
Mi día            ← portada
Tareas            ← todas, con filtro por ámbito
DINKBIT (azul)    Leads · Conversaciones · Captación · Altas
CLIENTES (gris)   una entrada por cliente + «Todos los clientes»
Ajustes (admin)   Usuarios · Ajustes de dinkbit
```

- **Fase 1 (este documento): menú y espacios.** Sin cambios en la base de datos.
- **Fase 2: carpeta del cliente.** Pestañas «Datos del alta» y «Archivos» (como el Fichero de Giro). Hay que unir `alta_clientes` con `ventas_marcas` (SQL a mano).
- **Fase 3: proyectos y checks.** Lotes de tareas desde plantillas (Web, RRSS, Campañas Meta, Ventas B2B), tareas por fases y asignables. Tablas nuevas (SQL a mano). También el botón «Crear alta» en un lead ganado y retirar el `/panel` antiguo.

Decisiones de Yael (2026-11-18):

- El rol **comercial trabaja en los dos espacios**. Solo Ajustes queda para admin.
- Puede haber **tareas generales** (sin lead ni cliente), pero no se crean de ejemplo: las facturas del mes ya van por Finanzas.

## Fase 1: menú y espacios

### Qué es «Dinkbit» y qué es «cliente»

Sigue siendo la misma tabla `ventas_marcas`. Dinkbit es la marca con slug `dinkbit` (el mismo criterio que ya usa `tieneProspeccion`). Una constante `MARCA_PROPIA = "dinkbit"` en `src/lib/ventas/rutas.ts` y una función pura `esMarcaPropia(slug)`. Toda marca activa o pausada que no sea la propia es un cliente.

### Las direcciones no cambian

Las rutas `/panel/ventas/[slug]/…` se quedan como están: las usan los correos del recordatorio diario, los avisos y los enlaces guardados. Lo que cambia es el menú y la portada.

| Ruta | Antes | Después |
|---|---|---|
| `/panel/ventas` | Cuadrícula de marcas | Redirige a `/panel/ventas/hoy` |
| `/panel/ventas/hoy` | Mi día | Mi día, separado en Dinkbit / Clientes |
| `/panel/ventas/clientes` | — | La cuadrícula de antes, **sin dinkbit** |
| `/panel/ventas/tareas` | — | Todas las tareas manuales, con filtro por ámbito |
| `/panel/ventas/altas` | En la barra, junto a Usuarios | En el menú, dentro de Dinkbit (solo admin, como hoy) |

El login sigue llevando a `/panel/ventas`, que acaba en Mi día. El formulario de nueva marca (admin) pasa a `/panel/ventas/clientes`.

### Menú lateral

`VentasShell` cambia la barra de arriba por un menú lateral (`VentasMenu`, componente de servidor; el resaltado de la sección activa en un componente cliente pequeño con `usePathname`).

- **Mi día** y **Tareas**.
- **Dinkbit · lo nuestro**, en azul:
  - Leads → `/panel/ventas/dinkbit/tablero`
  - Conversaciones → `/panel/ventas/dinkbit/conversaciones`
  - Captación → `/panel/ventas/dinkbit/secuencias`
  - Altas → `/panel/ventas/altas` (solo admin)
- **Clientes**, en gris: una entrada por cliente activo o pausado, con su punto de color, y «Todos los clientes».
- **Ajustes** (solo admin): Usuarios y Ajustes de dinkbit.
- Abajo: nombre, rol y «Salir».

En móvil el menú se pone encima del contenido (fila con `flex-wrap`), sin cajón ni JavaScript extra.

Una barra encima del contenido dice dónde estás (`Dinkbit › Leads`, `Clientes › Hydrup › Conversaciones`) con el color del espacio: azul para Dinkbit, gris para Clientes, oscuro para Mi día / Tareas.

**Roles ligados a una marca** (`cliente`, `agente`): no ven el menú de espacios. Ven solo su marca con las secciones que ya tienen (`SECCIONES_POR_ROL`), igual que ahora.

### Pestañas dentro de una marca

`MarcaCabecera` agrupa las 10 pestañas. El menú lateral lleva al grupo; las pestañas de arriba son solo las del grupo en el que estás.

**En Dinkbit:**

| Grupo (menú) | Pestañas |
|---|---|
| Leads | Resumen · Tablero · Tabla · Tareas |
| Conversaciones | Conversaciones · WhatsApp |
| Captación | Secuencias · Mailing · Prospección |

En Dinkbit, Condiciones no está en ningún grupo: allí no hay comisiones, pero sí los módulos, las exclusiones y el webhook. Se abre desde Ajustes como «Ajustes de dinkbit» (`/panel/ventas/dinkbit/condiciones`, sin pestañas).

**En un cliente:** una sola fila (ya no está el menú de Dinkbit compitiendo): Resumen · Tablero · Tabla · Tareas · Conversaciones · Secuencias · Mailing (si tiene el módulo) · Condiciones · WhatsApp. El enlace «← Panel» pasa a «← Clientes». En la fase 2 se añaden «Datos del alta» y «Archivos».

Las reglas de visibilidad que ya existen se mantienen: Mailing solo con el módulo de campañas, Prospección solo en dinkbit, y la clienta y la agente solo con sus secciones.

### Mi día

Los mismos datos que hoy (`pendientesDelDia`, el mismo filtro que el correo de la mañana), repartidos en dos bloques, **Dinkbit** y **Clientes**, según la marca de cada lead o tarea. En el bloque de Clientes cada fila lleva el nombre del cliente. Si un bloque está vacío dice «Nada pendiente».

### Tareas (vista global)

`/panel/ventas/tareas`, para admin y comercial:

- Las tareas manuales de todas las marcas (`ventas_tareas`), agrupadas como en la página de cada marca: Atrasadas, Hoy, Próximas, Sin fecha.
- Filtros por ámbito: Todas · Dinkbit · cada cliente. Y por responsable: Todas · Mías.
- Las tareas automáticas (primer contacto, muestras) siguen en la página de tareas de cada marca: calcularlas pide los leads y llamadas de todas las marcas, y eso queda para más adelante si hace falta.
- **Tareas generales**: necesitan `marca_id` nulo en `ventas_tareas`, que hoy es obligatorio. Fuera de la fase 1 para no tocar la base; se valoran con la fase 3.

### Fuera de la fase 1

- Datos del alta, Archivos, proyectos y plantillas (fases 2 y 3).
- Botón «Crear alta» en un lead ganado (fase 3).
- Retirar el `/panel` antiguo (leads antiguos, agenda, campañas, calculadora) (fase 3).
- Tareas generales sin marca.

## Pruebas

- `rutas.ts`: `esMarcaPropia`, y que las secciones por grupo respetan las reglas por rol y por módulo.
- Una función pura que reparte los pendientes de Mi día en Dinkbit / Clientes.
- Una función pura para el filtro de la vista de Tareas (ámbito y responsable).
- Componentes: el menú no muestra Altas ni Ajustes a la comercial, y no muestra el menú de espacios a cliente ni agente.
- `npm test`, typecheck y build antes de desplegar.

## Cambio de direcciones (2026-11-18, a petición de Yael)

«Ventas» es solo una parte del panel, así que el panel deja `/panel/ventas` y pasa a `/panel`. Esto sustituye a la tabla de «Las direcciones no cambian» de arriba:

- El panel por persona (Supabase Auth) vive en `/panel/…`: `/panel/hoy`, `/panel/tareas`, `/panel/clientes`, `/panel/<slug>/…`, `/panel/login`.
- El panel viejo (contraseña compartida) pasa a `/panel/antiguo/…`. Se retira en la fase 3.
- `next.config.ts` redirige `/panel/ventas/…` → `/panel/…` y `/panel/{campanas,calculadora,agenda,tablero,pdf,plantilla-leads}/…` → `/panel/antiguo/…`, sin ser permanentes. Los correos ya enviados y los marcadores siguen funcionando.
- Esos nombres quedan reservados como identificador de marca.
- El nombre visible pasa de «Ventas B2B» a «Panel».
- «¿Has olvidado tu contraseña?»: el enlace del correo vuelve a `/panel/login/recuperar/vuelta`, que tiene que estar en las «Redirect URLs» de Supabase Auth.

## Fase 2: fichas de cliente (2026-11-18, a petición de Yael)

SQL: `docs/sql/2026-11-18-panel-fichas-clientes.sql` (se ejecuta a mano; el código funciona sin él y avisa en pantalla).

- **Clientes anclados.** Cada persona ancla sus clientes («Anclar en mi menú», en la cabecera del cliente y en «Todos los clientes»); el menú lateral enseña «Mis clientes». Columna `ventas_usuarias.clientes_anclados`. Sin la migración, el menú enseña todos.
- **Crear ficha de cliente.** En un alta enviada, el botón crea el cliente (`ventas_marcas`) con el nombre del alta, los une (`alta_clientes.marca_id`), lo ancla a quien lo crea y abre su ficha. A un cliente que existía antes se le puede unir un alta enviada desde su ficha.
- **Pestañas de un cliente**, en dos niveles (`cabeceraMarca` en `lib/ventas/espacios.ts`):
  - **Ficha**: servicios contratados (`ventas_marcas.servicios`) y todo lo del alta (datos fiscales, logos, archivos), con el mismo componente que la página del alta.
  - **Tareas**: «Proyectos», con las tareas de la plantilla de cada servicio contratado (`lib/ventas/proyectos.ts`: Web, Redes sociales, Campañas Meta, Campañas Google Ads, Ventas B2B; borrador para revisar). Se elige el servicio, se desmarca lo que no aplique y se añade el lote (`ventas_tareas.proyecto/fase/orden`). Debajo, las tareas sueltas de siempre.
  - **Leads**: Resumen · Tablero · Tabla (· Mailing con el módulo).
  - **WhatsApp**: Conversaciones · Conexión · Secuencias. Solo con el servicio «Integración con WhatsApp» marcado en la ficha (la clienta y la agente lo ven siempre).
  - **Integraciones** (antes Condiciones): el enlace de los anuncios con su secreto. Condiciones, estado, módulos y exclusiones quedan plegados para admin.
- **Dinkbit**: menú Leads · WhatsApp · Captación (Mailing, Prospección) · Altas. Secuencias pasa a WhatsApp.
