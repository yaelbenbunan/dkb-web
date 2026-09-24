# Ejecución de secuencias por WhatsApp — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la conversación con un lead de anuncio la lleve la secuencia editable del panel —pulsa un botón, recibe la rama que toca— en vez de un texto en código.

**Architecture:** El motor ya existe y es puro (`src/lib/ventas/simulador.ts`). Esta entrega añade una capa fina de traducción entre el canal y el motor, persiste el estado en `ventas_conversaciones`, y lo acciona desde `procesar.ts` en la fase B del webhook. Nada del motor se reescribe.

**Tech Stack:** Next.js App Router (runtime nodejs), TypeScript, Supabase (clave de servicio), vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-secuencias-ejecucion-design.md`

## Global Constraints

- Rama de trabajo: crear `feat/secuencias-ejecucion` desde `origin/main`.
- Código y comentarios **en español**, como el resto del módulo de ventas.
- Migraciones **manuales** en `docs/sql/`, nunca automáticas. RLS activada sin políticas.
- Acceso a datos con `getSupabaseAdmin()` a través del helper `db()` de cada módulo, en ficheros con `import "server-only"`.
- Todo lo que toque esta entrega ocurre en **fase B** del webhook: el mensaje entrante ya está persistido, así que un fallo se registra con `console.error` y se responde 200. Nunca propagar desde aquí.
- El motor `simulador.ts` **no se modifica**. Si algo no encaja, se adapta la capa de traducción.
- Tests con `npm test` (vitest). Antes de cada commit: `npm test` y `npm run typecheck`.
- `npm run lint` funciona pero arrastra 50 errores preexistentes de reglas de React; no es una puerta.

## Review Focus

Cinco cosas que el spec da por supuestas y que romperían la conversación de un lead real. Cada una tiene su test asignado:

1. **Secuencia editada mientras hay conversaciones en vuelo**: el paso guardado ya no existe. El motor debe terminar con aviso, no romper. → Tarea 8.
2. **Reintento de Meta del mismo `wamid`**: la secuencia no puede avanzar dos veces ni mandar el mismo mensaje dos veces. → Tarea 8.
3. **El lead escribe en vez de pulsar**: sin id de botón, debe irse por el camino de texto libre, que para la secuencia y avisa. → Tareas 3 y 8.
4. **Ningún guion sirve a ese anuncio**: debe caer en la autorespuesta en código, nunca quedarse mudo. → Tarea 7.
5. **Variables sin valor** (`{{ciudad}}` de un lead sin ciudad): el mensaje sale con el hueco visible y la conversación sigue, en vez de reventar. → Tarea 7.

---

### Task 1: Migración del estado de conversación

**Files:**
- Create: `docs/sql/2026-09-24-secuencias-ejecucion.sql`

**Interfaces:**
- Produces: las columnas que leen y escriben las tareas 5, 6, 7 y 8.

- [ ] **Step 1: Escribir la migración**

```sql
-- Ejecución de secuencias por WhatsApp (entrega 2 del canal).
-- Spec: docs/superpowers/specs/2026-09-24-secuencias-ejecucion-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Solo añade columnas: no toca ninguna fila existente.

-- Dónde va cada conversación dentro de su guion. El hilo de mensajes NO se
-- guarda aquí: ya está en `ventas_mensajes`, y duplicarlo crecería sin límite.
alter table public.ventas_conversaciones
  add column if not exists secuencia_id uuid references public.ventas_secuencias(id) on delete set null,
  add column if not exists paso_actual text,
  add column if not exists datos jsonb not null default '{}'::jsonb,
  -- Solo se escribe si una ruta usa `esperar_dias`. No hay cron todavía: sirve
  -- para que una persona vea que hay una conversación parada esperando.
  add column if not exists reanudar_en timestamptz;

