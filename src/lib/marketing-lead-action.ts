"use server";

import { Resend } from "resend";
import { z } from "zod";

/**
 * Lead de las landings de captación (/marketing-clinicas y
 * /marketing-negocios-locales). Formulario corto: nombre, teléfono y tipo de
 * clínica/negocio, con email opcional. Mismo blindaje antispam que el resto de
 * formularios (honeypot `website` + time-trap `formLoadedAt`).
 */
const marketingLeadSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    phone: z.string().min(6, "Teléfono demasiado corto"),
    businessType: z.string().min(1, "Selecciona una opción"),
    budget: z.string().min(1, "Selecciona un presupuesto"),
    email: z
      .union([z.email("Email inválido"), z.literal("")])
      .optional()
      .transform((v) => (v ? v : undefined)),
    origin: z.string().min(1),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

interface MarketingLeadResult {
  ok: boolean;
  error?: string;
}

export async function sendMarketingLead(
  formData: FormData,
): Promise<MarketingLeadResult> {
  const parsed = marketingLeadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    businessType: formData.get("businessType"),
    budget: formData.get("budget"),
    email: formData.get("email") ?? "",
    origin: formData.get("origin"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return {
      ok: false,
      error: "Servidor mal configurado. Inténtalo más tarde.",
    };
  }

  const resend = new Resend(apiKey);
  const { name, phone, businessType, budget, email, origin } = parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    ...(email ? { replyTo: email } : {}),
    subject: `Nuevo lead — ${origin} — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      `Tipo: ${businessType}`,
      `Presupuesto: ${budget}`,
      email ? `Email: ${email}` : "Email: (no facilitado)",
      "",
      `Origen: ${origin}.`,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return {
      ok: false,
      error: "No se pudo enviar la solicitud. Inténtalo más tarde.",
    };
  }
  return { ok: true };
}
