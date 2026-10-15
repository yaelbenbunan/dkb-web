# Unificación del CRM (proyecto 1): leads, fases y agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que todos los leads de dinkbit vivan en `/panel/ventas` (marca `dinkbit`), con fases propias por marca, la agenda convertida en tareas, y todas las entradas de leads de la web escribiendo en ventas.

**Architecture:**
- Las fases dejan de ser globales: `flujoDeMarca(slug)` en `dominio.ts` da las fases, el camino, las columnas y el embudo de cada marca.
- Las funciones que hoy crean y actualizan filas en `imagina_leads` se reimplementan sobre `ventas_leads` en `src/lib/ventas/leads-web.ts`, con la misma firma. `src/lib/imagina-leads.ts` las reexporta, así los 27 llamantes no cambian el import. Las lecturas que solo usa el `/panel` viejo (en consulta) siguen leyendo `imagina_leads`.
- Dos SQL manuales: estructura (columnas y RPC `ventas_crear_lead`) y datos (copia `imagina_leads` → `ventas_leads`).

**Tech Stack:** Next.js App Router, Supabase (PostgREST + RPC plpgsql), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-crm-unificacion-leads-fases-design.md`

## Global Constraints

- Marca destino: `MARCA_DINKBIT_SLUG = "dinkbit"` (ya existe en `dominio.ts`).
- Fases de dinkbit: `nuevo, contactado, volver_a_llamar, interesado, propuesta, cliente` + descartes `perdido, no_interesa, ilocalizable, fuera_de_perfil`. Etiqueta de `propuesta`: «Propuesta enviada». El resto de marcas: igual que hoy (con `muestras`, sin `propuesta`).
- Etiqueta Kit Digital: `kit-digital`.
- Responsables: `Yael → yael.benbunan@dinkbit.com`, `Paula G → paula.garcia@dinkbit.com`, `Paula L → paula.lopez@dinkbit.com`, `Alicia → alicia.ruiz@dinkbit.com`.
- Columnas nuevas de `ventas_leads`: `id_externo text`, `ids_externos text[] default '{}'`, `canal text`, `campana text`, `etiquetas text[] default '{}'`, `consentimiento boolean`, `email_estado text`, `email_mensaje_id text`, `email_actualizado_at timestamptz`, `archivado boolean default false`, `extra jsonb default '{}'`. `origen` admite `web`.
- Las migraciones las ejecuta Yael a mano. **El código tiene que funcionar sin ellas**: lecturas con `tolerarMigracionPendiente`; un alta de formulario que falla por columna o RPC inexistente reintenta por el camino antiguo (`imagina_leads`) y lo registra en el log, para no perder leads entre el despliegue y el SQL. (Ruling sobre la spec, que decía «sin respaldo»: perder leads es peor que duplicar la fuente durante unas horas; la migración de datos los recoge igual.)
- Comentarios y textos de interfaz en español de España. Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests: `npx vitest run <ruta>`; suite `npx vitest run`; `npx tsc --noEmit -p .`; `npx eslint <rutas>`; `npx next build`.
- **No escribir en la base de producción durante el desarrollo** (el `.env.local` apunta a producción). La revisión visual se hace con lecturas y sin enviar formularios.

## Review Focus

1. Un lead que llega dos veces con el mismo email por dos formularios distintos (Kit Digital y web-299) no se duplica y conserva canal/campaña del primero — test en Task 4.
2. Una baja (`/api/unsubscribe?id=<id viejo de imagina>`) de un correo enviado antes de la migración da de baja al lead migrado — test en Task 5.
3. Un lead migrado con fase `kit-digital` sin email ni teléfono sigue entrando (negocio = «(sin nombre) <id>») — test en Task 8 (función pura de correspondencia).
4. El tablero de Hydrup sigue igual (con «Muestras enviadas») después del cambio a fases por marca — test en Task 2.
5. Un formulario de la web desplegado antes del SQL de estructura no pierde el lead — test en Task 4.

---

### Task 1: Fases por marca y tablas de correspondencia (dominio)

**Files:**
- Modify: `src/lib/ventas/dominio.ts`
- Test: `src/lib/__tests__/ventas-dominio-flujos.test.ts`

**Interfaces — Produces:**
- `FASES` incluye `"propuesta"` (después de `"muestras"`); `FASE_LABELS.propuesta = "Propuesta enviada"`; `FASE_COLORES.propuesta = { bg: "#e0e7ff", text: "#3730a3" }`.
- `interface FlujoMarca { fases: readonly Fase[]; activas: readonly Fase[]; camino: readonly Fase[]; pasoAvanzado: "muestras" | "propuesta"; conMuestras: boolean }`
- `flujoDeMarca(slug: string): FlujoMarca`
- `FASES_ACTIVAS` sigue existiendo y pasa a ser la unión de todas las activas (`nuevo, contactado, volver_a_llamar, interesado, muestras, propuesta`), para las consultas que no saben de marca (`listSeguimientosUsuaria`).
- `ETIQUETA_KIT_DIGITAL = "kit-digital"`
- `ESTADO_PANEL_A_FASE: Record<string, Fase>` y `faseDesdeEstadoPanel(estado: string | null): Fase`
- `RESPONSABLES_PANEL: Record<string, string>` (texto de `/panel` → email) y `emailDeResponsablePanel(texto: string | null): string | null` (sin mayúsculas ni espacios sobrantes).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/ventas-dominio-flujos.test.ts
import { describe, expect, test } from "vitest";
import {
  emailDeResponsablePanel,
  esFaseActiva,
  faseDesdeEstadoPanel,
  FASE_LABELS,
  flujoDeMarca,
} from "../ventas/dominio";

describe("flujoDeMarca", () => {
  test("dinkbit: propuesta en vez de muestras", () => {
    const f = flujoDeMarca("dinkbit");
    expect(f.camino).toEqual(["nuevo", "contactado", "interesado", "propuesta", "cliente"]);
    expect(f.fases).toContain("propuesta");
    expect(f.fases).not.toContain("muestras");
    expect(f.conMuestras).toBe(false);
    expect(f.pasoAvanzado).toBe("propuesta");
  });

  test("cualquier otra marca: como hasta ahora, con muestras", () => {
    for (const slug of ["hydrup", "proveedores-deportivos", "otra"]) {
      const f = flujoDeMarca(slug);
      expect(f.camino).toEqual(["nuevo", "contactado", "interesado", "muestras", "cliente"]);
      expect(f.fases).not.toContain("propuesta");
      expect(f.conMuestras).toBe(true);
    }
  });

  test("propuesta cuenta como fase activa y tiene etiqueta", () => {
    expect(esFaseActiva("propuesta")).toBe(true);
    expect(FASE_LABELS.propuesta).toBe("Propuesta enviada");
  });
});

describe("correspondencias del /panel viejo", () => {
  test("estado → fase", () => {
    expect(faseDesdeEstadoPanel("seguimiento")).toBe("volver_a_llamar");
    expect(faseDesdeEstadoPanel("kit-digital")).toBe("interesado");
    expect(faseDesdeEstadoPanel("cliente-kit-digital")).toBe("cliente");
    expect(faseDesdeEstadoPanel("ganado")).toBe("cliente");
    expect(faseDesdeEstadoPanel("propuesta")).toBe("propuesta");
    expect(faseDesdeEstadoPanel("raro")).toBe("nuevo");
    expect(faseDesdeEstadoPanel(null)).toBe("nuevo");
  });

  test("responsable → email, sin mayúsculas ni espacios", () => {
    expect(emailDeResponsablePanel(" paula g ")).toBe("paula.garcia@dinkbit.com");
    expect(emailDeResponsablePanel("Yael")).toBe("yael.benbunan@dinkbit.com");
    expect(emailDeResponsablePanel("Alicia")).toBe("alicia.ruiz@dinkbit.com");
    expect(emailDeResponsablePanel("Paula L")).toBe("paula.lopez@dinkbit.com");
    expect(emailDeResponsablePanel("Otra")).toBeNull();
    expect(emailDeResponsablePanel(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/ventas-dominio-flujos.test.ts` → FAIL (exports inexistentes).

