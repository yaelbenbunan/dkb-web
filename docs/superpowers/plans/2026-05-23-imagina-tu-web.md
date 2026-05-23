# Imagina tu web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/imagina-tu-web`, a hidden landing where users complete a 6-step questionnaire and receive a generated home preview, with two-stage lead capture (form submit + thumbs rating) sent via Resend.

**Architecture:** Next.js 16 App Router page with a client-side wizard (6 steps, state in `useState`). On final submit, a server action validates with Zod and sends mail #1 via Resend; the client then renders a templated home preview with CSS variables (palette + typography) scoped to a wrapper, no global theme change. A floating rating bar triggers a second server action sending mail #2 with the same lead data plus the rating. No database — data flows through form state and server actions only.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Zod, Resend, next/font/google (Inter, Space Grotesk, Playfair Display, Fraunces), Vitest for unit tests.

**Spec reference:** [docs/superpowers/specs/2026-05-23-imagina-tu-web-design.md](../specs/2026-05-23-imagina-tu-web-design.md)

---

## File Structure

```
src/app/imagina-tu-web/
├── page.tsx                              # landing wrapper + metadata noindex
└── _components/
    ├── PreviewWizard.tsx                 # state machine, orchestrates steps
    ├── steps/
    │   ├── StepBusinessType.tsx
    │   ├── StepIdentity.tsx
    │   ├── StepOfferings.tsx
    │   ├── StepPalette.tsx
    │   ├── StepTypography.tsx
    │   └── StepFinal.tsx
    ├── WebPreview.tsx                    # rendered home mock
    └── RatingBar.tsx                     # 👍/👎 + comment + CTA

src/lib/
├── preview-themes.ts                     # palettes + typography defs + sector icons
├── preview-lead-id.ts                    # short ID generator
├── preview-validation.ts                 # Zod schemas (lead + rating)
├── preview-lead-action.ts                # server action — mail #1
├── preview-rating-action.ts              # server action — mail #2
└── __tests__/
    ├── preview-themes.test.ts
    ├── preview-lead-id.test.ts
    └── preview-validation.test.ts
```

---

## Task 1: Preview themes module (palettes + typography + sectors)

Pure data module. No React, no IO. Tests assert the catalog is well-formed.

**Files:**
- Create: `src/lib/preview-themes.ts`
- Create: `src/lib/__tests__/preview-themes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/preview-themes.test.ts
import { describe, it, expect } from "vitest";
import {
  PALETTES,
  TYPOGRAPHIES,
  SECTORS,
  SECTOR_ICONS,
  isPaletteSlug,
  isTypographySlug,
  isSectorSlug,
} from "@/lib/preview-themes";

describe("preview-themes catalog", () => {
  it("exposes exactly 4 palettes with required fields", () => {
    expect(PALETTES).toHaveLength(4);
    for (const p of PALETTES) {
      expect(p.slug).toMatch(/^[a-z-]+$/);
      expect(p.name).toBeTruthy();
      expect(p.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.surface).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.heroGradient).toContain("gradient");
    }
  });

  it("exposes exactly 4 typographies with required fields", () => {
    expect(TYPOGRAPHIES).toHaveLength(4);
    for (const t of TYPOGRAPHIES) {
      expect(t.slug).toMatch(/^[a-z-]+$/);
      expect(t.name).toBeTruthy();
      expect(t.displayVar).toMatch(/^--/);
      expect(t.bodyVar).toMatch(/^--/);
    }
  });

  it("provides an icon per sector and an 'otro' fallback", () => {
    expect(SECTORS.length).toBeGreaterThanOrEqual(7);
    for (const s of SECTORS) {
      expect(SECTOR_ICONS[s.slug]).toBeTruthy();
    }
    expect(SECTOR_ICONS.otro).toBeTruthy();
  });

  it("isPaletteSlug guards correctly", () => {
    expect(isPaletteSlug("pastel-suave")).toBe(true);
    expect(isPaletteSlug("nope")).toBe(false);
  });

  it("isTypographySlug guards correctly", () => {
    expect(isTypographySlug("moderna-sans")).toBe(true);
    expect(isTypographySlug("nope")).toBe(false);
  });

  it("isSectorSlug guards correctly", () => {
    expect(isSectorSlug("salud")).toBe(true);
    expect(isSectorSlug("nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- preview-themes`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the themes module**

