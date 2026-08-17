"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { growthLead, utmFromFormData } from "./web-lead-origin";
import { sendLeadAutoresponder } from "./lead-autoresponder";
import { growthAutoresponder } from "./lead-emails";
import { sendMetaLead } from "./meta-capi";
import { calcular, parseImporte, type CalcResult } from "./growth-calc";

/**
 * Los tres importes llegan como cadena. Cadena vacía = la opción "no lo sé" /
 * "no invierto todavía" / "prefiero no decirlo", así que no hacen falta
 * banderas aparte: parseImporte("") devuelve null, que es lo que espera
 * calcular().
 */
const schema = z
  .object({
    name: z.string().trim().min(2, "Demasiado corto"),
    email: z.string().trim().email("Email inválido"),
    phone: z.string().trim().min(6, "Teléfono demasiado corto"),
    inversion: z.string(),
    pacientes: z.string(),
    ticket: z.string(),
    consent: z.literal(true),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export interface GrowthResult {
  ok: boolean;
  error?: string;
  resultado?: CalcResult;
}

export async function requestGrowth(formData: FormData): Promise<GrowthResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    inversion: String(formData.get("inversion") ?? ""),
    pacientes: String(formData.get("pacientes") ?? ""),
    ticket: String(formData.get("ticket") ?? ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }
  const d = parsed.data;

  const inversion = parseImporte(d.inversion);
  const pacientes = parseImporte(d.pacientes);
  const ticket = parseImporte(d.ticket);
  const resultado = calcular({ inversion, pacientes, ticket });

  const saved = await createWebhookLead(
    growthLead(
      {
        name: d.name,
        email: d.email,
        phone: d.phone,
        inversion,
        pacientes,
        ticket,
        costePorPaciente: resultado.costePorPaciente,
        rama: resultado.rama,
      },
      utmFromFormData(formData),
    ),
  );

  // Best-effort de aquí abajo: el resultado ya es suyo y lo ha "pagado" con sus
  // datos. Que falle el correo o la conversión no puede quitárselo.
  await sendLeadAutoresponder({
    leadId: saved.id,
    to: d.email,
    mail: growthAutoresponder({
      name: d.name,
      rama: resultado.rama,
      costePorPaciente: resultado.costePorPaciente,
    }),
  });

  // Misma conversión que manda el píxel del navegador, con el mismo eventId:
  // sin él Meta contaría dos por lead.
  const eventId = String(formData.get("eventId") ?? "");
  if (eventId) {
    const h = await headers();
    const c = await cookies();
    await sendMetaLead({
      eventId,
      email: d.email,
      phone: d.phone,
      sourceUrl: String(formData.get("sourceUrl") ?? "") || null,
      userAgent: h.get("user-agent"),
      clientIp: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      fbp: c.get("_fbp")?.value ?? null,
      fbc: c.get("_fbc")?.value ?? null,
    });
  }

  return { ok: true, resultado };
}