- [ ] **Step 3: Implement in `dominio.ts`**

Añadir `"propuesta"` a `FASES` (tras `"muestras"`), su etiqueta y color; añadirla a `FASES_ACTIVAS`. Después de `esFase`:

```ts
/* Fases por marca ---------------------------------------------------------- */

export interface FlujoMarca {
  /** Fases que existen en la marca (las que se ofrecen en desplegables y filtros). */
  fases: readonly Fase[];
  /** Fases en las que se trabaja el lead (llevan seguimiento). */
  activas: readonly Fase[];
  /** Camino principal: el botón «→» y el menú «Mover a…». */
  camino: readonly Fase[];
  /** El paso entre «Interesado» y «Cliente». */
  pasoAvanzado: "muestras" | "propuesta";
  /** Si la marca envía muestras (tarea automática, botón y resultado «Pide muestras»). */
  conMuestras: boolean;
}

/**
 * dinkbit vende servicios: entre «Interesado» y «Cliente» hay una propuesta, no
 * unas muestras. Las marcas de producto (Hydrup, proveedores deportivos) sí
 * envían muestras. Vive en código, como `TIPOS_POR_MARCA`: con tres marcas no
 * compensa una tabla.
 */
export function flujoDeMarca(slug: string): FlujoMarca {
  const paso = slug === MARCA_DINKBIT_SLUG ? "propuesta" : "muestras";
  const camino: Fase[] = ["nuevo", "contactado", "interesado", paso, "cliente"];
  const activas: Fase[] = ["nuevo", "contactado", "volver_a_llamar", "interesado", paso];
  return {
    fases: [...activas, "cliente", ...FASES_DESCARTE],
    activas,
    camino,
    pasoAvanzado: paso,
    conMuestras: paso === "muestras",
  };
}

/* Correspondencias del /panel viejo (migración y altas de la web) ---------- */

export const ETIQUETA_KIT_DIGITAL = "kit-digital";

/** Estado de `imagina_leads.status` → fase de ventas. Copiada en
 *  docs/sql/2026-10-15-crm-unificacion-datos.sql: si cambia aquí, cambia allí. */
export const ESTADO_PANEL_A_FASE: Record<string, Fase> = {
  nuevo: "nuevo",
  contactado: "contactado",
  seguimiento: "volver_a_llamar",
  "kit-digital": "interesado",
  propuesta: "propuesta",
  ganado: "cliente",
  "cliente-kit-digital": "cliente",
  perdido: "perdido",
  ilocalizable: "ilocalizable",
};

export function faseDesdeEstadoPanel(estado: string | null | undefined): Fase {
  return (estado && ESTADO_PANEL_A_FASE[estado]) || "nuevo";
}

/** `imagina_leads.account_manager` → email de su usuario en ventas. Copiada en el SQL de datos. */
export const RESPONSABLES_PANEL: Record<string, string> = {
  yael: "yael.benbunan@dinkbit.com",
  "paula g": "paula.garcia@dinkbit.com",
  "paula l": "paula.lopez@dinkbit.com",
  alicia: "alicia.ruiz@dinkbit.com",
};

export function emailDeResponsablePanel(texto: string | null | undefined): string | null {
  const clave = (texto ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return RESPONSABLES_PANEL[clave] ?? null;
}
```

`MARCA_DINKBIT_SLUG` está más abajo en el fichero: mover su declaración encima de `flujoDeMarca` (es una `const`; usarla antes de declararla en el módulo daría error en tiempo de carga).

Actualizar el comentario de cabecera: `propuesta` también va en el CHECK de la base (Task 3).

- [ ] **Step 4: Run** el test → PASS; `npx vitest run src/lib/__tests__ | tail` → los tests que enumeran `FASES` (p. ej. de métricas o validación) pueden fallar por la fase nueva: arreglarlos añadiendo `propuesta` donde un `Record<Fase, …>` lo exija (TypeScript los señala: `npx tsc --noEmit -p .`). `RANGO` en `metricas.ts` gana `propuesta: 3`.

- [ ] **Step 5: Commit** `feat(ventas): fases por marca (propuesta en dinkbit) y correspondencias del panel viejo`

---

### Task 2: Tablero, embudo, tareas y ficha según la marca

**Files:**
- Modify: `src/lib/ventas/tablero.ts`, `src/lib/ventas/metricas.ts`, `src/lib/ventas/tareas.ts`
- Modify: `src/app/(site)/panel/ventas/(app)/[slug]/tablero/Tablero.tsx`, `.../tablero/page.tsx`, `src/app/(site)/panel/ventas/_componentes/EmbudoVista.tsx`, `.../[slug]/page.tsx`, `.../(app)/page.tsx`, `.../[slug]/tareas/page.tsx`, `.../[slug]/leads/page.tsx`, `.../[slug]/leads/[id]/AccionesLead.tsx` (y su `page.tsx`), `src/app/(site)/panel/ventas/acciones-leads.ts`
- Test: `src/lib/__tests__/ventas-tablero.test.ts`, `ventas-metricas.test.ts`, `ventas-tareas.test.ts` (añadir casos)

**Interfaces:**
- Consumes: `flujoDeMarca` (Task 1).
- Produces (firmas nuevas; las viejas desaparecen):
  - `columnasTablero(slug: string): ColumnaTablero[]` — como `COLUMNAS_TABLERO` pero con la columna del paso avanzado de la marca (`muestras` o `propuesta`, título = `FASE_LABELS[paso]`), y una columna `otros` («Otros», `destino: null`) con las fases que no son de la marca. `ColumnaId` pasa a `string`.
  - `columnaDeFase(fase: Fase, slug: string): string | null`
  - `siguienteFase(fase: Fase, slug: string): Fase | null`
  - `fasesDestino(actual: Fase, slug: string): Fase[]`
  - `agruparEnColumnas<T extends { fase: Fase }>(leads: T[], slug: string): Record<string, T[]>`
  - `etapasEmbudo(slug: string): readonly ["contactado", "interesado", "muestras" | "propuesta", "cliente"]`
  - `calcularEmbudo(leads, cambios, slug: string): Embudo` con `alcanzaron: Record<string, number>`
  - `tareasAutomaticas(leads, pidenMuestras, slug: string)` — sin tarea `enviar_muestras` si `!flujoDeMarca(slug).conMuestras`.
  - `resumenMes(...)` sin cambios de firma; la tarjeta «Muestras» del resumen se oculta en la página cuando `!conMuestras` y se muestra «Propuestas» (`cambio_fase` a `propuesta` del mes) — añadir el campo `propuestas: number` a `ResumenMes`.