-- A qué anuncios de Meta sirve cada secuencia.
--
-- Hace falta porque `activarSecuencia` archiva las demás activas de la marca:
-- con dos campañas vivas bajo `dinkbit`, activar dental archivaría psicología y
-- sus leads se quedarían sin guion. Con esto, cada lead encuentra el suyo.
alter table public.ventas_secuencias
  add column if not exists anuncios text[] not null default '{}';

create index if not exists ventas_secuencias_anuncios_idx
  on public.ventas_secuencias using gin (anuncios);
```

- [ ] **Step 2: Commit**

```bash
git add docs/sql/2026-09-24-secuencias-ejecucion.sql
git commit -m "feat(ventas): migración del estado de ejecución de secuencias"
```

**Nota:** la migración se aplica a mano. El resto del plan no depende de que esté aplicada salvo en la comprobación manual final.

---

### Task 2: El id del botón pulsado llega hasta el orquestador

**Files:**
- Modify: `src/lib/whatsapp/entrante.ts`
- Test: `src/lib/whatsapp/__tests__/entrante.test.ts`

**Interfaces:**
- Produces: `MensajeEntrante` gana `botonId: string | null` — el `id` que Meta devuelve del botón pulsado (`opcion_1`, `opcion_2`…), o `null` si el lead escribió a mano.

Hoy `entrante.ts` guarda el **rótulo** del botón como `texto` pero descarta su `id`, y el motor avanza por **índice**. Sin el id habría que adivinar el índice comparando rótulos, que se rompe en cuanto alguien edita el texto de un botón.

- [ ] **Step 1: Escribir el test que falla**

```ts
it("conserva el id del botón pulsado, no solo su rótulo", () => {
  const [m] = extraerMensajes(
    sobreBoton({ type: "button_reply", button_reply: { id: "opcion_2", title: "Vienen 1 vez y ya" } }),
  );
  expect(m.botonId).toBe("opcion_2");
  expect(m.texto).toBe("Vienen 1 vez y ya");
});

it("deja el id a null cuando el lead escribe a mano", () => {
  const [m] = extraerMensajes(
    sobre({
      messages: [
        { id: "wamid.T", from: "34660415514", timestamp: "1790000000", type: "text", text: { body: "hola" } },
      ],
    }),
  );
  expect(m.botonId).toBeNull();
});
```

(`sobreBoton` y `sobre` ya existen en ese fichero de test.)

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/entrante.test.ts`
Expected: FAIL, `botonId` es `undefined`.

- [ ] **Step 3: Implementar**

Añadir `botonId: string | null` a la interfaz `MensajeEntrante` y una función hermana de `textoDelMensaje`:

```ts
/**
 * Id del botón o de la opción de lista que pulsó el lead. El motor de
 * secuencias avanza por ÍNDICE, y el id (`opcion_1`, `opcion_2`…) es lo que
 * permite traducirlo sin comparar rótulos: comparar textos se rompería en
 * cuanto alguien edite el texto de un botón en el panel.
 */
function botonDelMensaje(tipo: string, m: Record<string, unknown>): string | null {
  if (tipo !== "interactive" || !esObjeto(m.interactive)) return null;
  for (const clave of ["button_reply", "list_reply"] as const) {
    const respuesta = m.interactive[clave];
    if (esObjeto(respuesta) && typeof respuesta.id === "string") return respuesta.id;
  }
  return null;
}
```

