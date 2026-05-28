# Imagina tu web v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/imagina-tu-web` preview to use OpenAI for text polish (`gpt-4o-mini`) and hero image generation (`gpt-image-1`), with two adaptive templates (informativa-editorial vs ecommerce-grid), a loading screen during generation, and graceful fallbacks if AI fails.

**Architecture:** Work on `staging` branch which already has the v1 infrastructure (wizard, steps, lead/rating actions, themes). Add new server action `generatePreview` that runs text + image generation in parallel (`Promise.allSettled`). Lead email is sent BEFORE calling AI so we never lose a lead. WebPreview switches between two new template components based on business type. SectorIllustration provides flat SVG visuals for ecommerce product cards (no per-tile AI to keep cost/latency down).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Zod, Resend (existing), `openai` SDK v5+ (new), `next/font/google` (existing — Inter, Space Grotesk, Playfair, Fraunces, Source Sans).

**Spec reference:** [docs/superpowers/specs/2026-05-25-imagina-tu-web-v2-design.md](../specs/2026-05-25-imagina-tu-web-v2-design.md)

---

## File Structure

```
src/lib/
├── openai-client.ts                      # NEW: thin OpenAI wrapper
├── preview-prompts.ts                    # NEW: pure prompt builders
├── preview-generate-action.ts            # NEW: server action (text + image in parallel)
├── preview-validation.ts                 # MODIFY: add CopyResponse schema
├── preview-themes.ts                     # KEEP from v1
├── preview-lead-action.ts                # KEEP from v1
├── preview-rating-action.ts              # KEEP from v1
├── preview-lead-id.ts                    # KEEP from v1
└── __tests__/
    ├── openai-client.test.ts             # NEW
    ├── preview-prompts.test.ts           # NEW
    ├── preview-validation.test.ts        # MODIFY: add copy schema tests
    └── preview-themes.test.ts            # KEEP
    └── preview-lead-id.test.ts           # KEEP

src/app/imagina-tu-web/
├── page.tsx                              # KEEP from v1
└── _components/
    ├── PreviewWizard.tsx                 # MODIFY: add generating state
    ├── PreviewLoading.tsx                # NEW
    ├── WebPreview.tsx                    # REWRITE: switch templates
    ├── templates/
    │   ├── InformativaTemplate.tsx       # NEW
    │   └── EcommerceTemplate.tsx         # NEW
    ├── SectorIllustration.tsx            # NEW
    ├── RatingBar.tsx                     # KEEP from v1
    └── steps/                             # KEEP all 6 from v1
```

---

## Task 1: Branch setup and v1 baseline sync

We start from `staging` (which has v1) and pull in the ecommerce-content fix from `main` so the working branch is up to date.

**Files:** none modified by this task; pure git.

- [ ] **Step 1: Switch to staging**

```bash
git checkout staging
```
Expected: switched to staging, working tree clean.

- [ ] **Step 2: Merge main into staging to pick up the ecommerce fix**

```bash
git fetch origin main
git merge origin/main --no-edit
```
Expected: merge commit OR clean fast-forward if no divergence on staging since last sync. If there's a conflict on `src/lib/types.ts` (because v1 doesn't touch it and main added heroTitle/heroSubtitle), accept both — the new fields stay.

- [ ] **Step 3: Verify v1 still builds and tests pass**

Run: `npm test && npm run typecheck`
Expected: all tests pass (25 from v1), typecheck clean.

- [ ] **Step 4: No commit needed for git-only step.**

(The merge above produces its own commit if non-FF, otherwise nothing.)

---

## Task 2: Install OpenAI SDK

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install latest stable openai SDK**

```bash
npm install openai
```
Expected: openai (>=5.x) added to dependencies. package-lock.json updated.

- [ ] **Step 2: Verify install**

Run: `node -e "console.log(require('openai').OpenAI.name)"`
Expected: prints `OpenAI`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add openai sdk for imagina preview generation"
```

---

## Task 3: openai-client.ts (thin wrapper)

A thin module that exposes `getOpenAIClient()` returning a configured `OpenAI` instance or `null` if the API key is missing. This isolates env-var handling and makes testing easy.

**Files:**
- Create: `src/lib/openai-client.ts`
- Create: `src/lib/__tests__/openai-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/openai-client.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getOpenAIClient } from "@/lib/openai-client";

describe("openai-client", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns null when OPENAI_API_KEY is missing", () => {
    expect(getOpenAIClient()).toBeNull();
  });

  it("returns null when OPENAI_API_KEY is empty string", () => {
    process.env.OPENAI_API_KEY = "";
    expect(getOpenAIClient()).toBeNull();
  });

  it("returns a client instance when key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test-123";
    const c = getOpenAIClient();
    expect(c).not.toBeNull();
    expect(typeof c?.chat?.completions?.create).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- openai-client`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the wrapper**

```ts
// src/lib/openai-client.ts
import OpenAI from "openai";

let cached: OpenAI | null = null;
let cachedForKey: string | undefined = undefined;

export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    cached = null;
    cachedForKey = undefined;
    return null;
  }
  if (cached && cachedForKey === key) return cached;
  cached = new OpenAI({ apiKey: key });
  cachedForKey = key;
  return cached;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- openai-client`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai-client.ts src/lib/__tests__/openai-client.test.ts
git commit -m "feat(imagina): openai-client wrapper with optional-key behavior"
```

