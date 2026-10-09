# Ventas B2B: borrar leads, tareas, hora de seguimiento y rol «cliente»

Fecha: 2026-10-09 · Estado: diseño aprobado en conversación, pendiente de revisión escrita

## Para qué

El piloto de Hydrup en `/panel/ventas` ha dejado seis fricciones:

1. Hay leads de prueba (la importación «lista1») que no se pueden quitar y
   ensucian el resumen y el embudo.
2. Añadir un lead a mano y la importación por CSV están al fondo de la lista de
   leads, lejos y fáciles de no ver.
3. En el tablero hay que abrir cada ficha para saber en qué quedó el lead.
4. No hay un sitio que reúna todo lo pendiente (llamar, enviar muestras…).
5. El seguimiento solo tiene fecha; cuando se queda a una hora, no hay dónde
   apuntarla.
6. El cliente (Hydrup) no puede entrar a ver y trabajar su propio proyecto sin
   ver el resto del módulo.

Éxito: los 135 leads de lista1 desaparecen de Hydrup y de sus métricas; una
usuaria con rol «cliente» entra, cae en su marca y trabaja Resumen, Tablero,
Leads y Tareas sin poder llegar a nada más; y las comerciales ven en «Tareas»
qué les toca, con hora cuando la hay.

## Decisiones tomadas

- **Borrado definitivo, no papelera.** Una papelera dejaría ocupados el teléfono
  y el email de prueba (índices únicos por marca) y el siguiente lead con ese
  número se fusionaría con el oculto.
- **Borrar es solo de admin.** El rol cliente y el comercial no borran.
- **Tareas automáticas + manuales.** Las automáticas se calculan de lo que ya se
  registra; las manuales viven en una tabla nueva.
- **La hora es opcional y va en columna aparte** (`proximo_seguimiento_hora`),
  no convirtiendo la fecha en `timestamptz`: toda la lógica actual compara
  fechas `YYYY-MM-DD` en hora de Madrid y sigue valiendo tal cual.
- **Rol cliente = todo lo operativo de su marca**: mover tarjetas, fichas,
  llamadas, notas, añadir e importar leads, crear y asignar tareas. Sin
  Secuencias, Conversaciones, Condiciones, Usuarias ni otras marcas.
- **Una clienta, una marca.** Columna `marca_id` en `ventas_usuarias`, no tabla
  intermedia.

## Supuestos sin confirmar

Se plantearon y no se respondieron; la spec asume lo siguiente y se corrige si
no es lo deseado:

- La clienta ve el historial completo de la ficha, incluidas las notas internas
  de las comerciales.
- En los desplegables de responsable la clienta ve los nombres de todas las
  usuarias activas (hoy las comerciales no están ligadas a marcas).

## Fuera de alcance

- Borrado en lote desde la lista (más allá del SQL puntual de lista1).
- Avisos o recordatorios (email, WhatsApp, push) cuando llega la hora.
- Tareas recurrentes, subtareas o comentarios en tareas.
- Ligar comerciales a marcas.
- Distinguir notas internas de notas visibles para el cliente.

## 1. Borrar leads

**Base de datos.** Función `public.ventas_eliminar_leads(p_marca_id uuid, p_lead_ids uuid[]) returns integer`:

- Solo actúa sobre leads de `p_marca_id` (los ids de otra marca se ignoran).
- En una transacción: `set_config('ventas.borrando_lead', 'on', true)`, borra
  `ventas_conversaciones` de esos leads (sus mensajes caen en cascada), borra
  `ventas_actividad`, borra `ventas_tareas` ligadas y por último `ventas_leads`.
- Devuelve cuántos leads borró.
- El trigger `ventas_actividad_inmutable` cambia para dejar pasar un `DELETE`
  únicamente cuando `current_setting('ventas.borrando_lead', true) = 'on'`.
  `UPDATE` sigue prohibido siempre.
- `grant execute` solo a `service_role`.

**Aplicación.** `eliminarLead(marcaId, leadId)` en `db.ts`;
`eliminarLeadAction(slug, leadId)` en `acciones-leads.ts`, con
`requireUsuaria("admin")` y comprobación de marca, que redirige a la lista. En
la ficha, bloque «Eliminar lead» visible solo para admin: avisa de que es
definitivo y exige escribir el nombre del negocio para habilitar el botón.

**Lista1.** Fichero aparte `docs/sql/2026-10-09-borrar-lista1-hydrup.sql`, de un
solo uso, que llama a la función con los leads de Hydrup con `origen = 'lista'`
y `origen_detalle = 'lista1'`. Son 135 (133 en «Nuevo», 1 «Contactado», 1
«Volver a llamar»; 2 llamadas y 2 notas en total; ninguna conversación). El
fichero imprime el número borrado.