Y rellenarlo en el objeto que construye `extraerMensajes`, junto a `texto`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/entrante.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/entrante.ts src/lib/whatsapp/__tests__/entrante.test.ts
git commit -m "feat(whatsapp): el id del botón pulsado llega al orquestador"
```

---

### Task 3: La capa de traducción entre el canal y el motor

**Files:**
- Create: `src/lib/whatsapp/guion.ts`
- Test: `src/lib/whatsapp/__tests__/guion.test.ts`

**Interfaces:**
- Consumes: `EstadoSimulacion` y `EntradaConversacion` de `src/lib/ventas/simulador.ts`.
- Produces:
  - `indiceDeBoton(botonId: string | null): number | null`
  - `mensajesAEnviar(anterior: EstadoSimulacion | null, nuevo: EstadoSimulacion): EntradaConversacion[]`
  - `interface EstadoGuardado { pasoActual: string | null; datos: Record<string, string>; }`
  - `aEstadoGuardado(estado: EstadoSimulacion): EstadoGuardado`
  - `desdeEstadoGuardado(guardado: EstadoGuardado, fase: Fase): EstadoSimulacion`

Módulo **puro**, sin `server-only`: es donde vive toda la lógica de esta entrega que se puede testear sin base ni red.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import type { EstadoSimulacion } from "../../ventas/simulador";
import { aEstadoGuardado, desdeEstadoGuardado, indiceDeBoton, mensajesAEnviar } from "../guion";

const estado = (parcial: Partial<EstadoSimulacion> = {}): EstadoSimulacion => ({
  conversacion: [],
  pasoActual: null,
  fase: "nuevo",
  datos: {},
  avisos: [],
  esperaDias: null,
  terminada: false,
  faltanVariables: [],
  ...parcial,
});

describe("indiceDeBoton", () => {
  it("traduce el id que mandamos al índice que espera el motor", () => {
    expect(indiceDeBoton("opcion_1")).toBe(0);
    expect(indiceDeBoton("opcion_3")).toBe(2);
  });

  it("devuelve null con un id que no reconocemos o sin id", () => {
    // Pasa si el lead escribe a mano, o si alguien cambia el formato del id en
    // el mensajero sin tocar esto. En los dos casos hay que irse por el camino
    // de texto libre, que para la secuencia y avisa, en vez de avanzar a ciegas.
    for (const id of [null, "", "boton_2", "opcion_cero", "opcion_0"]) {
      expect(indiceDeBoton(id)).toBeNull();
    }
  });
});

describe("mensajesAEnviar", () => {
  it("devuelve solo lo que dijo la marca, y solo lo nuevo", () => {
    const anterior = estado({ conversacion: [{ de: "marca", texto: "uno" }] });
    const nuevo = estado({
      conversacion: [
        { de: "marca", texto: "uno" },
        { de: "negocio", texto: "respondo" },
        { de: "marca", texto: "dos", botones: ["A", "B"] },
      ],
    });
    expect(mensajesAEnviar(anterior, nuevo)).toEqual([{ de: "marca", texto: "dos", botones: ["A", "B"] }]);
  });

  it("al arrancar manda todo lo que dijo la marca", () => {
    const nuevo = estado({ conversacion: [{ de: "marca", texto: "hola", botones: ["A"] }] });
    expect(mensajesAEnviar(null, nuevo)).toHaveLength(1);
  });
});

describe("estado guardado", () => {
  it("conserva paso y datos en el viaje de ida y vuelta", () => {
    const original = estado({ pasoActual: "problemas", datos: { problema_principal: "Huecos en la agenda" } });
    const recuperado = desdeEstadoGuardado(aEstadoGuardado(original), "contactado");
    expect(recuperado.pasoActual).toBe("problemas");
    expect(recuperado.datos).toEqual({ problema_principal: "Huecos en la agenda" });
    expect(recuperado.fase).toBe("contactado");
  });

  it("el estado recuperado arranca sin hilo: el hilo vive en ventas_mensajes", () => {
    const recuperado = desdeEstadoGuardado({ pasoActual: "p1", datos: {} }, "nuevo");
    expect(recuperado.conversacion).toEqual([]);
    expect(recuperado.terminada).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/guion.test.ts`
Expected: FAIL, no existe `../guion`.

- [ ] **Step 3: Implementar**

