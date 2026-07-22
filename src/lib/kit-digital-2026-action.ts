"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { kitDigital2026Lead, utmFromFormData } from "./web-lead-origin";

const schema = z
  .object({
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z.string().trim().email("Email inválido"),
    phone: z.string().trim().min(6, "Teléfono demasiado corto"),
    services: z.array(z.string().trim().min(1)).min(1, "Selecciona un servicio"),
    businessType: z.enum(["pyme", "autonomo"]),
    // Pyme → tramo de empleados; autónomo → antigüedad de alta. La condición se
    // valida abajo con superRefine (uno u otro según el tipo).
    employees: z.string().trim().optional(),
    seniority: z.string().trim().optional(),
    sectors: z.array(z.string().trim().min(1)).default([]),
    consent: z.literal(true),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  })
  .superRefine((d, ctx) => {
    if (d.businessType === "pyme" && !d.employees) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Falta nº de empleados",
        path: ["employees"],
      });
    }
    if (d.businessType === "autonomo" && !d.seniority) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Falta antigüedad de alta",
        path: ["seniority"],
      });
    }
  });

export interface KitDigital2026Result {
  ok: boolean;
  error?: string;
}

export async function requestKitDigital2026(
  formData: FormData,
): Promise<KitDigital2026Result> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    services: formData.getAll("services").map(String),
    businessType: formData.get("businessType"),
    employees: formData.get("employees") ?? undefined,
    seniority: formData.get("seniority") ?? undefined,
    sectors: formData.getAll("sectors").map(String),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }

  const d = parsed.data;

  // Persist every web lead to the CRM (best-effort, never throws) before the
  // emails — so the lead is never lost even if Resend is down or misconfigured.
  await createWebhookLead(
    kitDigital2026Lead(
      {
        name: d.name,
        email: d.email,
        phone: d.phone,
        services: d.services,
        businessType: d.businessType,
        employees: d.employees ?? null,
        seniority: d.seniority ?? null,
        sectors: d.sectors,
      },
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
  const typeLabel = d.businessType === "pyme" ? "Pyme" : "Autónomo";
  const detail =
    d.businessType === "pyme"
      ? `Empleados: ${d.employees}`
      : `Antigüedad de alta: ${d.seniority}`;

  // 1) Aviso interno al equipo (crítico): si falla, devolvemos error.
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `Kit Digital 2026 — Nuevo interesado — ${d.name}`,
    text: [
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      `Servicios de interés: ${d.services.join(", ")}`,
      `Tipo: ${typeLabel}`,
      detail,
      `Sectores: ${d.sectors.join(", ") || "—"}`,
      "",
      "Origen: landing /kit-digital-2026 (vuelta del Kit Digital) de dinkbit.es.",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error (kit-digital-2026, interno):", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }

  // 2) Autoresponder al lead (best-effort): un fallo aquí no invalida el envío
  //    — el aviso interno ya se entregó y el lead está en el CRM.
  const firstName = d.name.split(/\s+/)[0] || d.name;
  const { error: autoErr } = await resend.emails.send({
    from,
    to: d.email,
    subject: "Gracias — te avisamos en cuanto se abra el Kit Digital 2026",
    text: [
      `Hola ${firstName},`,
      "",
      "Gracias por dejarnos tus datos. Ya estás en nuestra lista para el Kit Digital 2026.",
      "",
      "Qué haremos:",
      "· En cuanto se abra oficialmente el plazo, preparamos y tramitamos tu solicitud.",
      "· Si nos falta algún dato para tu diagnóstico, te contactamos.",
      "· Mientras tanto podemos ir preparando tu diagnóstico de madurez digital para que estés listo el día 1.",
      "",
      "Cualquier duda, responde a este correo.",
      "",
      "Un saludo,",
      "El equipo de Dinkbit",
    ].join("\n"),
  });
  if (autoErr) {
    console.error("Resend error (kit-digital-2026, autoresponder):", autoErr);
  }

  return { ok: true };
}
