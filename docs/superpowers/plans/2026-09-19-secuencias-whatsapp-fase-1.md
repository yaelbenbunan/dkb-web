# Secuencias de WhatsApp (fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada marca pueda escribir, editar y probar su conversación de WhatsApp en `/panel/ventas/[slug]/secuencias`, sin enviar nada todavía.

**Architecture:** Módulo dentro de `/panel/ventas`, mismos patrones que el resto: lógica pura en `src/lib/ventas/` (tipos y validación de la secuencia, motor de simulación), capa de datos en `db.ts`, servicios en `servicios.ts`, server actions finas con `requireUsuaria()`, pantallas Server Component + formularios cliente. Una tabla nueva (`ventas_secuencias`) con los pasos en jsonb: la forma la valida zod en el servidor, nunca la base.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), TypeScript, zod 4, Supabase (Postgres), Vitest.

**Spec:** [docs/superpowers/specs/2026-09-18-secuencias-whatsapp-design.md](../specs/2026-09-18-secuencias-whatsapp-design.md)

## Global Constraints

- **Fase 1 no envía nada ni habla con Meta.** No hay webhook, no hay conversaciones reales, no se tocan `ventas_conversaciones` ni `ventas_mensajes` (son de la fase 2).
- **Ruta:** `/panel/ventas/[slug]/secuencias` y `/panel/ventas/[slug]/secuencias/[id]`. Pestaña «Secuencias» en `MarcaCabecera`, después de «Leads».
- **Permisos:** ver, cualquier usuaria con sesión; crear, editar, duplicar, activar y archivar, solo `admin`. Toda server action llama primero a `requireUsuaria()` (y `requireUsuaria("admin")` donde toque) y comprueba que la secuencia es de la marca de la URL.
- **Nunca pasar a un componente "use client" objetos con secretos** (una `Marca` lleva `webhook_secret`).
- **Tabla nueva:** `ventas_secuencias`, RLS activada sin políticas, migración manual en `docs/sql/`. Las funciones nuevas, si las hubiera, con `revoke execute ... from public, anon, authenticated` y `grant ... to service_role`.
- **Los pasos se guardan en jsonb** y se validan SIEMPRE con zod al escribir y al leer. Una secuencia guardada con una forma inválida no debe romper la pantalla: se enseña el error.
- **Idioma:** textos de pantalla y comentarios en español de España.
- **Estilo visual:** el del panel (estilos en línea, `_componentes/estilos.ts`).
- **Tests** en `src/lib/__tests__/ventas-*.test.ts`. Verificación por tarea: `npx vitest run src/lib/__tests__/ventas-*` en verde y `npm run typecheck` limpio.
- Los 2 tests de `PromoPopup` fallan desde antes de este trabajo: no son de este plan.
- **Nada de push:** el trabajo va en la rama del worktree; la integración se decide al final.

---

### Task 1: Migración de la tabla de secuencias

**Files:**
- Create: `docs/sql/2026-09-19-ventas-secuencias.sql`