```ts
import type { Fase } from "../ventas/dominio";
import type { EntradaConversacion, EstadoSimulacion } from "../ventas/simulador";

/** Formato de los ids que pone `mensajero.enviarBotones`: `opcion_1`, `opcion_2`… */
const ID_BOTON = /^opcion_([1-9]\d*)$/;

export function indiceDeBoton(botonId: string | null): number | null {
  const m = botonId?.match(ID_BOTON);
  return m ? Number(m[1]) - 1 : null;
}

/**
 * Lo que hay que mandar por WhatsApp tras una transición: los mensajes que la
 * marca añadió al hilo, y solo los nuevos. Los del lado `negocio` ya los
 * escribió el lead.
 */
export function mensajesAEnviar(
  anterior: EstadoSimulacion | null,
  nuevo: EstadoSimulacion,
): EntradaConversacion[] {
  const desde = anterior?.conversacion.length ?? 0;
  return nuevo.conversacion.slice(desde).filter((e) => e.de === "marca");
}

export interface EstadoGuardado {
  pasoActual: string | null;
  datos: Record<string, string>;
}

export function aEstadoGuardado(estado: EstadoSimulacion): EstadoGuardado {
  return { pasoActual: estado.pasoActual, datos: estado.datos };
}

/**
 * Reconstruye el estado del motor desde lo guardado. El hilo va vacío a
 * propósito: no se persiste (vive en `ventas_mensajes`) y así `mensajesAEnviar`
 * devuelve exactamente lo que el motor añada en esta vuelta.
 */
export function desdeEstadoGuardado(guardado: EstadoGuardado, fase: Fase): EstadoSimulacion {
  return {
    conversacion: [],
    pasoActual: guardado.pasoActual,
    fase,
    datos: guardado.datos,
    avisos: [],
    esperaDias: null,
    terminada: false,
    faltanVariables: [],
  };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/guion.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/guion.ts src/lib/whatsapp/__tests__/guion.test.ts
git commit -m "feat(whatsapp): traducción entre el canal y el motor de secuencias"
```

---

### Task 4: Elegir qué secuencia sirve a cada lead

**Files:**
- Create: `src/lib/whatsapp/eleccion.ts`
- Test: `src/lib/whatsapp/__tests__/eleccion.test.ts`

**Interfaces:**
- Produces: `elegirSecuencia<T extends { estado: string; anuncios: string[] }>(secuencias: T[], anuncio: string | null): T | null`

Función **pura**: recibe las secuencias ya cargadas y decide. Quien las carga es la tarea 6.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { elegirSecuencia } from "../eleccion";

const s = (id: string, estado: string, anuncios: string[] = []) => ({ id, estado, anuncios });

