# WhatsApp por marca con coexistencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada marca de `/panel/ventas` conecte su propio número de WhatsApp en coexistencia desde el panel, y que mensajes, ecos del móvil, historial y envíos vayan siempre a y desde su marca.

**Architecture:** El webhook único pasa a enrutar cada cambio por `metadata.phone_number_id` (o `waba_id` en `account_update`) a su marca; el número de la variable de entorno sigue siendo Dinkbit. Cada marca con número propio guarda su WABA, su número y un token de negocio cifrado (AES-256-GCM), obtenido canjeando el `code` de la ventana de Embedded Signup que abre el panel. Ecos, historial y contactos son nuevos tipos de evento que `entrante.ts` extrae (puro) y `procesar.ts` aplica con las mismas reglas de fase A/B e idempotencia por `wamid`.

**Tech Stack:** Next.js 16 App Router, Supabase (supabase-js v2, service role), Vitest, WhatsApp Cloud API Graph `v21.0`, Facebook JS SDK (Embedded Signup v4), Node `crypto`.

**Spec:** `docs/superpowers/specs/2026-10-20-whatsapp-coexistencia-design.md`

## Global Constraints

- App ID `1444585017092524`; configuración de Embedded Signup `971972375349049`; `extras: { setup: {}, sessionInfoVersion: "3", version: "v4", featureType: "whatsapp_business_app_onboarding" }`; `response_type: "code"`, `override_default_response_type: true`.
- En coexistencia NO se llama a `/register` ni se pone PIN. Sí `POST /{waba_id}/subscribed_apps`.
- Sincronización: `POST /{phone_number_id}/smb_app_data` con `{"messaging_product":"whatsapp","sync_type":"smb_app_state_sync"}` y después `"sync_type":"history"`; una vez por conexión, en las 24 h siguientes.
- Error de historial rechazado por el negocio: código `2593109`.
- El número de entorno (`WHATSAPP_PHONE_NUMBER_ID`, hoy `1385086741345422`) y `WHATSAPP_TOKEN` siguen sirviendo a Dinkbit sin cambios; ningún despliegue intermedio puede romperlo.
- Un envío de una marca con número propio NUNCA sale por el número/token de entorno: si falta o no se descifra su token, falla visible.
- La barrera de `crearMensajero` (sin `VERCEL_ENV=production` ni `WHATSAPP_ENVIO_REAL=1` → simulado) también aplica a los tokens por marca.
- Toda server action resuelve la marca con `accesoMarcaAccion(slug, seccion)`.
- Toda lectura de columnas nuevas tolera la migración pendiente (`tolerarMigracionPendiente`, `src/lib/ventas/db.ts:197`); antes de desplegar algo que dependa del SQL se pide a Yael el resultado de la consulta de comprobación.
- La secuencia solo arranca con `referral` (anuncio de clic a WhatsApp), como hoy (`decidir`, `src/lib/whatsapp/entrante.ts:226`). Historial e importados entran en `humana`.
- Las marcas con número propio crean lead para toda conversación nueva (origen `anuncio` con referral, `whatsapp` sin él), vinculando si el teléfono ya existe y aplicando `clasificarLeads` con `listExclusiones`. Dinkbit (número de entorno) conserva su comportamiento actual.
- Clave de cifrado: variable `WHATSAPP_CLAVE_TOKENS`, 32 bytes en base64.
- Recordatorios 3 h / 8 h (`recordatorio.ts`) siguen solo para Dinkbit.

## Review Focus

1. Marca con número propio cuyo token falta o no se descifra (clave rotada): el envío falla con error guardado, no sale por el número de Dinkbit — test en Task 3.
2. Un mismo cuerpo de webhook con cambios de dos números distintos: cada mensaje va a su marca — test en Task 5.
3. Un eco del móvil a un número con el que aún no había conversación (Hydrup escribe primero): crea conversación `humana` y lead — test en Task 6.
4. El mismo `wamid` llega como eco y otra vez dentro del historial: se guarda una sola vez — test en Task 7.
5. Mensajes antiguos del historial: no abren la ventana de 24 h ni disparan secuencias ni actividad — test en Task 7.

