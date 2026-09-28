"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { web299Lead, utmFromFormData } from "./web-lead-origin";
import { consentFromFormData } from "./consent";
import { sendLeadAutoresponder } from "./lead-autoresponder";
import { web299Autoresponder } from "./lead-emails";
import { sendMetaLead } from "./meta-capi";
import { destinatariosAviso } from "./avisos-internos";
import { headers, cookies } from "next/headers";
import { WEB_299_ORIGIN, WEB_299_PRICE } from "./web-299";

/**
 * Entrada de leads de la landing de 299€.
 *
 * Tres campos y nada más: nombre, teléfono y email. La acción de web express
 * (`web-express-action.ts`) exige cinco campos más de cualificación, y aquí no
 * sirve — esta landing es para tráfico de pago, donde cada campo extra es gente
 * que abandona antes de enviar. Lo que sí se comparte es todo lo que protege y
 * distribuye el lead: validación de teléfono, honeypot, tiempo mínimo, alta en
 * el CRM antes que nada, autorespondedor y conversión a Meta.
 */

/**
 * Teléfono español: 9 dígitos que empiezan por 6, 7, 8 o 9, con +34 opcional y
 * tolerando espacios, puntos o guiones. Mismo criterio que el resto de los
 * formularios del sitio; no es verificación real, pero descarta lo que de verdad
 * ensucia la lista.
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
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  // Un bot rellena y envía en milisegundos. Dos segundos no molestan a nadie que
  // esté escribiendo de verdad.
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export interface Web299Result {
  ok: boolean;
  error?: string;
}

export async function requestWeb299(formData: FormData): Promise<Web299Result> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    // El mensaje del honeypot y el del tiempo no se le enseñan a nadie: son
    // trampas, y decir «has enviado demasiado rápido» solo le enseña al bot a
    // esperar. Se devuelve el primer error de un campo de verdad.
    const first = parsed.error.issues.find(
      (i) => i.path[0] !== "formLoadedAt" && i.path[0] !== "website",
    );
    return { ok: false, error: first?.message ?? "Revisa los campos." };
  }

  const d = parsed.data;

  // El lead PRIMERO: si Resend falla después, el lead no se pierde. Es el mismo
  // orden que el resto de los formularios y la razón es la de siempre — un
  // correo que no sale se puede reenviar, un lead que no se guardó no existe.
  const saved = await createWebhookLead(
    web299Lead({ ...d, consent: consentFromFormData(formData) }, utmFromFormData(formData)),
  );

  const apiKey = process.env.RESEND_API_KEY;
  const to = destinatariosAviso(process.env.CONTACT_EMAIL_TO);
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || to.length === 0) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const resend = new Resend(apiKey);
  // El asunto lleva el precio: con dos ofertas de web vivas, es lo que decide
  // con qué guion se llama a este lead.
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `${WEB_299_ORIGIN} — ${d.name}`,
    text: [
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      "",
      `Oferta: desarrollo web por ${WEB_299_PRICE} (alojamiento y dominio aparte)`,
      `Origen: ${WEB_299_ORIGIN}`,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error (web-299, interno):", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }

  await sendLeadAutoresponder({
    leadId: saved.id,
    to: d.email,
    mail: web299Autoresponder({ name: d.name }),
  });

  // Conversión a Meta por servidor, con el mismo eventId que mandó el píxel del
  // navegador: si llegan los dos, Meta cuenta uno; si el píxel no llegó
  // —bloqueador, iOS, cookies rechazadas— este sí. En una landing de pago esto
  // es lo que decide si la campaña puede optimizar.
  const eventId = String(formData.get("eventId") ?? "");
  if (eventId) {
    const h = await headers();
    const c = await cookies();
    await sendMetaLead({
      eventId,
      email: d.email,
      phone: d.phone,
      sourceUrl: String(formData.get("pageUrl") ?? ""),
      userAgent: h.get("user-agent"),
      clientIp: h.get("x-real-ip") ?? h.get("x-forwarded-for"),
      fbp: c.get("_fbp")?.value,
      fbc: c.get("_fbc")?.value,
    });
  }

  return { ok: true };
}