---

## Task 4: preview-prompts.ts (pure prompt builders)

Two pure functions: `buildCopyPrompt(input)` returns the string prompt for the text LLM, `buildImagePrompt(input)` returns the prompt for the image model. Pure → easy to snapshot-test.

**Files:**
- Create: `src/lib/preview-prompts.ts`
- Create: `src/lib/__tests__/preview-prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/preview-prompts.test.ts
import { describe, it, expect } from "vitest";
import {
  buildCopyPrompt,
  buildImagePrompt,
  type PromptInput,
} from "@/lib/preview-prompts";

const baseInput: PromptInput = {
  businessName: "La Tiendita",
  sectorLabel: "Moda",
  businessType: "ecommerce",
  ecommerceKind: "productos",
  offerings: ["camisetas", "sudaderas", "gorras"],
  valueProp: "Hacemos prendas artesanales con materiales sostenibles desde 2010.",
  paletteSlug: "pastel-suave",
  paletteAccent: "#c084fc",
  template: "ecommerce",
};

describe("buildCopyPrompt", () => {
  it("includes the business name, sector, and value prop", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p).toContain("La Tiendita");
    expect(p).toContain("Moda");
    expect(p).toContain("prendas artesanales");
  });

  it("includes each offering", () => {
    const p = buildCopyPrompt(baseInput);
    for (const o of baseInput.offerings) {
      expect(p).toContain(o);
    }
  });

  it("declares the no-invented-data rule", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p.toLowerCase()).toContain("no inventes");
  });

  it("requests Spanish from Spain", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p.toLowerCase()).toMatch(/espa[ñn]a/);
  });
});

describe("buildImagePrompt", () => {
  it("mentions sector and palette accent color", () => {
    const p = buildImagePrompt(baseInput);
    expect(p.toLowerCase()).toContain("moda");
    expect(p.toLowerCase()).toContain("c084fc");
  });

  it("explicitly bans people faces, text, logos", () => {
    const p = buildImagePrompt(baseInput);
    expect(p.toLowerCase()).toContain("no people");
    expect(p.toLowerCase()).toContain("no text");
    expect(p.toLowerCase()).toContain("no logos");
  });

  it("picks portrait for informativa and landscape for ecommerce", () => {
    const informativa = buildImagePrompt({
      ...baseInput,
      businessType: "informativa",
      template: "informativa",
    });
    expect(informativa.toLowerCase()).toContain("portrait");

    const ecommerce = buildImagePrompt(baseInput);
    expect(ecommerce.toLowerCase()).toContain("landscape");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- preview-prompts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builders**

```ts
// src/lib/preview-prompts.ts
export interface PromptInput {
  businessName: string;
  sectorLabel: string;
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  offerings: string[];
  valueProp: string;
  paletteSlug: string;
  paletteAccent: string;
  template: "informativa" | "ecommerce";
}

export function buildCopyPrompt(input: PromptInput): string {
  const tipo =
    input.businessType === "ecommerce"
      ? `Ecommerce — ${input.ecommerceKind ?? "productos"}`
      : "Web informativa";

  return [
    "Eres copywriter web especializado en convertir visitas en clientes.",
    "El usuario rellenó un cuestionario para generar un preview de su web.",
    "Genera copy NATURAL Y CONFIABLE en español de España para su home.",
    "",
    `Negocio: ${input.businessName}`,
    `Sector: ${input.sectorLabel}`,
    `Tipo: ${tipo}`,
    `Oferta: ${input.offerings.join(", ")}`,
    `Valor agregado escrito por el usuario: "${input.valueProp}"`,
    "",
    "Reglas:",
    "- NO inventes datos numéricos, años de experiencia, certificaciones,",
    "  premios ni clientes específicos.",
    "- Usa el valor agregado del usuario como insumo, pero reescríbelo mejor.",
    "- Tono profesional cercano, sin marketing-speak vacío",
    "  (prohibido: 'revolucionario', 'líder', 'mejor del mercado', 'pasión').",
    "- Español de España: 'ordenador' no 'computadora', 'móvil' no 'celular'.",
    "- heroHeadline: gancho corto que enganche, no descripción larga.",
    "- heroTagline: una frase que explique qué hace el negocio y por qué",
    "  elegirlo.",
    "- offerings[].blurb: una frase concreta sobre ese producto/servicio,",
    "  no genericidades.",
    "",
    "RESPONDE ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto extra)",
    "con esta forma exacta:",
    "{",
    '  "heroHeadline": string (8-80 chars),',
    '  "heroTagline": string (20-220 chars),',
    '  "ctaText": string (1-40 chars),',
    '  "sectionTitle": string (2-60 chars),',
    '  "offerings": [{ "name": string, "blurb": string (20-160 chars) }, ...]',
    "}",
    `Debes devolver EXACTAMENTE ${input.offerings.length} entradas en "offerings",`,
    "una por cada producto/servicio listado arriba, en el mismo orden.",
  ].join("\n");
}

