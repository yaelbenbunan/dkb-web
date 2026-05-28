import { z } from "zod";
import {
  isPaletteSlug,
  isTypographySlug,
  isSectorSlug,
} from "@/lib/preview-themes";

const offeringSchema = z.string().trim().min(1, "Vacío").max(80, "Demasiado largo");

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

// Optional logo: data URL (image/png|jpeg|webp|svg) up to ~700 KB.
const logoDataUrlSchema = z
  .string()
  .trim()
  .max(700_000, "Logo demasiado pesado (máx 500 KB aprox.)")
  .regex(
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/,
    "Formato de logo no válido",
  );

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
    customColors: customColorsSchema,
    typography: z.string().refine(isTypographySlug, "Tipografía inválida"),
    logoDataUrl: logoDataUrlSchema.optional().or(z.literal("")),
    address: z.string().trim().max(120, "Dirección demasiado larga").optional().or(z.literal("")),
    city: z.string().trim().max(60, "Ciudad demasiado larga").optional().or(z.literal("")),
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
    .refine((arr) => arr.length === 4 || arr.length === 6, {
      message: "bullets must contain exactly 4 or 6 items",
    }),
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
  palette: z.string().refine(isPaletteSlug),
  customColors: customColorsSchema,
  typography: z.string().refine(isTypographySlug),
  valueProp: z.string().trim().min(20).max(500),
  address: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
});
export type PreviewGenerateInput = z.infer<typeof previewGenerateInputSchema>;