---

## File Structure

- `docs/sql/2026-10-20-whatsapp-por-marca.sql` — columnas de marca, credenciales, contactos, origen de mensajes, origen de lead `whatsapp`.
- `src/lib/whatsapp/cifrado.ts` (nuevo, puro) — cifrar/descifrar tokens.
- `src/lib/whatsapp/enrutado.ts` (nuevo, puro) — a qué marca pertenece un número.
- `src/lib/whatsapp/numeros.ts` (nuevo, server-only) — lecturas/escrituras por marca de número, WABA, credencial; `mensajeroDeMarca`.
- `src/lib/whatsapp/entrante.ts` — extractores nuevos (ecos, historial, contactos, avisos de cuenta) y `numeroId`/`nombrePerfil` en mensajes.
- `src/lib/whatsapp/db.ts` — `guardarEco`, `guardarHistorial`, `guardarContactos`, campos nuevos en tipos.
- `src/lib/whatsapp/procesar.ts` — enrutado por marca, mensajero por marca, leads para todo, ecos, historial, contactos, avisos.
- `src/lib/whatsapp/conexion.ts` (nuevo, server-only) — canje del code, comprobaciones, suscripción y sincronización.
- `src/lib/whatsapp/mensajero.ts` — opción `exigirProduccion`.
- `src/lib/ventas/rutas.ts`, `dominio.ts`, `db.ts` — sección `whatsapp`, origen `whatsapp`, campos de `Marca`.
- `src/app/(site)/panel/ventas/(app)/[slug]/whatsapp/{page.tsx,ConectarWhatsApp.tsx,acciones.ts}` (nuevos).
- `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/{acciones.ts,page.tsx,Conversaciones.tsx}` — envío por marca, refresco, origen y nombre.
- `src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx` — pestaña WhatsApp.

---

### Task 1: Migración y tipos

**Files:**
- Create: `docs/sql/2026-10-20-whatsapp-por-marca.sql`
- Modify: `src/lib/ventas/db.ts:38-52` (`Marca`), `src/lib/ventas/dominio.ts` (`ORIGENES`, `ORIGEN_LABELS`), `src/lib/whatsapp/db.ts:15-46` (`Conversacion`, `Mensaje`)
- Test: `src/lib/__tests__/ventas-dominio.test.ts` (o el test existente de `dominio`)

**Interfaces:**
- Produces:
  - `Marca` gana opcionales `whatsapp_phone_number_id?: string | null`, `whatsapp_waba_id?: string | null`, `whatsapp_conectado_en?: string | null`, `whatsapp_estado?: "conectado" | "desconectado" | null`, `whatsapp_motivo?: string | null`, `whatsapp_historial?: "pedido" | "completo" | "rechazado" | null`.
  - `Conversacion.nombre_contacto?: string | null`; `Mensaje.origen?: "cliente" | "bot" | "panel" | "movil" | "historial" | null`.
  - `ORIGENES` incluye `"whatsapp"` con etiqueta `"WhatsApp"`.