export function buildImagePrompt(input: PromptInput): string {
  const orientation =
    input.template === "informativa"
      ? "Portrait orientation, subject centered in frame."
      : "Landscape 16:9 orientation, subject slightly right-of-center to allow text overlay on the left.";

  const composition =
    input.template === "informativa"
      ? "Editorial magazine still life, calm composition."
      : "Wide cinematic banner, environmental shot.";

  const sectorHint = sectorSubjectHint(input.sectorLabel);
  const accentHex = input.paletteAccent.replace("#", "").toLowerCase();

  return [
    `Professional hero image for a ${input.sectorLabel} business website.`,
    "Style: clean modern editorial photography, soft natural lighting,",
    `color palette aligned with accent hex ${accentHex}.`,
    composition,
    `Subject: ${sectorHint}.`,
    orientation,
    "Constraints: NO people faces visible, NO text in image, NO logos,",
    "NO watermarks, NO UI elements, NO charts or graphs.",
  ].join(" ");
}

function sectorSubjectHint(label: string): string {
  const map: Record<string, string> = {
    Salud:
      "soft minimal clinic interior or natural wellness objects, abstract not literal",
    Educación: "open notebook, light coming from window, no faces, no text",
    Restauración:
      "warm restaurant tabletop with natural ingredients, soft styling",
    Moda: "clean fabric textures or fashion still life, no models",
    Tecnología:
      "abstract geometric shapes, soft gradient, modern tech aesthetic, no devices with screens",
    "Servicios profesionales":
      "minimal modern office setting, plants, neutral palette, no people",
    Otro: "abstract minimal scene with organic shapes",
  };
  return map[label] ?? map["Otro"];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- preview-prompts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-prompts.ts src/lib/__tests__/preview-prompts.test.ts
git commit -m "feat(imagina): pure prompt builders for text and image generation"
```

---

## Task 5: Update preview-validation.ts (add CopyResponse + GenerateInput schemas)

Add two Zod schemas: `copyResponseSchema` (what the LLM must return) and `previewGenerateInputSchema` (what the server action accepts).

**Files:**
- Modify: `src/lib/preview-validation.ts`
- Modify: `src/lib/__tests__/preview-validation.test.ts`

- [ ] **Step 1: Append the new schemas to preview-validation.ts**

Append at the bottom of `src/lib/preview-validation.ts`:

```ts
// ---- v2: AI generation schemas ----

export const copyResponseSchema = z.object({
  heroHeadline: z.string().trim().min(8).max(80),
  heroTagline: z.string().trim().min(20).max(220),
  ctaText: z.string().trim().min(1).max(40),
  sectionTitle: z.string().trim().min(2).max(60),
  offerings: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        blurb: z.string().trim().min(20).max(160),
      }),
    )
    .min(1)
    .max(6),
});
export type CopyResponse = z.infer<typeof copyResponseSchema>;

export const previewGenerateInputSchema = z.object({
  businessType: z.enum(["informativa", "ecommerce"]),
  ecommerceKind: z.enum(["productos", "servicios"]).optional(),
  businessName: z.string().trim().min(2).max(60),
  sector: z.string().refine(isSectorSlug),
  offerings: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
  palette: z.string().refine(isPaletteSlug),
  typography: z.string().refine(isTypographySlug),
  valueProp: z.string().trim().min(20).max(500),
});
export type PreviewGenerateInput = z.infer<typeof previewGenerateInputSchema>;
```

- [ ] **Step 2: Add tests for both new schemas**

Append at the end of `src/lib/__tests__/preview-validation.test.ts`:

```ts
import {
  copyResponseSchema,
  previewGenerateInputSchema,
} from "@/lib/preview-validation";

const validCopyResponse = {
  heroHeadline: "Tu negocio, en su mejor versión",
  heroTagline: "Diseñamos webs que enamoran y venden desde el primer clic.",
  ctaText: "Empezar ahora",
  sectionTitle: "Lo que hacemos",
  offerings: [
    { name: "Asesoría", blurb: "Te ayudamos a definir la estrategia digital correcta." },
  ],
};

describe("copyResponseSchema", () => {
  it("accepts a valid response", () => {
    expect(copyResponseSchema.safeParse(validCopyResponse).success).toBe(true);
  });

  it("rejects too-short headline", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      heroHeadline: "Hi",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty offerings", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      offerings: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 6 offerings", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      offerings: Array.from({ length: 7 }, (_, i) => ({
        name: `n${i}`,
        blurb: "Una descripción larga de al menos 20 chars.",
      })),
    });
    expect(r.success).toBe(false);
  });
});

