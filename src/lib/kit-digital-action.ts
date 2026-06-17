"use server";

import { Resend } from "resend";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z.string().trim().email("Email inválido"),
    phone: z.string().trim().min(6, "Teléfono demasiado corto"),
    device: z.string().trim().min(1, "Falta modelo"),
    nif: z.string().trim().min(8, "NIF inválido"),
    address: z.string().trim().min(4, "Dirección demasiado corta"),
    postalCode: z.string().trim().regex(/^\d{5}$/, "Código postal inválido"),
    city: z.string().trim().min(2, "Ciudad demasiado corta"),
    bono: z.string().trim().min(1, "Falta número de bono"),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export interface KitDigitalResult {
  ok: boolean;
  error?: string;
}

export async function requestKitDigital(
  formData: FormData,
): Promise<KitDigitalResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    device: formData.get("device"),
    nif: formData.get("nif"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    bono: formData.get("bono"),
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
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const resend = new Resend(apiKey);
  const { name, email, phone, device, nif, address, postalCode, city, bono } =
    parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Kit Digital — Solicitud de ordenador — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Teléfono: ${phone}`,
      `Modelo de interés: ${device}`,
      `NIF: ${nif}`,
      `Número de bono: ${bono}`,
      `Dirección de entrega: ${address}`,
      `Código postal: ${postalCode}`,
      `Ciudad: ${city}`,
      "",
      "Origen: landing /kit-digital de dinkbit.es.",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error (kit-digital):", error);
    return { ok: false, error: "No se pudo enviar la solicitud. Inténtalo más tarde." };
  }
  return { ok: true };
}