- [ ] **Step 1: Write the failing test** — `test("el origen whatsapp existe y tiene etiqueta")`: `expect(ORIGENES).toContain("whatsapp")`, `expect(ORIGEN_LABELS.whatsapp).toBe("WhatsApp")`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/ventas-dominio.test.ts` — Expected: FAIL.
- [ ] **Step 3: Escribir el SQL**, idempotente y en transacción, con consulta de comprobación al final:
  - `ventas_marcas`: `whatsapp_phone_number_id text unique`, `whatsapp_waba_id text`, `whatsapp_conectado_en timestamptz`, `whatsapp_estado text check (in ('conectado','desconectado'))`, `whatsapp_motivo text`, `whatsapp_historial text check (in ('pedido','completo','rechazado'))`.
  - `ventas_whatsapp_credenciales (marca_id uuid primary key references ventas_marcas on delete cascade, token_cifrado text not null, actualizado_en timestamptz not null default now())`, RLS activada sin políticas, `revoke all` a `anon, authenticated`, `grant all` a `service_role`.
  - `ventas_whatsapp_contactos (marca_id uuid references ventas_marcas on delete cascade, wa_id text, nombre text not null, actualizado_en timestamptz default now(), primary key (marca_id, wa_id))`, mismos permisos.
  - `ventas_conversaciones.nombre_contacto text`; `ventas_mensajes.origen text check (in ('cliente','bot','panel','movil','historial'))`.
  - `ventas_leads_origen_check` → `('lista','anuncio','manual','web','whatsapp')`.
  - Comprobación: `select` de las columnas nuevas en `information_schema.columns` y de `pg_get_constraintdef` de `ventas_leads_origen_check`.
- [ ] **Step 4: Ampliar tipos y `ORIGENES`.** Run test — Expected: PASS; `npx tsc --noEmit` sin errores.
- [ ] **Step 5: Commit** `feat(whatsapp): migración y tipos de número por marca`.

### Task 2: Cifrado de tokens

**Files:** Create `src/lib/whatsapp/cifrado.ts`; Test `src/lib/whatsapp/__tests__/cifrado.test.ts`

**Interfaces:**
- Produces: `cifrarToken(token: string, claveB64: string): string` (formato `v1:<iv>:<tag>:<datos>`, base64url, IV de 12 bytes aleatorio); `descifrarToken(cifrado: string, claveB64: string): string` (lanza si la clave no mide 32 bytes, el formato no es `v1` o la etiqueta no cuadra); `claveDeEntorno(): string | null` (lee `WHATSAPP_CLAVE_TOKENS`, `null` si falta).

- [ ] **Step 1: Write the failing tests:** ida y vuelta devuelve el original; dos cifrados del mismo token difieren; cambiar un carácter de `<datos>` → lanza; otra clave → lanza; clave de 16 bytes → lanza `"WHATSAPP_CLAVE_TOKENS debe tener 32 bytes"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/whatsapp/__tests__/cifrado.test.ts` — FAIL.
- [ ] **Step 3: Implementar** con `crypto.createCipheriv("aes-256-gcm", ...)`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): cifrado de tokens por marca`.

### Task 3: Enrutado y mensajero por marca

**Files:**
- Create: `src/lib/whatsapp/enrutado.ts`, `src/lib/whatsapp/numeros.ts`
- Modify: `src/lib/whatsapp/mensajero.ts:33-37,71-80`
- Test: `src/lib/whatsapp/__tests__/enrutado.test.ts`, `src/lib/whatsapp/__tests__/numeros.test.ts`, `src/lib/whatsapp/__tests__/mensajero.test.ts`

**Interfaces:**
- Consumes: Task 1 tipos, Task 2 `descifrarToken`, `claveDeEntorno`.
- Produces:
  - `elegirMarca(i: { numeroId: string | null; numeroEntorno: string | null; asignada: { id: string } | null }): "asignada" | "dinkbit" | "desconocida"` — asignada gana siempre; si no hay asignada y `numeroId` es null o igual al de entorno → `"dinkbit"`; si no → `"desconocida"`.
  - `getMarcaPorNumero(numeroId: string): Promise<Marca | null>`, `getMarcaPorWaba(wabaId: string): Promise<Marca | null>` — tolerantes a migración pendiente (devuelven `null`).
  - `guardarConexion(marcaId: string, c: { wabaId: string; numeroId: string; tokenCifrado: string }): Promise<Escritura>` (pone `whatsapp_estado = 'conectado'`, `whatsapp_conectado_en = now`, `whatsapp_motivo = null`; error de unicidad → `"Ese número ya está conectado a otra marca."`), `marcarDesconectada(marcaId: string, motivo: string | null): Promise<void>`, `setHistorialMarca(marcaId: string, estado: "pedido" | "completo" | "rechazado"): Promise<void>`, `getTokenCifrado(marcaId: string): Promise<string | null>`.
  - `mensajeroDeMarca(marca: Marca): Promise<MensajeroWhatsApp>` — sin `whatsapp_phone_number_id` → `crearMensajero()`; con él → `crearMensajero({ token, phoneNumberId, exigirProduccion: true })`; token ausente o indescifrable → un mensajero cuyos envíos devuelven `{ ok: false, error: "La marca no tiene credenciales de WhatsApp válidas: reconéctala." }`.
  - `ConfigMensajero.exigirProduccion?: boolean` — con credenciales explícitas, aplica igualmente la barrera de producción.

