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