- [ ] **Step 1: Write the failing tests** (añadir a los ficheros de test existentes; si alguno no existe con ese nombre, buscar con `ls src/lib/__tests__ | grep ventas` y añadir al correspondiente)

```ts
// en ventas-tablero.test.ts
import { agruparEnColumnas, columnasTablero, fasesDestino, siguienteFase } from "../ventas/tablero";

describe("tablero por marca", () => {
  test("Hydrup sigue igual: con Muestras enviadas y sin Propuesta", () => {
    const ids = columnasTablero("hydrup").map((c) => c.id);
    expect(ids).toEqual(["nuevo", "contactado", "volver_a_llamar", "interesado", "muestras", "cliente", "descartados"]);
    expect(siguienteFase("interesado", "hydrup")).toBe("muestras");
  });

  test("dinkbit: Propuesta enviada en lugar de Muestras", () => {
    const cols = columnasTablero("dinkbit");
    expect(cols.map((c) => c.id)).toEqual(["nuevo", "contactado", "volver_a_llamar", "interesado", "propuesta", "cliente", "descartados"]);
    expect(cols.find((c) => c.id === "propuesta")?.titulo).toBe("Propuesta enviada");
    expect(siguienteFase("interesado", "dinkbit")).toBe("propuesta");
    expect(fasesDestino("nuevo", "dinkbit")).not.toContain("muestras");
  });

  test("un lead con una fase que no es de su marca cae en «Otros», no desaparece", () => {
    const g = agruparEnColumnas([{ fase: "muestras" as const }], "dinkbit");
    expect(g.otros).toHaveLength(1);
    expect(columnasTablero("dinkbit").some((c) => c.id === "otros")).toBe(false); // «Otros» solo se pinta si tiene algo: lo decide la vista
  });
});
```

```ts
// en ventas-metricas.test.ts
import { calcularEmbudo, etapasEmbudo } from "../ventas/metricas";

test("embudo de dinkbit con propuesta", () => {
  expect(etapasEmbudo("dinkbit")).toEqual(["contactado", "interesado", "propuesta", "cliente"]);
  const e = calcularEmbudo([{ id: "a", fase: "propuesta" }, { id: "b", fase: "cliente" }], [], "dinkbit");
  expect(e.alcanzaron.propuesta).toBe(2);
  expect(e.alcanzaron.cliente).toBe(1);
});
```

```ts
// en ventas-tareas.test.ts
test("dinkbit no genera «Enviar muestras»", () => {
  const lead = { id: "l1", negocio: "Clínica", fase: "interesado" as const, asignada_a: null, proximo_seguimiento: null, proximo_seguimiento_hora: null };
  expect(tareasAutomaticas([lead], new Set(["l1"]), "dinkbit")).toEqual([]);
  expect(tareasAutomaticas([lead], new Set(["l1"]), "hydrup").map((t) => t.tipo)).toEqual(["enviar_muestras"]);
});
```

(El objeto `lead` debe llevar los campos que exija `LeadDeTarea` en `tareas.ts`; ajustar al tipo real.)

- [ ] **Step 2: Run** los tres ficheros → FAIL.

- [ ] **Step 3: Implement** en `tablero.ts`:

```ts
const BASE: readonly { id: string; fase: Fase }[] = [
  { id: "nuevo", fase: "nuevo" },
  { id: "contactado", fase: "contactado" },
  { id: "volver_a_llamar", fase: "volver_a_llamar" },
  { id: "interesado", fase: "interesado" },
];

export function columnasTablero(slug: string): ColumnaTablero[] {
  const flujo = flujoDeMarca(slug);
  const paso = flujo.pasoAvanzado;
  return [
    ...BASE.map((c) => ({ id: c.id, titulo: FASE_LABELS[c.fase], fases: [c.fase], destino: c.fase })),
    { id: paso, titulo: FASE_LABELS[paso], fases: [paso], destino: paso },
    { id: "cliente", titulo: "Cliente", fases: ["cliente"], destino: "cliente" },
    { id: "descartados", titulo: "Descartados", fases: ["perdido", "no_interesa", "ilocalizable"], destino: null },
  ];
}

/** Columna de reserva para fases que no son de la marca (datos antiguos): mejor verlos que perderlos. */
export const COLUMNA_OTROS: ColumnaTablero = { id: "otros", titulo: "Otros", fases: [], destino: null };

export function columnaDeFase(fase: Fase, slug: string): string | null {
  if (fase === "fuera_de_perfil") return null;
  return columnasTablero(slug).find((c) => c.fases.includes(fase))?.id ?? COLUMNA_OTROS.id;
}

export function siguienteFase(fase: Fase, slug: string): Fase | null {
  const camino = flujoDeMarca(slug).camino;
  const i = camino.indexOf(fase);
  return i >= 0 && i < camino.length - 1 ? camino[i + 1] : null;
}

export function fasesDestino(actual: Fase, slug: string): Fase[] {
  return flujoDeMarca(slug).camino.filter((f) => f !== actual);
}

export function agruparEnColumnas<T extends { fase: Fase }>(leads: T[], slug: string): Record<string, T[]> {
  const grupos: Record<string, T[]> = Object.fromEntries([...columnasTablero(slug), COLUMNA_OTROS].map((c) => [c.id, [] as T[]]));
  for (const lead of leads) {
    const id = columnaDeFase(lead.fase, slug);
    if (id) grupos[id].push(lead);
  }
  return grupos;
}
```

Borrar `COLUMNAS_TABLERO`, `CAMINO` y `FASES_MOVIBLES`. **`src/lib/panel-tablero.ts` y `src/app/(site)/panel/tablero/Tablero.tsx` (el tablero del `/panel` viejo) importan `COLUMNAS_TABLERO`/`agruparEnColumnas` de su propio módulo `panel-tablero.ts`**: comprobar con `grep -n "ventas/tablero" src/lib/panel-tablero.ts`; si importan de `ventas/tablero`, pasarles `"dinkbit"`.

`metricas.ts`: `RANGO.propuesta = 3`; `etapasEmbudo(slug)` = `["contactado", "interesado", flujoDeMarca(slug).pasoAvanzado, "cliente"] as const`; `calcularEmbudo(leads, cambios, slug)` usa `etapasEmbudo(slug)` y `RANGO_ETAPA = { contactado: 1, interesado: 2, muestras: 3, propuesta: 3, cliente: 4 }`; `alcanzaron` se construye con `Object.fromEntries(etapas.map(e => [e, 0]))`. `ResumenMes` gana `propuestas` (cambios de fase a `propuesta` del mes).

`tareas.ts`: `tareasAutomaticas(leads, pidenMuestras, slug)` añade la de muestras solo si `flujoDeMarca(slug).conMuestras`.