- [ ] **Step 1: Write the failing tests:**
  - `elegirMarca`: asignada → `"asignada"`; `{numeroId:null}` → `"dinkbit"`; `numeroId === numeroEntorno` sin asignada → `"dinkbit"`; número ajeno sin asignada → `"desconocida"`.
  - `mensajeroDeMarca` (mock de `./numeros` lecturas y de `process.env`): marca sin número usa entorno; marca con número y token válido envía con ese `phoneNumberId` (fetch falso, comprobar URL `.../{numero}/messages` y `Authorization: Bearer <token>`); **token que no descifra → `enviarTexto` devuelve el error de credenciales y el fetch NO se llama** (Review Focus 1); `exigirProduccion` sin `VERCEL_ENV=production` → simulado.
- [ ] **Step 2: Run** los tres archivos — FAIL.
- [ ] **Step 3: Implementar** `enrutado.ts` (puro), `numeros.ts` (con `getSupabaseAdmin` y `tolerarMigracionPendiente`; exportar este helper desde `ventas/db.ts` si hace falta), y la opción de `mensajero.ts`.
- [ ] **Step 4: Run** — PASS. `npx vitest run src/lib/whatsapp` entero en verde.
- [ ] **Step 5: Commit** `feat(whatsapp): enrutado y mensajero por marca`.

### Task 4: Extractores de coexistencia

**Files:** Modify `src/lib/whatsapp/entrante.ts:15-65,140-214`; Test `src/lib/whatsapp/__tests__/entrante.test.ts`

**Interfaces:**
- Produces:
  - `MensajeEntrante` gana `numeroId: string | null` (de `value.metadata.phone_number_id`) y `nombrePerfil: string | null` (de `value.contacts[]` con `wa_id === from`, `profile.name`).
  - `interface EcoSaliente { wamid; waId /* = to */; numeroId; texto: string | null; tipo; enviadoEn: Date; crudo: unknown }` y `extraerEcos(cuerpo): EcoSaliente[]` (campo `smb_message_echoes`, `value.message_echoes[]`).
  - `interface LoteHistorial { numeroId: string | null; fase: number | null; progreso: number | null; error: { codigo: number; mensaje: string } | null; hilos: Array<{ waId: string; mensajes: Array<{ wamid: string; deNegocio: boolean; texto: string | null; tipo: string; enviadoEn: Date; crudo: unknown }> }> }` y `extraerHistorial(cuerpo): LoteHistorial[]` (campo `history`; `deNegocio = from !== hilo.id`; `progreso` de `metadata.progress`).
  - `interface ContactoSync { numeroId: string | null; waId: string; nombre: string | null; accion: "add" | "remove" }` y `extraerContactos(cuerpo): ContactoSync[]` (campo `smb_app_state_sync`, `type === "contact"`, `waId` = dígitos de `phone_number`, `nombre` = `full_name ?? first_name`).
  - `interface AvisoCuenta { evento: string; wabaId: string | null; motivo: string | null }` y `extraerAvisosCuenta(cuerpo): AvisoCuenta[]` (campo `account_update`; `motivo` de `disconnection_info.reason` si existe).
  - `valoresDeCambios` devuelve `{ campo: string | null; valor }`; `extraerMensajes`/`extraerEstados` solo miran cambios sin campo o con campo `messages`.
- Reutilizar las mismas reglas de timestamp (`TIMESTAMP_MINIMO_SEGUNDOS`, techo) en ecos e historial; nunca lanzar.