```ts
// src/lib/preview-themes.ts
export interface Palette {
  slug: string;
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  heroGradient: string;
}

export interface Typography {
  slug: string;
  name: string;
  displayVar: string;
  bodyVar: string;
}

export interface Sector {
  slug: string;
  label: string;
}

export const PALETTES: Palette[] = [
  {
    slug: "pastel-suave",
    name: "Pastel suave",
    bg: "#fef7f4",
    surface: "#ffffff",
    text: "#2a2438",
    accent: "#c084fc",
    heroGradient:
      "linear-gradient(135deg, #fce7f3 0%, #e9d5ff 60%, #ddd6fe 100%)",
  },
  {
    slug: "oscuro-moderno",
    name: "Oscuro moderno",
    bg: "#0a0a0f",
    surface: "#16161f",
    text: "#f5f5f7",
    accent: "#22d3ee",
    heroGradient:
      "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0e7490 100%)",
  },
  {
    slug: "azul-corporativo",
    name: "Azul corporativo",
    bg: "#f4f7fc",
    surface: "#ffffff",
    text: "#0c1c40",
    accent: "#187bef",
    heroGradient:
      "linear-gradient(135deg, #dbeafe 0%, #93c5fd 60%, #187bef 100%)",
  },
  {
    slug: "tierra-natural",
    name: "Tierra natural",
    bg: "#faf6f0",
    surface: "#ffffff",
    text: "#2d2419",
    accent: "#a16207",
    heroGradient:
      "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #d97706 100%)",
  },
];

export const TYPOGRAPHIES: Typography[] = [
  {
    slug: "moderna-sans",
    name: "Moderna sans",
    displayVar: "--font-prev-inter",
    bodyVar: "--font-prev-inter",
  },
  {
    slug: "geometrica",
    name: "Geométrica",
    displayVar: "--font-prev-space",
    bodyVar: "--font-prev-space",
  },
  {
    slug: "elegante-serif",
    name: "Elegante serif",
    displayVar: "--font-prev-playfair",
    bodyVar: "--font-prev-source",
  },
  {
    slug: "friendly",
    name: "Friendly",
    displayVar: "--font-prev-fraunces",
    bodyVar: "--font-prev-fraunces",
  },
];

export const SECTORS: Sector[] = [
  { slug: "salud", label: "Salud" },
  { slug: "educacion", label: "Educación" },
  { slug: "restauracion", label: "Restauración" },
  { slug: "moda", label: "Moda" },
  { slug: "tecnologia", label: "Tecnología" },
  { slug: "servicios", label: "Servicios profesionales" },
  { slug: "otro", label: "Otro" },
];

export const SECTOR_ICONS: Record<string, string> = {
  salud: "🩺",
  educacion: "🎓",
  restauracion: "🍽️",
  moda: "👗",
  tecnologia: "💻",
  servicios: "💼",
  otro: "✨",
};

const PALETTE_SLUGS = new Set(PALETTES.map((p) => p.slug));
const TYPO_SLUGS = new Set(TYPOGRAPHIES.map((t) => t.slug));
const SECTOR_SLUGS = new Set(SECTORS.map((s) => s.slug));

export function isPaletteSlug(v: unknown): v is string {
  return typeof v === "string" && PALETTE_SLUGS.has(v);
}

export function isTypographySlug(v: unknown): v is string {
  return typeof v === "string" && TYPO_SLUGS.has(v);
}

export function isSectorSlug(v: unknown): v is string {
  return typeof v === "string" && SECTOR_SLUGS.has(v);
}

export function getPalette(slug: string): Palette | undefined {
  return PALETTES.find((p) => p.slug === slug);
}

export function getTypography(slug: string): Typography | undefined {
  return TYPOGRAPHIES.find((t) => t.slug === slug);
}

export function getSectorLabel(slug: string): string {
  return SECTORS.find((s) => s.slug === slug)?.label ?? slug;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- preview-themes`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-themes.ts src/lib/__tests__/preview-themes.test.ts
git commit -m "feat(imagina): add preview themes catalog (palettes, typography, sectors)"
```

---

## Task 2: Lead ID generator

Tiny pure util. Generates a short, human-readable ID for cross-referencing the two emails.

**Files:**
- Create: `src/lib/preview-lead-id.ts`
- Create: `src/lib/__tests__/preview-lead-id.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/preview-lead-id.test.ts
import { describe, it, expect } from "vitest";
import { generateLeadId, isLeadIdShape } from "@/lib/preview-lead-id";