Llamantes (pasar `marca.slug`, que todas esas páginas ya tienen de `requireAccesoMarca`):
- `Tablero.tsx`: recibe `slug` por props y lo pasa a `columnasTablero`, `columnaDeFase`, `siguienteFase`, `fasesDestino`, `agruparEnColumnas`; pinta la columna `otros` solo si tiene tarjetas.
- `EmbudoVista.tsx`: recibe `slug`, usa `etapasEmbudo(slug)` y `FASE_LABELS` para los títulos.
- `[slug]/page.tsx` y `(app)/page.tsx` (panel general, una tarjeta por marca): pasan el slug de cada marca a `calcularEmbudo`; la tarjeta «Muestras» del resumen se sustituye por «Propuestas» cuando `!flujoDeMarca(slug).conMuestras`.
- `tareas/page.tsx`: pasa el slug a `tareasAutomaticas`.
- `leads/page.tsx`: el filtro de fase ofrece `flujoDeMarca(slug).fases` en vez de `FASES`.
- Ficha (`leads/[id]/page.tsx` + `AccionesLead.tsx`): recibe `conMuestras` y `fases`; sin muestras no pinta el botón «Marcar muestras enviadas» ni el resultado de llamada «Pide muestras»; el desplegable de cambio de fase ofrece `fases`.
- `acciones-leads.ts`: la acción de muestras responde «Esta marca no trabaja con muestras.» si `!conMuestras`; la de cambiar fase rechaza fases que no estén en `flujoDeMarca(slug).fases`.

- [ ] **Step 4: Run** `npx vitest run src/lib/__tests__ src/app && npx tsc --noEmit -p .` → PASS y sin errores de tipos.

- [ ] **Step 5: Commit** `feat(ventas): tablero, embudo, tareas y ficha con las fases de cada marca`

---

### Task 3: SQL de estructura, tipos de `Lead` y lecturas tolerantes

**Files:**
- Create: `docs/sql/2026-10-15-crm-unificacion-estructura.sql`
- Modify: `src/lib/ventas/db.ts` (tipo `Lead`, `listLeads` con filtros y `archivado`, nueva `crearLeadWeb`, `buscarLeadWeb`, `actualizarLeadWeb`)
- Modify: `src/lib/ventas/dominio.ts` (`ORIGENES` gana `"web"`, etiqueta «Web»)
- Test: `src/lib/__tests__/ventas-db.test.ts` (añadir)

**Interfaces — Produces:**
- `Lead` gana: `id_externo`, `ids_externos: string[]`, `canal`, `campana`, `etiquetas: string[]`, `consentimiento: boolean | null`, `email_estado`, `email_mensaje_id`, `email_actualizado_at`, `archivado: boolean`, `extra: Record<string, unknown>` — todos opcionales en el tipo (`?`) porque sin migración no vienen.
- `crearLeadWeb(marcaId: string, lead: LeadWebNuevo): Promise<{ ok: true; id: string } | { ok: false; error: string; faltaMigracion?: boolean }>` — llama a la RPC `ventas_crear_lead`.
- `interface LeadWebNuevo { negocio: string; contacto?: string | null; telefono?: string | null; email?: string | null; web?: string | null; tipo_negocio?: string | null; origen: "web" | "manual" | "lista"; origen_detalle?: string | null; fase?: Fase; asignada_a?: string | null; proximo_seguimiento?: string | null; id_externo?: string | null; canal?: string | null; campana?: string | null; etiquetas?: string[]; consentimiento?: boolean | null; extra?: Record<string, unknown>; created_at?: string | null }`
- `buscarLeadWeb(marcaId: string, c: { id?: string | null; email?: string | null; telefono?: string | null }): Promise<Lead | null>` — por `id` (uuid), `id_externo`, `ids_externos` (contiene), `email_norm` o `telefono_norm`, en ese orden.
- `actualizarLeadWeb(id: string, cambios: Partial<Pick<Lead, "contacto" | "telefono" | "email" | "web" | "canal" | "campana" | "etiquetas" | "consentimiento" | "email_estado" | "email_mensaje_id" | "email_actualizado_at" | "archivado" | "extra" | "id_externo" | "ids_externos" | "negocio">>): Promise<Escritura>`
- `listLeads(marcaId, filtro: { fase?; asignadaA?; canal?; campana?; etiqueta?; archivados?: boolean })` — por defecto excluye `archivado = true` (con tolerancia: sin la columna, sin ese filtro).

- [ ] **Step 1: Write the SQL** (idempotente):

```sql
-- Unificación del CRM, proyecto 1: estructura. Los leads de /panel (imagina_leads)
-- pasan a ventas (marca dinkbit). Ejecutar una vez en el SQL Editor de Supabase
-- (proyecto wnboyesnlrbtwfmhcxmc) ANTES de desplegar el código. Idempotente.

alter table public.ventas_leads drop constraint if exists ventas_leads_fase_check;
alter table public.ventas_leads add constraint ventas_leads_fase_check check (fase in (
  'nuevo', 'contactado', 'volver_a_llamar', 'interesado', 'muestras', 'propuesta', 'cliente',
  'perdido', 'no_interesa', 'ilocalizable', 'fuera_de_perfil'
));

alter table public.ventas_leads drop constraint if exists ventas_leads_origen_check;
alter table public.ventas_leads add constraint ventas_leads_origen_check
  check (origen in ('lista', 'anuncio', 'manual', 'web'));

alter table public.ventas_leads
  add column if not exists id_externo text,
  add column if not exists ids_externos text[] not null default '{}',
  add column if not exists canal text,
  add column if not exists campana text,
  add column if not exists etiquetas text[] not null default '{}',
  add column if not exists consentimiento boolean,
  add column if not exists email_estado text,
  add column if not exists email_mensaje_id text,
  add column if not exists email_actualizado_at timestamptz,
  add column if not exists archivado boolean not null default false,
  add column if not exists extra jsonb not null default '{}';

create unique index if not exists ventas_leads_id_externo_uq
  on public.ventas_leads (marca_id, id_externo) where id_externo is not null;
create index if not exists ventas_leads_ids_externos_idx on public.ventas_leads using gin (ids_externos);
create index if not exists ventas_leads_email_mensaje_idx on public.ventas_leads (email_mensaje_id) where email_mensaje_id is not null;

-- Alta de un lead con todos los campos; devuelve su id (null si choca con otro
-- por email, teléfono o id_externo: el código lo busca y lo completa).
create or replace function public.ventas_crear_lead(p_marca_id uuid, p_lead jsonb)
returns uuid language plpgsql as $$
declare
  v_prefijo text;
  v_codigo text;
  v_id uuid;
begin
  select upper(left(replace(slug, '-', ''), 3)) into v_prefijo from public.ventas_marcas where id = p_marca_id;
  if v_prefijo is null then raise exception 'marca_no_existe'; end if;
  loop
    v_codigo := v_prefijo || '-' || public.ventas_codigo_aleatorio();
    exit when not exists (select 1 from public.ventas_leads where marca_id = p_marca_id and codigo_cliente = v_codigo);
  end loop;
  insert into public.ventas_leads (
    marca_id, negocio, tipo_negocio, contacto, telefono, email, web, origen, origen_detalle, fase,
    asignada_a, proximo_seguimiento, codigo_cliente, id_externo, canal, campana, etiquetas,
    consentimiento, extra, created_at
  ) values (
    p_marca_id,
    p_lead->>'negocio',
    nullif(p_lead->>'tipo_negocio', ''),
    nullif(p_lead->>'contacto', ''),
    nullif(p_lead->>'telefono', ''),
    nullif(p_lead->>'email', ''),
    nullif(p_lead->>'web', ''),
    p_lead->>'origen',
    nullif(p_lead->>'origen_detalle', ''),
    coalesce(nullif(p_lead->>'fase', ''), 'nuevo'),
    nullif(p_lead->>'asignada_a', '')::uuid,
    nullif(p_lead->>'proximo_seguimiento', '')::date,
    v_codigo,
    nullif(p_lead->>'id_externo', ''),
    nullif(p_lead->>'canal', ''),
    nullif(p_lead->>'campana', ''),
    coalesce(array(select jsonb_array_elements_text(p_lead->'etiquetas')), '{}'),
    (p_lead->>'consentimiento')::boolean,
    coalesce(p_lead->'extra', '{}'::jsonb),
    coalesce(nullif(p_lead->>'created_at', '')::timestamptz, now())
  )
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, datos)
    values (v_id, p_marca_id, null, 'alta', jsonb_build_object('origen', p_lead->>'origen', 'canal', p_lead->>'canal'));
  end if;
  return v_id;
end $$;
revoke all on function public.ventas_crear_lead(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ventas_crear_lead(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

-- Comprobación (debe devolver 8):
-- select count(*) from information_schema.columns where table_name = 'ventas_leads'
--   and column_name in ('id_externo','canal','campana','etiquetas','consentimiento','email_estado','archivado','extra');
```