- [ ] **Step 1: Write the failing tests** con los payloads de la sección «Webhooks» del spec: un eco de texto; un lote de historial con un hilo de dos mensajes (uno de cada lado) y `progress: 100`; un lote con `errors[0].code = 2593109` → `error.codigo === 2593109`, `hilos` vacío; un `state_sync` con `+34 600 11 22 33` → `waId "34600112233"`; `account_update` `PARTNER_REMOVED` con `disconnection_info.reason: "PRIMARY_INACTIVITY"`; un mensaje normal con `contacts[0].profile.name = "Ana"` → `nombrePerfil "Ana"`, `numeroId` del metadata; un eco dentro de un cambio `messages` NO aparece en `extraerEcos`.
- [ ] **Step 2: Run** `npx vitest run src/lib/whatsapp/__tests__/entrante.test.ts` — FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** — PASS (los tests antiguos de `entrante` siguen en verde).
- [ ] **Step 5: Commit** `feat(whatsapp): extraer ecos, historial, contactos y avisos de cuenta`.

### Task 5: Enrutado del webhook, envío por marca y leads para toda conversación

**Files:** Modify `src/lib/whatsapp/procesar.ts` (`Deps` 60-91, `depsReales` 99-143, `procesarMensaje` 606, `procesarWebhook` 1288-1330, envíos 883/973/1166, respaldo `autorespuesta`); Test `src/lib/whatsapp/__tests__/procesar.test.ts`

**Interfaces:**
- Consumes: Task 3 `elegirMarca`, `getMarcaPorNumero`, `mensajeroDeMarca`; Task 4 `numeroId`, `nombrePerfil`.
- Produces:
  - `Deps.mensajero` se sustituye por `mensajeroDeMarca: (marca: Marca) => Promise<MensajeroWhatsApp>`; `Deps.marcaDeNumero: (numeroId: string) => Promise<Marca | null>`; `Deps.marcaDinkbit: () => Promise<Marca | null>`.
  - `Deps.crearLeadDeAnuncio` se sustituye por `crearLeadDeWhatsApp(i: { marcaId; waId; telefono: string | null; nombre: string | null; origen: "anuncio" | "whatsapp"; anuncio: string | null }): Promise<{ id; negocio; contacto; ciudad }>` — `contacto = nombre ?? ""`; marca `excluido` con `clasificarLeads([{telefono}], [], await listExclusiones(marcaId))`.
  - `export function tieneNumeroPropio(marca: Marca): boolean` (`!!marca.whatsapp_phone_number_id`).
  - Reglas: la marca se resuelve por mensaje con `elegirMarca`; `"desconocida"` → `console.error` y se salta (no 500); Dinkbit inexistente sigue lanzando. Para marcas con número propio, una conversación nueva sin lead crea lead `whatsapp` aunque la decisión sea `solo_guardar`. El respaldo de `autorespuesta.ts` solo para Dinkbit: otra marca sin secuencia que sirva → `humana`. `nombre_contacto` se guarda desde `nombrePerfil` si la conversación no lo tenía. Salientes del bot con `origen: "bot"`, entrantes `"cliente"`.

- [ ] **Step 1: Write the failing tests** (`depsFalsas` ampliado):
  - mensaje con `numeroId` de Hydrup → conversación y envío con la marca Hydrup (`mensajeroDeMarca` recibe Hydrup);
  - **cuerpo con dos `entry` (Dinkbit por entorno y Hydrup) → cada mensaje a su marca** (Review Focus 2);
  - número desconocido → no guarda nada, no lanza;
  - Hydrup, mensaje sin referral de un teléfono nuevo → `crearLeadDeWhatsApp` con `origen "whatsapp"`, `nombre` del perfil, conversación `humana`, ningún envío;
  - Hydrup con referral y sin secuencia que sirva → `humana`, sin autorespuesta;
  - Dinkbit sin referral → sin lead (comportamiento actual intacto);
  - teléfono en exclusiones → lead con `excluido: true`.
