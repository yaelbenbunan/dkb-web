"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { homeHeroLead, utmFromFormData } from "./web-lead-origin";
import { consentFromFormData } from "./consent";
import { sendLeadAutoresponder } from "./lead-autoresponder";
import { homeHeroAutoresponder } from "./lead-emails";

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
  // email, so the lead is never lost even si Resend está caído o mal configurado.
  const saved = await createWebhookLead(
    homeHeroLead(
      { ...parsed.data, consent: consentFromFormData(formData) },
      utmFromFormData(formData),
    ),
  );

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

  // Acuse de recibo al lead. Va después del aviso interno y es best-effort: si
  // falla, el lead ya está guardado y el equipo ya está avisado, así que no se
  // le devuelve un error a quien acaba de rellenar el formulario.
  await sendLeadAutoresponder({
    leadId: saved.id,
    to: email,
    mail: homeHeroAutoresponder({ name, service }),
  });

  return { ok: true };
}
