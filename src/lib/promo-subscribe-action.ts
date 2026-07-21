"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { promoVeranoLead, utmFromFormData } from "./web-lead-origin";
import { addOrUpdateMember } from "./mailchimp";
import { buildPromoEmail } from "./promo-email";
import { PROMO } from "./promo-config";

const schema = z
  .object({
    // Nombre: sirve para saber por quién preguntar al contactar con el lead.
    name: z.string().trim().min(2, "Nombre inválido").max(80),
    email: z.email("Email inválido"),
    // Teléfono opcional: vía de contacto adicional al email. Cadena vacía ⇒ sin teléfono.
    phone: z.string().max(40).optional(),
    // El checkbox sólo llega ("on") si el usuario lo marca; ausente ⇒ null ⇒ falla.
    consent: z.literal("on", { message: "Debes aceptar para continuar" }),
    website: z.string().max(0, "Honeypot field must be empty"),
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export async function subscribePromo(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    consent: formData.get("consent"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa tu nombre y email, y acepta las condiciones." };
  }
  const name = parsed.data.name;
  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone?.trim() || undefined;

  // 1) CRÍTICO: guardar el lead antes que nada (nunca se pierde).
  const consentAt = new Date().toISOString();
  const lead = await createWebhookLead(
    promoVeranoLead({ name, email, phone, consentAt }, utmFromFormData(formData)),
  );
  if (!lead.ok || !lead.id) {
    console.error("[promo] lead persist failed:", lead.error);
    return { ok: false, error: "No pudimos completar tu solicitud. Inténtalo de nuevo en un momento." };
  }

  // 2) BEST-EFFORT: alta en Mailchimp (single opt-in) + tag.
  await addOrUpdateMember(email, [PROMO.mailchimpTag]);

  // 3) BEST-EFFORT: email de bienvenida con los detalles de la promo y CTA a
  //    WhatsApp / llamada (el enlace del cuestionario se envía a mano después).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const { subject, html, text } = buildPromoEmail({ name });
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `${PROMO.fromName} <${PROMO.fromEmail}>`,
      to: email,
      subject,
      html,
      text,
    });
    if (error) console.error("[promo] Resend error:", error);
  } else {
    console.error("[promo] Missing RESEND_API_KEY — welcome email not sent");
  }

  return { ok: true };
}