## 2. Lista de leads

- Junto al buscador, dos botones: **«Añadir lead»** e **«Importar CSV»**.
- Cada uno abre un diálogo (`<dialog>` nativo, componente cliente
  `DialogoLeads`) con el formulario existente: `NuevoLeadForm` e
  `ImportarLeads` se reutilizan sin cambiar campos ni la previsualización.
- Los dos bloques al fondo de la página se eliminan.
- Al crear un lead se sigue redirigiendo a su ficha; al importar, el diálogo
  muestra el resultado y la lista se refresca.

## 3. Última nota en el tablero

- «Última nota» = la `nota` no vacía más reciente del historial del lead, sea
  de una llamada, una nota suelta, muestras o un cambio de fase.
- Consulta nueva `listUltimasNotas(marcaId)` apoyada en una función SQL
  `ventas_ultimas_notas(p_marca_id)` (`select distinct on (lead_id)`), para no
  traer todo el historial de la marca.
- `TarjetaLead` gana `ultima_nota: { texto: string; fecha: string } | null`. La
  tarjeta la pinta bajo los datos del lead, a dos líneas con recorte y la fecha
  corta delante. El texto completo queda en `title`.

## 4. Hora en el próximo seguimiento

- Columna `ventas_leads.proximo_seguimiento_hora time` (nula = sin hora). Un
  `CHECK` impide hora sin fecha.
- `ventas_registrar_actividad` recibe un parámetro más,
  `p_proximo_seguimiento_hora time`; cuando cambia el seguimiento escribe fecha
  y hora juntas, y cuando lo borra borra ambas. La hora también se guarda en
  `datos` de la actividad para el historial.
- Formularios (llamada, muestras, nota): junto a la fecha, un campo
  `type="time"` opcional. Validación: `HH:MM`, y solo válida si hay fecha.
- Se muestra «20/10/2026 · 16:30» en ficha, lista, tablero, «Mi día» y Tareas.
- Orden: a igual fecha, primero las que tienen hora (ascendente) y luego las
  que no.
- «Atrasado» pasa a tener en cuenta la hora: una cita de hoy a las 10:00 está
  atrasada a las 10:01 (hora de Madrid). Sin hora, se comporta como hoy: no se
  atrasa hasta el día siguiente. La regla vive en una función pura
  `estadoSeguimiento(fecha, hora, fase, ahora)` en `tablero.ts`, que sustituye a
  la actual.

## 5. Tareas

Pestaña nueva **«Tareas»** en cada marca: `/panel/ventas/[slug]/tareas`.

**Automáticas** (calculadas, sin tabla; módulo puro `src/lib/ventas/tareas.ts`):

| Tarea | Condición | Responsable |
|---|---|---|
| Llamar | Fase activa con `proximo_seguimiento` | `asignada_a` del lead |
| Enviar muestras | Fase `interesado` cuya última llamada tuvo resultado `pide_muestras` | `asignada_a` del lead |
| Primer contacto | Fase `nuevo` sin seguimiento | `asignada_a` del lead |

Desaparecen solas cuando se registra la llamada, las muestras o cambia la fase.
«Primer contacto» se muestra agrupada (un contador con enlace a la lista
filtrada por «Nuevo») para no inundar la pantalla.

**Manuales.** Tabla `ventas_tareas`:

- `id`, `marca_id` (not null), `lead_id` (nulo; `on delete cascade`), `titulo`
  (1–200), `vence` date nula, `vence_hora` time nula, `asignada_a` (usuaria,
  nula), `creada_por`, `hecha_at` timestamptz nula, `hecha_por`, `created_at`.
- Índices por `(marca_id, hecha_at)` y `(asignada_a, vence)`.
- RLS activada sin políticas, como el resto del módulo.

**Pantalla.** Secciones «Atrasadas», «Hoy», «Próximas» y «Sin fecha», mezclando
automáticas y manuales ordenadas por fecha y hora. Filtro «Solo mías» y por
responsable. Formulario «Nueva tarea» (título, fecha, hora, responsable, lead
opcional). Las manuales tienen casilla de hecha y se pueden reasignar; las
automáticas enlazan a la ficha del lead, donde se resuelven. Las hechas se
pueden ver con un filtro «Hechas» (últimos 30 días).

**Acciones** (`acciones-tareas.ts`): crear, marcar hecha / deshacer, reasignar.
Todas pasan por el control de acceso de marca.

