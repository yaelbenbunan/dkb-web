"use server";

import { Resend } from "resend";
import { z } from "zod";

const callRequestSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    phone: z.string().min(6, "Teléfono demasiado corto"),
    service: z.string().min(1, "Falta servicio"),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

interface CallRequestResult {
  ok: boolean;
  error?: string;
}

export async function sendCallRequest(
  formData: FormData,
): Promise<CallRequestResult> {
  const parsed = callRequestSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    service: formData.get("service"),
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
  const { name, phone, service } = parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nueva solicitud de llamada — ${service} — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      `Servicio de interés: ${service}`,
      "",
      "Origen: CTA del sidebar en la página del servicio.",
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