**Interfaces:**
- Produces: tabla `public.ventas_secuencias` con columnas `id uuid pk default gen_random_uuid()`, `marca_id uuid not null references ventas_marcas(id) on delete cascade`, `nombre text not null`, `estado text not null default 'borrador' check (estado in ('borrador','activa','archivada'))`, `pasos jsonb not null default '{}'::jsonb`, `creada_por uuid references ventas_usuarias(id)`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`; índice `ventas_secuencias_marca_idx (marca_id, created_at desc)`; RLS activada.

- [ ] **Step 1:** Escribir el SQL siguiendo el estilo de `docs/sql/2026-09-17-ventas-fase1.sql`: cabecera explicando qué es y que se ejecuta en el SQL Editor del proyecto `wnboyesnlrbtwfmhcxmc`, idempotente (`create table if not exists`, `create index if not exists`).
- [ ] **Step 2:** No ejecutarlo. Verificar solo leyéndolo.
- [ ] **Step 3:** Commit `feat(ventas): tabla de secuencias de WhatsApp`.

---

### Task 2: Tipos y validación de una secuencia (puro)

**Files:**
- Create: `src/lib/ventas/secuencias.ts`
- Test: `src/lib/__tests__/ventas-secuencias.test.ts`

**Interfaces:**
- Consumes: `FASES`, `esFase`, `type Fase` de `./dominio`; zod.
- Produces:
  - `VARIABLES_BASE = ["negocio", "contacto", "ciudad", "marca", "remitente"] as const`
  - `interface Ruta { ir_a?: string; fase?: Fase; esperar_dias?: number; avisar?: boolean; terminar?: boolean }`
  - `interface Boton { texto: string; ruta: Ruta }`
  - `interface Paso { tipo: "mensaje"; texto: string; plantilla?: boolean; botones: Boton[]; guardar_respuesta_en?: string; ruta?: Ruta }`
  - `interface Secuencia { version: 1; inicio: string; pasos: Record<string, Paso> }`
  - `secuenciaSchema: z.ZodType<Secuencia>` (texto 1..1024, máximo 3 botones por paso, texto de botón 1..20 —lo que admite WhatsApp—, ids de paso `^[a-z0-9_-]{1,24}$`)
  - `parsearSecuencia(raw: unknown): { ok: true; secuencia: Secuencia } | { ok: false; error: string }`
  - `secuenciaVacia(): Secuencia` (un paso `p1` de plantilla con texto de ejemplo y un botón)
  - `variablesEnTexto(texto: string): string[]`
  - `interface Aviso { paso: string; mensaje: string; grave: boolean }`
  - `validarSecuencia(s: Secuencia, variablesExtra?: string[]): Aviso[]`
  - `renderizarTexto(texto: string, valores: Record<string, string | null>): { texto: string; faltan: string[] }`
  - `siguientesPasos(s: Secuencia, id: string): string[]`

**Reglas que comprueba `validarSecuencia`** (graves impiden activar; el resto son avisos):
1. `inicio` existe entre los pasos. **Grave.**
2. Todo `ir_a` apunta a un paso existente. **Grave.**
3. Todo paso es alcanzable desde `inicio`. Aviso.
4. Un paso sin botones necesita `ruta` (si no, la conversación se queda parada). **Grave.**
5. Ningún botón repite texto dentro del mismo paso. Aviso.
6. Las variables usadas están en `VARIABLES_BASE` o en `variablesExtra`. **Grave.**
7. Solo el paso `inicio` puede ser `plantilla: true`; el resto va dentro de la ventana de 24 h. Aviso.
8. `esperar_dias` entre 1 y 90. **Grave** si se sale.
9. Una ruta con `terminar: true` no lleva `ir_a`. **Grave.**

- [ ] **Step 1: Write the failing tests** — un test por regla de arriba (secuencia válida → `[]`; cada caso roto → su aviso, comprobando `grave`), más: `parsearSecuencia` con basura devuelve error legible; `variablesEnTexto("Hola {{negocio}} y {{contacto}}")` → `["negocio","contacto"]`; `renderizarTexto` sustituye y devuelve `faltan` con las que no tienen valor; `secuenciaVacia()` pasa `validarSecuencia` sin avisos graves; `siguientesPasos` devuelve los destinos de botones y ruta.
- [ ] **Step 2:** Ejecutar y ver fallar.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Tests en verde y `npm run typecheck` limpio.
- [ ] **Step 5:** Commit `feat(ventas): forma y validación de las secuencias de WhatsApp`.

---

### Task 3: Motor de simulación (puro)

**Files:**
- Create: `src/lib/ventas/simulador.ts`
- Test: `src/lib/__tests__/ventas-simulador.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Secuencia`, `Paso`, `Ruta`, `renderizarTexto`), `type Fase` de `./dominio`.
- Produces:
  - `interface ContextoSimulacion { valores: Record<string, string | null>; faseInicial: Fase }`
  - `interface EntradaConversacion { de: "marca" | "negocio"; texto: string; botones?: string[] }`
  - `interface EstadoSimulacion { conversacion: EntradaConversacion[]; pasoActual: string | null; fase: Fase; datos: Record<string, string>; avisos: string[]; esperaDias: number | null; terminada: boolean; faltanVariables: string[] }`
  - `iniciarSimulacion(s: Secuencia, ctx: ContextoSimulacion): EstadoSimulacion`
  - `responderBoton(s: Secuencia, estado: EstadoSimulacion, indiceBoton: number, ctx: ContextoSimulacion): EstadoSimulacion`
  - `responderTexto(estado: EstadoSimulacion, texto: string): EstadoSimulacion` (para el caso «contesta algo libre»)

**Comportamiento a testear:**
- `iniciarSimulacion` mete el mensaje del paso `inicio` con sus botones y deja `pasoActual` en él.
- Pulsar un botón añade la respuesta del negocio y luego el mensaje del paso destino.
- `fase` en la ruta cambia la fase del estado; `avisar` añade un aviso legible («Avisar a la comercial»); `esperar_dias` deja `esperaDias` y no avanza; `terminar` marca `terminada` y deja `pasoActual` en null.
- `guardar_respuesta_en` guarda en `datos` el texto del botón pulsado (o el texto libre).
- `responderTexto` **siempre** termina la simulación con el aviso «Respuesta libre: la secuencia se para y se avisa a la comercial» (regla del spec).
- Las variables sin valor salen en `faltanVariables` y el texto muestra el hueco tal cual (`{{precio}}`), para que se vea qué falta.
- Pulsar un índice de botón que no existe no cambia el estado.
- Una secuencia con `ir_a` a un paso inexistente no revienta: termina con un aviso grave.

- [ ] **Step 1: Write the failing tests** (uno por punto). **Step 2:** Ver fallar. **Step 3:** Implementar. **Step 4:** Verde + typecheck. **Step 5:** Commit `feat(ventas): simulador de conversaciones de WhatsApp`.

---

### Task 4: Capa de datos y servicios

**Files:**
- Modify: `src/lib/ventas/db.ts`
- Modify: `src/lib/ventas/servicios.ts`
- Test: `src/lib/__tests__/ventas-secuencias-datos.test.ts`

**Interfaces:**
- Produces en `db.ts`:
  - `interface SecuenciaRow { id: string; marca_id: string; nombre: string; estado: "borrador" | "activa" | "archivada"; pasos: unknown; creada_por: string | null; created_at: string; updated_at: string }`
  - `listSecuencias(marcaId: string): Promise<SecuenciaRow[]>`
  - `getSecuencia(id: string): Promise<SecuenciaRow | null>`
  - `crearSecuencia(input: { marcaId: string; nombre: string; pasos: unknown; creadaPor: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }>`
  - `actualizarSecuencia(id: string, patch: { nombre?: string; pasos?: unknown; estado?: string }): Promise<Escritura>`
- Produces en `servicios.ts`:
  - `guardarSecuencia(input: { marca: Marca; usuaria: Usuaria; secuenciaId: string; nombre: string; pasosJson: unknown }): Promise<Escritura>` — valida con `parsearSecuencia`, rechaza si la secuencia no es de la marca, y si tiene avisos graves la guarda igual pero **nunca** la deja `activa`.
  - `activarSecuencia(input: { marca: Marca; secuenciaId: string }): Promise<Escritura>` — falla si hay avisos graves (`"La secuencia tiene errores que hay que corregir antes de activarla."`); al activar, archiva las demás activas de la marca.
  - `duplicarSecuencia(input: { marca: Marca; usuaria: Usuaria; secuenciaId: string; nombre: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }>`

- [ ] **Step 1: Write the failing tests** con `db` mockeado (como `ventas-servicios.test.ts`): guardar valida la forma; una secuencia de otra marca se rechaza; activar con avisos graves falla y no escribe; activar archiva las otras activas; duplicar copia los pasos con nombre nuevo y estado `borrador`.
- [ ] **Step 2–4:** Ver fallar, implementar, verde + typecheck.
- [ ] **Step 5:** Commit `feat(ventas): guardar, activar y duplicar secuencias`.

---

### Task 5: Server actions

**Files:**
- Create: `src/app/(site)/panel/ventas/acciones-secuencias.ts`
- Test: `src/lib/__tests__/ventas-acciones-secuencias.test.ts`

**Interfaces:**
- Produces: `crearSecuenciaAction(slug, prev, fd)`, `guardarSecuenciaAction(slug, secuenciaId, prev, fd)`, `activarSecuenciaAction(slug, secuenciaId)`, `archivarSecuenciaAction(slug, secuenciaId)`, `duplicarSecuenciaAction(slug, secuenciaId, prev, fd)`. Todas devuelven `ResultadoAccion` (o redirigen al editor tras crear/duplicar).
- El formulario del editor manda los pasos como JSON en un campo oculto `pasos`; la action lo parsea y valida en el servidor: **nunca se fía del cliente**.

- [ ] **Step 1: Write the failing tests:** todas exigen sesión; crear/guardar/activar/archivar/duplicar exigen `admin` y no escriben si se deniega; JSON inválido devuelve error legible sin llamar al servicio.
- [ ] **Step 2–4:** Ver fallar, implementar, verde + typecheck.
- [ ] **Step 5:** Commit `feat(ventas): acciones del editor de secuencias`.

---

### Task 6: Lista de secuencias

**Files:**
- Modify: `src/app/(site)/panel/ventas/_componentes/MarcaCabecera.tsx` (pestaña «Secuencias» tras «Leads»)
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/NuevaSecuenciaForm.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/AccionesSecuencia.tsx`

**Contenido:** tabla con nombre, estado (etiqueta de color), nº de pasos, última edición y enlace al editor; acciones por fila (activar, archivar, duplicar) solo para admin; formulario «Nueva secuencia» (nombre) que crea una `secuenciaVacia()` y abre el editor. Aviso arriba: «Todavía no se envía nada: esto sirve para escribir y probar la conversación.»

- [ ] **Step 1:** Implementar. **Step 2:** `npm run typecheck` + `npm run build`. **Step 3:** Commit `feat(ventas): lista de secuencias por marca`.

---

### Task 7: Editor de la secuencia

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/[id]/page.tsx`
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/[id]/EditorSecuencia.tsx`

**Contenido:**
- Columna izquierda: los pasos en orden de recorrido (desde `inicio`), con su id, las primeras palabras del texto y una marca si es plantilla. Botones: añadir paso, borrar paso (no deja borrar el `inicio`), marcar como inicio.
- Columna derecha: el paso seleccionado — texto (área grande con las variables disponibles listadas debajo, insertables al pulsarlas), casilla «es plantilla (primer mensaje, necesita aprobación de Meta)», hasta 3 botones con su texto y su ruta (ir a paso / cambiar fase / esperar N días / avisar / terminar), y campo «guardar respuesta en».
- Arriba: nombre de la secuencia, estado, botón **Guardar** y botón **Activar** (deshabilitado si hay avisos graves, con el motivo al lado).
- Panel de avisos: lista de `validarSecuencia`, los graves en rojo y el resto en ámbar, cada uno enlazando al paso.
- Todo el estado vive en el cliente y se manda como JSON al guardar.

- [ ] **Step 1:** Implementar. **Step 2:** `npm run typecheck` + `npm run build`. **Step 3:** Commit `feat(ventas): editor de secuencias de WhatsApp`.

---

### Task 8: Simulador dentro del editor

**Files:**
- Create: `src/app/(site)/panel/ventas/(app)/[slug]/secuencias/[id]/Simulador.tsx`
- Modify: `EditorSecuencia.tsx` (pestaña «Simular» junto a «Editar»)

**Contenido:** conversación en burbujas (la marca a la izquierda, el negocio a la derecha), los botones del paso actual pulsables, y un campo para escribir una respuesta libre (que demuestra que la secuencia se para y se avisa). A la derecha: fase actual del lead simulado, datos recogidos, avisos y variables que faltan. Botón «Empezar de nuevo». Los valores de ejemplo (negocio, contacto, ciudad) se pueden editar arriba para ver el texto con datos reales.

- [ ] **Step 1:** Implementar. **Step 2:** `npm run typecheck` + `npm run build`. **Step 3:** Commit `feat(ventas): simulador de la conversación en el editor`.

---

### Task 9: Verificación en el navegador

- [ ] **Step 1:** `npx vitest run`, `npm run typecheck`, `npm run build`.
- [ ] **Step 2:** Pedir a Yael que ejecute `docs/sql/2026-09-19-ventas-secuencias.sql` en Supabase.
- [ ] **Step 3:** Con el servidor de producción en local y la cuenta admin, recorrer: crear secuencia, editar textos y botones, ver los avisos (botón sin destino, variable inventada), intentar activar con un aviso grave (no deja), corregir y activar, duplicar, simular la conversación entera incluida una respuesta libre, y comprobar que una comercial no ve los botones de admin. Capturas en el scratchpad.
- [ ] **Step 4:** Informe con PASS/FAIL por punto.