Antes de dar por bueno el SQL: abrir `docs/sql/2026-09-17-ventas-fase1.sql` y comprobar (a) el nombre real del CHECK de `origen` (si no es `ventas_leads_origen_check`, usar el real; si es anónimo, buscarlo con un `do $$ … $$` sobre `pg_constraint` como hace el SQL de fases del 2026-09-24), (b) que `ventas_actividad` admite `tipo = 'alta'` y qué columnas pide su insert en `ventas_crear_leads`, y copiar ese insert tal cual.

- [ ] **Step 2: Write the failing tests** (en `ventas-db.test.ts`, con el mock de `getSupabaseAdmin` que ya tiene el fichero)

```ts
describe("crearLeadWeb", () => {
  test("llama a ventas_crear_lead con el lead entero y devuelve el id", async () => {
    rpcMock.mockReset().mockResolvedValue({ data: "uuid-1", error: null });
    const r = await crearLeadWeb("m1", { negocio: "Clínica Sol", email: "a@b.es", origen: "web", canal: "Meta", etiquetas: ["kit-digital"] });
    expect(r).toEqual({ ok: true, id: "uuid-1" });
    expect(rpcMock).toHaveBeenCalledWith("ventas_crear_lead", { p_marca_id: "m1", p_lead: expect.objectContaining({ negocio: "Clínica Sol", canal: "Meta", etiquetas: ["kit-digital"] }) });
  });

  test("sin la RPC (migración pendiente) lo dice", async () => {
    rpcMock.mockReset().mockResolvedValue({ data: null, error: { message: "not found", code: "PGRST202" } });
    expect(await crearLeadWeb("m1", { negocio: "X", origen: "web" })).toEqual({ ok: false, error: expect.any(String), faltaMigracion: true });
  });

  test("choque con un lead existente: ok false sin faltaMigracion", async () => {
    rpcMock.mockReset().mockResolvedValue({ data: null, error: null });
    expect(await crearLeadWeb("m1", { negocio: "X", origen: "web" })).toEqual({ ok: false, error: "duplicado" });
  });
});
```

- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** `crearLeadWeb`, `buscarLeadWeb`, `actualizarLeadWeb`, filtros de `listLeads` (con `tolerarMigracionPendiente` para `archivado`/`canal`/…). `buscarLeadWeb` hace una consulta por criterio en el orden dicho (`.eq("id", x)` solo si `x` parece uuid — regex `/^[0-9a-f-]{36}$/i`; `.eq("id_externo", x)`; `.contains("ids_externos", [x])`; `.eq("email_norm", normEmail)`; `.eq("telefono_norm", normalizarTelefono(t))`), parando en el primero que encuentre; los criterios que tocan columnas nuevas, envueltos en `tolerarMigracionPendiente` (sin migración → `null` para ese criterio). Normalización de email: `trim().toLowerCase()` (comprobar que coincide con `ventas_norm_email` en el SQL de fase 1; si esa función hace más, replicarlo). **Run** → PASS.

- [ ] **Step 5: Commit** `feat(ventas): columnas de los leads de la web, alta con todos los campos y filtros`

---

### Task 4: `leads-web.ts`: las altas de la web escriben en ventas

**Files:**
- Create: `src/lib/ventas/leads-web.ts`
- Modify: `src/lib/imagina-leads.ts` (las funciones de escritura pasan a ser reexportaciones; se conservan con su código original renombradas `…Legacy` para el respaldo)
- Test: `src/lib/__tests__/ventas-leads-web.test.ts`

**Interfaces:**
- Consumes: `crearLeadWeb`, `buscarLeadWeb`, `actualizarLeadWeb`, `registrarActividad`, `getMarcaPorSlug` (`db.ts`); `faseDesdeEstadoPanel`, `ETIQUETA_KIT_DIGITAL`, `MARCA_DINKBIT_SLUG` (`dominio.ts`).
- Produces, con **las mismas firmas** que hoy tienen en `imagina-leads.ts` (copiar los tipos `WebhookLeadInput`, `SaveLeadInput`, `ManualLeadInput`, `BulkLeadInput`, `LeadRow` — que se quedan definidos en `imagina-leads.ts` y `leads-web.ts` los importa como tipo):
  `createWebhookLead`, `saveLead`, `upsertKitDigital2026Lead`, `createManualLead`, `createLeadsBulk`, `savePromoQuestionnaire`, `updateLeadReview`, `getLeadNotes`, `updateLeadField` (solo `"notes"` escribe — como nota en el historial —; el resto de campos se rechaza con `false` y un log, porque solo lo usa el panel viejo), `setLeadEmailSent`, `setLeadEmailStatusByMessageId`, `setLeadConsent`, `setCampaignRecipientStatusByMessageId`, `listEmailableLeads`, `getLeadPdfPath`.
- `aLeadRow(l: Lead): LeadRow` — adapta un lead de ventas a la forma `LeadRow` que esperan Campañas (`status` = fase, `channel` = canal, `campaign` = campana, `consent` = consentimiento, `email_status` = email_estado, `name` = contacto ?? negocio, `business_name` = negocio, `pdf_path` = extra.pdf_path, etc.).

Reglas de `guardar` (función interna común a todas las altas):
1. Marca: `getMarcaPorSlug("dinkbit")` (cacheada en el módulo).
2. `negocio` = businessName ?? name ?? email ?? `(sin nombre) <id_externo>`.
3. `buscarLeadWeb(marca.id, { id: input.id, email, telefono })`.
4. Si existe: completa vacíos (`contacto`, `telefono`, `email`, `web`, `canal`, `campana`), une `etiquetas`, pone `consentimiento = true` si llega `true` (nunca lo baja), guarda el `id_externo` nuevo en `id_externo` si estaba vacío o en `ids_externos` si no, mezcla `extra`; apunta «Ha vuelto a llegar desde la web (<canal> · <campaña>).» + notas en el historial. Devuelve `{ ok: true, id: existente.id }`.
5. Si no existe: `crearLeadWeb` con `origen: "web"`, `origen_detalle: campaign`, `fase: faseDesdeEstadoPanel(status)`, `etiquetas: status kit-digital/cliente-kit-digital → ["kit-digital"]`, `extra` (sector, business_type, style, palette, value_prop, pdf_path, template). Notas → `registrarActividad({ tipo: "nota" })`. Devuelve `{ ok: true, id }`.
6. Si `crearLeadWeb` devuelve `duplicado` (carrera): repetir desde 3 una vez.
7. Si devuelve `faltaMigracion`, o Supabase lanza: **respaldo** → la función legacy de `imagina-leads.ts` (`createWebhookLeadLegacy(input)`), con `console.error("[leads-web] respaldo en imagina_leads: …")`.