- [ ] **Step 2: Run** `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts` — FAIL.
- [ ] **Step 3: Implementar**, pasando el mensajero de la marca a `procesarMensaje` y a los tres puntos de envío.
- [ ] **Step 4: Run** `npx vitest run src/lib/whatsapp` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): cada mensaje a su marca y lead para toda conversación con número propio`.

### Task 6: Ecos del móvil

**Files:** Modify `src/lib/whatsapp/db.ts`, `src/lib/whatsapp/procesar.ts`; Test `src/lib/whatsapp/__tests__/procesar.test.ts`, `src/lib/whatsapp/__tests__/db.test.ts`

**Interfaces:**
- Consumes: Task 4 `extraerEcos`; Task 5 resolución de marca y `crearLeadDeWhatsApp`.
- Produces: `guardarEco(i: { conversacionId: string; wamid: string; texto: string | null; enviadoEn: Date; payload: unknown }): Promise<{ nuevo: boolean }>` — upsert por `wamid` con `ignoreDuplicates`, `direccion "saliente"`, `origen "movil"`, `estado "enviado"`, `created_at = enviadoEn`; si es nuevo actualiza `ultimo_texto`/`ultimo_mensaje_at`. `Deps.guardarEco`.
- Regla: tras un eco nuevo la conversación pasa a `estado "humana"` con `pasoActual: null` (se para la secuencia); la ventana no cambia.

- [ ] **Step 1: Write the failing tests:** eco en conversación en `bot` con paso → queda `humana`, `paso_actual null`, eco guardado; **eco a un `waId` sin conversación → crea conversación `humana` y lead `whatsapp`** (Review Focus 3); eco repetido (mismo wamid) → `nuevo:false`, sin más escrituras; `guardarEco` hace upsert con `onConflict: "wamid"` (db.test con supabase-admin mockeado).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implementar** `procesarEco` y llamarlo desde `procesarWebhook` después de los mensajes, con la misma política de fase A.
- [ ] **Step 4: Run** `npx vitest run src/lib/whatsapp` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): los mensajes escritos desde el móvil aparecen y paran la secuencia`.

### Task 7: Historial, contactos y avisos de cuenta

**Files:** Modify `src/lib/whatsapp/db.ts`, `src/lib/whatsapp/procesar.ts`; Test `procesar.test.ts`, `db.test.ts`

**Interfaces:**
- Consumes: Task 3 `getMarcaPorWaba`, `marcarDesconectada`, `setHistorialMarca`; Task 4 `extraerHistorial`, `extraerContactos`, `extraerAvisosCuenta`.
- Produces:
  - `guardarHistorial(i: { conversacionId: string; mensajes: Array<{ wamid; deNegocio: boolean; texto; enviadoEn: Date; crudo }> }): Promise<number>` — un upsert por lote con `onConflict: "wamid"`, `ignoreDuplicates`, `direccion` según `deNegocio`, `origen "historial"`, `created_at = enviadoEn`; actualiza `ultimo_*` solo si el último importado es más reciente que `ultimo_mensaje_at`.
  - `guardarContactos(marcaId: string, c: Array<{ waId: string; nombre: string }>): Promise<void>` (upsert en `ventas_whatsapp_contactos`) y `nombreDeContacto(marcaId: string, waId: string): Promise<string | null>`.
  - Reglas historial: conversación nueva `humana`, `ventana_hasta` null; lead `whatsapp` como en Task 5 con el nombre de `nombreDeContacto`; sin secuencias, sin envíos, sin `registrarActividad`. `error.codigo === 2593109` → `setHistorialMarca(..., "rechazado")`; `progreso === 100` → `"completo"`.
  - Reglas contactos: `add` → guarda nombre y rellena `nombre_contacto` de la conversación y `contacto` del lead si estaban vacíos; `remove` → nada.
  - Avisos: `PARTNER_REMOVED` → `marcarDesconectada(marca.id, motivo)`; el resto se registra con `console.info`.

