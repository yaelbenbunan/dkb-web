"use server";

import { cookies, headers } from "next/headers";
import { Resend } from "resend";
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
    // positive() y no solo number(): un campo ausente da Number(null) = 0, que
    // sin este mínimo pasaría el control de tiempo de más abajo (Date.now() -
    // 0 siempre es mayor que 2000) y dejaría el anti-spam sin efecto ante un
    // POST directo que omita el campo.
    formLoadedAt: z.number().positive(),
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

  const lead = growthLead(
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
  );
  const saved = await createWebhookLead(lead);

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

  // Aviso interno: esta es la única landing de captación sin él, y su fallo
  // silencioso es caro (nadie se entera de un lead nuevo, o si falta
  // configuración en producción todos se evaporan sin más rastro que un
  // console.error). Va envuelto en try/catch a propósito y NO participa del
  // resultado de la función: a diferencia de otros actions, aquí que falle
  // este correo no puede tocar el `return { ok: true, resultado }` de abajo,
  // porque el usuario ya ha "pagado" con sus datos por ver su resultado.
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_EMAIL_TO;
    const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
    if (!apiKey || !to) {
      console.error("Growth: falta RESEND_API_KEY o CONTACT_EMAIL_TO; no se manda aviso interno");
    } else {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        replyTo: d.email,
        subject: `Growth — ${d.name} (rama ${resultado.rama})`,
        text: [
          `Nombre: ${d.name}`,
          `Email: ${d.email}`,
          `Teléfono: ${d.phone}`,
          "",
          lead.notes ?? "",
          "",
          // El guardado en el CRM va en el cuerpo para que un fallo de Supabase
          // sea visible en el buzón y no sólo en los logs de Vercel.
          saved.ok
            ? "CRM: guardado correctamente."
            : `CRM: NO SE GUARDÓ (${saved.error ?? "sin detalle"}). Revisa Supabase.`,
        ].join("\n"),
      });
      if (error) console.error("Resend error (growth, interno):", error);
    }
  } catch (err) {
    console.error("Growth: fallo al mandar el aviso interno", err);
  }

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