const validGenerateInput = {
  businessType: "ecommerce" as const,
  ecommerceKind: "productos" as const,
  businessName: "La Tiendita",
  sector: "moda",
  offerings: ["camisetas", "gorras"],
  palette: "pastel-suave",
  typography: "moderna-sans",
  valueProp:
    "Hacemos prendas artesanales con materiales sostenibles desde 2010.",
};

describe("previewGenerateInputSchema", () => {
  it("accepts valid input", () => {
    expect(previewGenerateInputSchema.safeParse(validGenerateInput).success).toBe(
      true,
    );
  });

  it("rejects unknown sector", () => {
    const r = previewGenerateInputSchema.safeParse({
      ...validGenerateInput,
      sector: "ufo",
    });
    expect(r.success).toBe(false);
  });

  it("rejects too-short valueProp", () => {
    const r = previewGenerateInputSchema.safeParse({
      ...validGenerateInput,
      valueProp: "corto",
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- preview-validation`
Expected: PASS (all old tests + 7 new = 23 total).

- [ ] **Step 4: Commit**

```bash
git add src/lib/preview-validation.ts src/lib/__tests__/preview-validation.test.ts
git commit -m "feat(imagina): add copy response + generate input schemas"
```

---

## Task 6: preview-generate-action.ts (server action)

Server action that orchestrates the two OpenAI calls in parallel. No unit test (integration tested in browser smoke test).

**Files:**
- Create: `src/lib/preview-generate-action.ts`

- [ ] **Step 1: Implement the action**

```ts
// src/lib/preview-generate-action.ts
"use server";

import type OpenAI from "openai";
import { getOpenAIClient } from "./openai-client";
import {
  buildCopyPrompt,
  buildImagePrompt,
  type PromptInput,
} from "./preview-prompts";
import {
  copyResponseSchema,
  previewGenerateInputSchema,
  type CopyResponse,
  type PreviewGenerateInput,
} from "./preview-validation";
import { getPalette, getSectorLabel } from "./preview-themes";

export interface PreviewGenerateResult {
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
  error?: string;
}

export async function generatePreview(
  input: PreviewGenerateInput,
): Promise<PreviewGenerateResult> {
  const parsed = previewGenerateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      copy: null,
      heroImageDataUrl: null,
      error: "Datos inválidos para generar el preview.",
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    console.error("Missing OPENAI_API_KEY — preview will use fallbacks.");
    return { copy: null, heroImageDataUrl: null };
  }

  const palette = getPalette(parsed.data.palette);
  if (!palette) {
    return { copy: null, heroImageDataUrl: null };
  }

  const template: "informativa" | "ecommerce" =
    parsed.data.businessType === "ecommerce" ? "ecommerce" : "informativa";

  const promptInput: PromptInput = {
    businessName: parsed.data.businessName,
    sectorLabel: getSectorLabel(parsed.data.sector),
    businessType: parsed.data.businessType,
    ecommerceKind: parsed.data.ecommerceKind,
    offerings: parsed.data.offerings,
    valueProp: parsed.data.valueProp,
    paletteSlug: palette.slug,
    paletteAccent: palette.accent,
    template,
  };

  const [copyRes, imageRes] = await Promise.allSettled([
    generateCopy(client, promptInput),
    generateHeroImage(client, promptInput),
  ]);

  return {
    copy: copyRes.status === "fulfilled" ? copyRes.value : null,
    heroImageDataUrl: imageRes.status === "fulfilled" ? imageRes.value : null,
  };
}

async function generateCopy(
  client: OpenAI,
  promptInput: PromptInput,
): Promise<CopyResponse | null> {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente que responde únicamente con JSON válido, sin markdown ni texto extra.",
        },
        { role: "user", content: buildCopyPrompt(promptInput) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("generateCopy: invalid JSON from OpenAI:", err);
      return null;
    }
    const validated = copyResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(
        "generateCopy: response failed schema validation:",
        validated.error.issues,
      );
      return null;
    }
    return validated.data;
  } catch (err) {
    console.error("generateCopy failed:", err);
    return null;
  }
}

async function generateHeroImage(
  client: OpenAI,
  promptInput: PromptInput,
): Promise<string | null> {
  try {
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: buildImagePrompt(promptInput),
      size:
        promptInput.template === "informativa" ? "1024x1536" : "1536x1024",
      quality: "medium",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error("generateHeroImage failed:", err);
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/preview-generate-action.ts
git commit -m "feat(imagina): generatePreview server action (text + image parallel)"
```

---

## Task 7: SectorIllustration.tsx (7 SVG variants)

Pure presentational component. Receives sector slug + palette, renders an inline SVG colored with palette tones. Used inside ecommerce template cards instead of an AI image per card.

**Files:**
- Create: `src/app/imagina-tu-web/_components/SectorIllustration.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// src/app/imagina-tu-web/_components/SectorIllustration.tsx
"use client";

import type { CSSProperties } from "react";

interface Props {
  sector: string;
  paletteAccent: string;
  paletteSurface: string;
  className?: string;
}

export function SectorIllustration({
  sector,
  paletteAccent,
  paletteSurface,
  className,
}: Props) {
  const style: CSSProperties = { color: paletteAccent, backgroundColor: paletteSurface };
  return (
    <div
      className={className ?? "flex aspect-video items-center justify-center rounded-lg"}
      style={style}
      aria-hidden
    >
      {renderSvg(sector)}
    </div>
  );
}

function renderSvg(sector: string) {
  const common = {
    width: 96,
    height: 96,
    viewBox: "0 0 96 96",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (sector) {
    case "salud":
      return (
        <svg {...common}>
          <path d="M48 22v52M22 48h52" />
          <rect x="16" y="16" width="64" height="64" rx="14" />
        </svg>
      );
    case "educacion":
      return (
        <svg {...common}>
          <path d="M16 38l32-14 32 14-32 14L16 38z" />
          <path d="M30 46v18c0 4 8 8 18 8s18-4 18-8V46" />
          <path d="M80 38v22" />
        </svg>
      );
    case "restauracion":
      return (
        <svg {...common}>
          <path d="M32 16v28a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8V16" />
          <path d="M40 16v22" />
          <path d="M64 16c-6 6-6 24 0 30v32" />
        </svg>
      );
    case "moda":
      return (
        <svg {...common}>
          <path d="M48 18a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
          <path d="M48 30L18 60h12l4 22h28l4-22h12L48 30z" />
        </svg>
      );
    case "tecnologia":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="6" />
          <circle cx="72" cy="24" r="6" />
          <circle cx="48" cy="72" r="6" />
          <path d="M30 24h36M28 28L46 66M68 28L50 66" />
        </svg>
      );
    case "servicios":
      return (
        <svg {...common}>
          <rect x="14" y="30" width="68" height="48" rx="6" />
          <path d="M36 30v-8a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v8" />
          <path d="M14 52h68" />
        </svg>
      );
    case "otro":
    default:
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="28" />
          <circle cx="48" cy="48" r="14" />
        </svg>
      );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/SectorIllustration.tsx
git commit -m "feat(imagina): SectorIllustration with 7 flat SVG variants"
```

---

## Task 8: InformativaTemplate.tsx

Layout: split 50/50 hero with image on the right + numbered list of services below. Uses AI copy if available, fallback to user input.

**Files:**
- Create: `src/app/imagina-tu-web/_components/templates/InformativaTemplate.tsx`

- [ ] **Step 1: Implement the template**

```tsx
// src/app/imagina-tu-web/_components/templates/InformativaTemplate.tsx
"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
} from "@/lib/preview-themes";
import type { CopyResponse } from "@/lib/preview-validation";

export interface InformativaData {
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: InformativaData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function InformativaTemplate({ data, copy, heroImageDataUrl }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);
  if (!palette || !typo) return null;

  const wrapper: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const display: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const accentBtn: CSSProperties = {
    backgroundColor: palette.accent,
    color: "#fff",
  };
  const heroFallback: CSSProperties = {
    background: palette.heroGradient,
  };

  const headline = copy?.heroHeadline ?? data.businessName;
  const tagline = copy?.heroTagline ?? data.valueProp;
  const ctaText = copy?.ctaText ?? "Contáctanos";
  const sectionTitle = copy?.sectionTitle ?? "Lo que hacemos";
  const offerings =
    copy?.offerings ?? data.offerings.map((name) => ({ name, blurb: "" }));

  return (
    <div style={wrapper}>
      {/* Hero split */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-70"
              style={display}
            >
              {data.businessName}
            </p>
            <h1
              style={display}
              className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              {headline}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed opacity-90">
              {tagline}
            </p>
            <button
              type="button"
              style={accentBtn}
              className="mt-8 inline-flex h-12 items-center rounded-lg px-7 text-sm font-semibold shadow-md"
            >
              {ctaText} →
            </button>
          </div>
          <div className="relative">
            {heroImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageDataUrl}
                alt=""
                className="aspect-[3/4] w-full rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div
                style={heroFallback}
                className="aspect-[3/4] w-full rounded-2xl shadow-2xl"
                aria-hidden
              />
            )}
          </div>
        </div>
      </section>

      {/* Numbered services list */}
      <section className="px-6 py-12 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2
            style={display}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {sectionTitle}
          </h2>
          <ul className="divide-y" style={{ borderColor: palette.accent + "33" }}>
            {offerings.map((o, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr] gap-6 py-6 sm:gap-10"
                style={{ borderColor: palette.accent + "33" }}
              >
                <span
                  className="text-sm font-mono opacity-60"
                  style={display}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p style={display} className="text-xl font-semibold">
                    {o.name}
                  </p>
                  {o.blurb && (
                    <p className="mt-1 text-sm leading-relaxed opacity-80">
                      {o.blurb}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA band */}
      <section
        style={{ backgroundColor: palette.surface }}
        className="px-6 py-14 sm:px-12 sm:py-20"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 style={display} className="text-2xl font-bold sm:text-3xl">
            ¿Hablamos?
          </h2>
          <p className="opacity-80">Estamos a un mensaje de distancia.</p>
          <button
            type="button"
            style={accentBtn}
            className="inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold"
          >
            Escríbenos
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-6 text-xs opacity-70 sm:px-12"
        style={{ borderColor: palette.accent + "22" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {data.businessName}
          </span>
          <span className="flex gap-4">
            <span>Inicio</span>
            <span>Sobre nosotros</span>
            <span>Contacto</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/templates/InformativaTemplate.tsx
git commit -m "feat(imagina): InformativaTemplate (hero split + numbered list)"
```

---

## Task 9: EcommerceTemplate.tsx

Layout: full-width hero with image background, then large product/service grid using `SectorIllustration`.

**Files:**
- Create: `src/app/imagina-tu-web/_components/templates/EcommerceTemplate.tsx`

- [ ] **Step 1: Implement the template**

```tsx
// src/app/imagina-tu-web/_components/templates/EcommerceTemplate.tsx
"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
} from "@/lib/preview-themes";
import type { CopyResponse } from "@/lib/preview-validation";
import { SectorIllustration } from "../SectorIllustration";

export interface EcommerceData {
  businessName: string;
  sector: string;
  ecommerceKind?: "productos" | "servicios";
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: EcommerceData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function EcommerceTemplate({ data, copy, heroImageDataUrl }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);
  if (!palette || !typo) return null;

  const wrapper: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const display: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const accentBtn: CSSProperties = {
    backgroundColor: palette.accent,
    color: "#fff",
  };

  const isProducts = (data.ecommerceKind ?? "productos") === "productos";
  const headline = copy?.heroHeadline ?? data.businessName;
  const tagline = copy?.heroTagline ?? data.valueProp;
  const ctaText = copy?.ctaText ?? (isProducts ? "Ver productos" : "Reservar");
  const sectionTitle =
    copy?.sectionTitle ?? (isProducts ? "Nuestros productos" : "Nuestros servicios");
  const offerings =
    copy?.offerings ?? data.offerings.map((name) => ({ name, blurb: "" }));

  const heroBg: CSSProperties = heroImageDataUrl
    ? {
        backgroundImage: `linear-gradient(135deg, ${withAlpha(palette.bg, 0.7)} 0%, ${withAlpha(palette.bg, 0.45)} 60%, ${withAlpha(palette.bg, 0.85)} 100%), url(${heroImageDataUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: palette.heroGradient };

  return (
    <div style={wrapper}>
      {/* Full-width hero */}
      <section style={heroBg} className="px-6 py-20 sm:px-12 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
            style={display}
          >
            {data.businessName}
          </p>
          <h1
            style={display}
            className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            {headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed opacity-90">
            {tagline}
          </p>
          <button
            type="button"
            style={accentBtn}
            className="mt-7 inline-flex h-12 items-center rounded-lg px-7 text-sm font-semibold shadow-md"
          >
            {ctaText} →
          </button>
        </div>
      </section>

      {/* Product/service grid */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2
            style={display}
            className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {sectionTitle}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o, i) => (
              <article
                key={i}
                style={{ backgroundColor: palette.surface }}
                className="overflow-hidden rounded-xl shadow-sm transition hover:shadow-lg"
              >
                <SectorIllustration
                  sector={data.sector}
                  paletteAccent={palette.accent}
                  paletteSurface={withAlpha(palette.accent, 0.08)}
                  className="flex aspect-[4/3] items-center justify-center"
                />
                <div className="p-5">
                  <p style={display} className="text-lg font-semibold">
                    {o.name}
                  </p>
                  {o.blurb && (
                    <p className="mt-1 text-sm leading-relaxed opacity-75">
                      {o.blurb}
                    </p>
                  )}
                  {isProducts && (
                    <p
                      className="mt-3 text-sm font-bold"
                      style={{ color: palette.accent }}
                    >
                      desde 19€
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section
        style={{ backgroundColor: palette.surface }}
        className="px-6 py-14 sm:px-12 sm:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 style={display} className="text-2xl font-bold sm:text-3xl">
            Por qué nosotros
          </h2>
          <p className="mt-4 text-base leading-relaxed opacity-90">
            {tagline}
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 style={display} className="text-2xl font-bold sm:text-3xl">
            ¿Hablamos?
          </h2>
          <p className="opacity-80">Estamos a un mensaje de distancia.</p>
          <button
            type="button"
            style={accentBtn}
            className="inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold"
          >
            Escríbenos
          </button>
        </div>
      </section>

      <footer
        className="border-t px-6 py-6 text-xs opacity-70 sm:px-12"
        style={{ borderColor: palette.accent + "22" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {data.businessName}
          </span>
          <span className="flex gap-4">
            <span>Inicio</span>
            <span>Tienda</span>
            <span>Contacto</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/templates/EcommerceTemplate.tsx
git commit -m "feat(imagina): EcommerceTemplate (hero banner + product grid)"
```

---

## Task 10: Rewrite WebPreview.tsx (template switcher)

WebPreview now: chrome wrapper + disclaimer + template switch.

**Files:**
- Modify (rewrite): `src/app/imagina-tu-web/_components/WebPreview.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/app/imagina-tu-web/_components/WebPreview.tsx` with:

```tsx
// src/app/imagina-tu-web/_components/WebPreview.tsx
"use client";

import type { CopyResponse } from "@/lib/preview-validation";
import {
  InformativaTemplate,
  type InformativaData,
} from "./templates/InformativaTemplate";
import {
  EcommerceTemplate,
  type EcommerceData,
} from "./templates/EcommerceTemplate";

export interface WebPreviewData {
  businessType: "informativa" | "ecommerce";
  ecommerceKind?: "productos" | "servicios";
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
}

interface Props {
  data: WebPreviewData;
  copy: CopyResponse | null;
  heroImageDataUrl: string | null;
}

export function WebPreview({ data, copy, heroImageDataUrl }: Props) {
  const isEcom = data.businessType === "ecommerce";
  const safeName = data.businessName.toLowerCase().replace(/\s+/g, "");

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-fg-muted">{safeName}.es</span>
      </div>

      {isEcom ? (
        <EcommerceTemplate
          data={data as EcommerceData}
          copy={copy}
          heroImageDataUrl={heroImageDataUrl}
        />
      ) : (
        <InformativaTemplate
          data={data as InformativaData}
          copy={copy}
          heroImageDataUrl={heroImageDataUrl}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/WebPreview.tsx
git commit -m "refactor(imagina): WebPreview switches between two templates"
```

---

## Task 11: PreviewLoading.tsx (rotating messages)

Client component shown while AI is generating. Rotates 5 messages every 2.5s.

**Files:**
- Create: `src/app/imagina-tu-web/_components/PreviewLoading.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// src/app/imagina-tu-web/_components/PreviewLoading.tsx
"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Eligiendo la paleta perfecta…",
  "Maquetando el hero…",
  "Generando la imagen…",
  "Puliendo los textos…",
  "Casi listo, prometido…",
];

export function PreviewLoading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-bg-elevated p-10 text-center"
    >
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        </div>
      </div>
      <p className="text-base font-semibold">Creando tu preview…</p>
      <p
        key={idx}
        className="mt-2 text-sm text-fg-muted transition-opacity duration-300"
      >
        {MESSAGES[idx]}
      </p>
      <p className="mt-6 text-xs text-fg-muted">
        Esto suele tardar entre 10 y 15 segundos.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/PreviewLoading.tsx
git commit -m "feat(imagina): PreviewLoading with rotating messages"
```

---

## Task 12: Update PreviewWizard.tsx (add generating state)

Add the `generating` state between successful lead submit and showing the preview. Calls `generatePreview` and passes results to `WebPreview`.

**Files:**
- Modify: `src/app/imagina-tu-web/_components/PreviewWizard.tsx`

- [ ] **Step 1: Open the file and locate the success branch**

Open `src/app/imagina-tu-web/_components/PreviewWizard.tsx`. Find the block that currently looks like:

```tsx
  // Once we have a leadId, show the preview + rating
  if (leadId && state.businessType) {
    const data: WebPreviewData = {
```

This is the block we will replace.

- [ ] **Step 2: Add new imports at the top of the file**

After the existing import of `WebPreview`, add:

```tsx
import { generatePreview } from "@/lib/preview-generate-action";
import { PreviewLoading } from "./PreviewLoading";
import type { CopyResponse } from "@/lib/preview-validation";
```

- [ ] **Step 3: Add new state for generation result**

Inside the `PreviewWizard` function, near the other useState declarations, add:

```tsx
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    copy: CopyResponse | null;
    heroImageDataUrl: string | null;
  } | null>(null);
```

- [ ] **Step 4: Modify `handleSubmit` to kick off generation on lead success**

Replace the body of the existing `startTransition(async () => { ... })` inside `handleSubmit` with:

```tsx
    startTransition(async () => {
      const r = await sendPreviewLead(fd);
      if (r.ok && r.leadId) {
        track("preview_lead_submit", {
          leadId: r.leadId,
          businessType: state.businessType,
        });
        setLeadId(r.leadId);
        setGenerating(true);
        track("preview_generate_start", { leadId: r.leadId });
        const startedAt = Date.now();
        const result = await generatePreview({
          businessType: state.businessType!,
          ecommerceKind: state.ecommerceKind ?? undefined,
          businessName: state.businessName,
          sector: state.sector,
          offerings: state.offerings,
          palette: state.palette,
          typography: state.typography,
          valueProp: state.valueProp,
        });
        setGenerated({
          copy: result.copy,
          heroImageDataUrl: result.heroImageDataUrl,
        });
        setGenerating(false);
        const durationMs = Date.now() - startedAt;
        if (!result.copy && !result.heroImageDataUrl) {
          track("preview_generate_fail", {
            leadId: r.leadId,
            reason: result.error ?? "both_null",
            durationMs,
          });
        } else {
          track("preview_generate_success", {
            leadId: r.leadId,
            hadCopy: !!result.copy,
            hadImage: !!result.heroImageDataUrl,
            durationMs,
          });
        }
      } else {
        setSubmitError(r.error ?? "No se pudo enviar.");
      }
    });
```

- [ ] **Step 5: Replace the "show preview" branch**

Find the block starting with `// Once we have a leadId, show the preview + rating` and replace from that line up to and including the final closing `)` and `}` of that `if (leadId && state.businessType)` block with:

```tsx
  // After submit: show loading, then preview + rating
  if (leadId && state.businessType) {
    const data: WebPreviewData = {
      businessType: state.businessType,
      ecommerceKind: state.ecommerceKind ?? undefined,
      businessName: state.businessName,
      sector: state.sector,
      offerings: state.offerings,
      palette: state.palette,
      typography: state.typography,
      valueProp: state.valueProp,
    };

    if (generating || !generated) {
      return (
        <div className="space-y-6">
          <PreviewLoading />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-fg-muted">
          ⚡ <strong className="text-fg">Esta es una vista rápida</strong>{" "}
          generada con tus respuestas. Tu web real sería 100% personalizada:
          imágenes propias, copy adaptado a tu marca, animaciones, más
          secciones y muchísimo más detalle.
        </p>
        <WebPreview
          data={data}
          copy={generated.copy}
          heroImageDataUrl={generated.heroImageDataUrl}
        />
        <RatingBar
          leadId={leadId}
          contact={{ name: state.name, email: state.email, phone: state.phone }}
          data={data}
        />
      </div>
    );
  }
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/imagina-tu-web/_components/PreviewWizard.tsx
git commit -m "feat(imagina): wire wizard to generatePreview with loading state"
```

---

## Task 13: Full verification — tests, build, browser smoke test

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all pass (v1 tests + new ones for openai-client, prompts, validation v2).

- [ ] **Step 2: TypeScript check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, `/imagina-tu-web` listed as a route.

- [ ] **Step 4: Browser smoke test WITHOUT OPENAI_API_KEY (verify fallbacks)**

In one terminal: `npm run dev` (without setting `OPENAI_API_KEY`).
In a browser: open `http://localhost:3000/imagina-tu-web`.

Walk the wizard:
- [ ] Pick **Informativa** → fill identity → 3 offerings → palette → typography → final step
- [ ] Wait ≥2s after page load, then submit
- [ ] Mail #1 should arrive at `CONTACT_EMAIL_TO`
- [ ] Loading screen appears for ~1s (no OpenAI call to make), then preview
- [ ] Preview shows **InformativaTemplate** with user's value prop as tagline (fallback) and gradient hero (no image fallback)
- [ ] Disclaimer visible above preview
- [ ] RatingBar visible at bottom
- [ ] Click 👍 → comment → send → toast + CTA → click → goes to /contacto

- [ ] **Step 5: Browser smoke test WITH OPENAI_API_KEY**

Add `OPENAI_API_KEY=sk-...` to `.env.local`, restart dev server.

Repeat the flow with **Ecommerce → Productos**:
- [ ] Loading screen visible for ~10-15s with rotating messages
- [ ] Preview shows **EcommerceTemplate** with AI-generated headline (different from user's value prop), AI hero image as background, and price mocks on the cards
- [ ] Cards show **SectorIllustration** SVGs (not AI images)
- [ ] Voting still works and triggers mail #2

- [ ] **Step 6: Verify route still has noindex, not in sitemap, not in nav**

```bash
curl -s http://localhost:3000/imagina-tu-web | grep -oE '<meta name="robots"[^/]*/>'
curl -s http://localhost:3000/sitemap.xml | grep -c imagina    # expect 0
curl -s http://localhost:3000/ | grep -c imagina-tu-web        # expect 0
```

- [ ] **Step 7: Commit any small fixes from smoke test**

```bash
git status
# If anything needed adjusting:
git add <files>
git commit -m "fix(imagina): adjustments from manual smoke test"
```

---

## Done

The v2 preview lives at `/imagina-tu-web` on `staging`. Test the full AI flow locally with a real `OPENAI_API_KEY` before merging to `main`. To deploy: ensure `OPENAI_API_KEY` is set in Vercel project env vars (production env), then merge `staging → main` as before.
