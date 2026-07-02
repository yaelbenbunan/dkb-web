"use server";

import { Resend } from "resend";
import {
  contactSchema,
  isContactFieldName,
  type ContactActionResult,
  type ContactFieldErrors,
} from "./validation";
import { createWebhookLead } from "./imagina-leads";
import { contactLead, utmFromFormData } from "./web-lead-origin";

export async function sendContactEmail(
  formData: FormData,
): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    service: formData.get("service"),
    source: formData.get("source"),
    message: formData.get("message"),
    privacy: formData.get("privacy") ?? "",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    const fieldErrors: ContactFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (isContactFieldName(key) && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors,
    };
  }

  // Persist every web lead to the CRM (best-effort, never throws) before the
  // email — so the lead is never lost even if Resend is down or misconfigured.
  await createWebhookLead(contactLead(parsed.data, utmFromFormData(formData)));

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const resend = new Resend(apiKey);
  const { name, email, phone, service, source, message } = parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Nuevo contacto desde dinkbit.es — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Teléfono: ${phone}`,
      `Servicio de interés: ${service}`,
      `Cómo nos conoció: ${source}`,
      "",
      "Mensaje:",
      message,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar el mensaje. Inténtalo más tarde." };
  }
  return { ok: true };
}