**«Mi día».** Además de los seguimientos, lista las tareas manuales asignadas a
la usuaria vencidas o de hoy, y muestra la hora en ambos.

## 6. Rol «cliente»

**Datos.** `ventas_usuarias.rol` admite `'cliente'`; nueva columna
`ventas_usuarias.marca_id uuid references ventas_marcas(id)`, con `CHECK`: es
obligatoria si el rol es `cliente` y nula en los demás. `ROLES` y `ROL_LABELS`
en `dominio.ts` se amplían.

**Alta.** En «Usuarias», al elegir rol «Cliente» aparece un desplegable de marca
obligatorio.

**Regla de acceso.** Función pura en `rutas.ts`:

```ts
type SeccionMarca = "resumen" | "tablero" | "leads" | "tareas"
                  | "secuencias" | "conversaciones" | "condiciones";

evaluarAccesoMarca(usuaria, marca, seccion): "ok" | "login" | "permiso"
```

- admin y comercial: `ok` en toda marca y sección (como hoy).
- cliente: `ok` solo si `marca.id === usuaria.marca_id` y la sección es
  resumen, tablero, leads o tareas. En cualquier otro caso, `permiso`.

**Dónde se aplica.** Un único helper de servidor
`requireAccesoMarca(slug, seccion)` (devuelve `{ usuaria, marca }` o redirige)
sustituye al par `requireUsuaria()` + `cargarMarca()` en **todas** las páginas
bajo `[slug]` y en **todas** las server actions que reciben un `slug` o un
`marcaId` (`acciones-leads`, `acciones-tareas`, `acciones-secuencias`,
`acciones-marcas`, `conversaciones/acciones`). Hoy esas acciones solo comprueban
que haya sesión; sin este cambio una clienta podría operar sobre otra marca
llamando a la acción con otro slug.

Además:

- `/panel/ventas` (panel general) y `/panel/ventas/hoy`: una clienta es
  redirigida a `/panel/ventas/<su-marca>`. «Usuarias» sigue siendo solo admin.
- `VentasShell` no enseña «Panel», «Mi día» ni «Usuarias» a una clienta.
- `MarcaCabecera` recibe el rol y solo pinta las pestañas permitidas; tampoco
  el enlace «← Panel».
- Una clienta cuya marca no exista o esté desligada no entra a nada: va al
  login con aviso.
- El webhook de leads y el de WhatsApp no cambian (no usan sesión).

## Migración

`docs/sql/2026-10-09-ventas-tareas-rol-cliente.sql`, idempotente, para ejecutar
una vez en el SQL Editor del proyecto `wnboyesnlrbtwfmhcxmc`:

1. Rol `cliente` y `ventas_usuarias.marca_id` con sus `CHECK`.
2. `ventas_leads.proximo_seguimiento_hora` y nueva firma de
   `ventas_registrar_actividad` (se elimina la antigua).
3. Tabla `ventas_tareas`.
4. Función `ventas_ultimas_notas`.
5. Trigger de inmutabilidad revisado y función `ventas_eliminar_leads`.

Después, `2026-10-09-borrar-lista1-hydrup.sql`.

Orden de despliegue: primero la migración, luego el código. El código nuevo
llama a la firma nueva de `ventas_registrar_actividad`; si se desplegara antes,
registrar llamadas fallaría.

## Errores

- Borrar un lead que ya no existe: «Lead no encontrado», sin excepción.
- Fallo de la función de borrado: no se borra nada (transacción) y se muestra
  el error genérico del módulo.
- Hora sin fecha: error de validación en el formulario.
- Tarea asignada a una usuaria desactivada: se rechaza, como en la asignación
  de leads.

## Pruebas

- `rutas.test.ts`: matriz rol × marca × sección de `evaluarAccesoMarca`,
  incluida clienta sin marca y clienta en marca ajena.
- Acciones: cada server action rechaza a una clienta de otra marca y a una
  clienta en sección prohibida; `eliminarLeadAction` rechaza a no-admin.
- `tareas.test.ts`: derivación de las tres tareas automáticas, mezcla y orden
  con manuales, agrupación atrasadas/hoy/próximas con y sin hora.
- `tablero.test.ts`: `estadoSeguimiento` con hora (antes y después de la hora,
  sin hora, fase no activa) y orden por urgencia.
- `validacion.test.ts`: hora válida, inválida y hora sin fecha.
- Última nota: elige la más reciente con texto e ignora las vacías.
- Métricas: tras quitar leads, embudo y resumen no los cuentan (ya cubierto por
  ser funciones puras sobre las filas leídas; se añade un caso explícito).
- Typecheck, lint y la suite completa en verde antes de desplegar.
