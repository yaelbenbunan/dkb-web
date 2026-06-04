import { z } from "zod";
import {
  isPaletteSlug,
  isTypographySlug,
  isSectorSlug,
} from "@/lib/preview-themes";

const offeringSchema = z.string().trim().min(1, "Vacío").max(80, "Demasiado largo");

// ---- Contact-field validators ---------------------------------------------
// Shared between client (live input feedback in StepFinal) and server (schema
// validation in the lead action) so the rules never drift.

/** Strip everything that isn't a digit and count remaining digits. Strips the
 *  `+`/`00` prefix, spaces, dashes, parens, etc. */
export function countPhoneDigits(raw: string): number {
  return (raw.match(/\d/g) ?? []).length;
}

/** True if `s` contains an ascending or descending run of consecutive digits
 *  of length ≥ `len` (e.g. "123456", "98765"). */
function hasSequentialRun(s: string, len: number): boolean {
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
    asc = diff === 1 ? asc + 1 : 1;
    desc = diff === -1 ? desc + 1 : 1;
    if (asc >= len || desc >= len) return true;
  }
  return false;
}

/** Accept Spanish (9 digits, starting 6–9) and international numbers up to 15
 *  digits (E.164 max), while rejecting obvious fakes. Heuristics catch the most
 *  common junk submissions:
 *   - repeated digits (000000000, 111111111…)
 *   - 4+ identical digits in a row (…0000…)
 *   - too few distinct digits (+3400000000, 600600600…)
 *   - long sequential runs (123456789, 987654321…)
 */
export function isValidContactPhone(raw: string): boolean {
  const all = raw.replace(/\D/g, "");
  if (all.length < 9 || all.length > 15) return false;

  // National part: strip the country prefix (+34 / 0034 / 34) for ES numbers.
  let national = all;
  if (national.startsWith("0034")) national = national.slice(4);
  else if (national.length === 11 && national.startsWith("34"))
    national = national.slice(2);

  const isSpanish = national.length === 9;
  // Spanish 9-digit numbers always start with 6, 7, 8 or 9.
  if (isSpanish && !/^[6-9]/.test(national)) return false;

  // Run the anti-fake heuristics on the national part when it's a clean ES
  // number, otherwise on the full string.
  const d = isSpanish ? national : all;
  if (/^(\d)\1+$/.test(d)) return false; // all the same digit
  if (/(\d)\1{3,}/.test(d)) return false; // 4+ identical in a row
  if (new Set(d).size < 4) return false; // too few distinct digits
  if (hasSequentialRun(d, 6)) return false; // 123456… / 987654…
  return true;
}

/** Same rules zod uses internally but exported so we can show inline errors
 *  on the client without depending on a server round-trip. */
export function isValidContactEmail(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // local@host.tld — at least one dot in the domain, no whitespace.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

// Lowercase 6-digit hex color, e.g. "#1e3a8a". Accepts also 3-digit hex
// expanded to 6 (some color pickers emit shorthand).
const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Color inválido");

const customColorsSchema = z
  .object({
    text: hexColorSchema,
    accent: hexColorSchema,
    tint: hexColorSchema,
  })
  .optional();

const cuisineSchema = z
  .enum(["tradicional", "italiana", "asiatica", "mexicana", "americana", "fusion"])
  .optional();

// Optional logo: data URL (image/png|jpeg|webp|svg) up to ~700 KB.
const logoDataUrlSchema = z
  .string()
  .trim()
  .max(700_000, "Logo demasiado pesado (máx 500 KB aprox.)")
  .regex(
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/,
    "Formato de logo no válido",
  );

// Visual style selected by the user in StepStyle. Each value maps to a
// different React template under `_components/templates/`. Default is
// "moderno" so older lead rows / API calls remain valid.
export const PREVIEW_STYLES = ["moderno", "editorial", "compacto"] as const;
export type PreviewStyle = (typeof PREVIEW_STYLES)[number];
const styleSchema = z
  .enum(PREVIEW_STYLES)
  .optional()
  .default("moderno");

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
    cuisine: cuisineSchema,
    palette: z.string().refine(isPaletteSlug, "Paleta inválida"),
    customColors: customColorsSchema,
    typography: z.string().refine(isTypographySlug, "Tipografía inválida"),
    style: styleSchema,
    logoDataUrl: logoDataUrlSchema.optional().or(z.literal("")),
    address: z.string().trim().max(120, "Dirección demasiado larga").optional().or(z.literal("")),
    city: z.string().trim().max(60, "Ciudad demasiado larga").optional().or(z.literal("")),
    currentWebsite: z.string().trim().max(300, "URL demasiado larga").optional().or(z.literal("")),
    featuredDishes: z.array(offeringSchema).max(6).optional(),
    valueProp: z
      .string()
      .trim()
      .min(20, "Cuéntanos un poco más (mínimo 20 caracteres)")
      .max(800, "Máximo 800 caracteres"),
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z
      .string()
      .trim()
      .refine(isValidContactEmail, "Introduce un email válido"),
    phone: z
      .string()
      .trim()
      .refine(
        isValidContactPhone,
        "Introduce un teléfono válido (9 dígitos en España, hasta 15 internacional)",
      ),
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
    valueProp: z.string().trim().min(20).max(800),
    name: z.string().trim().min(2),
    email: z.string().trim().refine(isValidContactEmail),
    phone: z.string().trim().refine(isValidContactPhone),
    leadId: z.string().regex(/^[a-z0-9]{4,}-[a-z0-9]{4}$/, "leadId inválido"),
    rating: z.enum(["up", "down"]),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
  });
