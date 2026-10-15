# Landing proveedores deportivos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing `https://www.dinkbit.es/proveedores-deportivos` que vende el «Pack Campaña + CRM» (350 € + IVA/mes) a proveedores deportivos y mete cada solicitud como lead en `/panel/ventas` (marca `proveedores-deportivos`), con píxel + CAPI y página de gracias.

**Architecture:** Grupo de rutas nuevo `src/app/(deporte)` con layout oscuro propio (patrón de `(growth)`). Textos, opciones y esquema zod en un único módulo `src/lib/proveedores-deportivos.ts`; server action `src/lib/proveedores-deportivos-action.ts` que valida y llama a `recibirLeadFormulario` (ampliada para aceptar una nota del llamante) y a `sendMetaLead`. Componentes en `src/components/proveedores-deportivos/`.

**Tech Stack:** Next.js App Router (server actions), React 19, Tailwind, zod, vitest + Testing Library (jsdom), `next/font/google` (Anton), `next/image`, sharp (ya instalado) para optimizar fotos.

**Spec:** `docs/superpowers/specs/2026-10-15-landing-proveedores-deportivos-design.md` (léela entera antes de empezar).

## Global Constraints

- Ruta pública: `/proveedores-deportivos`; gracias: `/proveedores-deportivos/gracias` (`robots: { index: false }`).
- Slug de la marca de ventas: `proveedores-deportivos` (constante `MARCA_PROVEEDORES_DEPORTIVOS_SLUG`).
- Precio: `350 €` + `+ IVA/mes`, desde una sola constante; badge «PACK CAMPAÑA + CRM · 350 € + IVA/MES».
- Paleta fija (no tokens del tema): fondo `#0B0C0E`, superficie `#15171B`, línea `#262A31`, texto `#FFFFFF`, texto secundario `#B8BDC6`, acento `#187bef` (botones/bordes/brillos, texto encima blanco, negrita ≥16 px), acento claro `#4DA3FF` (texto, iconos y checks sobre fondo oscuro).
- Titulares en Anton (`next/font/google`, solo en `(deporte)`), cuerpo en la Source Sans del sitio.
- No inventar datos: cifras, testimonios, logos, FAQ sin respuesta, inversión mínima y dos líneas del pack van como `[PLACEHOLDER]` con el componente `Hueco`.
- Mockups (anuncio de Instagram, kanban del CRM) en HTML/CSS, **de frente, sin perspectiva ni rotación**.
- Sin dependencias npm nuevas. Iconos SVG propios.
- Todo movimiento se anula con `prefers-reduced-motion`; el contenido es visible sin JavaScript.
- Móvil primero (360–430 px), sin scroll horizontal.
- Textos de interfaz en español de España; comentarios del código en español, como el resto del repo.
- Commits con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests: `npx vitest run <fichero>`; suite: `npx vitest run`; tipos: `npx tsc --noEmit -p .`; lint: `npx eslint <rutas>`; build: `npx next build`.

## Review Focus

1. Teléfono con prefijo o espacios («+34 600 11 22 33») debe aceptarse; uno de 8 dígitos o con letras, rechazarse con mensaje en el campo — test en Task 1.
2. Volver al paso 1 desde el paso 2 no debe perder lo escrito ni los chips marcados — test en Task 5.
3. La marca `proveedores-deportivos` sin crear o pausada: el visitante ve el error con enlace a WhatsApp y no se manda CAPI — test en Task 3.
4. Dos envíos con el mismo email (lead repetido) cuentan como éxito y la nota llega igual al lead existente — test en Task 2.
5. «Enviar» pulsado dos veces seguidas no debe crear dos peticiones (botón deshabilitado mientras `pending`) — test en Task 5.

---

### Task 1: Contenido, catálogos y esquema del formulario

**Files:**
- Create: `src/lib/proveedores-deportivos.ts`
- Test: `src/lib/__tests__/proveedores-deportivos.test.ts`

**Interfaces:**
- Produces:
  - `PD_PATH = "/proveedores-deportivos"`, `PD_GRACIAS_PATH = "/proveedores-deportivos/gracias"`
  - `MARCA_PROVEEDORES_DEPORTIVOS_SLUG = "proveedores-deportivos"`
  - `PD_PRECIO = "350 €"`, `PD_PRECIO_SUFIJO = "+ IVA/mes"`, `PD_PRECIO_NUMERO = "350"`, `PD_BADGE = "PACK CAMPAÑA + CRM · 350 € + IVA/MES"`
  - `PD_META_TITLE`, `PD_META_DESCRIPTION` (string)
  - Catálogos `as const` de `{ valor, etiqueta }`: `PD_PRODUCTOS`, `PD_DESTINOS`, `PD_FACTURACION`, `PD_MUESTRAS`, `PD_PRESUPUESTO`
  - `PD_FAQS: readonly { q: string; a: string | null }[]` (`a: null` = placeholder)
  - `pasoUnoSchema`, `solicitudSchema` (zod) y `type Solicitud = z.infer<typeof solicitudSchema>`
  - `leerSolicitud(fd: FormData): { ok: true; datos: Solicitud } | { ok: false; errores: Partial<Record<keyof Solicitud, string>> }`
  - `notaSolicitudPack(s: Solicitud): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/proveedores-deportivos.test.ts
import { describe, expect, test } from "vitest";
import { leerSolicitud, notaSolicitudPack, PD_BADGE, PD_PRECIO, PD_PRECIO_SUFIJO } from "../proveedores-deportivos";

function fd(extra: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    nombre: "Laura Gómez",
    empresa: "Padel Pro SL",
    web: "@padelpro",
    email: "laura@padelpro.es",
    telefono: "600 11 22 33",
    producto: "padel",
    destinos: ["clubes_padel", "gimnasios"],
    facturacion: "100k_500k",
    muestras: "si",
    presupuesto: "500_1500",
    privacidad: "on",
    ...extra,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}

describe("leerSolicitud", () => {
  test("un envío completo es válido y conserva los chips", () => {
    const r = leerSolicitud(fd());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.destinos).toEqual(["clubes_padel", "gimnasios"]);
  });

  test("teléfono con +34 y espacios vale; con 8 dígitos o letras no", () => {
    expect(leerSolicitud(fd({ telefono: "+34 600 11 22 33" })).ok).toBe(true);
    const corto = leerSolicitud(fd({ telefono: "6001122" }));
    expect(corto.ok === false && corto.errores.telefono).toBeTruthy();
    const letras = leerSolicitud(fd({ telefono: "600abc223" }));
    expect(letras.ok === false && letras.errores.telefono).toBeTruthy();
  });

  test("exige al menos un destino y la privacidad", () => {
    const r = leerSolicitud(fd({ destinos: [], privacidad: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.destinos).toBeTruthy();
      expect(r.errores.privacidad).toBeTruthy();
    }
  });

  test("rechaza valores fuera del catálogo", () => {
    const r = leerSolicitud(fd({ producto: "coches", facturacion: "infinito", destinos: ["marte"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.producto).toBeTruthy();
      expect(r.errores.facturacion).toBeTruthy();
      expect(r.errores.destinos).toBeTruthy();
    }
  });

  test("email y campos de texto obligatorios", () => {
    const r = leerSolicitud(fd({ email: "no-es-email", empresa: " ", web: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.email).toBeTruthy();
      expect(r.errores.empresa).toBeTruthy();
      expect(r.errores.web).toBeTruthy();
    }
  });
});

describe("notaSolicitudPack", () => {
  test("una línea por respuesta con etiquetas legibles", () => {
    const r = leerSolicitud(fd());
    if (!r.ok) throw new Error("debería ser válida");
    expect(notaSolicitudPack(r.datos)).toBe(
      [
        "Desde la landing de proveedores deportivos (Pack Campaña + CRM).",
        "Web / Instagram: @padelpro",
        "Qué vende: Material de pádel",
        "A quién quiere vender: Clubes de pádel, Gimnasios",
        "Facturación anual: 100k–500k€",
        "Muestras gratuitas: Sí",
        "Presupuesto mensual en publicidad: 500–1.500€",
      ].join("\n"),
    );
  });
});

test("el precio se escribe igual en todas partes", () => {
  expect(PD_BADGE).toContain(PD_PRECIO);
  expect(PD_BADGE).toContain(PD_PRECIO_SUFIJO.toUpperCase());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/proveedores-deportivos.test.ts`
