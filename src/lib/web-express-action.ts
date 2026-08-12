"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { webExpressLead, utmFromFormData } from "./web-lead-origin";
import { consentFromFormData } from "./consent";
import { sendLeadAutoresponder } from "./lead-autoresponder";
import { webExpressAutoresponder } from "./lead-emails";
import {
  CONTACT_METHODS,
  TIME_SLOTS,
  DECISION_MAKER,
  URGENCY,
  GOALS,
  PRACTICE_STAGE,
} from "./web-express-landings";

/**
 * Teléfono español: 9 dígitos que empiezan por 6, 7, 8 o 9, con prefijo +34
 * opcional y tolerando espacios, puntos o guiones.
 *
 * No es verificación real —para eso haría falta mandar un código— pero descarta
 * lo que de verdad ensucia la lista: los 123456789, los teléfonos de 5 cifras y
 * los "no quiero darlo". Quien quiera colar un número falso plausible podrá,
 * pero ese caso lo detecta la llamada, no un formulario.
 */
const PHONE_RE = /^(?:\+34[\s.-]?)?[6-9](?:[\s.-]?\d){8}$/;

const schema = z
  .object({
    name: z.string().trim().min(3, "Escribe tu nombre y apellidos"),
    email: z.email("Revisa tu correo"),
    phone: z
      .string()
      .trim()
      .regex(PHONE_RE, "Escribe un teléfono español válido (9 dígitos)"),
    contactMethod: z.enum(CONTACT_METHODS),
    timeSlot: z.enum(TIME_SLOTS),
    decisionMaker: z.enum(DECISION_MAKER),
    urgency: z.enum(URGENCY),
    goals: z.array(z.enum(GOALS)).min(1, "Marca al menos un objetivo"),
    stage: z.enum(PRACTICE_STAGE).optional(),
    currentWebsite: z.string().trim().max(200).optional(),
    origin: z.string().min(1),
    campaign: z.string().min(1),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export interface WebExpressResult {
  ok: boolean;
  error?: string;
}

export async function requestWebExpress(formData: FormData): Promise<WebExpressResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    contactMethod: formData.get("contactMethod"),
    timeSlot: formData.get("timeSlot"),
    decisionMaker: formData.get("decisionMaker"),
    urgency: formData.get("urgency"),
    goals: formData.getAll("goals").map(String),
    stage: formData.get("stage") || undefined,
    currentWebsite: formData.get("currentWebsite") || undefined,
    origin: formData.get("origin"),
    campaign: formData.get("campaign"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    const first = parsed.error.issues.find((i) => i.path[0] !== "formLoadedAt");
    return { ok: false, error: first?.message ?? "Revisa los campos." };
  }

  const d = parsed.data;

  // El lead primero: si Resend falla después, no se pierde.
  const saved = await createWebhookLead(
    webExpressLead(
      { ...d, consent: consentFromFormData(formData) },
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
  // Aviso interno. El asunto lleva el plazo porque es lo que decide a quién se
  // llama primero cuando entran varios leads a la vez.
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `${d.origin} — ${d.name} (${d.urgency})`,
    text: [
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      "",
      `Contactar por: ${d.contactMethod}`,
      `Franja: ${d.timeSlot}`,
      `¿Decide?: ${d.decisionMaker}`,
      `Plazo: ${d.urgency}`,
      `Objetivo: ${d.goals.join(", ")}`,
      d.stage ? `Situación: ${d.stage}` : "Situación: —",
      d.currentWebsite ? `Web actual: ${d.currentWebsite}` : "Web actual: no tiene",
      "",
      `Origen: ${d.origin}`,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error (web-express, interno):", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }

  await sendLeadAutoresponder({
    leadId: saved.id,
    to: d.email,
    mail: webExpressAutoresponder({ name: d.name, timeSlot: d.timeSlot }),
  });

  return { ok: true };
}
