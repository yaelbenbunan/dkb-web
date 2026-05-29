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

/** Accept Spanish (9 digits) and most international numbers up to 15 digits
 *  (E.164 max). Common spam submissions use repeated digits or very short
 *  numbers — both fail this check. */
export function isValidContactPhone(raw: string): boolean {
  const digits = countPhoneDigits(raw);
  if (digits < 9 || digits > 15) return false;
  // Reject obvious spam: same digit repeated (111111111, 999999999, etc.)
  const onlyDigits = raw.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(onlyDigits)) return false;
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