Expected: FAIL — `Failed to resolve import "../proveedores-deportivos"`.

- [ ] **Step 3: Write the module**

```ts
// src/lib/proveedores-deportivos.ts
/**
 * Landing «Pack Campaña + CRM» para proveedores deportivos.
 *
 * Todo lo que se dice en la página —precio, opciones del formulario, FAQ— vive
 * aquí, para que la página, el JSON-LD y la validación del servidor no puedan
 * contar cosas distintas. Puro: sin red ni `server-only`.
 */
import { z } from "zod";

export const PD_PATH = "/proveedores-deportivos";
export const PD_GRACIAS_PATH = "/proveedores-deportivos/gracias";
/** Marca de /panel/ventas donde entran las solicitudes. Se crea a mano en el panel. */
export const MARCA_PROVEEDORES_DEPORTIVOS_SLUG = "proveedores-deportivos";

export const PD_PRECIO = "350 €";
export const PD_PRECIO_NUMERO = "350";
export const PD_PRECIO_SUFIJO = "+ IVA/mes";
export const PD_BADGE = `PACK CAMPAÑA + CRM · ${PD_PRECIO} ${PD_PRECIO_SUFIJO.toUpperCase()}`;

export const PD_META_TITLE = "Pack Campaña + CRM para proveedores deportivos | dinkbit";
export const PD_META_DESCRIPTION =
  "Campañas en Meta con muestras gratis para que gimnasios y clubes de pádel prueben tu producto, y un CRM para seguir cada lead hasta el pedido. 350 € + IVA/mes.";

export const PD_PRODUCTOS = [
  { valor: "padel", etiqueta: "Material de pádel" },
  { valor: "equipaciones", etiqueta: "Equipaciones personalizadas" },
  { valor: "merchandising", etiqueta: "Merchandising para centros" },
  { valor: "consumibles", etiqueta: "Consumibles de gimnasio" },
  { valor: "suelos", etiqueta: "Suelos y equipamiento" },
  { valor: "trofeos", etiqueta: "Trofeos y medallas" },
  { valor: "nutricion", etiqueta: "Nutrición deportiva" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

export const PD_DESTINOS = [
  { valor: "gimnasios", etiqueta: "Gimnasios" },
  { valor: "clubes_padel", etiqueta: "Clubes de pádel" },
  { valor: "boxes", etiqueta: "Boxes CrossFit" },
  { valor: "clubes_deportivos", etiqueta: "Clubes de fútbol y deportivos" },
  { valor: "estudios", etiqueta: "Estudios de pilates o yoga" },
  { valor: "eventos", etiqueta: "Organizadores de eventos" },
] as const;

export const PD_FACTURACION = [
  { valor: "menos_100k", etiqueta: "<100k€" },
  { valor: "100k_500k", etiqueta: "100k–500k€" },
  { valor: "500k_2m", etiqueta: "500k–2M€" },
  { valor: "mas_2m", etiqueta: ">2M€" },
] as const;

export const PD_MUESTRAS = [
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
  { valor: "depende", etiqueta: "Depende del producto" },
] as const;

export const PD_PRESUPUESTO = [
  { valor: "menos_500", etiqueta: "<500€" },
  { valor: "500_1500", etiqueta: "500–1.500€" },
  { valor: "1500_5000", etiqueta: "1.500–5.000€" },
  { valor: "mas_5000", etiqueta: ">5.000€" },
] as const;

/** `a: null` = respuesta pendiente: se pinta como placeholder y no entra en el JSON-LD. */
export const PD_FAQS: readonly { q: string; a: string | null }[] = [
  { q: "¿Cuánto cuesta?", a: `El Pack Campaña + CRM cuesta ${PD_PRECIO} + IVA al mes. La inversión en anuncios de Meta se paga aparte, directamente a Meta.` },
  { q: "¿Qué incluye el CRM?", a: null },
  { q: "¿Hay permanencia?", a: null },
  { q: "¿Quién paga las muestras?", a: null },
  { q: "¿Cómo filtráis a los curiosos?", a: "Pedimos datos del negocio (nombre del centro, CIF o web, volumen de compra) antes de que se envíe ninguna muestra." },
  { q: "¿En cuánto tiempo veo resultados?", a: null },
  { q: "¿Trabajáis con cadenas de gimnasios?", a: null },
];

type Catalogo = readonly { valor: string; etiqueta: string }[];
const valores = <C extends Catalogo>(c: C) => c.map((o) => o.valor) as [C[number]["valor"], ...C[number]["valor"][]];
const etiqueta = (c: Catalogo, v: string) => c.find((o) => o.valor === v)?.etiqueta ?? v;

/** Móvil o fijo español: 9 dígitos que empiezan por 6–9, con +34 opcional y separadores. Mismo criterio que web-299. */
const TELEFONO_RE = /^(?:\+34[\s.-]?)?[6-9](?:[\s.-]?\d){8}$/;
const texto = (msg: string) => z.string().trim().min(2, msg).max(200, "Demasiado largo");

export const pasoUnoSchema = z.object({
  nombre: texto("Escribe tu nombre y apellidos"),
  empresa: texto("Escribe el nombre de tu empresa"),
  web: texto("Escribe tu web o tu Instagram"),
  email: z.email("Revisa tu correo"),
  telefono: z.string().trim().regex(TELEFONO_RE, "Escribe un teléfono español válido (9 dígitos)"),
});

export const solicitudSchema = pasoUnoSchema.extend({
  producto: z.enum(valores(PD_PRODUCTOS), "Elige qué vendes"),
  destinos: z.array(z.enum(valores(PD_DESTINOS), "Elige a quién quieres vender")).min(1, "Elige al menos uno"),
  facturacion: z.enum(valores(PD_FACTURACION), "Elige tu facturación"),
  muestras: z.enum(valores(PD_MUESTRAS), "Dinos si podéis enviar muestras"),
  presupuesto: z.enum(valores(PD_PRESUPUESTO), "Elige un presupuesto"),
  privacidad: z.literal(true, "Tienes que aceptar la política de privacidad"),
});

export type Solicitud = z.infer<typeof solicitudSchema>;
export type ErroresSolicitud = Partial<Record<keyof Solicitud, string>>;

function errores(e: z.ZodError): ErroresSolicitud {
  const r: ErroresSolicitud = {};
  for (const i of e.issues) {
    const k = i.path[0] as keyof Solicitud;
    if (k && !r[k]) r[k] = i.message;
  }
  return r;
}

export function leerSolicitud(fd: FormData): { ok: true; datos: Solicitud } | { ok: false; errores: ErroresSolicitud } {
  const s = (k: string) => String(fd.get(k) ?? "");
  const r = solicitudSchema.safeParse({
    nombre: s("nombre"),
    empresa: s("empresa"),
    web: s("web"),
    email: s("email"),
    telefono: s("telefono"),
    producto: s("producto"),
    destinos: fd.getAll("destinos").map(String),
    facturacion: s("facturacion"),
    muestras: s("muestras"),
    presupuesto: s("presupuesto"),
    privacidad: fd.get("privacidad") === "on",
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: errores(r.error) };
}

/** Lo que el CRM no tiene como columna, como nota inicial del lead. */
export function notaSolicitudPack(s: Solicitud): string {
  return [
    "Desde la landing de proveedores deportivos (Pack Campaña + CRM).",
    `Web / Instagram: ${s.web}`,
    `Qué vende: ${etiqueta(PD_PRODUCTOS, s.producto)}`,
    `A quién quiere vender: ${s.destinos.map((d) => etiqueta(PD_DESTINOS, d)).join(", ")}`,
    `Facturación anual: ${etiqueta(PD_FACTURACION, s.facturacion)}`,
    `Muestras gratuitas: ${etiqueta(PD_MUESTRAS, s.muestras)}`,
    `Presupuesto mensual en publicidad: ${etiqueta(PD_PRESUPUESTO, s.presupuesto)}`,
  ].join("\n");
}
```