`id` devuelto: el uuid de ventas. Todas las funciones que reciben `leadId` resuelven con `buscarLeadWeb(marca.id, { id: leadId })` (uuid, `id_externo` o `ids_externos`), así los ids viejos de correos ya enviados siguen valiendo. Si no lo encuentran en ventas, prueban la versión legacy sobre `imagina_leads` (entre el despliegue y el SQL de datos los leads viejos solo están allí).

`listEmailableLeads(filter)`: leads de dinkbit con `consentimiento = true`, email no nulo, `email_estado` nulo o no en (`bounced`,`complained`), `archivado = false`; filtros `status` → `fase`, `campaign` → `campana`, `channel` → `canal`; devuelve `aLeadRow(...)`. Sin migración: la legacy.

`setCampaignRecipientStatusByMessageId`: igual que hoy en `campaign_recipients`; la propagación de rebote/queja al lead resuelve `row.lead_id` con `buscarLeadWeb` (uuid nuevo o id viejo) y actualiza `email_estado` (+ `consentimiento = false` si queja); si no lo encuentra en ventas, legacy.

`setLeadEmailStatusByMessageId`: `update ventas_leads set email_estado… where email_mensaje_id = id`; si actualiza 0 filas, legacy (correos enviados antes de la migración).

- [ ] **Step 1: Write the failing test** (`ventas-leads-web.test.ts`) — mockear `../ventas/db` (con `vi.hoisted`, como `ventas-recordatorio-diario-envio.test.ts`) y `../imagina-leads-legacy`… → **ruling de estructura:** para poder mockear el respaldo, mover las implementaciones originales de escritura a `src/lib/imagina-leads-legacy.ts` (mismo código, nombres originales) y que `imagina-leads.ts` reexporte de `ventas/leads-web.ts`. Casos:

```ts
test("alta nueva: crea en dinkbit con origen web, canal, campaña, fase y etiqueta", async () => {
  m.buscarLeadWeb.mockResolvedValue(null);
  m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v1" });
  const r = await createWebhookLead({ name: "Ana", email: "ana@x.es", phone: "600111222", channel: "Meta", campaign: "kd", status: "kit-digital", consent: true, notes: "Hola" });
  expect(r).toEqual({ ok: true, id: "v1" });
  expect(m.crearLeadWeb).toHaveBeenCalledWith("m-dink", expect.objectContaining({ negocio: "Ana", contacto: "Ana", origen: "web", canal: "Meta", campana: "kd", fase: "interesado", etiquetas: ["kit-digital"], consentimiento: true }));
  expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "v1", tipo: "nota", nota: "Hola" }));
});

test("repetido por email desde otro formulario: no duplica, completa vacíos y conserva canal y campaña", async () => {
  m.buscarLeadWeb.mockResolvedValue({ id: "v1", contacto: "Ana", telefono: null, email: "ana@x.es", canal: "Meta", campana: "kd", etiquetas: ["kit-digital"], id_externo: null, ids_externos: [], extra: {}, consentimiento: null });
  const r = await createWebhookLead({ email: "ANA@x.es", phone: "600111222", channel: "Web", campaign: "web-299" });
  expect(r).toEqual({ ok: true, id: "v1" });
  expect(m.crearLeadWeb).not.toHaveBeenCalled();
  const cambios = m.actualizarLeadWeb.mock.calls[0][1];
  expect(cambios).toMatchObject({ telefono: "600111222" });
  expect(cambios.canal).toBeUndefined();
  expect(cambios.campana).toBeUndefined();
  expect(m.registrarActividad.mock.calls[0][0].nota).toContain("Ha vuelto a llegar desde la web");
});

test("saveLead con id de preview: lo guarda como id_externo y el PDF en extra", async () => {
  m.buscarLeadWeb.mockResolvedValue(null);
  m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v2" });
  await saveLead({ id: "prev-123", name: "Luis", email: "l@x.es", pdfPath: "prev-123.pdf", businessName: "Fisio Luis" });
  expect(m.crearLeadWeb).toHaveBeenCalledWith("m-dink", expect.objectContaining({ id_externo: "prev-123", negocio: "Fisio Luis", extra: expect.objectContaining({ pdf_path: "prev-123.pdf" }) }));
});

test("sin nombre de negocio ni persona usa el email", async () => {
  m.buscarLeadWeb.mockResolvedValue(null);
  m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v3" });
  await createWebhookLead({ email: "solo@x.es" });
  expect(m.crearLeadWeb.mock.calls[0][1].negocio).toBe("solo@x.es");
});

test("sin la migración no se pierde el lead: va a imagina_leads", async () => {
  m.buscarLeadWeb.mockResolvedValue(null);
  m.crearLeadWeb.mockResolvedValue({ ok: false, error: "x", faltaMigracion: true });
  m.legacy.createWebhookLead.mockResolvedValue({ ok: true, id: "old-1" });
  expect(await createWebhookLead({ email: "a@x.es" })).toEqual({ ok: true, id: "old-1" });
});

test("setLeadConsent con un id viejo de imagina encuentra el lead migrado", async () => {
  m.buscarLeadWeb.mockResolvedValue({ id: "v1" });
  await setLeadConsent("imagina-viejo-1", false);
  expect(m.buscarLeadWeb).toHaveBeenCalledWith("m-dink", { id: "imagina-viejo-1" });
  expect(m.actualizarLeadWeb).toHaveBeenCalledWith("v1", { consentimiento: false });
});

test("setLeadConsent de un lead que solo está en imagina_leads usa el legacy", async () => {
  m.buscarLeadWeb.mockResolvedValue(null);
  await setLeadConsent("solo-viejo", false);
  expect(m.legacy.setLeadConsent).toHaveBeenCalledWith("solo-viejo", false);
});

test("listEmailableLeads devuelve forma LeadRow con status = fase", async () => {
  m.listarLeadsEmailables.mockResolvedValue([{ id: "v1", negocio: "Clínica", contacto: "Ana", email: "a@x.es", fase: "interesado", canal: "Meta", campana: "kd", consentimiento: true, email_estado: null, created_at: "2026-10-01" }]);
  const [l] = await listEmailableLeads();
  expect(l).toMatchObject({ id: "v1", name: "Ana", email: "a@x.es", status: "interesado", channel: "Meta", campaign: "kd", consent: true });
});
```