describe("preview-lead-id", () => {
  it("returns a string in the form 'xxxx-xxxx'", () => {
    const id = generateLeadId();
    expect(id).toMatch(/^[a-z0-9]{4,}-[a-z0-9]{4}$/);
  });

  it("returns distinct ids on repeated calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateLeadId()));
    expect(ids.size).toBe(50);
  });

  it("isLeadIdShape accepts valid ids and rejects garbage", () => {
    expect(isLeadIdShape(generateLeadId())).toBe(true);
    expect(isLeadIdShape("bad id with spaces")).toBe(false);
    expect(isLeadIdShape("")).toBe(false);
    expect(isLeadIdShape("abcd")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- preview-lead-id`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```ts
// src/lib/preview-lead-id.ts
function rand4(): string {
  return Math.floor(Math.random() * 0x10000)
    .toString(36)
    .padStart(4, "0")
    .slice(0, 4);
}

export function generateLeadId(): string {
  const ts = Date.now().toString(36);
  return `${ts}-${rand4()}`;
}

export function isLeadIdShape(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9]{4,}-[a-z0-9]{4}$/.test(v);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- preview-lead-id`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-lead-id.ts src/lib/__tests__/preview-lead-id.test.ts
git commit -m "feat(imagina): add short lead id generator"
```

---

## Task 3: Zod validation schemas for lead and rating

Two schemas: one for the lead submit (paso 6), one for the rating. Both reuse the honeypot + `formLoadedAt ≥ 2s` pattern from `src/lib/validation.ts`.

**Files:**
- Create: `src/lib/preview-validation.ts`
- Create: `src/lib/__tests__/preview-validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/preview-validation.test.ts
import { describe, it, expect } from "vitest";
import {
  previewLeadSchema,
  previewRatingSchema,
} from "@/lib/preview-validation";

const validLead = {
  businessType: "ecommerce",
  ecommerceKind: "productos",
  businessName: "La Tiendita",
  sector: "moda",
  offerings: ["camisetas", "gorras"],
  palette: "pastel-suave",
  typography: "moderna-sans",
  valueProp:
    "Somos artesanos locales con materiales sostenibles desde 2010, atención personal.",
  name: "Ana López",
  email: "ana@example.com",
  phone: "+34 600 111 222",
  privacy: "on",
  website: "",
  formLoadedAt: Date.now() - 5000,
};

describe("previewLeadSchema", () => {
  it("accepts a valid ecommerce-productos lead", () => {
    expect(previewLeadSchema.safeParse(validLead).success).toBe(true);
  });

  it("accepts informativa without ecommerceKind", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      businessType: "informativa",
      ecommerceKind: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("rejects ecommerce without ecommerceKind", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      ecommerceKind: undefined,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown palette", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, palette: "neon" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown typography", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      typography: "comic",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown sector", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, sector: "futbol" });
    expect(r.success).toBe(false);
  });

  it("rejects offerings outside 1..6 range", () => {
    expect(
      previewLeadSchema.safeParse({ ...validLead, offerings: [] }).success,
    ).toBe(false);
    expect(
      previewLeadSchema.safeParse({
        ...validLead,
        offerings: ["a", "b", "c", "d", "e", "f", "g"],
      }).success,
    ).toBe(false);
  });

  it("rejects too-short valueProp", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, valueProp: "corto" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email and short phone", () => {
    expect(
      previewLeadSchema.safeParse({ ...validLead, email: "x" }).success,
    ).toBe(false);
    expect(
      previewLeadSchema.safeParse({ ...validLead, phone: "12" }).success,
    ).toBe(false);
  });

  it("rejects missing privacy", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, privacy: "" });
    expect(r.success).toBe(false);
  });

  it("rejects filled honeypot", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, website: "spam" });
    expect(r.success).toBe(false);
  });

  it("rejects submission faster than 2s", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      formLoadedAt: Date.now() - 500,
    });
    expect(r.success).toBe(false);
  });
});

const validRating = {
  ...validLead,
  leadId: "m7k2-a9f3",
  rating: "up" as const,
  comment: "Me ha gustado mucho.",
};

describe("previewRatingSchema", () => {
  it("accepts a valid up rating with comment", () => {
    expect(previewRatingSchema.safeParse(validRating).success).toBe(true);
  });

  it("accepts down rating without comment", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      rating: "down",
      comment: "",
    });
    expect(r.success).toBe(true);
  });

  it("rejects malformed leadId", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      leadId: "not valid",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown rating value", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      rating: "meh",
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- preview-validation`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement schemas**

```ts
// src/lib/preview-validation.ts
import { z } from "zod";
import {
  isPaletteSlug,
  isTypographySlug,
  isSectorSlug,
} from "@/lib/preview-themes";

const offeringSchema = z.string().trim().min(1, "Vacío").max(80, "Demasiado largo");

const baseLead = z
  .object({
    businessType: z.enum(["informativa", "ecommerce"], {
      message: "Elige un tipo de web",
    }),
    ecommerceKind: z.enum(["productos", "servicios"]).optional(),
    businessName: z.string().trim().min(2, "Nombre demasiado corto").max(60),
    sector: z.string().refine(isSectorSlug, "Sector inválido"),
    offerings: z
      .array(offeringSchema)
      .min(1, "Añade al menos uno")
      .max(6, "Máximo 6"),
    palette: z.string().refine(isPaletteSlug, "Paleta inválida"),
    typography: z.string().refine(isTypographySlug, "Tipografía inválida"),
    valueProp: z
      .string()
      .trim()
      .min(20, "Cuéntanos un poco más (mínimo 20 caracteres)")
      .max(500, "Máximo 500 caracteres"),
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z.email("Email inválido"),
    phone: z.string().trim().min(6, "Teléfono demasiado corto"),
    privacy: z.literal("on", {
      message: "Debes aceptar la política de privacidad",
    }),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  })
  .refine(
    (d) => d.businessType !== "ecommerce" || !!d.ecommerceKind,
    {
      message: "Indica productos o servicios",
      path: ["ecommerceKind"],
    },
  );

export const previewLeadSchema = baseLead;
export type PreviewLeadInput = z.infer<typeof previewLeadSchema>;

export const previewRatingSchema = z
  .object({
    businessType: z.enum(["informativa", "ecommerce"]),
    ecommerceKind: z.enum(["productos", "servicios"]).optional(),
    businessName: z.string().trim().min(2).max(60),
    sector: z.string().refine(isSectorSlug),
    offerings: z.array(offeringSchema).min(1).max(6),
    palette: z.string().refine(isPaletteSlug),
    typography: z.string().refine(isTypographySlug),
    valueProp: z.string().trim().min(20).max(500),
    name: z.string().trim().min(2),
    email: z.email(),
    phone: z.string().trim().min(6),
    leadId: z.string().regex(/^[a-z0-9]{4,}-[a-z0-9]{4}$/, "leadId inválido"),
    rating: z.enum(["up", "down"]),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
  });
export type PreviewRatingInput = z.infer<typeof previewRatingSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- preview-validation`
Expected: PASS (16 tests across both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-validation.ts src/lib/__tests__/preview-validation.test.ts
git commit -m "feat(imagina): add zod schemas for preview lead and rating"
```

---

## Task 4: Server action `preview-lead-action.ts` (mail #1)

Server action that validates the form, generates the lead ID, sends mail #1 via Resend, and returns `{ ok, leadId, error? }`.

**Files:**
- Create: `src/lib/preview-lead-action.ts`

- [ ] **Step 1: Implement the server action**

```ts
// src/lib/preview-lead-action.ts
"use server";

import { Resend } from "resend";
import { previewLeadSchema } from "./preview-validation";
import { generateLeadId } from "./preview-lead-id";
import { getSectorLabel } from "./preview-themes";

interface PreviewLeadResult {
  ok: boolean;
  leadId?: string;
  error?: string;
}

function parseOfferings(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export async function sendPreviewLead(
  formData: FormData,
): Promise<PreviewLeadResult> {
  const parsed = previewLeadSchema.safeParse({
    businessType: formData.get("businessType"),
    ecommerceKind: formData.get("ecommerceKind") || undefined,
    businessName: formData.get("businessName"),
    sector: formData.get("sector"),
    offerings: parseOfferings(formData.get("offerings")),
    palette: formData.get("palette"),
    typography: formData.get("typography"),
    valueProp: formData.get("valueProp"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    privacy: formData.get("privacy") ?? "",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos del formulario." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const leadId = generateLeadId();
  const d = parsed.data;
  const tipo =
    d.businessType === "ecommerce"
      ? `Ecommerce — ${d.ecommerceKind}`
      : "Informativa";

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `Preview Web — ${d.name} (${tipo}) [#${leadId}]`,
    text: [
      `ID lead: ${leadId}`,
      "",
      "--- Contacto ---",
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      "",
      "--- Respuestas ---",
      `Tipo de web: ${tipo}`,
      `Negocio: ${d.businessName} (sector: ${getSectorLabel(d.sector)})`,
      `Oferta: ${d.offerings.join(", ")}`,
      `Paleta: ${d.palette}`,
      `Tipografía: ${d.typography}`,
      "",
      "Toque personal:",
      d.valueProp,
      "",
      "Origen: /imagina-tu-web (paso 6).",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }
  return { ok: true, leadId };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/preview-lead-action.ts
git commit -m "feat(imagina): server action sendPreviewLead (mail #1)"
```

---

## Task 5: Server action `preview-rating-action.ts` (mail #2)

Server action for the thumbs rating. Receives the leadId + rating + comment + all lead data (re-sent from client) so the mail is self-contained.

**Files:**
- Create: `src/lib/preview-rating-action.ts`

- [ ] **Step 1: Implement the server action**

```ts
// src/lib/preview-rating-action.ts
"use server";

import { Resend } from "resend";
import { previewRatingSchema } from "./preview-validation";
import { getSectorLabel } from "./preview-themes";

interface PreviewRatingResult {
  ok: boolean;
  error?: string;
}

function parseOfferings(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export async function sendPreviewRating(
  formData: FormData,
): Promise<PreviewRatingResult> {
  const parsed = previewRatingSchema.safeParse({
    businessType: formData.get("businessType"),
    ecommerceKind: formData.get("ecommerceKind") || undefined,
    businessName: formData.get("businessName"),
    sector: formData.get("sector"),
    offerings: parseOfferings(formData.get("offerings")),
    palette: formData.get("palette"),
    typography: formData.get("typography"),
    valueProp: formData.get("valueProp"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    leadId: formData.get("leadId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos del rating inválidos." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado." };
  }

  const d = parsed.data;
  const tipo =
    d.businessType === "ecommerce"
      ? `Ecommerce — ${d.ecommerceKind}`
      : "Informativa";
  const emoji = d.rating === "up" ? "👍" : "👎";

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `Rating Preview — ${emoji} — ${d.name} [#${d.leadId}]`,
    text: [
      `ID lead: ${d.leadId}`,
      `Rating: ${emoji} (${d.rating})`,
      "",
      "Comentario:",
      d.comment || "(sin comentario)",
      "",
      "--- Datos del lead (repetidos) ---",
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      `Tipo de web: ${tipo}`,
      `Negocio: ${d.businessName} (sector: ${getSectorLabel(d.sector)})`,
      `Oferta: ${d.offerings.join(", ")}`,
      `Paleta: ${d.palette}`,
      `Tipografía: ${d.typography}`,
      "",
      "Toque personal:",
      d.valueProp,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar el rating." };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/preview-rating-action.ts
git commit -m "feat(imagina): server action sendPreviewRating (mail #2)"
```

---

## Task 6: `WebPreview` component (presentational home mock)

Pure presentational client component. Renders the templated home using CSS variables scoped to a wrapper. No business logic.

**Files:**
- Create: `src/app/imagina-tu-web/_components/WebPreview.tsx`

- [ ] **Step 1: Implement WebPreview**

```tsx
// src/app/imagina-tu-web/_components/WebPreview.tsx
"use client";

import type { CSSProperties } from "react";
import {
  getPalette,
  getTypography,
  SECTOR_ICONS,
} from "@/lib/preview-themes";

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
}

export function WebPreview({ data }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);
  if (!palette || !typo) return null;

  const isEcomProducts =
    data.businessType === "ecommerce" && data.ecommerceKind === "productos";
  const icon = SECTOR_ICONS[data.sector] ?? SECTOR_ICONS.otro;

  const wrapperStyle: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const displayStyle: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const heroStyle: CSSProperties = {
    background: palette.heroGradient,
  };
  const accentBtnStyle: CSSProperties = {
    backgroundColor: palette.accent,
    color: "#fff",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-subtle px-4 py-2.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-yellow-400" />
        <span className="size-3 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-fg-muted">
          {data.businessName.toLowerCase().replace(/\s+/g, "")}.es
        </span>
      </div>

      <div style={wrapperStyle}>
        {/* Hero */}
        <section style={heroStyle} className="px-6 py-16 sm:px-12 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 text-sm font-medium opacity-80" style={displayStyle}>
              {data.businessName}
            </p>
            <h1
              style={displayStyle}
              className="text-3xl font-bold leading-tight sm:text-5xl"
            >
              {data.valueProp}
            </h1>
            <button
              type="button"
              style={accentBtnStyle}
              className="mt-8 inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold shadow-md"
            >
              Contáctanos
            </button>
          </div>
        </section>

        {/* Offerings grid */}
        <section className="px-6 py-12 sm:px-12 sm:py-16">
          <h2
            style={displayStyle}
            className="mb-8 text-center text-2xl font-bold sm:text-3xl"
          >
            {data.businessType === "ecommerce" && data.ecommerceKind === "productos"
              ? "Nuestros productos"
              : "Lo que ofrecemos"}
          </h2>
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.offerings.map((item, i) => (
              <article
                key={i}
                style={{ backgroundColor: palette.surface }}
                className="rounded-xl p-6 shadow-sm"
              >
                <div
                  style={{ background: palette.heroGradient }}
                  className="mb-4 flex aspect-video items-center justify-center rounded-lg text-4xl"
                >
                  {icon}
                </div>
                <h3
                  style={displayStyle}
                  className="text-lg font-semibold"
                >
                  {item}
                </h3>
                {isEcomProducts && (
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{ color: palette.accent }}
                  >
                    desde 19€
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section
          style={{ backgroundColor: palette.surface }}
          className="px-6 py-12 sm:px-12 sm:py-16"
        >
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
            <h2 style={displayStyle} className="text-2xl font-bold sm:text-3xl">
              ¿Hablamos?
            </h2>
            <p className="opacity-80">Estamos a un mensaje de distancia.</p>
            <button
              type="button"
              style={accentBtnStyle}
              className="inline-flex h-12 items-center rounded-lg px-6 text-sm font-semibold"
            >
              Escríbenos
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t px-6 py-6 text-xs opacity-70 sm:px-12">
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
git commit -m "feat(imagina): WebPreview component (templated home mock)"
```

---

## Task 7: `RatingBar` component (👍/👎 + comment + CTA)

Sticky bar at the end of the preview. Calls `sendPreviewRating` server action on submit.

**Files:**
- Create: `src/app/imagina-tu-web/_components/RatingBar.tsx`

- [ ] **Step 1: Implement RatingBar**

```tsx
// src/app/imagina-tu-web/_components/RatingBar.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendPreviewRating } from "@/lib/preview-rating-action";
import { track } from "@/lib/gtm";
import type { WebPreviewData } from "./WebPreview";

interface Props {
  leadId: string;
  contact: { name: string; email: string; phone: string };
  data: WebPreviewData;
}

type Phase = "ask" | "comment" | "done";

export function RatingBar({ leadId, contact, data }: Props) {
  const [phase, setPhase] = useState<Phase>("ask");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (chosen: "up" | "down", finalComment: string) => {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("rating", chosen);
    fd.set("comment", finalComment);
    fd.set("name", contact.name);
    fd.set("email", contact.email);
    fd.set("phone", contact.phone);
    fd.set("businessType", data.businessType);
    if (data.ecommerceKind) fd.set("ecommerceKind", data.ecommerceKind);
    fd.set("businessName", data.businessName);
    fd.set("sector", data.sector);
    fd.set("offerings", JSON.stringify(data.offerings));
    fd.set("palette", data.palette);
    fd.set("typography", data.typography);
    fd.set("valueProp", data.valueProp);

    startTransition(async () => {
      const r = await sendPreviewRating(fd);
      if (r.ok) {
        track("preview_rating", { leadId, rating: chosen });
        setPhase("done");
      } else {
        setError(r.error ?? "No se pudo enviar.");
      }
    });
  };

  const handleVote = (v: "up" | "down") => {
    setRating(v);
    setPhase("comment");
  };

  return (
    <div className="sticky bottom-4 mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-bg-elevated p-5 shadow-2xl">
      {phase === "ask" && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-base font-semibold">¿Qué te parece el preview?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleVote("up")}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/25"
            >
              <span className="text-xl">👍</span> Me gusta
            </button>
            <button
              type="button"
              onClick={() => handleVote("down")}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-500/15 px-4 text-sm font-semibold text-red-400 hover:bg-red-500/25"
            >
              <span className="text-xl">👎</span> Mejorable
            </button>
          </div>
        </div>
      )}

      {phase === "comment" && rating && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {rating === "up"
              ? "¡Genial! ¿Algo que destacarías? (opcional)"
              : "Vaya. ¿Qué cambiarías? (opcional)"}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Escribe aquí…"
            className="surface-input block w-full resize-none rounded-md px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => submit(rating, "")}
              disabled={pending}
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-bg-subtle disabled:opacity-50"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={() => submit(rating, comment.trim())}
              disabled={pending}
              className="h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar feedback"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-semibold text-emerald-400">
              ¡Gracias por tu feedback!
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Si quieres dar el siguiente paso, hablemos.
            </p>
          </div>
          <Link
            href="/contacto?servicio=Desarrollo%20web"
            onClick={() => track("preview_cta_click", { leadId })}
            className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-white shadow-md hover:bg-accent-hover"
          >
            Quiero mi web de verdad →
          </Link>
        </div>
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
git add src/app/imagina-tu-web/_components/RatingBar.tsx
git commit -m "feat(imagina): RatingBar with 👍/👎, comment, and contacto CTA"
```

---

## Task 8: Step components — group A (BusinessType, Identity, Offerings)

Three simple form steps. Each is a controlled component receiving current value and an `onChange`. No internal wizard logic.

**Files:**
- Create: `src/app/imagina-tu-web/_components/steps/StepBusinessType.tsx`
- Create: `src/app/imagina-tu-web/_components/steps/StepIdentity.tsx`
- Create: `src/app/imagina-tu-web/_components/steps/StepOfferings.tsx`

- [ ] **Step 1: StepBusinessType**

```tsx
// src/app/imagina-tu-web/_components/steps/StepBusinessType.tsx
"use client";

interface Value {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepBusinessType({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">¿Qué tipo de web quieres?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            onChange({ businessType: "informativa", ecommerceKind: null })
          }
          className={`rounded-xl border-2 p-6 text-left transition ${
            value.businessType === "informativa"
              ? "border-accent bg-accent/10"
              : "border-border hover:border-accent/50"
          }`}
        >
          <p className="text-lg font-semibold">🌐 Informativa</p>
          <p className="mt-1 text-sm text-fg-muted">
            Web para presentar tu marca, servicios y captar contactos.
          </p>
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ businessType: "ecommerce", ecommerceKind: value.ecommerceKind })
          }
          className={`rounded-xl border-2 p-6 text-left transition ${
            value.businessType === "ecommerce"
              ? "border-accent bg-accent/10"
              : "border-border hover:border-accent/50"
          }`}
        >
          <p className="text-lg font-semibold">🛒 Ecommerce</p>
          <p className="mt-1 text-sm text-fg-muted">
            Para vender online con catálogo, carrito y pagos.
          </p>
        </button>
      </div>

      {value.businessType === "ecommerce" && (
        <div>
          <p className="mb-3 text-sm font-semibold text-fg-muted">
            ¿Productos o servicios?
          </p>
          <div className="flex gap-3">
            {(["productos", "servicios"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  onChange({ businessType: "ecommerce", ecommerceKind: k })
                }
                className={`rounded-lg border-2 px-5 py-2 text-sm font-semibold capitalize transition ${
                  value.ecommerceKind === k
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: StepIdentity**

```tsx
// src/app/imagina-tu-web/_components/steps/StepIdentity.tsx
"use client";

import { SECTORS } from "@/lib/preview-themes";

interface Value {
  businessName: string;
  sector: string;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepIdentity({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tu negocio</h2>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Nombre del negocio *
        </span>
        <input
          type="text"
          value={value.businessName}
          onChange={(e) =>
            onChange({ ...value, businessName: e.target.value })
          }
          placeholder="Ej. Tienda Tati"
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          maxLength={60}
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Sector *
        </span>
        <select
          value={value.sector}
          onChange={(e) => onChange({ ...value, sector: e.target.value })}
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        >
          <option value="" disabled>
            Selecciona un sector
          </option>
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 3: StepOfferings**

```tsx
// src/app/imagina-tu-web/_components/steps/StepOfferings.tsx
"use client";

import { useState } from "react";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
}

export function StepOfferings({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const item = draft.trim();
    if (!item || value.length >= 6) return;
    onChange([...value, item.slice(0, 80)]);
    setDraft("");
  };
  const remove = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">¿Qué vendes u ofreces?</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Añade entre 1 y 6. Pulsa Enter o el botón.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ej. Asesoría fiscal"
          className="surface-input block w-full rounded-md px-3.5 py-2.5 text-sm"
          maxLength={80}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || value.length >= 6}
          className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {value.map((item, i) => (
          <li
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar ${item}`}
              className="text-fg-muted hover:text-fg"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/imagina-tu-web/_components/steps/StepBusinessType.tsx src/app/imagina-tu-web/_components/steps/StepIdentity.tsx src/app/imagina-tu-web/_components/steps/StepOfferings.tsx
git commit -m "feat(imagina): wizard steps 1-3 (business type, identity, offerings)"
```

---

## Task 9: Step components — group B (Palette, Typography)

Two visual selection steps.

**Files:**
- Create: `src/app/imagina-tu-web/_components/steps/StepPalette.tsx`
- Create: `src/app/imagina-tu-web/_components/steps/StepTypography.tsx`

- [ ] **Step 1: StepPalette**

```tsx
// src/app/imagina-tu-web/_components/steps/StepPalette.tsx
"use client";

import { PALETTES } from "@/lib/preview-themes";

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function StepPalette({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Elige una paleta</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PALETTES.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => onChange(p.slug)}
            className={`overflow-hidden rounded-xl border-2 text-left transition ${
              value === p.slug
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/50"
            }`}
          >
            <div
              className="h-24"
              style={{ background: p.heroGradient }}
              aria-hidden
            />
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="font-semibold">{p.name}</span>
              <span className="flex gap-1">
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.bg }}
                  aria-hidden
                />
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.text }}
                  aria-hidden
                />
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.accent }}
                  aria-hidden
                />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: StepTypography**

```tsx
// src/app/imagina-tu-web/_components/steps/StepTypography.tsx
"use client";

import { TYPOGRAPHIES } from "@/lib/preview-themes";

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function StepTypography({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Elige una tipografía</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {TYPOGRAPHIES.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => onChange(t.slug)}
            className={`rounded-xl border-2 p-6 text-left transition ${
              value === t.slug
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/50"
            }`}
          >
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: `var(${t.displayVar}), system-ui, sans-serif` }}
            >
              Tu marca
            </p>
            <p className="mt-2 text-sm text-fg-muted">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/imagina-tu-web/_components/steps/StepPalette.tsx src/app/imagina-tu-web/_components/steps/StepTypography.tsx
git commit -m "feat(imagina): wizard steps 4-5 (palette, typography)"
```

---

## Task 10: Step component — StepFinal (textarea + contact + privacy + honeypot)

The final step combines the value-prop textarea with contact info, privacy checkbox, honeypot, and the actual submit button.

**Files:**
- Create: `src/app/imagina-tu-web/_components/steps/StepFinal.tsx`

- [ ] **Step 1: Implement StepFinal**

```tsx
// src/app/imagina-tu-web/_components/steps/StepFinal.tsx
"use client";

interface Value {
  valueProp: string;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  website: string; // honeypot
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepFinal({ value, onChange }: Props) {
  const set = <K extends keyof Value>(k: K, v: Value[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Toque personal y tus datos</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Te enviamos el preview y nos lo guardamos para hablar contigo.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          ¿Por qué eres bueno en lo que haces? *
        </span>
        <textarea
          value={value.valueProp}
          onChange={(e) => set("valueProp", e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Ej. Hacemos asesoría fiscal personalizada con respuesta en 24h y precios cerrados desde el primer día."
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-fg-muted">
          {value.valueProp.length}/500
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Nombre *
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Teléfono *
          </span>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+34 600 000 000"
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Email *
        </span>
        <input
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="tu@email.com"
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.privacy}
          onChange={(e) => set("privacy", e.target.checked)}
          className="mt-1"
        />
        <span>
          He leído y acepto la{" "}
          <a href="/privacidad" target="_blank" className="text-accent underline">
            política de privacidad
          </a>
          .
        </span>
      </label>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value.website}
        onChange={(e) => set("website", e.target.value)}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/steps/StepFinal.tsx
git commit -m "feat(imagina): wizard step 6 (value prop + contact + privacy)"
```

---

## Task 11: `PreviewWizard` state machine

Orchestrates the 6 steps, holds the full state, validates locally before advancing, submits at the end, and (on success) renders `WebPreview` + `RatingBar`.

**Files:**
- Create: `src/app/imagina-tu-web/_components/PreviewWizard.tsx`

- [ ] **Step 1: Implement PreviewWizard**

```tsx
// src/app/imagina-tu-web/_components/PreviewWizard.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPreviewLead } from "@/lib/preview-lead-action";
import { track } from "@/lib/gtm";
import { StepBusinessType } from "./steps/StepBusinessType";
import { StepIdentity } from "./steps/StepIdentity";
import { StepOfferings } from "./steps/StepOfferings";
import { StepPalette } from "./steps/StepPalette";
import { StepTypography } from "./steps/StepTypography";
import { StepFinal } from "./steps/StepFinal";
import { WebPreview, type WebPreviewData } from "./WebPreview";
import { RatingBar } from "./RatingBar";

interface WizardState {
  businessType: "informativa" | "ecommerce" | null;
  ecommerceKind: "productos" | "servicios" | null;
  businessName: string;
  sector: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  website: string;
}

const INITIAL: WizardState = {
  businessType: null,
  ecommerceKind: null,
  businessName: "",
  sector: "",
  offerings: [],
  palette: "",
  typography: "",
  valueProp: "",
  name: "",
  email: "",
  phone: "",
  privacy: false,
  website: "",
};

const TOTAL_STEPS = 6;

export function PreviewWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
    track("preview_wizard_start");
  }, []);

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return (
          state.businessType === "informativa" ||
          (state.businessType === "ecommerce" && !!state.ecommerceKind)
        );
      case 2:
        return state.businessName.trim().length >= 2 && !!state.sector;
      case 3:
        return state.offerings.length >= 1 && state.offerings.length <= 6;
      case 4:
        return !!state.palette;
      case 5:
        return !!state.typography;
      case 6:
        return (
          state.valueProp.trim().length >= 20 &&
          state.name.trim().length >= 2 &&
          /.+@.+\..+/.test(state.email) &&
          state.phone.trim().length >= 6 &&
          state.privacy
        );
      default:
        return false;
    }
  };

  const advance = () => {
    if (!canAdvance()) return;
    if (step < TOTAL_STEPS) {
      track("preview_step_advance", { step });
      setStep(step + 1);
      return;
    }
    handleSubmit();
  };

  const handleSubmit = () => {
    setSubmitError(null);
    const fd = new FormData();
    fd.set("businessType", state.businessType ?? "");
    if (state.ecommerceKind) fd.set("ecommerceKind", state.ecommerceKind);
    fd.set("businessName", state.businessName);
    fd.set("sector", state.sector);
    fd.set("offerings", JSON.stringify(state.offerings));
    fd.set("palette", state.palette);
    fd.set("typography", state.typography);
    fd.set("valueProp", state.valueProp);
    fd.set("name", state.name);
    fd.set("email", state.email);
    fd.set("phone", state.phone);
    fd.set("privacy", state.privacy ? "on" : "");
    fd.set("website", state.website);
    fd.set("formLoadedAt", String(loadedAt.current));

    startTransition(async () => {
      const r = await sendPreviewLead(fd);
      if (r.ok && r.leadId) {
        track("preview_lead_submit", {
          leadId: r.leadId,
          businessType: state.businessType,
        });
        setLeadId(r.leadId);
      } else {
        setSubmitError(r.error ?? "No se pudo enviar.");
      }
    });
  };

  // Once we have a leadId, show the preview + rating
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
    return (
      <div className="space-y-6">
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-fg-muted">
          ⚡ <strong className="text-fg">Esta es una vista rápida</strong>{" "}
          generada con tus respuestas. Tu web real sería 100% personalizada:
          imágenes, textos propios, animaciones, más secciones y muchísimo más
          detalle.
        </p>
        <WebPreview data={data} />
        <RatingBar
          leadId={leadId}
          contact={{ name: state.name, email: state.email, phone: state.phone }}
          data={data}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-6 sm:p-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
          <span>
            Paso {step} de {TOTAL_STEPS}
          </span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <StepBusinessType
            value={{
              businessType: state.businessType,
              ecommerceKind: state.ecommerceKind,
            }}
            onChange={(v) =>
              setState({
                ...state,
                businessType: v.businessType,
                ecommerceKind: v.ecommerceKind,
              })
            }
          />
        )}
        {step === 2 && (
          <StepIdentity
            value={{ businessName: state.businessName, sector: state.sector }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
        {step === 3 && (
          <StepOfferings
            value={state.offerings}
            onChange={(v) => setState({ ...state, offerings: v })}
          />
        )}
        {step === 4 && (
          <StepPalette
            value={state.palette}
            onChange={(v) => setState({ ...state, palette: v })}
          />
        )}
        {step === 5 && (
          <StepTypography
            value={state.typography}
            onChange={(v) => setState({ ...state, typography: v })}
          />
        )}
        {step === 6 && (
          <StepFinal
            value={{
              valueProp: state.valueProp,
              name: state.name,
              email: state.email,
              phone: state.phone,
              privacy: state.privacy,
              website: state.website,
            }}
            onChange={(v) => setState({ ...state, ...v })}
          />
        )}
      </div>

      {submitError && (
        <p className="mt-4 text-sm text-red-500">{submitError}</p>
      )}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || pending}
          className="h-11 rounded-lg border border-border px-5 text-sm font-medium hover:bg-bg-subtle disabled:opacity-40"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={!canAdvance() || pending}
          className="inline-flex h-11 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-white shadow-md hover:bg-accent-hover disabled:opacity-50"
        >
          {pending
            ? "Generando…"
            : step === TOTAL_STEPS
              ? "Ver mi preview"
              : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/imagina-tu-web/_components/PreviewWizard.tsx
git commit -m "feat(imagina): PreviewWizard state machine orchestrating 6 steps"
```

---

## Task 12: `page.tsx` with noindex metadata, fonts, and intro copy

The landing page itself: noindex metadata, loads the 4 preview fonts via `next/font/google`, exposes them as CSS variables on the wrapper, renders an intro + the wizard.

**Files:**
- Create: `src/app/imagina-tu-web/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
// src/app/imagina-tu-web/page.tsx
import type { Metadata } from "next";
import {
  Inter,
  Space_Grotesk,
  Playfair_Display,
  Fraunces,
  Source_Sans_3,
} from "next/font/google";
import { PreviewWizard } from "./_components/PreviewWizard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-prev-inter",
  display: "swap",
});
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-prev-space",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-prev-playfair",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-prev-fraunces",
  display: "swap",
});
const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-prev-source",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Imagina tu web",
  description:
    "Cuéntanos un poco sobre tu negocio y te mostramos al momento cómo podría ser el home de tu web.",
  robots: { index: false, follow: false },
};

export default function ImaginaPage() {
  const fontVars = [
    inter.variable,
    space.variable,
    playfair.variable,
    fraunces.variable,
    source.variable,
  ].join(" ");

  return (
    <div className={fontVars}>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            Vista rápida
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">
            Imagina tu web en un vistazo
          </h1>
          <p className="mt-4 text-base text-fg-muted sm:text-lg">
            6 preguntas cortas y te mostramos cómo podría ser el home de tu
            negocio. Sin compromiso.
          </p>
        </div>
        <PreviewWizard />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Verify the page is NOT in sitemap and NOT in nav**

Open `src/app/sitemap.ts` and confirm `/imagina-tu-web` is NOT in `staticRoutes`. Open `src/lib/nav.ts` and confirm `imagina-tu-web` is not present. These should be unchanged from main — no edit needed, just confirm.

- [ ] **Step 4: Commit**

```bash
git add src/app/imagina-tu-web/page.tsx
git commit -m "feat(imagina): landing page with noindex metadata and preview fonts"
```

---

## Task 13: Full test suite + browser smoke test

Run all checks and manually verify the flow in the browser.

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: PASS. All existing + new tests green.

- [ ] **Step 2: TypeScript check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Start dev server and walk the flow**

Run: `npm run dev`
Open: `http://localhost:3000/imagina-tu-web`

Manually verify:
- [ ] Page loads with intro + step 1 of 6
- [ ] Step 1: Select **Informativa**, Siguiente activa, advance
- [ ] Step 2: Fill name "Test SL", select sector "Tecnología", advance
- [ ] Step 3: Add 3 offerings ("Consultoría", "Desarrollo", "Soporte"), advance
- [ ] Step 4: Pick a palette (e.g. **Pastel suave**), advance
- [ ] Step 5: Pick a typography (e.g. **Elegante serif**), advance
- [ ] Step 6: Write a 30+ char value prop, fill contact, accept privacy
- [ ] Click **Ver mi preview** — wait ≥2s after page load before clicking, or honeypot will reject
- [ ] Mail #1 arrives at `CONTACT_EMAIL_TO` (check inbox or Resend dashboard)
- [ ] Preview renders with chosen palette + typography + offerings
- [ ] Disclaimer visible above the preview
- [ ] RatingBar visible at bottom — click 👍
- [ ] Add optional comment, click **Enviar feedback**
- [ ] Mail #2 arrives with rating + comment
- [ ] After rating, **Quiero mi web de verdad** appears → click → goes to `/contacto?servicio=Desarrollo%20web`

- [ ] **Step 5: Verify route is not crawlable**

Open: `http://localhost:3000/imagina-tu-web` → View page source → confirm `<meta name="robots" content="noindex,nofollow">` is present.

Open: `http://localhost:3000/sitemap.xml` → confirm `/imagina-tu-web` is NOT listed.

Open homepage `http://localhost:3000/` → confirm no header or footer link to `/imagina-tu-web`.

- [ ] **Step 6: Re-test the ecommerce-productos branch**

Repeat the flow with **Ecommerce → Productos**. Confirm the preview grid shows "desde 19€" under each card and the heading reads "Nuestros productos".

- [ ] **Step 7: Commit any small fixes from smoke test**

```bash
git status
# if needed:
git add <files>
git commit -m "fix(imagina): adjustments from manual smoke test"
```

---

## Done

The flow is live at `/imagina-tu-web`, invisible from menu/footer, noindex, and sends:
- mail #1 on every form submit
- mail #2 (optional) on every thumbs rating

with a cross-referencing `leadId` in both subjects.