Note: el repo usa zod 4.4 (`z.email(...)`, ver `web-299-action.ts`), donde `z.enum(lista, "msg")` y `z.literal(true, "msg")` aceptan el mensaje como segundo argumento.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/proveedores-deportivos.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/proveedores-deportivos.ts src/lib/__tests__/proveedores-deportivos.test.ts
git commit -m "feat(deporte): textos, catálogos y validación de la solicitud del Pack Campaña + CRM"
```

---

### Task 2: `recibirLeadFormulario` acepta una nota del llamante

**Files:**
- Modify: `src/lib/ventas/servicios.ts:242-255`
- Test: `src/lib/__tests__/ventas-servicios.test.ts` (añadir al `describe("recibirLeadFormulario")`)

**Interfaces:**
- Produces: `recibirLeadFormulario(input: { slug: string; datos: unknown; nota?: string | null }): Promise<{ status: number; body: Record<string, unknown> }>`. Si `nota` viene, sustituye a `notaFormulario(datos)`. La ruta `/api/ventas/formulario/[slug]` no la pasa y no cambia.

- [ ] **Step 1: Write the failing tests** (dentro del `describe("recibirLeadFormulario")` existente; `m`, `MARCA_ACTIVA` ya existen en el fichero)

```ts
  test("con nota del llamante, la nota del lead nuevo es esa", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Padel Pro", email: "p@p.es", comentarios: "x" }, nota: "Qué vende: Material de pádel" });
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "l-new", tipo: "nota", nota: "Qué vende: Material de pádel" }));
  });

  test("lead repetido: cuenta como éxito y la nota llega al existente", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-viejo", email: "ya@a.es", telefono: null });
    const r = await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Padel Pro", email: "ya@a.es" }, nota: "Qué vende: Trofeos" });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.registrarActividad.mock.calls[0][0].nota).toContain("Qué vende: Trofeos");
  });
```

- [ ] **Step 2: Run to verify the first one fails**

Run: `npx vitest run src/lib/__tests__/ventas-servicios.test.ts -t "nota del llamante"`
Expected: FAIL — la nota registrada es «Desde la web (landing B2B).\nComentarios: x», no la pasada.

- [ ] **Step 3: Implement**

En `src/lib/ventas/servicios.ts`, sustituir la firma y la última línea de `recibirLeadFormulario`:

```ts
export async function recibirLeadFormulario(input: {
  slug: string;
  datos: unknown;
  /** Nota inicial ya montada por quien llama (p. ej. la landing de proveedores
   *  deportivos). Sin ella se monta con los campos del formulario de Hydrup. */
  nota?: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
```

y

```ts
  return guardarLeadEntrante({
    marca,
    lead: leido.lead,
    campana: CAMPANA_FORMULARIO_WEB,
    notaInicial: input.nota ?? notaFormulario(datos),
  });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/ventas-servicios.test.ts`
Expected: PASS (todos, incluidos los existentes de la ruta pública).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ventas/servicios.ts src/lib/__tests__/ventas-servicios.test.ts
git commit -m "feat(ventas): el alta por formulario acepta una nota montada por quien llama"
```

---

### Task 3: Server action `enviarSolicitudPack`

**Files:**
- Create: `src/lib/proveedores-deportivos-action.ts`
- Test: `src/lib/__tests__/proveedores-deportivos-action.test.ts`

**Interfaces:**
- Consumes: `leerSolicitud`, `notaSolicitudPack`, `MARCA_PROVEEDORES_DEPORTIVOS_SLUG` (Task 1); `recibirLeadFormulario({ slug, datos, nota })` (Task 2); `esEnvioBot`, `crearLimitador` de `src/lib/ventas/formulario-web.ts`; `sendMetaLead` de `src/lib/meta-capi.ts`; `CONTACT_INFO.socials.whatsapp` de `src/lib/contact-info.ts` (`https://wa.me/34657559397`).
- Produces: `enviarSolicitudPack(fd: FormData): Promise<ResultadoSolicitud>` con
  `type ResultadoSolicitud = { ok: true } | { ok: false; error: string; errores?: ErroresSolicitud; whatsapp?: string }`.
  Campos del FormData: los de Task 1 + `website_url` (trampa), `eventId`, `pageUrl`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/proveedores-deportivos-action.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ recibir: vi.fn(), capi: vi.fn(), ip: "1.1.1.1" }));

vi.mock("server-only", () => ({}));
vi.mock("../ventas/servicios", () => ({ recibirLeadFormulario: m.recibir }));
vi.mock("../meta-capi", () => ({ sendMetaLead: m.capi }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": m.ip, "user-agent": "UA" }),
  cookies: async () => ({ get: () => undefined }),
}));

import { enviarSolicitudPack } from "../proveedores-deportivos-action";

