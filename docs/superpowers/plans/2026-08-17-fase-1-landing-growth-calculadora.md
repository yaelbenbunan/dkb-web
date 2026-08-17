# Landing /growth y calculadora de coste por paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una landing en `/growth` con una calculadora de coste por paciente que capture leads de clínicas en el CRM existente, con atribución de canal y medición en GA4 y Meta.

**Architecture:** Todo dentro de `dkb-web`. La landing va en el grupo de rutas `(landing)`, que ya aporta chrome reducido sin navegación. La lógica de cálculo se aísla en un módulo puro sin React para poder testearla sola. El lead se persiste con el patrón ya establecido: un builder en `web-lead-origin.ts` que fija la campaña y deriva el canal de las UTMs, y una server action con zod, honeypot y control de tiempo. No se crea ninguna tabla ni se toca Supabase.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind, zod, Vitest + jsdom + Testing Library, Supabase (existente), Resend, GTM/GA4, Meta CAPI.

**Spec:** [docs/growth/2026-08-17-fase-1-landing-calculadora-spec.md](../../growth/2026-08-17-fase-1-landing-calculadora-spec.md)

**Documento de producto:** [docs/growth/2026-08-17-sistema-clinicas-producto.md](../../growth/2026-08-17-sistema-clinicas-producto.md)

## Global Constraints

- **Nombre comercial provisional: `Growth`.** Ningún componente escribe el nombre literal; todos lo leen de `GROWTH.name` en `src/lib/growth-config.ts`.
- **Ruta: `/growth`.** Si cambia, hay que añadir un `redirect` 301 en `next.config.ts`.
- **Campaña fija en el CRM: `"Growth clínicas"`.** Literal exacto, usado para filtrar en el panel.
- **Estado inicial del lead: `"nuevo"`.** No se crea un estado nuevo en `lead-status.ts`.
- **El resultado NUNCA se muestra antes del paso de contacto.** Es requisito de negocio, no de UX.
- **Idioma de todo el texto de cara al usuario: español de España.** Comentarios de código en español, como el resto del repo.
- **Consentimiento obligatorio:** `z.literal(true)` en la server action, y `consent: true` en el lead.
- **Anti-spam:** honeypot con campo `website` que debe llegar vacío, y `formLoadedAt` con más de 2000 ms desde la carga.
- **Meta:** el `eventId` del píxel del navegador y el de la API de Conversiones tienen que ser el mismo, o Meta cuenta dos conversiones por lead.
- **Verificación final de cada tarea:** `npx vitest run` en verde, `npm run typecheck` limpio.

---

### Task 1: Módulo de cálculo y configuración

El núcleo de la fase. Función pura, sin React, sin acceso a red: es donde vive el riesgo real de bugs y donde los tests valen más.

**Files:**
- Create: `src/lib/growth-config.ts`
- Create: `src/lib/growth-calc.ts`
- Test: `src/lib/__tests__/growth-calc.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `GROWTH: { name: string; path: string; videoSrc: string | null }`
  - `type Rama = "A" | "B" | "C"`
  - `interface CalcInput { inversion: number | null; pacientes: number | null; ticket: number | null }`
  - `interface CalcResult { rama: Rama; costePorPaciente: number | null; generado: number | null; retorno: number | null; sinPacientes: boolean }`
  - `parseImporte(raw: string): number | null`
  - `calcular(input: CalcInput): CalcResult`

- [ ] **Step 1: Escribir el test de `parseImporte` (falla)**

Crear `src/lib/__tests__/growth-calc.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseImporte } from "../growth-calc";

