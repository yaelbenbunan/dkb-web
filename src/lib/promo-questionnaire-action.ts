"use server";

import { z } from "zod";
import { verifyPromoToken } from "./promo-token";
import {
  savePromoQuestionnaire,
  uploadPromoLogo,
  createWebhookLead,
} from "./imagina-leads";
import type { PromoQuestionnaireInput } from "./promo-questionnaire";

const schema = z
  .object({
    token: z.string().default(""),
    leadId: z.string().default(""),
    email: z.email("Email inválido"),
    name: z.string().min(2, "Falta tu nombre"),
    businessName: z.string().min(1, "Falta el nombre del negocio"),
    phone: z.string().optional().default(""),
    activity: z.string().min(2, "Cuéntanos a qué te dedicas"),
    sector: z.string().min(1, "Elige un sector"),
    services: z.string().min(2, "Indica tus servicios"),
    need: z.string().min(1, "Elige qué necesitas"),
    currentWebsite: z.string().optional().default(""),
    style: z.string().min(1, "Elige un estilo"),
    colors: z.string().min(1, "Indica los colores"),
    typography: z.string().min(1, "Indica la tipografía"),
    references: z.string().optional().default(""),
    social: z.string().optional().default(""),
    extra: z.string().optional().default(""),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export async function submitPromoQuestionnaire(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse({ ...raw, formLoadedAt: Number(formData.get("formLoadedAt")) });
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos obligatorios." };
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  // Determina el lead a actualizar: el del token si verifica; si no, uno nuevo.
  let leadId = d.leadId;
  const tokenOk = d.token && d.leadId && verifyPromoToken(d.leadId, email, d.token);
  if (!tokenOk) {
    const fresh = await createWebhookLead({
      email,
      name: d.name,
      phone: d.phone || null,
      channel: "promo-verano",
      campaign: "promo-verano-2026",
      notes: "Origen: cuestionario Promo Verano (sin token válido)",
    });
    leadId = fresh.id ?? email;
  }

  // Logo (best-effort): sólo si el usuario adjuntó un fichero real.
  let logoPath: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    logoPath = await uploadPromoLogo(leadId, logo);
  }

  const input: PromoQuestionnaireInput = {
    leadId,
    email,
    name: d.name,
    businessName: d.businessName,
    phone: d.phone || undefined,
    activity: d.activity,
    sector: d.sector,
    services: d.services,
    need: d.need,
    currentWebsite: d.currentWebsite || undefined,
    style: d.style,
    colors: d.colors,
    typography: d.typography,
    references: d.references || undefined,
    social: d.social || undefined,
    logoPath,
    extra: d.extra || undefined,
  };
  await savePromoQuestionnaire(input);
  return { ok: true };
}