describe("elegirSecuencia", () => {
  it("prefiere la que declara servir a ese anuncio", () => {
    const secuencias = [s("general", "activa"), s("psico", "activa", ["120252112386740343"])];
    expect(elegirSecuencia(secuencias, "120252112386740343")?.id).toBe("psico");
  });

  it("cae en la activa sin anuncios cuando ninguna lo cubre", () => {
    const secuencias = [s("general", "activa"), s("psico", "activa", ["otro"])];
    expect(elegirSecuencia(secuencias, "120252112386740343")?.id).toBe("general");
  });

  it("ignora las que no están activas, aunque declaren el anuncio", () => {
    // Un borrador a medio escribir no puede hablar con un cliente.
    const secuencias = [s("borrador", "borrador", ["A"]), s("archivada", "archivada", ["A"])];
    expect(elegirSecuencia(secuencias, "A")).toBeNull();
  });

  it("devuelve null si no hay ninguna activa", () => {
    expect(elegirSecuencia([], "A")).toBeNull();
    expect(elegirSecuencia([s("b", "borrador")], null)).toBeNull();
  });

  it("sin anuncio usa la activa general", () => {
    expect(elegirSecuencia([s("general", "activa")], null)?.id).toBe("general");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/eleccion.test.ts`
Expected: FAIL, no existe `../eleccion`.

- [ ] **Step 3: Implementar**

```ts
/**
 * Qué guion sigue un lead. Primero la secuencia activa que declare servir a su
 * anuncio; si ninguna lo cubre, la activa que no declara anuncios (la general
 * de la marca).
 *
 * Esta distinción existe porque `activarSecuencia` archiva las demás activas
 * de la marca: sin ella, activar la campaña de dental dejaría a los leads de
 * psicología sin guion.
 */
export function elegirSecuencia<T extends { estado: string; anuncios: string[] }>(
  secuencias: T[],
  anuncio: string | null,
): T | null {
  const activas = secuencias.filter((s) => s.estado === "activa");
  const delAnuncio = anuncio ? activas.find((s) => s.anuncios.includes(anuncio)) : undefined;
  return delAnuncio ?? activas.find((s) => s.anuncios.length === 0) ?? null;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/eleccion.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/eleccion.ts src/lib/whatsapp/__tests__/eleccion.test.ts
git commit -m "feat(whatsapp): elección de secuencia por anuncio"
```

---

### Task 5: Persistir el estado en la conversación

**Files:**
- Modify: `src/lib/whatsapp/db.ts`
- Test: `src/lib/whatsapp/__tests__/db.test.ts`

**Interfaces:**
- Produces:
  - `Conversacion` gana `secuencia_id: string | null`, `paso_actual: string | null`, `datos: Record<string, string>`, `reanudar_en: string | null`
  - `actualizarConversacion` acepta además `secuenciaId?: string | null`, `pasoActual?: string | null`, `datos?: Record<string, string>`, `reanudarEn?: Date | null`

- [ ] **Step 1: Escribir el test que falla**

```ts
it("guarda el avance de la secuencia sin pisar el resto", async () => {
  updateMock.mockReturnValue({ eq: () => ({ error: null }) });
  await actualizarConversacion("c1", { pasoActual: "cierre_huecos", datos: { problema_principal: "Huecos" } });
  const patch = updateMock.mock.calls[0][0];
  expect(patch).toEqual({ paso_actual: "cierre_huecos", datos: { problema_principal: "Huecos" } });
});

it("distingue «no tocar» de «poner a null» en el paso", async () => {
  // Terminar una conversación es poner `paso_actual` a null a propósito; no
  // puede confundirse con «este cambio no toca el paso».
  updateMock.mockReturnValue({ eq: () => ({ error: null }) });
  await actualizarConversacion("c1", { pasoActual: null });
  expect(updateMock.mock.calls[0][0]).toEqual({ paso_actual: null });
});
```

(El fichero ya mockea `getSupabaseAdmin`; añadir `updateMock` siguiendo el patrón de `insertMock`.)

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/db.test.ts`
Expected: FAIL, el patch no incluye las columnas nuevas.

- [ ] **Step 3: Implementar**

Añadir los campos a la interfaz `Conversacion` y al `select` de las consultas, y extender el patch de `actualizarConversacion` con el mismo patrón de «la clave llegó» que ya usa para `leadId`:

```ts
if (cambios.secuenciaId !== undefined) patch.secuencia_id = cambios.secuenciaId;
if (cambios.pasoActual !== undefined) patch.paso_actual = cambios.pasoActual;
if (cambios.datos !== undefined) patch.datos = cambios.datos;
if (cambios.reanudarEn !== undefined) {
  patch.reanudar_en = cambios.reanudarEn ? cambios.reanudarEn.toISOString() : null;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/db.ts src/lib/whatsapp/__tests__/db.test.ts
git commit -m "feat(whatsapp): la conversación guarda por dónde va su secuencia"
```

---

### Task 6: Cargar las secuencias de la marca con sus anuncios

**Files:**
- Modify: `src/lib/ventas/db.ts`
- Test: `src/lib/__tests__/ventas-db.test.ts`

**Interfaces:**
- Produces: `SecuenciaRow` gana `anuncios: string[]`; nueva `listSecuenciasDeMarca(marcaId: string): Promise<SecuenciaRow[]>` que devuelve todas con sus anuncios (la existente `listSecuencias` ya vale si se le añade la columna al select — comprobarlo antes de crear una nueva y, si vale, NO crear ninguna).

- [ ] **Step 1: Escribir el test que falla**

```ts
it("trae los anuncios que sirve cada secuencia", async () => {
  // Sin esta columna, elegirSecuencia no puede distinguir la campaña de
  // psicología de la de dental y todos los leads caerían en la misma.
  selectMock.mockReturnValue({
    eq: () => ({ order: () => ({ data: [{ id: "s1", anuncios: ["120252112386740343"] }], error: null }) }),
  });
  const filas = await listSecuencias("m1");
  expect(filas[0].anuncios).toEqual(["120252112386740343"]);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/__tests__/ventas-db.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Añadir `anuncios` a la interfaz `SecuenciaRow` y a la lista de columnas del `select` de `listSecuencias` y `getSecuencia`. Si el select usa `*`, basta con la interfaz.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/__tests__/ventas-db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/db.ts src/lib/__tests__/ventas-db.test.ts
git commit -m "feat(ventas): las secuencias declaran a qué anuncios sirven"
```

---

### Task 7: Arrancar la secuencia con un lead de anuncio

**Files:**
- Modify: `src/lib/whatsapp/procesar.ts`
- Test: `src/lib/whatsapp/__tests__/procesar.test.ts`

**Interfaces:**
- Consumes: `elegirSecuencia`, `mensajesAEnviar`, `aEstadoGuardado`, `parsearSecuencia`, `iniciarSimulacion`.
- Produces: `Deps` gana `listSecuencias: (marcaId: string) => Promise<Array<SecuenciaRow>>`.

Sustituye la llamada a `textoAutorespuesta` en las acciones `crear_lead_y_responder` y `responder`, **pero la conserva como respaldo**.

- [ ] **Step 1: Escribir el test que falla**

```ts
it("arranca la secuencia que sirve al anuncio y manda su primer paso", async () => {
  const deps = depsFalsas({
    secuencias: [
      { id: "s1", estado: "activa", anuncios: ["AD1"], pasos: SECUENCIA_MINIMA },
    ],
  });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  expect(deps.salientes[0].texto).toContain("¿Qué te pasa?");
  const conv = [...deps.conversaciones.values()][0];
  expect(conv.secuencia_id).toBe("s1");
  expect(conv.paso_actual).toBe("problemas");
});

it("cae en la autorespuesta en código si ninguna secuencia sirve", async () => {
  // Nunca mudo: si alguien archiva la secuencia, el lead sigue recibiendo algo.
  const deps = depsFalsas({ secuencias: [] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  expect(deps.salientes[0].texto).toContain("Escala");
});

it("una variable sin valor deja el hueco visible y sigue", async () => {
  // El lead de WhatsApp no trae ciudad. El mensaje debe salir igual.
  const deps = depsFalsas({
    secuencias: [{ id: "s1", estado: "activa", anuncios: [], pasos: SECUENCIA_CON_CIUDAD }],
  });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  expect(deps.salientes).toHaveLength(1);
});
```

`SECUENCIA_MINIMA` es una `Secuencia` con un paso `problemas` de texto `"¿Qué te pasa?"` y tres botones que van a tres cierres terminales. `SECUENCIA_CON_CIUDAD` usa `{{ciudad}}` en su texto.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En la fase B, antes de la autorespuesta: cargar secuencias, `elegirSecuencia`, `parsearSecuencia` (si falla, registrar y caer al respaldo), `iniciarSimulacion` con el contexto, mandar `mensajesAEnviar(null, estado)` y guardar `secuenciaId` y `aEstadoGuardado(estado)`.

El contexto se arma con lo que hay: `marca` es el nombre de la marca, `remitente` el nombre fijo del canal, y `negocio`, `contacto` y `ciudad` salen del lead si existe. `renderizarTexto` ya deja el hueco visible cuando falta un valor, así que no hay que comprobar nada.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/procesar.ts src/lib/whatsapp/__tests__/procesar.test.ts
git commit -m "feat(whatsapp): un lead de anuncio arranca su secuencia"
```

---

### Task 8: Avanzar la secuencia con la respuesta del lead

**Files:**
- Modify: `src/lib/whatsapp/procesar.ts`
- Test: `src/lib/whatsapp/__tests__/procesar.test.ts`

**Interfaces:**
- Consumes: `indiceDeBoton`, `desdeEstadoGuardado`, `responderBoton`, `responderTexto`.

- [ ] **Step 1: Escribir el test que falla**

```ts
it("el botón pulsado lleva a su rama", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  await procesarWebhook({ cuerpo: sobrePulsacion("opcion_2", "Vienen 1 vez y ya"), deps });
  expect(deps.salientes[1].texto).toContain("cierre dos");
});

it("un reintento de Meta no avanza la secuencia dos veces", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  const pulsacion = sobrePulsacion("opcion_2", "Vienen 1 vez y ya");
  await procesarWebhook({ cuerpo: pulsacion, deps });
  await procesarWebhook({ cuerpo: pulsacion, deps });
  expect(deps.salientes).toHaveLength(2);
});

it("texto libre con botones delante para la secuencia y avisa", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  await procesarWebhook({ cuerpo: sobreTexto("prefiero que me llaméis"), deps });
  const conv = [...deps.conversaciones.values()][0];
  expect(conv.estado).toBe("humana");
  expect(deps.actividades.some((a) => a.nota.includes("Avisar"))).toBe(true);
});

it("si el paso guardado ya no existe, termina con aviso en vez de romper", async () => {
  // Pasa cuando alguien edita la secuencia con conversaciones en vuelo.
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  deps.secuencias[0].pasos = SECUENCIA_SIN_ESE_PASO;
  await expect(
    procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Huecos en la agenda"), deps }),
  ).resolves.toBeDefined();
  expect([...deps.conversaciones.values()][0].estado).toBe("humana");
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En la acción `guardar_respuesta` (conversación en `bot`): cargar la secuencia por `secuencia_id`, reconstruir el estado con `desdeEstadoGuardado`, llamar a `responderBoton` si `indiceDeBoton` da un índice y a `responderTexto` si no, mandar `mensajesAEnviar` y guardar.

El gate de idempotencia por `wamid` ya existe y va antes: un reintento sale temprano y no llega aquí.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/procesar.ts src/lib/whatsapp/__tests__/procesar.test.ts
git commit -m "feat(whatsapp): la respuesta del lead avanza la secuencia"
```

---

### Task 9: Avisos, fases y fin de conversación

**Files:**
- Modify: `src/lib/whatsapp/procesar.ts`
- Test: `src/lib/whatsapp/__tests__/procesar.test.ts`

**Interfaces:**
- Consumes: `registrarActividad` de `src/lib/ventas/db.ts`, ya presente en `Deps`.

- [ ] **Step 1: Escribir el test que falla**

```ts
it("un aviso del guion registra actividad y pasa la conversación a humana", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  await procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Huecos en la agenda"), deps });
  expect(deps.actividades).toHaveLength(1);
  expect([...deps.conversaciones.values()][0].estado).toBe("humana");
});

it("una ruta que cambia de fase mueve el lead", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  await procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Huecos en la agenda"), deps });
  expect(deps.fases).toContainEqual({ leadId: "lead-1", fase: "interesado" });
});

it("una conversación terminada no vuelve a responder", async () => {
  const deps = depsFalsas({ secuencias: [SECUENCIA_ACTIVA] });
  await procesarWebhook({ cuerpo: sobreDeAnuncio("AD1"), deps });
  await procesarWebhook({ cuerpo: sobrePulsacion("opcion_1", "Huecos en la agenda"), deps });
  const antes = deps.salientes.length;
  await procesarWebhook({ cuerpo: sobreTexto("¿hola?"), deps });
  expect(deps.salientes).toHaveLength(antes);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/whatsapp/__tests__/procesar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Tras aplicar el estado: por cada aviso, `registrarActividad` tipo `nota` con el texto del aviso y `estado: "humana"` en la conversación; si `estado.fase` cambió respecto a la del lead, moverlo; si `terminada`, `paso_actual` a null. Una conversación en `humana` ya no entra por el camino de la secuencia, que es lo que hace que el último test pase.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/procesar.ts src/lib/whatsapp/__tests__/procesar.test.ts
git commit -m "feat(whatsapp): avisos, fases y cierre de la conversación"
```

---

### Task 10: Refundir el arranque de las dos secuencias

**Files:**
- Modify: `src/lib/ventas/secuencias-plantilla.ts`
- Modify: `src/lib/__tests__/ventas-secuencias-plantilla.test.ts`
- Create: `docs/sql/2026-09-24-refundir-secuencias-dinkbit.sql`

**Interfaces:**
- Produces: las dos plantillas empiezan por el saludo con los tres botones de problema.

- [ ] **Step 1: Ajustar los tests de las plantillas**

Los tests actuales exigen una espera de 7 días y un paso de problemas separado del inicio. Al refundir, el inicio ES el paso de problemas y no queda ninguna espera:

```ts
it("empieza preguntando, sin pasos de presentación", () => {
  // El saludo y la pregunta van juntos: cada mensaje antes de cualificar es
  // uno en el que el lead puede abandonar.
  const inicio = secuencia.pasos[secuencia.inicio];
  expect(inicio.botones).toHaveLength(3);
  expect(inicio.texto).toContain("Escala");
});

it("no tiene esperas: todos los cierres terminan", () => {
  const esperas = Object.values(secuencia.pasos).flatMap((p) =>
    [...p.botones.map((b) => b.ruta), ...(p.ruta ? [p.ruta] : [])].map((r) => r.esperar_dias),
  );
  expect(esperas.filter((d) => d !== undefined)).toEqual([]);
});
```

Sustituyen a los que hoy comprueban `esperas === [7]` y `pasoProblemas`.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/lib/__tests__/ventas-secuencias-plantilla.test.ts`
Expected: FAIL.

- [ ] **Step 3: Refundir las plantillas**

El paso `inicio` pasa a llevar el texto que hoy está en `autorespuesta.ts` para ese sector, con los tres botones de problema apuntando a sus tres cierres. Se eliminan `publicidad`, `ahora_no` y `reintento`. Los tres cierres se quedan como están.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/lib/__tests__/ventas-secuencias-plantilla.test.ts`
Expected: PASS.

- [ ] **Step 5: Generar el SQL de actualización**

Mismo procedimiento que se usó para sembrarlas: serializar las constantes y escribir un `update ... set pasos = '<json>'::jsonb` para cada una, filtrando por `marca_id` de `dinkbit` y por nombre. Añadir al fichero un aviso en cabecera de que **pisa lo editado en el panel**, y el `update` que asigna `anuncios = '{120252112386740343}'` a la de psicología.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ventas/secuencias-plantilla.ts src/lib/__tests__/ventas-secuencias-plantilla.test.ts docs/sql/2026-09-24-refundir-secuencias-dinkbit.sql
git commit -m "feat(ventas): las secuencias empiezan por la pregunta"
```

---

## Comprobación manual al desplegar

1. Aplicar `docs/sql/2026-09-24-secuencias-ejecucion.sql`.
2. Aplicar `docs/sql/2026-09-24-refundir-secuencias-dinkbit.sql` **solo si no se han editado las secuencias en el panel**.
3. Activar la secuencia de psicología desde `/panel/ventas/dinkbit/secuencias`.
4. Escribir al número desde un móvil pulsando el anuncio de prueba: debe llegar el saludo con tres botones, y al pulsar uno, el cierre de esa rama.
5. Comprobar en la ficha del lead que quedó registrada la respuesta y el aviso.