- [ ] **Step 1: Write the failing tests:** un lote de historial crea conversación `humana` con sus dos mensajes y lead, **sin abrir ventana ni llamar a `listSecuencias`/envíos/actividad** (Review Focus 5); **un wamid ya guardado como eco no se duplica al llegar en el historial** (Review Focus 4); error `2593109` → historial `rechazado`; contacto `add` rellena el nombre; `PARTNER_REMOVED` de la WABA de Hydrup → `marcarDesconectada(hydrup.id, "PRIMARY_INACTIVITY")`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implementar** y llamarlos desde `procesarWebhook` (avisos → contactos → historial → mensajes → ecos).
- [ ] **Step 4: Run** `npx vitest run src/lib/whatsapp` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): importar historial y contactos, y avisar de desconexión`.

### Task 8: Conectar un número desde el panel

**Files:**
- Create: `src/lib/whatsapp/conexion.ts`, `src/app/(site)/panel/ventas/(app)/[slug]/whatsapp/page.tsx`, `.../whatsapp/ConectarWhatsApp.tsx`, `.../whatsapp/acciones.ts`
- Modify: `src/lib/ventas/rutas.ts` (`SeccionMarca`, `SECCIONES_CLIENTE`), `src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx`
- Test: `src/lib/whatsapp/__tests__/conexion.test.ts`, `src/lib/__tests__/ventas-rutas.test.ts`, `src/lib/__tests__/ventas-acciones-whatsapp.test.ts`

**Interfaces:**
- Consumes: Task 2 `cifrarToken`, `claveDeEntorno`; Task 3 `guardarConexion`, `setHistorialMarca`; `GRAPH_VERSION`.
- Produces:
  - `SeccionMarca` gana `"whatsapp"`; `SECCIONES_CLIENTE` = `["resumen","tablero","leads","tareas","conversaciones","whatsapp"]`; `puedeConectarWhatsApp(u: { rol; activa; marca_id }, marcaId: string): boolean` (admin siempre; cliente solo su marca; comercial y agente no).
  - `conectarNumero(i: { marcaId: string; code: string; wabaId: string; numeroId: string | null; fetchImpl?: typeof fetch }): Promise<ResultadoAccion>` en `conexion.ts`, en este orden: clave presente (si no: `"Falta WHATSAPP_CLAVE_TOKENS en el servidor."`) → canje `GET /oauth/access_token?client_id=1444585017092524&client_secret=$WHATSAPP_APP_SECRET&code=…` → `GET /{waba}/phone_numbers` (si `numeroId` es null y hay exactamente uno, ese; si no coincide/no hay: `"Meta no ha devuelto el número conectado."`) → `guardarConexion` → `POST /{waba}/subscribed_apps` → `POST /{numero}/smb_app_data` contactos → historial → `setHistorialMarca("pedido")`. Un fallo de suscripción o sincronización devuelve `ok:false` con el paso que falló, sin deshacer la conexión guardada.
  - Server action `conectarWhatsAppAction(slug: string, datos: { code: string; wabaId: string; numeroId: string | null }): Promise<ResultadoAccion>`: `accesoMarcaAccion(slug, "whatsapp")` + `puedeConectarWhatsApp`; valida que `code`/`wabaId` sean strings no vacíos y `wabaId`/`numeroId` solo dígitos.
  - `ConectarWhatsApp` (cliente): carga `https://connect.facebook.net/es_ES/sdk.js` con `next/script`, `FB.init({ appId: "1444585017092524", autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION })`; escucha `message` de origen `https://www.facebook.com` o `https://web.facebook.com`, con `type === "WA_EMBEDDED_SIGNUP"` y `event` en `["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"]` para leer `data.waba_id`/`data.phone_number_id`; con el `authResponse.code` de `FB.login` (Global Constraints) llama a la acción. `CANCEL` y `ERROR` muestran un mensaje y no llaman a nada.
  - Página: estado (sin conectar / conectado con número y fecha / desconectado con motivo), estado del historial, y el botón «Conectar WhatsApp» o «Reconectar», solo si `puedeConectarWhatsApp`. Comercial que entra ve el estado sin botón; agente redirigido.
  - `MarcaCabecera`: pestaña `{ clave: "whatsapp", texto: "WhatsApp", ruta: "/whatsapp" }`.