(`listarLeadsEmailables(marcaId, filtro)` es una lectura nueva en `db.ts`: añadirla en este task con su test de query en `ventas-db.test.ts`. `m.legacy` es el mock de `../imagina-leads-legacy`. `m-dink` = id que devuelve el mock de `getMarcaPorSlug`.)

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `leads-web.ts`, `imagina-leads-legacy.ts` (mover el código), y en `imagina-leads.ts` reemplazar los cuerpos de las funciones de escritura por `export { createWebhookLead, … } from "./ventas/leads-web";` manteniendo `listLeads`, `getSignedPdfUrl`, `uploadPreviewPdf`, `uploadPromoLogo`, `listLeadContacts`, `archiveLeads`, `deleteLeads`, `updateLeadStatus`, `updateLeadFollowupDate` sobre `imagina_leads` (son del panel viejo). `getLeadPdfPath(id)`: primero ventas (`extra.pdf_path`), luego legacy.

- [ ] **Step 4: Run** `npx vitest run` (suite entera: los tests de cada formulario mockean `../imagina-leads` y deben seguir verdes sin cambios) y `npx tsc --noEmit -p .`. Si algún test de formulario mockea `getSupabaseAdmin` en vez del módulo, ajustarlo para mockear `../ventas/leads-web` o `../imagina-leads`.

- [ ] **Step 5: Commit** `feat(ventas): los formularios de la web dan de alta los leads en ventas (dinkbit)`

---

### Task 5: Baja, webhook de Resend y campañas con ids nuevos y viejos

**Files:**
- Modify: `src/app/api/unsubscribe/route.ts` (sin cambios de código si `setLeadConsent` ya resuelve ids; añadir test), `src/app/api/resend/webhook/route.ts` (idem), `src/lib/campaign-send.ts` (sin cambios si `listEmailableLeads` devuelve `LeadRow`)
- Test: `src/lib/__tests__/unsubscribe-route.test.ts` (o el existente de la ruta; buscar con `grep -rl "unsubscribe" src/lib/__tests__ src/app`), `src/lib/__tests__/campaign-send.test.ts` (añadir caso)

- [ ] **Step 1: Failing tests:**
  - La ruta de baja con un id viejo válido llama a `setLeadConsent(idViejo, false)` y responde «Te has dado de baja» (ya lo hace; el test fija el contrato con el mock de `@/lib/imagina-leads`).
  - `campaign-send`: con `listEmailableLeads` mockeado devolviendo leads con `id` uuid de ventas, el enlace de baja (`buildUnsubscribeUrl`) lleva ese uuid y `campaign_recipients.lead_id` = uuid.
  - El caso de leads-web de Task 4 «setLeadConsent con id viejo» cubre la resolución.
- [ ] **Step 2-4:** ajustar lo que falle; **Run** suite.
- [ ] **Step 5: Commit** `test(ventas): bajas y campañas con ids de ventas y de imagina`

---

### Task 6: Lista, tablero y ficha de ventas con canal, campaña, etiquetas y archivados; adiós a «Pasar al embudo»

**Files:**
- Modify: `src/app/(site)/panel/ventas/(app)/[slug]/leads/page.tsx` (+ su componente de filtros), `.../tablero/page.tsx` + `Tablero.tsx`, `.../leads/[id]/page.tsx` + `AccionesLead.tsx`, `src/app/(site)/panel/ventas/acciones-leads.ts`, `src/lib/ventas/servicios.ts`, `src/lib/ventas/validacion.ts`
- Test: `src/lib/__tests__/ventas-acciones-leads.test.ts` (o el que cubra `acciones-leads`), `ventas-validacion.test.ts`

**Comportamiento:**
- Lista y tablero: filtros por `canal`, `campana` y `etiqueta` (desplegables con los valores presentes en la marca, leídos de los leads ya cargados), en la query string (`?canal=Meta&campana=kd&etiqueta=kit-digital`), y un enlace «Archivados (N)» que cambia a `?archivados=1`.
- Ficha: bloque «Origen» con canal, campaña, etiquetas, consentimiento («Sí / No / Sin definir») y estado del email; formulario para editar canal, campaña, etiquetas (texto separado por comas) y consentimiento → acción `actualizarOrigenLeadAction(slug, leadId, formData)` con `requireAccesoMarca(slug, "leads")`; botón «Archivar» / «Desarchivar» → `archivarLeadAction(slug, leadId, archivado)`. Si `extra.pdf_path`: enlace «Ver PDF del preview» a `/panel/pdf/<id>` (la ruta del panel viejo resuelve vía `getLeadPdfPath`, que ya mira ventas). **Ojo:** `/panel/pdf` está tras la contraseña del panel viejo; admins la tienen. Ruling: aceptable hasta el proyecto 4, que la moverá a ventas.
- Quitar «Pasar al embudo»: botón en `AccionesLead.tsx`, `pasarLeadAlEmbudoAction` en `acciones-leads.ts`, `pasarLeadAlEmbudo` en `servicios.ts` y sus tests; `promocionado_at` se queda en el tipo como opcional sin uso.
- `validacion.ts`: `validarOrigenLead(formData)` → `{ canal, campana, etiquetas: string[] (trim, minúsculas, sin vacíos, sin repetidos, máx. 10 de 40 caracteres), consentimiento: boolean | null }`.

- [ ] **Step 1: Failing tests** — validación (`"Kit-Digital, , kit-digital ,Promo"` → `["kit-digital","promo"]`; consentimiento `"si"|"no"|""` → `true|false|null`); acciones: `actualizarOrigenLeadAction` y `archivarLeadAction` rechazan a una clienta de otra marca (patrón de los tests de acciones existentes) y llaman a `actualizarLeadWeb` con los campos; ya no existe `pasarLeadAlEmbudoAction`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement. Step 4: Run** suite + `tsc` + `eslint` de las rutas tocadas.
- [ ] **Step 5: Commit** `feat(ventas): canal, campaña, etiquetas y archivados en lista, tablero y ficha`

---

### Task 7: /panel viejo en consulta, y alta de usuarios con login ya existente

**Files:**
- Modify: `src/app/(site)/panel/page.tsx`, `src/app/(site)/panel/tablero/page.tsx`, `src/app/(site)/panel/agenda/page.tsx`, `src/app/(site)/panel/LeadsTable.tsx`, `src/app/(site)/panel/actions.ts`, `src/app/(site)/panel/_componentes/PanelShell.tsx`
- Modify: `src/lib/ventas/db.ts` (`crearUsuariaCompleta`)
- Test: `src/lib/__tests__/panel-actions*.test.ts` (el que exista para `panel/actions.ts`), `ventas-db.test.ts`

**Comportamiento:**
- Las tres páginas muestran arriba un aviso: «Los leads se gestionan ahora en /panel/ventas.» con enlace a `/panel/ventas/dinkbit`. `LeadsTable` y el tablero viejo se pintan en solo lectura: sin selects editables, sin importación, sin alta manual, sin borrar ni archivar (prop `soloLectura`).
- Las server actions de escritura de `panel/actions.ts` (crear, importar, cambiar estado/campo/fecha, archivar, borrar, consentimiento) devuelven `{ ok: false, error: "Los leads se gestionan ahora en /panel/ventas." }` sin tocar nada.
- `PanelShell`: la pestaña «Leads» pasa a llamarse «Leads (antiguo)» y se añade «CRM → ventas» enlazando a `/panel/ventas/dinkbit`.
- `crearUsuariaCompleta`: si `createUser` falla porque el email ya existe, busca el usuario de Auth por email (`auth.admin.listUsers` paginado) y, si **no** tiene perfil en `ventas_usuarias`, crea el perfil con ese id, le pone la contraseña indicada (`updateUserById`) y devuelve `ok`. Si ya tiene perfil: «Ya existe un usuario con ese email.» (Es lo que pasó con paula.lopez@ el 15/10.)