function fd(extra: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    nombre: "Laura Gómez", empresa: "Padel Pro SL", web: "@padelpro", email: "laura@padelpro.es",
    telefono: "600112233", producto: "padel", facturacion: "100k_500k", muestras: "si",
    presupuesto: "500_1500", privacidad: "on", eventId: "ev-1", pageUrl: "https://www.dinkbit.es/proveedores-deportivos",
    ...extra,
  };
  Object.entries(base).forEach(([k, v]) => f.append(k, v));
  f.append("destinos", "gimnasios");
  return f;
}

let ipN = 0;
beforeEach(() => {
  m.recibir.mockReset().mockResolvedValue({ status: 200, body: { ok: true, duplicado: false } });
  m.capi.mockReset().mockResolvedValue({ ok: true });
  m.ip = `10.0.0.${++ipN}`; // IP distinta por test: el limitador vive en memoria del módulo
});

describe("enviarSolicitudPack", () => {
  test("válido: crea el lead con la nota y manda CAPI con el mismo eventId", async () => {
    expect(await enviarSolicitudPack(fd())).toEqual({ ok: true });
    const arg = m.recibir.mock.calls[0][0];
    expect(arg.slug).toBe("proveedores-deportivos");
    expect(arg.datos).toMatchObject({ contacto: "Laura Gómez", negocio: "Padel Pro SL", email: "laura@padelpro.es", telefono: "600112233", web: "@padelpro" });
    expect(arg.nota).toContain("Qué vende: Material de pádel");
    expect(m.capi).toHaveBeenCalledWith(expect.objectContaining({ eventId: "ev-1", email: "laura@padelpro.es" }));
  });

  test("un bot recibe ok y no se guarda nada", async () => {
    expect(await enviarSolicitudPack(fd({ website_url: "http://spam" }))).toEqual({ ok: true });
    expect(m.recibir).not.toHaveBeenCalled();
    expect(m.capi).not.toHaveBeenCalled();
  });

  test("datos inválidos: errores por campo y nada guardado", async () => {
    const r = await enviarSolicitudPack(fd({ email: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores?.email).toBeTruthy();
    expect(m.recibir).not.toHaveBeenCalled();
  });

  test("marca sin crear o pausada: error con WhatsApp y sin CAPI", async () => {
    m.recibir.mockResolvedValue({ status: 404, body: { ok: false, error: "unknown_brand" } });
    const r = await enviarSolicitudPack(fd());
    expect(r).toMatchObject({ ok: false, whatsapp: expect.stringContaining("wa.me") });
    expect(m.capi).not.toHaveBeenCalled();
  });

  test("lead repetido cuenta como éxito", async () => {
    m.recibir.mockResolvedValue({ status: 200, body: { ok: true, duplicado: true } });
    expect(await enviarSolicitudPack(fd())).toEqual({ ok: true });
  });

  test("más de 5 envíos desde la misma IP en 10 minutos se frenan", async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitudPack(fd())).ok).toBe(true);
    const r = await enviarSolicitudPack(fd());
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("varias solicitudes") });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/proveedores-deportivos-action.test.ts`
Expected: FAIL — no se resuelve `../proveedores-deportivos-action`.

- [ ] **Step 3: Implement**

```ts
// src/lib/proveedores-deportivos-action.ts
"use server";

import { cookies, headers } from "next/headers";
import { CONTACT_INFO } from "./contact-info";
import { sendMetaLead } from "./meta-capi";
import { leerSolicitud, MARCA_PROVEEDORES_DEPORTIVOS_SLUG, notaSolicitudPack, type ErroresSolicitud } from "./proveedores-deportivos";
import { crearLimitador, esEnvioBot } from "./ventas/formulario-web";
import { recibirLeadFormulario } from "./ventas/servicios";

export type ResultadoSolicitud =
  | { ok: true }
  | { ok: false; error: string; errores?: ErroresSolicitud; whatsapp?: string };

const permitir = crearLimitador({ max: 5, ventanaMs: 10 * 60 * 1000 });
const WHATSAPP = `${CONTACT_INFO.socials.whatsapp}?text=${encodeURIComponent("Hola, quiero el Pack Campaña + CRM")}`;

/**
 * Solicitudes de la landing de proveedores deportivos → lead en /panel/ventas.
 *
 * Mismo orden que el resto de formularios: el lead primero y la conversión a
 * Meta después, y solo si el lead se guardó (sin lead, no hay conversión que
 * contar). Un repetido cuenta como éxito: `recibirLeadFormulario` ya apunta la
 * vuelta en su ficha.
 */
export async function enviarSolicitudPack(fd: FormData): Promise<ResultadoSolicitud> {
  if (esEnvioBot({ website_url: fd.get("website_url") ?? "" })) return { ok: true };

  const h = await headers();
  const ip = h.get("cf-connecting-ip")?.trim() || h.get("x-real-ip")?.trim() || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (!permitir(`proveedores-deportivos:${ip}`)) {
    return { ok: false, error: "Has enviado varias solicitudes seguidas. Prueba en unos minutos o escríbenos por WhatsApp.", whatsapp: WHATSAPP };
  }

  const leido = leerSolicitud(fd);
  if (!leido.ok) return { ok: false, error: "Revisa los campos marcados.", errores: leido.errores };
  const s = leido.datos;

  let r: { status: number; body: Record<string, unknown> };
  try {
    r = await recibirLeadFormulario({
      slug: MARCA_PROVEEDORES_DEPORTIVOS_SLUG,
      datos: { contacto: s.nombre, negocio: s.empresa, email: s.email, telefono: s.telefono, web: s.web },
      nota: notaSolicitudPack(s),
    });
  } catch (e) {
    console.error("[proveedores-deportivos] fallo guardando el lead", e);
    r = { status: 500, body: { ok: false } };
  }
  if (r.status !== 200 || r.body.ok !== true) {
    console.error("[proveedores-deportivos] lead no guardado", r);
    return { ok: false, error: "No hemos podido enviar tu solicitud. Escríbenos por WhatsApp y lo vemos al momento.", whatsapp: WHATSAPP };
  }

  const eventId = String(fd.get("eventId") ?? "");
  if (eventId) {
    const c = await cookies();
    await sendMetaLead({
      eventId,
      email: s.email,
      phone: s.telefono,
      sourceUrl: String(fd.get("pageUrl") ?? ""),
      userAgent: h.get("user-agent"),
      clientIp: h.get("x-real-ip") ?? h.get("x-forwarded-for"),
      fbp: c.get("_fbp")?.value,
      fbc: c.get("_fbc")?.value,
    });
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/proveedores-deportivos-action.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/proveedores-deportivos-action.ts src/lib/__tests__/proveedores-deportivos-action.test.ts
git commit -m "feat(deporte): la solicitud del pack entra como lead en ventas y se mide en Meta"
```

---

### Task 4: Fotos

**Files:**
- Create: `public/img/deporte/*.webp` (12 fotos), `public/img/deporte/FUENTES.md`

**Interfaces:**
- Produces: estos nombres exactos, que usan las Tasks 6 y 7:
  `hero-pelotas.webp`, `hero-camisetas.webp`, `hero-magnesio.webp`, `hero-toallas.webp`, `pista-padel.webp`, `gimnasio.webp`, `box-crossfit.webp`, `caja-llegando.webp`, `abriendo-paquete.webp`, `equipaciones.webp`, `suelo-gimnasio.webp`, `trofeos.webp`.

- [ ] **Step 1: Buscar las fotos.** Con WebSearch/WebFetch, en Unsplash (licencia Unsplash) o Pexels (licencia Pexels), una foto por nombre de la lista, que encaje con el nombre (pelotas de pádel; camisetas deportivas; magnesio/tiza; toallas; pista de pádel; sala de gimnasio; box de CrossFit; caja de cartón llegando a un club o recepción; manos abriendo un paquete; equipaciones; suelo de caucho de gimnasio; trofeos/medallas). Nada con caras en primer plano ni marcas visibles. Descargar los originales en el scratchpad de la sesión, no en el repo.

- [ ] **Step 2: Optimizar a WebP** (máx. 1600 px de ancho, calidad 72) con sharp desde la raíz del repo:

```bash
node -e '
const sharp = require("sharp"); const fs = require("fs"); const path = require("path");
const [src, dst] = process.argv.slice(1);
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
  const out = path.join(dst, f.replace(/\.(jpe?g|png|webp)$/i, ".webp"));
  sharp(path.join(src, f)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out).then(i => console.log(out, i.size));
}' "<scratchpad>/fotos-deporte" public/img/deporte
```

(los ficheros del scratchpad ya deben tener el nombre final, p. ej. `pista-padel.jpg`). Cada WebP debe quedar por debajo de ~250 KB; si no, bajar la calidad a 65 para ese fichero.

- [ ] **Step 3: `public/img/deporte/FUENTES.md`** — una línea por foto:

```markdown
# Fotos de la landing de proveedores deportivos

Todas con licencia libre (Unsplash License / Pexels License): uso comercial sin atribución obligatoria.

| Fichero | Autor | URL original | Licencia |
|---|---|---|---|
| pista-padel.webp | <autor> | <url> | Unsplash |
```

(rellenar las 12 filas con los datos reales de cada foto descargada).

- [ ] **Step 4: Verificar** — `ls -la public/img/deporte` muestra 12 `.webp` + `FUENTES.md`; abrir 2–3 con Read para comprobar que se ven bien.

- [ ] **Step 5: Commit**

```bash
git add public/img/deporte
git commit -m "feat(deporte): fotos libres optimizadas para la landing de proveedores deportivos"
```

---

### Task 5: Formulario en dos pasos (`FormularioPack`)

**Files:**
- Create: `src/components/proveedores-deportivos/tema.ts`
- Create: `src/components/proveedores-deportivos/FormularioPack.tsx`
- Test: `src/components/proveedores-deportivos/__tests__/FormularioPack.test.tsx`

**Interfaces:**
- Consumes: catálogos, `pasoUnoSchema`, `PD_GRACIAS_PATH` (Task 1); `enviarSolicitudPack`, `ResultadoSolicitud` (Task 3); `newEventId`, `trackMetaLead` (`@/lib/meta-pixel`); `trackChatGptLead` (`@/lib/chatgpt-pixel`); `track`, `pushUserData` (`@/lib/gtm`); `appendUtms` (`@/lib/utm`).
- Produces:
  - `tema.ts`: `export const PD = { bg: "#0B0C0E", superficie: "#15171B", linea: "#262A31", texto: "#FFFFFF", suave: "#B8BDC6", acento: "#187bef", acentoClaro: "#4DA3FF", error: "#FF6B6B" } as const;`
  - `FormularioPack({ id?: string }): JSX.Element` — `id` por defecto `"solicitud"` (ancla de los CTA). Tras éxito llama a `router.push(PD_GRACIAS_PATH)` (`useRouter` de `next/navigation`).

Comportamiento:
- Paso 1 (nombre, empresa, web, email, teléfono) → botón «Siguiente» valida con `pasoUnoSchema` en cliente y muestra errores bajo cada campo; si todo va bien, pasa al paso 2.
- Barra de progreso arriba (`role="progressbar"`, `aria-valuenow` 1 o 2, `aria-valuemax` 2) y texto «Paso 1 de 2».
- **Los dos pasos están siempre en el DOM**; el inactivo lleva `hidden`. Así volver atrás no pierde nada y el `FormData` lleva todos los campos.
- Paso 2: selects (producto, facturación, presupuesto), chips de destinos como `<input type="checkbox" name="destinos" value=…>` estilizados con `aria-pressed` visual vía `:checked`, radios de muestras, checkbox `privacidad` con enlace a `/privacidad` (target `_blank`), botón «QUIERO MI PACK», enlace «← Volver», y debajo «Te respondemos en menos de 24 h».
- Trampa: `<input name="website_url" tabIndex={-1} autoComplete="off">` fuera de pantalla (como `Web299Form`).
- Al enviar: `eventId = newEventId()`, `fd.set("eventId")`, `fd.set("pageUrl", location.href)`, `appendUtms(fd)`; `startTransition` → `enviarSolicitudPack(fd)`. Botón `disabled={pending}` con texto «Enviando…». Si `ok`: `pushUserData`, `track("generate_lead", { form_location: "proveedores_deportivos" })`, `trackMetaLead(eventId)`, `trackChatGptLead(eventId)`, `router.push(PD_GRACIAS_PATH)`. Si no: errores por campo (si los hay, y si alguno es del paso 1, volver al paso 1) y mensaje general en `role="alert"` con enlace a `whatsapp` cuando venga.
- Estilo: tarjeta `background: PD.superficie`, `border: 2px solid PD.acento`, `boxShadow: "0 0 0 6px rgba(24,123,239,.15), 0 30px 80px -30px rgba(24,123,239,.55)"`; inputs oscuros (`#0F1114`, borde `PD.linea`, texto blanco, `text-[16px]` para que iOS no haga zoom); etiquetas `PD.suave`; errores `PD.error`; botón `background: PD.acento`, texto blanco, `font-extrabold text-[17px]`, ancho completo, `min-h-[52px]`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/proveedores-deportivos/__tests__/FormularioPack.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ enviar: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/proveedores-deportivos-action", () => ({ enviarSolicitudPack: m.enviar }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/lib/meta-pixel", () => ({ newEventId: () => "ev-1", trackMetaLead: vi.fn() }));
vi.mock("@/lib/chatgpt-pixel", () => ({ trackChatGptLead: vi.fn() }));
vi.mock("@/lib/gtm", () => ({ track: vi.fn(), pushUserData: vi.fn() }));
vi.mock("@/lib/utm", () => ({ appendUtms: vi.fn() }));

import { FormularioPack } from "../FormularioPack";

function rellenarPasoUno() {
  fireEvent.change(screen.getByLabelText(/Nombre y apellidos/i), { target: { value: "Laura Gómez" } });
  fireEvent.change(screen.getByLabelText(/^Empresa/i), { target: { value: "Padel Pro" } });
  fireEvent.change(screen.getByLabelText(/Web o Instagram/i), { target: { value: "@padelpro" } });
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "laura@padelpro.es" } });
  fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: "600112233" } });
}

beforeEach(() => {
  m.enviar.mockReset();
  m.push.mockReset();
});

describe("FormularioPack", () => {
  test("no pasa al paso 2 con el paso 1 incompleto", () => {
    render(<FormularioPack />);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText(/Escribe tu nombre y apellidos/i)).toBeInTheDocument();
  });

  test("volver al paso 1 conserva lo escrito y los chips", () => {
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    fireEvent.click(screen.getByLabelText("Gimnasios"));
    fireEvent.click(screen.getByRole("button", { name: /Volver/i }));
    expect(screen.getByLabelText(/Nombre y apellidos/i)).toHaveValue("Laura Gómez");
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByLabelText("Gimnasios")).toBeChecked();
  });

  test("envía una sola vez y lleva a la página de gracias", async () => {
    let resolver!: (v: { ok: true }) => void;
    m.enviar.mockReturnValue(new Promise((r) => (resolver = r)));
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    const enviar = screen.getByRole("button", { name: /QUIERO MI PACK/i });
    fireEvent.submit(enviar.closest("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: /Enviando/i })).toBeDisabled());
    fireEvent.submit(enviar.closest("form")!);
    resolver({ ok: true });
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/proveedores-deportivos/gracias"));
    expect(m.enviar).toHaveBeenCalledTimes(1);
  });

  test("si falla, avisa con enlace a WhatsApp", async () => {
    m.enviar.mockResolvedValue({ ok: false, error: "No hemos podido enviar tu solicitud.", whatsapp: "https://wa.me/34657559397" });
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    fireEvent.submit(screen.getByRole("button", { name: /QUIERO MI PACK/i }).closest("form")!);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No hemos podido enviar");
    expect(alerta.querySelector("a")).toHaveAttribute("href", "https://wa.me/34657559397");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/proveedores-deportivos/__tests__/FormularioPack.test.tsx`
Expected: FAIL — no se resuelve `../FormularioPack`.

- [ ] **Step 3: Implement `tema.ts` and `FormularioPack.tsx`** following the behaviour list above. Key structure:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { pushUserData, track } from "@/lib/gtm";
import { trackChatGptLead } from "@/lib/chatgpt-pixel";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { appendUtms } from "@/lib/utm";
import { enviarSolicitudPack } from "@/lib/proveedores-deportivos-action";
import {
  PD_DESTINOS, PD_FACTURACION, PD_GRACIAS_PATH, PD_MUESTRAS, PD_PRESUPUESTO, PD_PRODUCTOS,
  pasoUnoSchema, type ErroresSolicitud,
} from "@/lib/proveedores-deportivos";
import { PD } from "./tema";

const CAMPOS_PASO_UNO = ["nombre", "empresa", "web", "email", "telefono"] as const;

export function FormularioPack({ id = "solicitud" }: { id?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [errores, setErrores] = useState<ErroresSolicitud>({});
  const [aviso, setAviso] = useState<{ error: string; whatsapp?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const enviando = useRef(false); // freno síncrono: `pending` tarda un render en llegar

  function siguiente() {
    const fd = new FormData(formRef.current!);
    const r = pasoUnoSchema.safeParse(Object.fromEntries(CAMPOS_PASO_UNO.map((k) => [k, String(fd.get(k) ?? "")])));
    if (!r.success) {
      const e: ErroresSolicitud = {};
      for (const i of r.error.issues) e[i.path[0] as keyof ErroresSolicitud] ??= i.message;
      setErrores(e);
      return;
    }
    setErrores({});
    setPaso(2);
  }

  function enviar(fd: FormData) {
    if (enviando.current) return;
    enviando.current = true;
    const eventId = newEventId();
    fd.set("eventId", eventId);
    fd.set("pageUrl", window.location.href);
    appendUtms(fd);
    setAviso(null);
    startTransition(async () => {
      const r = await enviarSolicitudPack(fd);
      if (r.ok) {
        pushUserData({ email: String(fd.get("email") ?? ""), phone: String(fd.get("telefono") ?? "") });
        track("generate_lead", { form_location: "proveedores_deportivos" });
        trackMetaLead(eventId);
        trackChatGptLead(eventId);
        router.push(PD_GRACIAS_PATH);
        return;
      }
      enviando.current = false;
      setErrores(r.errores ?? {});
      if (r.errores && CAMPOS_PASO_UNO.some((k) => r.errores?.[k])) setPaso(1);
      setAviso({ error: r.error, whatsapp: r.whatsapp });
    });
  }

  // …JSX: <form id={id} ref={formRef} action={enviar} noValidate …>
  //   barra de progreso, <div hidden={paso !== 1}>…</div>, <div hidden={paso !== 2}>…</div>,
  //   trampa website_url, aviso role="alert" con <a href={aviso.whatsapp}>Escríbenos por WhatsApp</a>
}
```

Cada campo es `<label>` envolviendo texto + control (así `getByLabelText` funciona) y, debajo, `{errores.x && <p style={{ color: PD.error }}>{errores.x}</p>}`. En el paso 2, el botón «← Volver» es `type="button"` y hace `setPaso(1)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/proveedores-deportivos/__tests__/FormularioPack.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/proveedores-deportivos
git commit -m "feat(deporte): formulario del pack en dos pasos con píxel y CAPI"
```

---

### Task 6: Layout `(deporte)`, piezas visuales y página de gracias

**Files:**
- Create: `src/app/(deporte)/layout.tsx`
- Create: `src/components/proveedores-deportivos/Iconos.tsx`
- Create: `src/components/proveedores-deportivos/Hueco.tsx`
- Create: `src/components/proveedores-deportivos/Contador.tsx`
- Create: `src/app/(deporte)/proveedores-deportivos/gracias/page.tsx`
- Test: `src/components/proveedores-deportivos/__tests__/piezas.test.tsx`

**Interfaces:**
- Consumes: `PD` (Task 5); `PD_PATH` (Task 1); `CONTACT_INFO` (`email`, `socials.whatsapp`); `WhatsAppBubble` (`@/components/layout/WhatsAppBubble`).
- Produces:
  - Layout que expone la fuente Anton como variable CSS `--font-pd-titulo` y clase utilitaria: usar en titulares `style={{ fontFamily: "var(--font-pd-titulo)" }}` o la clase `pd-titulo` definida en el layout con `<style>`; `uppercase`, `leading-[0.95]`, `tracking-[0.01em]`.
  - `Icono({ nombre, className? })` con `nombre: "megafono" | "crm" | "euro" | "puerta" | "feria" | "telefono" | "anuncio" | "filtro" | "caja" | "apreton" | "check" | "flecha"` — SVG 24×24, `stroke="currentColor"`, `strokeWidth={2.25}`, `fill="none"`, `aria-hidden`.
  - `Hueco({ children, bloque? })` — pinta `[TEXTO]` con `data-placeholder`, fondo `rgba(77,163,255,.12)`, borde `1px dashed #4DA3FF`, `rounded`, `px-1`.
  - `Contador({ valor, sufijo?, etiqueta })` — `valor: number | null`; con `null` pinta `<Hueco>[X]</Hueco>`; con número cuenta de 0 a `valor` en 1,2 s al entrar en pantalla (IntersectionObserver), sin animar con `prefers-reduced-motion` o sin IntersectionObserver (muestra el valor final desde el primer render del servidor y solo se reinicia a 0 en cliente si va a animar).

Layout: igual que `src/app/(growth)/layout.tsx` (léelo) pero con `PD.bg`/`PD.texto`, Anton cargada con `next/font/google` (`weight: "400"`, `variable: "--font-pd-titulo"`, `display: "swap"`), header mínimo con el logo `/img/logo/dinkbit.svg` en blanco (usar `className="brightness-0 invert"`) enlazando a `/`, y footer: logo, `CONTACT_INFO.email` (mailto), Aviso legal, Privacidad, Cookies. Incluir `<WhatsAppBubble />`. **No** añadir padding-bottom global: el CTA fijo móvil de Task 7 lo gestiona.

Gracias: `metadata = { title: "Solicitud recibida | dinkbit", robots: { index: false, follow: false } }`; titular «SOLICITUD RECIBIDA» en Anton; texto «Te respondemos en menos de 24 h con los siguientes pasos para tu campaña.»; botón principal WhatsApp (`PD.acento`) a la URL de WhatsApp con `?text=` = «Hola, acabo de pedir el Pack Campaña + CRM»; enlace secundario «Volver» a `PD_PATH`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/proveedores-deportivos/__tests__/piezas.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Contador } from "../Contador";
import { Hueco } from "../Hueco";
import GraciasPage from "@/app/(deporte)/proveedores-deportivos/gracias/page";

describe("piezas", () => {
  test("Hueco se marca como placeholder", () => {
    const { container } = render(<Hueco>[TESTIMONIO REAL]</Hueco>);
    expect(container.querySelector("[data-placeholder]")).toHaveTextContent("[TESTIMONIO REAL]");
  });

  test("Contador sin dato real enseña [X] y no inventa un número", () => {
    const { container } = render(<Contador valor={null} etiqueta="muestras enviadas" />);
    expect(container.querySelector("[data-placeholder]")).toHaveTextContent("[X]");
  });

  test("Contador con dato lo enseña entero sin IntersectionObserver (jsdom)", () => {
    render(<Contador valor={120} sufijo="+" etiqueta="centros" />);
    expect(screen.getByText("120+")).toBeInTheDocument();
  });

  test("la página de gracias lleva a WhatsApp con el texto ya escrito", () => {
    render(<GraciasPage />);
    const a = screen.getByRole("link", { name: /WhatsApp/i });
    expect(a.getAttribute("href")).toContain("wa.me");
    expect(decodeURIComponent(a.getAttribute("href")!)).toContain("Pack Campaña + CRM");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/proveedores-deportivos/__tests__/piezas.test.tsx`
Expected: FAIL — módulos no encontrados.

- [ ] **Step 3: Implement** los cinco ficheros según «Produces».

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/proveedores-deportivos && npx tsc --noEmit -p .`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(deporte)" src/components/proveedores-deportivos
git commit -m "feat(deporte): layout oscuro con Anton, piezas visuales y página de gracias"
```

---

### Task 7: La landing — secciones, CTA fijo y JSON-LD

**Files:**
- Create: `src/components/proveedores-deportivos/Secciones.tsx` (todas las secciones excepto el hero; si pasa de ~400 líneas, partir en `Secciones.tsx` + `Mockups.tsx`)
- Create: `src/components/proveedores-deportivos/Hero.tsx`
- Create: `src/components/proveedores-deportivos/CtaMovil.tsx`
- Create: `src/app/(deporte)/proveedores-deportivos/page.tsx`
- Test: `src/components/proveedores-deportivos/__tests__/Landing.test.tsx`

**Interfaces:**
- Consumes: todo lo de Tasks 1, 5 y 6; `AlAparecer` desde `@/app/(growth)/growth/_components/AlAparecer` (reutilizar, no copiar); fotos de Task 4.
- Produces: `LandingProveedoresDeportivos(): JSX.Element` exportado desde `Secciones.tsx`, que pinta todo en orden y que usa `page.tsx`.

Contenido, en este orden (textos exactos del spec y del brief; los que van entre corchetes son `<Hueco>`):

1. **Hero** (`Hero.tsx`, `min-h-[100svh]`): collage de 4 fotos `hero-*.webp` en el fondo (grid 2×2 con `next/image` `fill`, `sizes="50vw"`, `priority` y animación CSS `@keyframes` de desplazamiento lento de 0→-3% en 18 s alterno, desactivada con `@media (prefers-reduced-motion: reduce)`), capa `linear-gradient(180deg, rgba(11,12,14,.75), rgba(11,12,14,.95))`. Grid `lg:grid-cols-[1.1fr_1fr]`: izquierda badge `PD_BADGE` (fondo `PD.acento`, texto blanco), `h1` «Llenamos tu agenda de gimnasios y clubes que quieren tu producto» (Anton, `text-[44px] sm:text-[56px] lg:text-[72px]`), subtítulo «Campañas en Meta + muestras gratis = pedidos recurrentes de centros deportivos», 3 bullets con `Icono` (`megafono`, `crm`, `euro`): «Campaña en Meta lista para captar centros deportivos», «CRM para gestionar cada lead, muestra y pedido», `Todo por ${PD_PRECIO} ${PD_PRECIO_SUFIJO}`. Derecha: título «Solicita tu Pack Campaña + CRM» + `<FormularioPack />`.
2. **Cifras**: 3 `Contador` con `valor={null}` y etiquetas «muestras enviadas», «centros contactados», «% de muestras que acaban en pedido».
3. **El problema**: 3 tarjetas con foto (`gimnasio`, `pista-padel`, `box-crossfit`), icono (`puerta`, `feria`, `telefono`) y los tres textos del brief.
4. **Cómo funciona**: 4 pasos numerados (01–04, Anton, `PD.acentoClaro`), iconos `anuncio`, `filtro`, `caja`, `apreton`; `md:grid-cols-4` y vertical en móvil con línea conectora.
5. **Para quién es**: 6 tarjetas (`pista-padel`/Pádel, `equipaciones`/Equipaciones, `hero-toallas`/Merchandising, `hero-magnesio`/Consumibles de gimnasio, `suelo-gimnasio`/Suelos, `trofeos`/Trofeos), foto con overlay `rgba(11,12,14,.65)`, `hover:` y `focus-within:` borde y brillo `PD.acento`; `grid-cols-2 lg:grid-cols-3`.
6. **Ejemplo de anuncio**: móvil en CSS (marco redondeado `rounded-[2.5rem]`, borde 10 px `#1c1f24`, ancho 300 px, **sin rotación ni perspectiva**) con cabecera de post («tumarca · Publicidad»), foto `hero-pelotas.webp`, texto «¿Tienes un club de pádel? Te enviamos una caja de pelotas para probar en tus pistas», botón «Pedir muestra», y debajo una mini-tarjeta de formulario (Nombre del club, CIF o web, Teléfono). Al lado, texto «Así verán tu anuncio los centros deportivos».
7. **Casos**: 3 tarjetas con `<Hueco>[LOGO CLIENTE]</Hueco>`, `<Hueco>[TESTIMONIO REAL]</Hueco>`, `<Hueco>[RESULTADO]</Hueco>`.
8. **Precio** (`id="precio"`): tarjeta centrada con borde `PD.acento` y brillo; «Pack Campaña + CRM»; `PD_PRECIO` gigante en Anton + `PD_PRECIO_SUFIJO` pequeño; lista con `Icono nombre="check"` en `PD.acentoClaro`: las 4 líneas reales del brief + `<Hueco>[Gestión y optimización de la campaña]</Hueco>` + `<Hueco>[Informe de resultados]</Hueco>`; nota «La inversión publicitaria en Meta no está incluida» + `<Hueco>[presupuesto mínimo recomendado: X€/mes]</Hueco>`; botón «EMPEZAR AHORA» → `href="#solicitud"`. Al lado, mockup de portátil en CSS (de frente) con un kanban de 4 columnas «Muestra solicitada», «Muestra enviada», «Seguimiento», «Pedido» y tarjetas de ejemplo («Club Pádel Norte», «Gym Centro», «Box 21», «Estudio Pilates Sol»…) y una etiqueta visible «Ejemplo».
9. **FAQ**: `<details>`/`<summary>` por cada `PD_FAQS`; `a === null` → `<Hueco>[PLACEHOLDER]</Hueco>`.
10. **CTA final**: titular del hero otra vez + `Pack Campaña + CRM · ${PD_PRECIO} ${PD_PRECIO_SUFIJO}` + botón a `#solicitud`.

Cada sección envuelve sus tarjetas en `AlAparecer` con `retraso={i * 90}`.

`CtaMovil.tsx` (cliente): botón fijo `fixed inset-x-4 bottom-4 z-40 md:hidden` «QUIERO MI PACK» → `#solicitud`; se oculta (IntersectionObserver sobre `#solicitud`) mientras el formulario está visible; sin IntersectionObserver se queda visible. Añadir al final de la página un espaciador `h-20 md:hidden` para que el pie no quede tapado.

`page.tsx`: `metadata` (title/description de Task 1, `alternates.canonical: PD_PATH`, Open Graph con `siteName: "dinkbit"` y `images: ["/img/deporte/pista-padel.webp"]`), JSON-LD `Service` con `Offer` (`price: PD_PRECIO_NUMERO`, `priceCurrency: "EUR"`, `priceSpecification: { "@type": "UnitPriceSpecification", price: PD_PRECIO_NUMERO, priceCurrency: "EUR", unitText: "MONTH", valueAddedTaxIncluded: false }`, `provider: { "@id": "https://www.dinkbit.es/#organizacion" }`) y `FAQPage` **solo con las FAQ con `a !== null`**, ambos con `.replace(/</g, "\\u003c")` como en `src/app/(landing)/web-299/page.tsx`. Añadir a `src/app/sitemap.ts`, junto a la de web-299 (línea ~34): `{ path: "/proveedores-deportivos", priority: 0.9, changeFrequency: "weekly" },`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/proveedores-deportivos/__tests__/Landing.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/proveedores-deportivos-action", () => ({ enviarSolicitudPack: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { LandingProveedoresDeportivos } from "../Secciones";
import { PD_FAQS, PD_PRECIO, PD_PRECIO_SUFIJO } from "@/lib/proveedores-deportivos";

describe("LandingProveedoresDeportivos", () => {
  test("el precio aparece con su sufijo en badge, bullets, tarjeta y CTA final", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const texto = container.textContent!;
    const veces = texto.split(PD_PRECIO).length - 1;
    expect(veces).toBeGreaterThanOrEqual(4);
    expect(texto).toContain(PD_PRECIO_SUFIJO);
    expect(texto).not.toMatch(/\[\/mes\]/);
  });

  test("los datos que no tenemos se ven como placeholder y no se inventan", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const huecos = [...container.querySelectorAll("[data-placeholder]")].map((n) => n.textContent);
    expect(huecos).toEqual(expect.arrayContaining(["[TESTIMONIO REAL]", "[LOGO CLIENTE]", "[RESULTADO]", "[X]"]));
    const faqsSinRespuesta = PD_FAQS.filter((f) => f.a === null).length;
    expect(huecos.filter((h) => h === "[PLACEHOLDER]").length).toBe(faqsSinRespuesta);
  });

  test("todos los CTA llevan al formulario", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    expect(container.querySelector("form#solicitud")).not.toBeNull();
    const ctas = [...container.querySelectorAll('a[href="#solicitud"]')];
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/proveedores-deportivos/__tests__/Landing.test.tsx`
Expected: FAIL — no se resuelve `../Secciones`.

- [ ] **Step 3: Implement** `Hero.tsx`, `Secciones.tsx`, `CtaMovil.tsx`, `page.tsx` y la entrada del sitemap.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run src/components/proveedores-deportivos && npx tsc --noEmit -p . && npx eslint "src/app/(deporte)" src/components/proveedores-deportivos src/lib/proveedores-deportivos*.ts src/app/sitemap.ts`
Expected: PASS, sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(deporte)" src/components/proveedores-deportivos src/app/sitemap.ts
git commit -m "feat(deporte): landing del Pack Campaña + CRM para proveedores deportivos"
```

---

### Task 8: Verificación visual y build

**Files:** ninguno nuevo, salvo correcciones que salgan de la revisión.

- [ ] **Step 1: Build**

Run: `npx next build`
Expected: compila; `/proveedores-deportivos` y `/proveedores-deportivos/gracias` aparecen como estáticas (○).

- [ ] **Step 2: Arrancar** `npx next start -p 3100` (en segundo plano).

- [ ] **Step 3: Revisión con Playwright** (MCP `browser_*`) a 390×844 y a 1440×900, en `http://localhost:3100/proveedores-deportivos`:
  - captura de página completa en ambos tamaños; mirar las capturas;
  - sin scroll horizontal: `browser_evaluate` → `document.documentElement.scrollWidth <= window.innerWidth` es `true`;
  - texto sobre fotos legible (hero, tarjetas de problema y de «Para quién es»): si alguna capa no basta, oscurecerla;
  - en móvil, el CTA fijo se ve al bajar y desaparece al llegar al formulario;
  - formulario: «Siguiente» vacío muestra errores; con paso 1 relleno pasa al 2; «Volver» conserva los datos. **No enviar** (crearía un lead real).
  - `/proveedores-deportivos/gracias` en móvil.
  - Consola sin errores (`browser_console_messages`).

- [ ] **Step 4: Suite completa**

Run: `npx vitest run`
Expected: todo en verde.

- [ ] **Step 5: Commit de correcciones (si las hay)**

```bash
git add -A
git commit -m "fix(deporte): ajustes de la revisión visual"
```

**Antes de anunciar la landing** (no es código; avisar a Yael): crear en `/panel/ventas` la marca «Proveedores deportivos» con slug `proveedores-deportivos` y estado «activa».