- [ ] **Step 1: Write the failing tests:**
  - `puedeConectarWhatsApp`: admin cualquier marca true; cliente su marca true, otra false; comercial false; agente false. `evaluarAccesoMarca(cliente,"m1","conversaciones")` → `"ok"`.
  - `conectarNumero` con fetch falso: camino feliz en el orden de llamadas indicado y token guardado cifrado (el texto plano no aparece en el argumento de `guardarConexion`); **`guardarConexion` devuelve el error de unicidad → `ok:false` "Ese número ya está conectado a otra marca." y no se suscribe ni sincroniza**; falta la clave → error sin llamar a Meta; `numeroId` null con dos números en la WABA → error.
  - Acción: cliente de otra marca → `"No tienes permiso para esto."` sin llamar a `conectarNumero`; `wabaId` con letras → error de validación.
- [ ] **Step 2: Run** los tres archivos — FAIL.
- [ ] **Step 3: Implementar** librería, acción, página y componente.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): conectar un número a una marca desde el panel`.

### Task 9: Bandeja por marca y en vivo

**Files:** Modify `src/app/(site)/panel/ventas/(app)/[slug]/conversaciones/{acciones.ts,page.tsx,Conversaciones.tsx}`, `src/lib/whatsapp/bandeja.ts`; Test `src/lib/__tests__/ventas-acciones-conversaciones.test.ts`, `src/lib/whatsapp/__tests__/bandeja.test.ts`

**Interfaces:**
- Consumes: Task 3 `mensajeroDeMarca`; Task 1 `origen`, `nombre_contacto`.
- Produces:
  - `responder` mantiene `accesoMarcaAccion(slug, "conversaciones")` y envía con `await mensajeroDeMarca(acceso.marca)`; guarda con `origen "panel"`.
  - `nombreConversacion` prefiere el nombre del lead, luego `nombre_contacto`, luego el teléfono.
  - `etiquetaOrigen(origen): string | null` en `bandeja.ts`: `"movil" → "Desde el móvil"`, `"historial" → "Importado"`, `"bot" → "Bot"`, resto `null`.
  - `Conversaciones` hace `router.refresh()` cada 10 000 ms solo con `document.visibilityState === "visible"`, sin solaparse con un envío en curso; el botón deja de quedarse en «Enviando…» cuando la acción vuelve.

- [ ] **Step 1: Write the failing tests:** `responder` en Hydrup llama a `mensajeroDeMarca` con Hydrup (no a `crearMensajero`); cliente de Hydrup puede responder en Hydrup y no en Dinkbit; `etiquetaOrigen` para los cuatro valores; `nombreConversacion` con y sin `nombre_contacto`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint "src/app/(site)/panel/ventas/(app)/[slug]/conversaciones" src/lib/whatsapp` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): la bandeja contesta desde el número de cada marca y se actualiza sola`.

### Task 10: Puesta en marcha (manual, con Yael)

**Files:** Create `docs/whatsapp-coexistencia-puesta-en-marcha.md` (checklist corto)

- [ ] **Step 1:** Escribir la checklist: generar `WHATSAPP_CLAVE_TOKENS` (`openssl rand -base64 32`) y añadirla en Vercel (Production, tipo Secret); ejecutar `docs/sql/2026-10-20-whatsapp-por-marca.sql` y mandar el resultado de la consulta de comprobación; en Meta for Developers → WhatsApp → Configuración → Webhooks, suscribir `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`; poner el Lebara de Hydrup en WhatsApp Business ≥ 2.24.17 en un móvil; desplegar; en `/panel/ventas/hydrup/whatsapp` pulsar «Conectar WhatsApp» y completar la ventana; comprobar estado «Conectado» e historial «pedido»; mensaje de prueba entrante, respuesta desde el panel, respuesta desde el móvil (aparece como «Desde el móvil»); que Sidney vea Conversaciones; y que Dinkbit (+34 604 35 75 87) sigue recibiendo y enviando.
- [ ] **Step 2:** Verificar `npx vitest run`, `npx tsc --noEmit`, `npm run build` en verde antes de integrar en `main`.
- [ ] **Step 3: Commit** `docs(whatsapp): checklist de puesta en marcha de la coexistencia`.
