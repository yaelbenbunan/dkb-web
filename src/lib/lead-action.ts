"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { homeHeroLead, utmFromFormData } from "./web-lead-origin";

const leadSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    email: z.email("Email inválido"),
    phone: z.string().min(6, "Teléfono demasiado corto"),
    service: z.string().min(1, "Selecciona un servicio"),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

interface LeadActionResult {
  ok: boolean;
  error?: string;
}

export async function sendLead(formData: FormData): Promise<LeadActionResult> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    service: formData.get("service"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }

  // Persist every web lead to the CRM (best-effort, never throws) before the
  // email — so the lead is never lost even if Resend is down or misconfigured.
  await createWebhookLead(homeHeroLead(parsed.data, utmFromFormData(formData)));

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const resend = new Resend(apiKey);
  const { name, email, phone, service } = parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Nuevo lead desde Home — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Teléfono: ${phone}`,
      `Servicio de interés: ${service}`,
      "",
      "Origen: formulario rápido del Home (Hero).",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar el mensaje. Inténtalo más tarde." };
  }
  return { ok: true };
}