export type PreviewRatingInput = z.infer<typeof previewRatingSchema>;

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
        /** Optional short fun tagline shown under the name. Currently only
         *  populated for restauración dishes ("Sabor a domingo", "Plato bandera",
         *  etc.) but the schema allows it anywhere the AI sees fit. */
        tagline: z.string().trim().min(2).max(40).optional(),
      }),
    )
    .min(1)
    .max(6),
});
export type CopyResponse = z.infer<typeof copyResponseSchema>;

// Fictitious "Carta destacada" (restauración). Two named sections of menu
// items, each carrying a short description and a realistic invented price.
const menuItemResponseSchema = z.object({
  name: z.string().trim().min(2).max(70),
  desc: z.string().trim().min(5).max(140),
  /** Price as a display string, e.g. "€14" or "14 €". Kept loose on purpose. */
  price: z.string().trim().min(1).max(12),
});
export const menuResponseSchema = z.object({
  leftTitle: z.string().trim().min(2).max(40),
  leftItems: z.array(menuItemResponseSchema).min(3).max(6),
  rightTitle: z.string().trim().min(2).max(40),
  rightItems: z.array(menuItemResponseSchema).min(3).max(6),
});
export type MenuResponse = z.infer<typeof menuResponseSchema>;

// Extended copy used by the sector-aware `InformativaSectorTemplate`.
// Originally written for the salud sector, now consumed by all supported
// sectors (salud, educacion, moda, tecnologia, servicios). The legacy
// `saludCopyResponseSchema`/`SaludCopyResponse` aliases stay for now to
// avoid breaking any external consumer that pinned to them.
export const sectorInformativaCopyResponseSchema = copyResponseSchema.extend({
  valorAgregadoTitle: z.string().trim().min(2).max(80),
  valorAgregadoIntro: z.string().trim().min(20).max(240),
  bullets: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(60),
        text: z.string().trim().min(20).max(180),
      }),
    )
    .length(6, "bullets must contain exactly 6 items (3 per column)"),
  team: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        role: z.string().trim().min(2).max(60),
        gender: z.enum(["male", "female"]).optional(),
      }),
    )
    .min(4)
    .max(6),
  testimonials: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        text: z.string().trim().min(40).max(280),
      }),
    )
    .min(3)
    .max(4),
  /** Restauración only — fictitious "Carta destacada" with prices. Includes
   *  the user's featured dishes plus invented ones. Optional: when absent we
   *  fall back to the static per-cuisine menu in sector-assets. */
  menu: menuResponseSchema.optional(),
});
export type SectorInformativaCopyResponse = z.infer<
  typeof sectorInformativaCopyResponseSchema
>;
/** @deprecated use {@link SectorInformativaCopyResponse} */
export type SaludCopyResponse = SectorInformativaCopyResponse;
/** @deprecated use {@link sectorInformativaCopyResponseSchema} */
export const saludCopyResponseSchema = sectorInformativaCopyResponseSchema;

export const previewGenerateInputSchema = z.object({
  businessType: z.enum(["informativa", "ecommerce"]),
  ecommerceKind: z.enum(["productos", "servicios"]).optional(),
  businessName: z.string().trim().min(2).max(60),
  sector: z.string().refine(isSectorSlug),
  offerings: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
  cuisine: cuisineSchema,
  palette: z.string().refine(isPaletteSlug),
  customColors: customColorsSchema,
  typography: z.string().refine(isTypographySlug),
  style: styleSchema,
  valueProp: z.string().trim().min(20).max(800),
  address: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  /** Optional URL of the business's current website. We fetch it server-side
   *  and use its content to ground the generated copy (and reuse a real image
   *  when possible). */
  currentWebsite: z.string().trim().max(300).optional(),
  /** Optional signature dishes the user highlights (restauración only). The AI
   *  keeps these and invents the rest of the menu around them. */
  featuredDishes: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
});
export type PreviewGenerateInput = z.infer<typeof previewGenerateInputSchema>;