- [ ] **Step 1: Failing tests:** una acción de escritura del panel viejo devuelve el error y no llama a Supabase; `crearUsuariaCompleta` con auth existente sin perfil crea el perfil con el id existente y actualiza la contraseña; con perfil existente devuelve el error.
- [ ] **Step 2-4** como siempre.
- [ ] **Step 5: Commit** `feat(panel): el panel viejo de leads queda en consulta; altas de usuario sobre logins existentes`

---

### Task 8: SQL de datos (migración de imagina_leads) y su correspondencia probada

**Files:**
- Create: `docs/sql/2026-10-15-crm-unificacion-datos.sql`
- Create: `src/lib/ventas/migracion-panel.ts` (función pura con la misma lógica, para probarla)
- Test: `src/lib/__tests__/ventas-migracion-panel.test.ts`

**Interfaces — Produces:** `leadVentasDesdePanel(fila: LeadRow, usuarias: { id: string; email: string; activa: boolean }[]): LeadWebNuevo & { notas: string[] }` — la referencia de cómo el SQL traduce cada fila. El test fija los casos; el SQL replica exactamente esa lógica (y su cabecera lo dice).

- [ ] **Step 1: Failing test**

```ts
import { leadVentasDesdePanel } from "../ventas/migracion-panel";

const U = [
  { id: "u-yael", email: "yael.benbunan@dinkbit.com", activa: true },
  { id: "u-pg", email: "paula.garcia@dinkbit.com", activa: true },
  { id: "u-al", email: "alicia.ruiz@dinkbit.com", activa: false },
];
const base = { id: "old-1", created_at: "2026-07-01T10:00:00Z", name: "Ana", email: "ana@x.es", phone: "600111222", sector: "dental", business_name: "Clínica Ana", business_type: null, template: null, style: null, palette: null, value_prop: null, current_website: "ana.es", pdf_path: null, review_rating: null, review_comment: null, status: "seguimiento", channel: "Meta", campaign: "kd", notes: "Llamar tarde", followup: "Pide presupuesto", followup_at: "2026-10-20", account_manager: "Paula G", archived: false, email_status: "delivered", email_message_id: "re_1", email_updated_at: null, consent: true };

test("traduce una fila completa", () => {
  const l = leadVentasDesdePanel(base, U);
  expect(l).toMatchObject({
    id_externo: "old-1", negocio: "Clínica Ana", contacto: "Ana", telefono: "600111222", email: "ana@x.es", web: "ana.es",
    origen: "web", origen_detalle: "kd", fase: "volver_a_llamar", asignada_a: "u-pg", proximo_seguimiento: "2026-10-20",
    canal: "Meta", campana: "kd", etiquetas: [], consentimiento: true, created_at: "2026-07-01T10:00:00Z",
    extra: { sector: "dental" },
  });
  expect(l.notas).toEqual(["Notas de /panel: Llamar tarde", "Seguimiento: Pide presupuesto"]);
});

test("kit digital: fase y etiqueta", () => {
  expect(leadVentasDesdePanel({ ...base, status: "cliente-kit-digital" }, U)).toMatchObject({ fase: "cliente", etiquetas: ["kit-digital"] });
});

test("responsable desactivado o desconocido: sin asignar", () => {
  expect(leadVentasDesdePanel({ ...base, account_manager: "Alicia" }, U).asignada_a).toBeNull();
  expect(leadVentasDesdePanel({ ...base, account_manager: "Otra" }, U).asignada_a).toBeNull();
});

test("sin nombre, email ni teléfono: no se pierde", () => {
  const l = leadVentasDesdePanel({ ...base, name: null, business_name: null, email: null, phone: null }, U);
  expect(l.negocio).toBe("(sin nombre) old-1");
});
```

- [ ] **Step 2: Run → FAIL. Step 3: Implement** `migracion-panel.ts` (usa `faseDesdeEstadoPanel`, `emailDeResponsablePanel`, `ETIQUETA_KIT_DIGITAL`; `extra` solo con las claves no nulas de sector/business_type/template/style/palette/value_prop/pdf_path/review_rating/review_comment). **Run → PASS.**

- [ ] **Step 4: Write the SQL** — una transacción que:
  1. obtiene la marca `dinkbit` (si no existe, `raise exception`);
  2. crea una tabla temporal `_resp(texto, email)` con las 4 filas de `RESPONSABLES_PANEL` y otra `_fase(estado, fase)` con `ESTADO_PANEL_A_FASE` (comentario: «copiadas de src/lib/ventas/dominio.ts»);
  3. para cada fila de `imagina_leads` (orden `created_at`): si ya hay en dinkbit un lead con `id_externo = id` o `id = any(ids_externos)` → la salta (re-ejecutable); si hay uno con el mismo `email_norm`/`telefono_norm` → completa vacíos, une etiquetas, añade el id a `ids_externos`, y cuenta «fusionado»; si no → `select public.ventas_crear_lead(marca, jsonb)` con el mismo mapeo que `leadVentasDesdePanel` (negocio: `coalesce(nullif(business_name,''), nullif(name,''), nullif(email,''), '(sin nombre) ' || id)`; `asignada_a`: `ventas_usuarias` activa con `lower(email) = _resp.email` para `lower(regexp_replace(trim(account_manager), '\s+', ' ', 'g'))`), luego `update` de `email_estado`, `email_mensaje_id`, `email_actualizado_at`, `archivado`, y las notas en `ventas_actividad` (`tipo = 'nota'`, `usuaria_id` null, `nota`);
  4. termina con `raise notice` de: leídos, creados, fusionados, saltados (ya migrados), por fase, asignados por email y sin asignar por cada `account_manager`.
  Usar `do $$ declare … begin … end $$;` y un bloque `begin … exception` por fila que cuente errores sin abortar el resto. Al final, una consulta de comprobación comentada: `select fase, count(*) from ventas_leads l join ventas_marcas m on m.id = l.marca_id where m.slug = 'dinkbit' group by fase;`.

- [ ] **Step 5: Commit** `feat(ventas): migración de los leads del panel viejo a ventas, con su correspondencia probada`

---

### Task 9: Verificación final

- [ ] `npx tsc --noEmit -p .`, `npx eslint src`, `npx vitest run`, `npx next build` — todo en verde.
- [ ] `npx next start -p 3100` y, **solo lectura** (no enviar formularios ni pulsar acciones: `.env.local` es producción), con Playwright a 390 y 1440 px: `/panel/ventas/hydrup/tablero` (sigue con «Muestras enviadas»), `/panel/ventas/dinkbit/tablero` (con «Propuesta enviada»), `/panel/ventas/dinkbit/leads` (filtros nuevos), una ficha de dinkbit (bloque Origen, sin «Pasar al embudo»), `/panel` (aviso y solo lectura). Requiere sesión: si no hay forma de iniciar sesión sin escribir, revisar solo que las páginas compilan en el build y dejarlo dicho.
- [ ] Preparar para Yael, en el portapapeles (`pbcopy`), el SQL de estructura + la consulta de comprobación, con el resultado esperado (`8`). El SQL de datos se le da **después** del despliegue.