describe("parseImporte", () => {
  test("número pelado", () => {
    expect(parseImporte("1500")).toBe(1500);
  });

  test("punto como separador de miles (formato español)", () => {
    expect(parseImporte("1.500")).toBe(1500);
    expect(parseImporte("1.500.000")).toBe(1500000);
  });

  test("coma como separador decimal", () => {
    expect(parseImporte("1500,50")).toBe(1500.5);
    expect(parseImporte("1.500,50")).toBe(1500.5);
  });

  test("punto como decimal cuando no son grupos de tres", () => {
    expect(parseImporte("1500.50")).toBe(1500.5);
    expect(parseImporte("0.5")).toBe(0.5);
  });

  test("ignora símbolos, espacios y texto", () => {
    expect(parseImporte(" 1 500 € ")).toBe(1500);
    expect(parseImporte("1500 euros")).toBe(1500);
  });

  test("vacío o sin dígitos devuelve null", () => {
    expect(parseImporte("")).toBeNull();
    expect(parseImporte("   ")).toBeNull();
    expect(parseImporte("no lo sé")).toBeNull();
  });

  test("negativos se tratan como no informados", () => {
    // Un importe negativo no significa nada aquí y colarlo produciría un
    // coste por paciente negativo en pantalla.
    expect(parseImporte("-300")).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/__tests__/growth-calc.test.ts`
Expected: FAIL — no existe el módulo `../growth-calc`.

- [ ] **Step 3: Crear `growth-config.ts`**

```ts
/**
 * Configuración de la landing de captación del sistema para clínicas.
 *
 * El nombre comercial está sin decidir (ver §14 del documento de producto), así
 * que vive aquí y NINGÚN componente lo escribe literal: cuando se decida, se
 * cambia en este fichero y ya. Lo mismo con la ruta, que además necesitaría un
 * redirect 301 en next.config.ts si cambiara.
 */
export const GROWTH = {
  /** Nombre comercial provisional. */
  name: "Growth",
  /** Ruta de la landing. */
  path: "/growth",
  /**
   * Fuente del vídeo del hero. Mientras sea null, la sección de vídeo no se
   * renderiza: la landing no debe esperar al vídeo para poder publicarse.
   */
  videoSrc: null as string | null,
} as const;
```

- [ ] **Step 4: Implementar `parseImporte` en `growth-calc.ts`**

```ts
/**
 * Cálculo del coste por paciente de la calculadora de /growth.
 *
 * Módulo puro a propósito: nada de React, nada de red. Es la pieza con más
 * riesgo de bug silencioso (divisiones por cero, NaN en pantalla, formatos de
 * número españoles) y así se puede testear sola.
 */

export type Rama = "A" | "B" | "C";

export interface CalcInput {
  /** null = "no invierto todavía". */
  inversion: number | null;
  /** null = "no lo sé". */
  pacientes: number | null;
  /** null = no lo quiso decir. */
  ticket: number | null;
}

export interface CalcResult {
  rama: Rama;
  costePorPaciente: number | null;
  generado: number | null;
  retorno: number | null;
  /** Invierte pero no le llega ningún paciente: mensaje propio dentro de la rama B. */
  sinPacientes: boolean;
}

/**
 * Normaliza un importe escrito a mano. Acepta formato español ("1.500,50"),
 * inglés ("1500.50"), con símbolos y con espacios.
 *
 * Regla para desambiguar el punto: si el último grupo tras un punto tiene
 * exactamente tres dígitos, es separador de miles; si no, es decimal. Eso
 * resuelve bien "1.500" (1500) y "1500.50" (1500,5). El caso "1.234" se
 * interpreta como 1234, que es lo correcto para importes en euros.
 */
export function parseImporte(raw: string): number | null {
  const limpio = (raw ?? "").replace(/[^\d.,-]/g, "");
  if (!limpio || !/\d/.test(limpio)) return null;
  const negativo = limpio.trimStart().startsWith("-");
  let s = limpio.replace(/-/g, "");

  if (s.includes(",")) {
    // La coma manda como decimal; los puntos son miles.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const grupos = s.split(".");
    const ultimo = grupos.length > 1 ? grupos[grupos.length - 1] : "";
    if (grupos.length > 1 && ultimo.length === 3) s = grupos.join("");
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  // Un importe negativo produciría un coste por paciente negativo en pantalla:
  // se trata como no informado.
  if (negativo || n < 0) return null;
  return n;
}
```

- [ ] **Step 5: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/__tests__/growth-calc.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/growth-config.ts src/lib/growth-calc.ts src/lib/__tests__/growth-calc.test.ts
git commit -m "feat(growth): normalización de importes de la calculadora"
```

- [ ] **Step 7: Escribir el test de `calcular` (falla)**

Añadir al final de `src/lib/__tests__/growth-calc.test.ts`:

```ts
import { calcular } from "../growth-calc";

describe("calcular", () => {
  test("rama A: sabe inversión y pacientes", () => {
    const r = calcular({ inversion: 1500, pacientes: 17, ticket: null });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(88.24);
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama A con ticket medio: generado y retorno", () => {
    const r = calcular({ inversion: 1000, pacientes: 10, ticket: 400 });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(100);
    expect(r.generado).toBe(4000);
    expect(r.retorno).toBe(4);
  });

  test("rama B: no sabe cuántos pacientes le llegan", () => {
    const r = calcular({ inversion: 1500, pacientes: null, ticket: 400 });
    expect(r.rama).toBe("B");
    expect(r.costePorPaciente).toBeNull();
    // Sin número de pacientes no se puede estimar lo generado.
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama B con cero pacientes: invierte y no llega nadie", () => {
    const r = calcular({ inversion: 1500, pacientes: 0, ticket: null });
    expect(r.rama).toBe("B");
    expect(r.sinPacientes).toBe(true);
    // Lo que nunca debe pasar: Infinity o NaN en pantalla.
    expect(r.costePorPaciente).toBeNull();
  });

  test("rama C: no invierte todavía", () => {
    const r = calcular({ inversion: null, pacientes: 5, ticket: 400 });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    // Esos pacientes existen y son orgánicos: se puede decir cuánto valen.
    expect(r.generado).toBe(2000);
    // Pero sin inversión no hay retorno que calcular.
    expect(r.retorno).toBeNull();
  });

  test("inversión cero se trata igual que no invertir", () => {
    expect(calcular({ inversion: 0, pacientes: 5, ticket: null }).rama).toBe("C");
  });

  test("números absurdos no rompen ni devuelven NaN", () => {
    const r = calcular({ inversion: 9_999_999, pacientes: 5000, ticket: 1 });
    expect(Number.isFinite(r.costePorPaciente as number)).toBe(true);
    expect(Number.isFinite(r.generado as number)).toBe(true);
  });

  test("todo desconocido: rama C, sin cifras", () => {
    const r = calcular({ inversion: null, pacientes: null, ticket: null });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
  });
});
```

- [ ] **Step 8: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/__tests__/growth-calc.test.ts`
Expected: FAIL — `calcular` no está exportada.

- [ ] **Step 9: Implementar `calcular`**

Añadir a `src/lib/growth-calc.ts`:

```ts
/** Redondeo a dos decimales, para que los tests sean deterministas y no salga
 *  "88.23529411764706" en pantalla. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Decide la rama del resultado y calcula lo que se pueda con lo que hay.
 *
 * Las tres ramas son discursos distintos, no grados del mismo:
 *   A: sabe sus números → se le da su coste por paciente.
 *   B: no sabe cuántos pacientes le llegan → "no se puede calcular, y eso es
 *      el hallazgo". Por volumen será la mayoritaria.
 *   C: no invierte todavía → crear demanda, no arreglar medición.
 */
export function calcular(input: CalcInput): CalcResult {
  const { inversion, pacientes, ticket } = input;
  const invierte = inversion !== null && inversion > 0;
  const sabePacientes = pacientes !== null;
  const sinPacientes = invierte && pacientes === 0;

  const generado =
    sabePacientes && pacientes > 0 && ticket !== null && ticket > 0
      ? redondear(pacientes * ticket)
      : null;

  if (!invierte) {
    return { rama: "C", costePorPaciente: null, generado, retorno: null, sinPacientes: false };
  }

  if (!sabePacientes || pacientes === 0) {
    return { rama: "B", costePorPaciente: null, generado: null, retorno: null, sinPacientes };
  }

  return {
    rama: "A",
    costePorPaciente: redondear((inversion as number) / pacientes),
    generado,
    retorno: generado !== null ? redondear(generado / (inversion as number)) : null,
    sinPacientes: false,
  };
}
```

- [ ] **Step 10: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/__tests__/growth-calc.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 11: Verificar tipos y commitear**

```bash
npm run typecheck
git add src/lib/growth-calc.ts src/lib/__tests__/growth-calc.test.ts
git commit -m "feat(growth): cálculo del coste por paciente y sus tres ramas"
```

---

### Task 2: Builder del lead

**Files:**
- Modify: `src/lib/web-lead-origin.ts` (añadir al final, junto a los otros builders)
- Test: `src/lib/__tests__/web-lead-origin.test.ts` (extender)

**Interfaces:**
- Consumes: `Rama` de `growth-calc.ts` (Task 1); `attribution()`, `UtmInput`, `WebhookLeadInput` ya existentes en el fichero.
- Produces: `growthLead(d, utm?): WebhookLeadInput`

- [ ] **Step 1: Escribir el test (falla)**

Añadir a `src/lib/__tests__/web-lead-origin.test.ts`:

```ts
import { growthLead } from "../web-lead-origin";

describe("growthLead", () => {
  const base = {
    name: "Ana Ruiz",
    email: "ana@clinica.com",
    phone: "600111222",
    inversion: 1500,
    pacientes: 17,
    ticket: 400,
    costePorPaciente: 88.24,
    rama: "A" as const,
  };

  test("sin UTMs: canal Web y campaña fija", () => {
    const lead = growthLead(base);
    expect(lead.channel).toBe("Web");
    expect(lead.campaign).toBe("Growth clínicas");
  });

  test("con UTMs de Google: el canal se sobrescribe, la campaña no", () => {
    const lead = growthLead(base, { utmSource: "google", utmCampaign: "clinicas-search" });
    expect(lead.channel).toBe("google ads");
    // La campaña se mantiene fija para poder filtrar todos sus leads juntos.
    expect(lead.campaign).toBe("Growth clínicas");
  });

  test("entra como lead comercial normal, no con estado propio", () => {
    expect(growthLead(base).status).toBe("nuevo");
  });

  test("registra el consentimiento", () => {
    expect(growthLead(base).consent).toBe(true);
  });

  test("las notas llevan las respuestas de la calculadora", () => {
    const notes = growthLead(base).notes ?? "";
    expect(notes).toContain("/growth");
    expect(notes).toContain("1500");
    expect(notes).toContain("17");
    expect(notes).toContain("400");
    expect(notes).toContain("88.24");
    expect(notes).toContain("Rama: A");
  });

  test("rama B: las notas dicen que no lo sabe, no dejan el hueco vacío", () => {
    const notes =
      growthLead({ ...base, pacientes: null, costePorPaciente: null, rama: "B" }).notes ?? "";
    expect(notes).toContain("no lo sabe");
    expect(notes).toContain("Rama: B");
  });

  test("rama C: las notas dicen que no invierte todavía", () => {
    const notes =
      growthLead({ ...base, inversion: null, costePorPaciente: null, rama: "C" }).notes ?? "";
    expect(notes).toContain("no invierte todavía");
    expect(notes).toContain("Rama: C");
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/__tests__/web-lead-origin.test.ts`
Expected: FAIL — `growthLead` no está exportada.

- [ ] **Step 3: Implementar el builder**

Añadir al final de `src/lib/web-lead-origin.ts`:

```ts
/** Campaña fija de la landing /growth, para filtrar todos sus leads juntos en
 *  el panel. Mismo criterio que "Kit Digital 2026". */
const GROWTH_CAMPAIGN = "Growth clínicas";

export function growthLead(
  d: {
    name: string;
    email: string;
    phone: string;
    /** null = "no invierto todavía". */
    inversion: number | null;
    /** null = "no lo sé". */
    pacientes: number | null;
    /** null = no lo quiso decir. */
    ticket: number | null;
    costePorPaciente: number | null;
    rama: "A" | "B" | "C";
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel } = attribution(utm, { channel: "Web", campaign: GROWTH_CAMPAIGN });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign: GROWTH_CAMPAIGN,
    // Lead comercial normal: recorre el pipeline existente (contactado →
    // propuesta → ganado). No necesita estado propio como sí lo necesitaba el
    // Kit Digital, que etiquetaba un tipo de interés y no una venta en curso.
    status: "nuevo",
    consent: true,
    // Las respuestas de la calculadora van a notas porque son el guion de la
    // llamada: quien contesta "no lo sé" necesita otra conversación que quien
    // contesta "88 €".
    notes: [
      "Origen: landing /growth (calculadora de coste por paciente)",
      `Inversión: ${d.inversion === null ? "no invierte todavía" : `${d.inversion} €/mes`}`,
      `Pacientes/mes: ${d.pacientes === null ? "no lo sabe" : d.pacientes}`,
      `Ticket medio: ${d.ticket === null ? "no lo dijo" : `${d.ticket} €`}`,
      `Coste por paciente: ${d.costePorPaciente === null ? "no calculable" : `${d.costePorPaciente} €`}`,
      `Rama: ${d.rama}`,
    ].join(" · "),
  };
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/__tests__/web-lead-origin.test.ts`
Expected: PASS, incluidos los 7 nuevos.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/lib/web-lead-origin.ts src/lib/__tests__/web-lead-origin.test.ts
git commit -m "feat(growth): builder del lead con campaña fija y respuestas en notas"
```

---

### Task 3: Plantilla del email de seguimiento

**Files:**
- Modify: `src/lib/lead-emails.ts` (añadir junto a los otros autoresponders)
- Test: `src/lib/__tests__/growth-email.test.ts`

**Interfaces:**
- Consumes: `BrandedEmailInput` de `email-layout.ts`; `Rama` de `growth-calc.ts`.
- Produces: `growthAutoresponder(input: { name?: string | null; rama: Rama; costePorPaciente: number | null }): BrandedEmailInput`

- [ ] **Step 1: Escribir el test (falla)**

Crear `src/lib/__tests__/growth-email.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { growthAutoresponder } from "../lead-emails";

describe("growthAutoresponder", () => {
  test("rama A: el email lleva su cifra por escrito", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "A", costePorPaciente: 88.24 });
    expect(mail.subject).toBeTruthy();
    expect(mail.intro).toContain("88,24");
    expect(mail.heading).toBeTruthy();
  });

  test("rama B: no inventa una cifra", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "B", costePorPaciente: null });
    expect(mail.intro).not.toMatch(/\d+,\d+\s*€/);
    expect(mail.intro.toLowerCase()).toContain("no se puede calcular");
  });

  test("rama C: habla de empezar a medir, no de un coste", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "C", costePorPaciente: null });
    expect(mail.intro).not.toMatch(/\d+,\d+\s*€/);
  });

  test("sin nombre no rompe", () => {
    expect(() =>
      growthAutoresponder({ name: null, rama: "A", costePorPaciente: 100 }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/__tests__/growth-email.test.ts`
Expected: FAIL — `growthAutoresponder` no está exportada.

- [ ] **Step 3: Implementar la plantilla**

Añadir a `src/lib/lead-emails.ts`:

```ts
/** Formato de euros en español: 88.24 → "88,24 €". */
function eurEs(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

/**
 * Calculadora de /growth. Le deja su resultado por escrito y abre hilo: es lo
 * que convierte, más que un "hemos recibido tus datos".
 */
export function growthAutoresponder(input: {
  name?: string | null;
  rama: "A" | "B" | "C";
  costePorPaciente: number | null;
}): BrandedEmailInput {
  const intro =
    input.rama === "A" && input.costePorPaciente !== null
      ? `según los datos que nos has dado, cada paciente nuevo te está costando alrededor de **${eurEs(input.costePorPaciente)}**. Es un cálculo con tus medias: lo que todavía no sabes es **qué campaña** te trae los pacientes que de verdad se quedan.`
      : input.rama === "B"
        ? "con los datos que tienes hoy, tu coste por paciente **no se puede calcular** — y eso es justo el hallazgo. No es un problema de tu publicidad, es que nadie está midiendo qué pasa entre el anuncio y la caja."
        : "todavía no inviertes en publicidad, así que no hay un coste por paciente que medir. Lo que sí se puede ver es cuántos pacientes estás dejando de captar.";

  return {
    subject: "Tu coste por paciente",
    eyebrow: "Diagnóstico",
    heading: "Esto es lo que sale",
    name: input.name,
    intro,
    preheader: "Te contamos qué hemos visto y qué haríamos.",
    bulletsLabel: "Lo que medimos contigo",
    bullets: [
      "Cuánto inviertes y cuántos leads entran, por canal",
      "Cuántos acaban con cita y cuántos acuden de verdad",
      "Cuánto dinero generan, y el retorno de cada campaña",
    ],
    cta: WHATSAPP_CTA,
  };
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/__tests__/growth-email.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/lib/lead-emails.ts src/lib/__tests__/growth-email.test.ts
git commit -m "feat(growth): email de seguimiento con el resultado por escrito"
```

---

### Task 4: Server action

**Files:**
- Create: `src/lib/growth-action.ts`
- Test: `src/lib/__tests__/growth-action.test.ts`

**Interfaces:**
- Consumes: `parseImporte`, `calcular` (Task 1); `growthLead` (Task 2); `growthAutoresponder` (Task 3); `createWebhookLead` de `imagina-leads.ts`; `utmFromFormData` de `web-lead-origin.ts`; `sendLeadAutoresponder`; `sendMetaLead`.
- Produces: `requestGrowth(formData: FormData): Promise<GrowthResult>` con
  `interface GrowthResult { ok: boolean; error?: string; resultado?: CalcResult }`

Los tres importes llegan como cadenas. **Cadena vacía significa la opción "no lo sé" / "no invierto todavía" / "prefiero no decirlo"**, así que no hacen falta banderas aparte: `parseImporte("")` devuelve `null`, que es exactamente lo que espera `calcular`.

- [ ] **Step 1: Escribir el test (falla)**

Crear `src/lib/__tests__/growth-action.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

// El action toca Supabase, Resend, Meta y las cabeceras de Next: se sustituyen
// todos para poder testear solo la validación y el encadenado.
vi.mock("../imagina-leads", () => ({
  createWebhookLead: vi.fn(async () => ({ ok: true, id: "lead-1" })),
}));
vi.mock("../lead-autoresponder", () => ({
  sendLeadAutoresponder: vi.fn(async () => ({ ok: true })),
}));
vi.mock("../meta-capi", () => ({ sendMetaLead: vi.fn(async () => ({ ok: true })) }));
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>(),
  cookies: async () => ({ get: () => undefined }),
}));

import { requestGrowth } from "../growth-action";
import { createWebhookLead } from "../imagina-leads";

/** FormData válido; cada test cambia lo que necesita. */
function fd(over: Record<string, string> = {}): FormData {
  const f = new FormData();
  const campos: Record<string, string> = {
    name: "Ana Ruiz",
    email: "ana@clinica.com",
    phone: "600111222",
    inversion: "1500",
    pacientes: "17",
    ticket: "400",
    consent: "true",
    website: "",
    // Muy por debajo de ahora: pasa el control de tiempo.
    formLoadedAt: String(Date.now() - 60_000),
    ...over,
  };
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("requestGrowth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("datos válidos: guarda el lead y devuelve el resultado", async () => {
    const res = await requestGrowth(fd());
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("A");
    expect(res.resultado?.costePorPaciente).toBe(88.24);
    expect(createWebhookLead).toHaveBeenCalledTimes(1);
  });

  test("campos vacíos de la calculadora = las opciones 'no lo sé'", async () => {
    const res = await requestGrowth(fd({ inversion: "", pacientes: "", ticket: "" }));
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("C");
  });

  test("sin consentimiento se rechaza y no guarda nada", async () => {
    const res = await requestGrowth(fd({ consent: "" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("honeypot relleno se rechaza en silencio", async () => {
    const res = await requestGrowth(fd({ website: "http://spam.example" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("envío demasiado rápido se rechaza", async () => {
    const res = await requestGrowth(fd({ formLoadedAt: String(Date.now()) }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("email inválido se rechaza", async () => {
    const res = await requestGrowth(fd({ email: "ana@" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("si falla el guardado, no se pierde el resultado del usuario", async () => {
    vi.mocked(createWebhookLead).mockResolvedValueOnce({ ok: false, error: "boom" });
    const res = await requestGrowth(fd());
    // El cálculo es suyo y ya lo ha "pagado" con sus datos: se le enseña igual.
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("A");
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `npx vitest run src/lib/__tests__/growth-action.test.ts`
Expected: FAIL — no existe `../growth-action`.

- [ ] **Step 3: Implementar el action**

```ts
"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { growthLead, utmFromFormData } from "./web-lead-origin";
import { sendLeadAutoresponder } from "./lead-autoresponder";
import { growthAutoresponder } from "./lead-emails";
import { sendMetaLead } from "./meta-capi";
import { calcular, parseImporte, type CalcResult } from "./growth-calc";

/**
 * Los tres importes llegan como cadena. Cadena vacía = la opción "no lo sé" /
 * "no invierto todavía" / "prefiero no decirlo", así que no hacen falta
 * banderas aparte: parseImporte("") devuelve null, que es lo que espera
 * calcular().
 */
const schema = z
  .object({
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z.string().trim().email("Email inválido"),
    phone: z.string().trim().min(6, "Teléfono demasiado corto"),
    inversion: z.string(),
    pacientes: z.string(),
    ticket: z.string(),
    consent: z.literal(true),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export interface GrowthResult {
  ok: boolean;
  error?: string;
  resultado?: CalcResult;
}

export async function requestGrowth(formData: FormData): Promise<GrowthResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    inversion: String(formData.get("inversion") ?? ""),
    pacientes: String(formData.get("pacientes") ?? ""),
    ticket: String(formData.get("ticket") ?? ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }
  const d = parsed.data;

  const inversion = parseImporte(d.inversion);
  const pacientes = parseImporte(d.pacientes);
  const ticket = parseImporte(d.ticket);
  const resultado = calcular({ inversion, pacientes, ticket });

  const saved = await createWebhookLead(
    growthLead(
      {
        name: d.name,
        email: d.email,
        phone: d.phone,
        inversion,
        pacientes,
        ticket,
        costePorPaciente: resultado.costePorPaciente,
        rama: resultado.rama,
      },
      utmFromFormData(formData),
    ),
  );

  // Best-effort de aquí abajo: el resultado ya es suyo y lo ha "pagado" con sus
  // datos. Que falle el correo o la conversión no puede quitárselo.
  await sendLeadAutoresponder({
    leadId: saved.id,
    to: d.email,
    mail: growthAutoresponder({
      name: d.name,
      rama: resultado.rama,
      costePorPaciente: resultado.costePorPaciente,
    }),
  });

  // Misma conversión que manda el píxel del navegador, con el mismo eventId:
  // sin él Meta contaría dos por lead.
  const eventId = String(formData.get("eventId") ?? "");
  if (eventId) {
    const h = await headers();
    const c = await cookies();
    await sendMetaLead({
      eventId,
      email: d.email,
      phone: d.phone,
      sourceUrl: String(formData.get("sourceUrl") ?? "") || null,
      userAgent: h.get("user-agent"),
      clientIp: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      fbp: c.get("_fbp")?.value ?? null,
      fbc: c.get("_fbc")?.value ?? null,
    });
  }

  return { ok: true, resultado };
}
```

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run src/lib/__tests__/growth-action.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add src/lib/growth-action.ts src/lib/__tests__/growth-action.test.ts
git commit -m "feat(growth): server action de la calculadora con validación y anti-spam"
```

---

### Task 5: Wizard de la calculadora

La pieza con el requisito de negocio más frágil: **el resultado no puede aparecer antes del paso de contacto**. Si una refactorización lo rompe, se dejan de capturar leads y no se nota mirando la pantalla — por eso hay un test dedicado.

**Files:**
- Create: `src/app/(landing)/growth/_components/CalculadoraWizard.tsx`
- Test: `src/app/(landing)/growth/_components/__tests__/CalculadoraWizard.test.tsx`

**Interfaces:**
- Consumes: `requestGrowth`, `GrowthResult` (Task 4); `GROWTH` (Task 1); `appendUtms` de `utm.ts`; `track`, `pushUserData` de `gtm.ts`; `newEventId`, `trackMetaLead` de `meta-pixel.ts`.
- Produces: `<CalculadoraWizard />`, sin props.

- [ ] **Step 1: Escribir el test (falla)**

Crear `src/app/(landing)/growth/_components/__tests__/CalculadoraWizard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const requestGrowth = vi.fn(async () => ({
  ok: true as const,
  resultado: {
    rama: "A" as const,
    costePorPaciente: 88.24,
    generado: 6800,
    retorno: 4.53,
    sinPacientes: false,
  },
}));
vi.mock("@/lib/growth-action", () => ({ requestGrowth: (fd: FormData) => requestGrowth(fd) }));
vi.mock("@/lib/gtm", () => ({ track: vi.fn(), pushUserData: vi.fn() }));
vi.mock("@/lib/meta-pixel", () => ({ newEventId: () => "evt-1", trackMetaLead: vi.fn() }));
vi.mock("@/lib/utm", () => ({ appendUtms: vi.fn() }));

import { CalculadoraWizard } from "../CalculadoraWizard";

describe("CalculadoraWizard", () => {
  beforeEach(() => vi.clearAllMocks());

  test("el resultado NO se muestra antes del paso de contacto", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/pacientes nuevos/i), "17");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/ticket medio/i), "400");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    // Estamos en el paso de contacto y la cifra no puede estar en pantalla.
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/88,24/)).not.toBeInTheDocument();
    expect(requestGrowth).not.toHaveBeenCalled();
  });

  test("«no lo sé» avanza sin escribir ningún número", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.click(screen.getByRole("button", { name: /no invierto todav/i }));
    expect(screen.getByLabelText(/pacientes nuevos/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /no lo sé/i }));
    expect(screen.getByLabelText(/ticket medio/i)).toBeInTheDocument();
  });

  test("tras enviar el contacto se muestra el resultado", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/pacientes nuevos/i), "17");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.click(screen.getByRole("button", { name: /prefiero no decirlo/i }));

    await user.type(screen.getByLabelText(/nombre/i), "Ana Ruiz");
    await user.type(screen.getByLabelText(/email/i), "ana@clinica.com");
    await user.type(screen.getByLabelText(/tel/i), "600111222");
    await user.click(screen.getByLabelText(/acepto/i));
    await user.click(screen.getByRole("button", { name: /ver mi resultado/i }));

    expect(requestGrowth).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/88,24/)).toBeInTheDocument();
  });

  test("el honeypot existe y está oculto", () => {
    const { container } = render(<CalculadoraWizard />);
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Ejecutar el test y comprobar que falla**

Run: `npx vitest run "src/app/(landing)/growth/_components/__tests__/CalculadoraWizard.test.tsx"`
Expected: FAIL — no existe `../CalculadoraWizard`.

Si `@testing-library/user-event` no estuviera instalado, instalarlo antes:
`npm i -D @testing-library/user-event`

- [ ] **Step 3: Implementar el wizard**

Componente cliente con cuatro pasos y resultado. Puntos no negociables: el estado `resultado` solo se rellena tras la respuesta del action; cada campo numérico tiene su botón de "no lo sé" que avanza dejando la cadena vacía; y el mismo `eventId` va al `FormData` y al píxel.

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { requestGrowth } from "@/lib/growth-action";
import type { CalcResult } from "@/lib/growth-calc";
import { track, pushUserData } from "@/lib/gtm";
import { newEventId, trackMetaLead } from "@/lib/meta-pixel";
import { appendUtms } from "@/lib/utm";

/** Euros en español: 88.24 → "88,24 €". */
function eur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

interface PasoNumerico {
  clave: "inversion" | "pacientes" | "ticket";
  etiqueta: string;
  ayuda: string;
  omitir: string;
}

const PASOS: PasoNumerico[] = [
  {
    clave: "inversion",
    etiqueta: "¿Cuánto inviertes al mes en publicidad?",
    ayuda: "Google, Meta, o lo que uses. Aproximado vale.",
    omitir: "No invierto todavía",
  },
  {
    clave: "pacientes",
    etiqueta: "¿Cuántos pacientes nuevos te llegan al mes de esa publicidad?",
    ayuda: "Pacientes que acaban viniendo, no formularios recibidos.",
    omitir: "No lo sé",
  },
  {
    clave: "ticket",
    etiqueta: "¿Cuál es tu ticket medio por paciente?",
    ayuda: "Nos sirve para calcular cuánto te generan. Es opcional.",
    omitir: "Prefiero no decirlo",
  },
];

export function CalculadoraWizard() {
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState({ inversion: "", pacientes: "", ticket: "" });
  const [resultado, setResultado] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const cargadoEn = useRef(Date.now());

  // Se anuncia desde el primer paso que al terminar ve su resultado: pedir el
  // contacto antes solo funciona si no se lee como cambiazo.
  const total = PASOS.length + 1;

  if (resultado) return <Resultado resultado={resultado} />;

  const actual = PASOS[paso];

  return (
    <div>
      <p>
        Paso {paso + 1} de {total} · Al terminar verás tu resultado
      </p>

      {actual ? (
        <div>
          <label htmlFor={actual.clave}>{actual.etiqueta}</label>
          <p>{actual.ayuda}</p>
          <input
            id={actual.clave}
            name={actual.clave}
            inputMode="decimal"
            value={valores[actual.clave]}
            onChange={(e) =>
              setValores((v) => ({ ...v, [actual.clave]: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() => {
              track("growth_calc_step", { step: actual.clave, skipped: false });
              setPaso((p) => p + 1);
            }}
          >
            Siguiente
          </button>
          <button
            type="button"
            onClick={() => {
              // La opción "no lo sé" deja el valor vacío, que el servidor
              // interpreta como null. No es un error de validación.
              setValores((v) => ({ ...v, [actual.clave]: "" }));
              track("growth_calc_step", { step: actual.clave, skipped: true });
              setPaso((p) => p + 1);
            }}
          >
            {actual.omitir}
          </button>
        </div>
      ) : (
        <form
          action={(fd) => {
            fd.set("inversion", valores.inversion);
            fd.set("pacientes", valores.pacientes);
            fd.set("ticket", valores.ticket);
            fd.set("formLoadedAt", String(cargadoEn.current));
            const eventId = newEventId();
            fd.set("eventId", eventId);
            fd.set("sourceUrl", window.location.href);
            appendUtms(fd);
            setError(null);
            startTransition(async () => {
              const res = await requestGrowth(fd);
              if (!res.ok || !res.resultado) {
                setError(res.error ?? "No se pudo enviar. Inténtalo de nuevo.");
                return;
              }
              pushUserData({
                email: String(fd.get("email") ?? ""),
                phone: String(fd.get("phone") ?? ""),
              });
              track("generate_lead", { form_location: "growth_calculadora" });
              trackMetaLead(eventId);
              setResultado(res.resultado);
            });
          }}
        >
          <label htmlFor="name">Nombre</label>
          <input id="name" name="name" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />

          <label htmlFor="phone">Teléfono</label>
          <input id="phone" name="phone" type="tel" required />

          <label htmlFor="consent">
            <input id="consent" name="consent" type="checkbox" value="true" required />
            Acepto que dinkbit me contacte sobre esta consulta
          </label>

          {/* Honeypot: invisible para personas, irresistible para bots. */}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          <button type="submit" disabled={pendiente}>
            {pendiente ? "Calculando…" : "Ver mi resultado"}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}

function Resultado({ resultado }: { resultado: CalcResult }) {
  if (resultado.rama === "A" && resultado.costePorPaciente !== null) {
    return (
      <div>
        <p>Cada paciente nuevo te está costando</p>
        <strong>{eur(resultado.costePorPaciente)}</strong>
        {resultado.retorno !== null && (
          <p>
            Por cada euro invertido recuperas{" "}
            {resultado.retorno.toFixed(2).replace(".", ",")} €.
          </p>
        )}
        <p>
          Es un cálculo con tus medias. Lo que no sabes es qué campaña te trae los
          pacientes buenos.
        </p>
      </div>
    );
  }

  if (resultado.rama === "B") {
    return (
      <div>
        <strong>No se puede calcular</strong>
        <p>
          {resultado.sinPacientes
            ? "Inviertes y no te está llegando nadie. Eso es lo primero que hay que mirar."
            : "Y eso es justo el hallazgo: nadie está midiendo qué pasa entre el anuncio y la caja."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <strong>Todavía no hay coste que medir</strong>
      <p>Pero sí hay pacientes que no están llegando. Esto es lo que verías si midieras.</p>
    </div>
  );
}
```

Los estilos siguen el patrón del repo (Tailwind con los tokens `text-fg`, `bg-accent`, `surface`); aquí se han omitido para que se lea la lógica. Al implementar, maquetar con las clases del proyecto y **conservar los `htmlFor`/`id` y los textos de los botones**, que son los que usan los tests.

- [ ] **Step 4: Ejecutar el test y comprobar que pasa**

Run: `npx vitest run "src/app/(landing)/growth/_components/__tests__/CalculadoraWizard.test.tsx"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
npm run typecheck
git add "src/app/(landing)/growth/_components/"
git commit -m "feat(growth): wizard de la calculadora con las tres ramas de resultado"
```

---

### Task 6: La landing y el sitemap

**Files:**
- Create: `src/app/(landing)/growth/page.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `GROWTH` (Task 1); `<CalculadoraWizard />` (Task 5); `Container`, `Reveal` ya existentes.
- Produces: la ruta `/growth`.

- [ ] **Step 1: Crear la página**

Componente de servidor con ocho secciones, en este orden exacto. Cada una con su titular literal:

| # | Sección | Titular | Contenido |
|---|---|---|---|
| 1 | Hero | `¿Sabes cuánto te cuesta conseguir un paciente nuevo?` | Subtítulo que reconoce lo que sí sabe (inversión, formularios) y señala lo que no (pacientes, dinero). Un solo CTA: "Calcúlalo gratis", ancla a `#calculadora`. **Sin precio.** |
| 2 | El agujero negro | `Entre el anuncio y la caja no hay nadie mirando` | El circuito `anuncio → web → formulario → ??? → paciente → facturación` con el hueco marcado visualmente. Es la sección que crea la necesidad. |
| 3 | Vídeo | — | Solo si `GROWTH.videoSrc` no es null. Si es null, no se renderiza nada. |
| 4 | Qué verías | `Esto es lo que verías cada mes` | Las cuatro cifras con datos de muestra: invertido, leads, pacientes que acudieron, generado, y el retorno. **Etiquetado visiblemente como ejemplo.** |
| 5 | Cómo funciona | `Captación, conversión, gestión e inteligencia` | Las cuatro capas, una línea cada una. |
| 6 | La oferta | `Desde 199 €/mes, sin permanencia` | Las **tres** cosas: la mensualidad, que no hay permanencia, y **que hay una cuota de alta que depende de tu inversión**. |
| 7 | Calculadora | `Calcula tu coste por paciente` | `id="calculadora"`, contiene `<CalculadoraWizard />`. |
| 8 | Cierre | — | `Vas a querer quedarte por los resultados, no porque te obliguemos.` |

La sección 6 es la que más fácil se estropea: publicar solo el "desde 199 €" y soltar la cuota de alta en la llamada rompe la confianza justo en el momento de cerrar, que es lo contrario de lo que vende este producto.

```tsx
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { GROWTH } from "@/lib/growth-config";
import { CalculadoraWizard } from "./_components/CalculadoraWizard";

export const metadata: Metadata = {
  title: "¿Sabes cuánto te cuesta conseguir un paciente? — dinkbit",
  description:
    "Conecta tus campañas, tu web y tu CRM y descubre qué canales te traen pacientes y cuáles solo leads. Desde 199 €/mes, sin permanencia.",
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "¿Sabes cuánto te cuesta conseguir un paciente?",
    description:
      "El sistema que mide de la campaña al paciente. Desde 199 €/mes, sin permanencia.",
    siteName: "dinkbit",
  },
};

export default function GrowthPage() {
  return (
    <>
      {/* Hero: abrir con el problema, nunca con el precio. */}
      <header>
        <Container>
          <h1>¿Sabes cuánto te cuesta conseguir un paciente nuevo?</h1>
          <p>
            Sabes cuánto inviertes. Sabes cuántos formularios recibes. Pero ¿sabes
            cuántos acabaron sentados en tu clínica, y cuánto dinero generaron?
          </p>
          <a href="#calculadora">Calcúlalo gratis</a>
        </Container>
      </header>

      {/* Secciones 2 a 6 de la tabla de arriba, cada una en su <section> con
          <Container> y envueltas en <Reveal>, siguiendo el patrón de
          KitDigitalSection.tsx. */}

      {GROWTH.videoSrc && (
        <section>
          <Container>
            <video src={GROWTH.videoSrc} controls playsInline />
          </Container>
        </section>
      )}

      <section id="calculadora">
        <Container>
          <Reveal>
            <CalculadoraWizard />
          </Reveal>
        </Container>
      </section>

      <section>
        <Container>
          <p>Vas a querer quedarte por los resultados, no porque te obliguemos.</p>
        </Container>
      </section>
    </>
  );
}
```

En la sección de la oferta, el texto debe decir **las tres cosas**: desde 199 €/mes, sin permanencia, y que hay una cuota de alta que depende de la inversión. Publicar solo el "desde 199 €" y soltar el alta en la llamada rompe la confianza en el momento de cerrar.

- [ ] **Step 2: Añadir la ruta al sitemap**

En `src/app/sitemap.ts`, dentro de `STATIC_ROUTES`:

```ts
{ path: "/growth", priority: 0.9, changeFrequency: "weekly" },
```

- [ ] **Step 3: Verificar en el navegador**

```bash
npm run dev
```

Comprobar en `http://localhost:3000/growth`:
- Cabecera reducida del grupo `(landing)`: logo y teléfono, sin navegación.
- Recorrer la calculadora entera con datos reales y ver el resultado.
- Recorrerla pulsando "No lo sé" y comprobar la rama B.
- Que el lead aparece en `/panel` con canal `Web` y campaña `Growth clínicas`.
- Que no hay desbordamiento horizontal a 390 px de ancho.

- [ ] **Step 4: Suite completa, tipos y build**

```bash
npx vitest run
npm run typecheck
npm run build
```
Expected: todo en verde. `/growth` debe aparecer en la salida del build como ruta estática.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(landing)/growth/page.tsx" src/app/sitemap.ts
git commit -m "feat(growth): landing de captación en /growth"
```

---

## Verificación final de la fase

- [ ] `npx vitest run` → toda la suite en verde (los 356 existentes más los nuevos).
- [ ] `npm run typecheck` → limpio.
- [ ] `npm run build` → `/growth` como ruta estática.
- [ ] Un lead de prueba aparece en `/panel` con campaña `Growth clínicas`.
- [ ] El email de seguimiento llega con la cifra correcta.
- [ ] Con `?utm_source=google&utm_campaign=test` el lead entra con canal `google ads`.
- [ ] El resultado no aparece en pantalla antes de enviar el contacto.

## Lo que queda fuera y por qué

- **El vídeo.** `GROWTH.videoSrc` en `null` y la sección no se renderiza. La landing sale sin él.
- **Cifras de muestra del dashboard de ejemplo.** Hay que sacarlas de un caso real vuestro para que sean creíbles; mientras no las haya, poner cifras redondas y etiquetadas como ejemplo.
- **El nombre comercial definitivo.** Una línea en `growth-config.ts` más un `redirect` en `next.config.ts`.
