"use server";

import { Resend } from "resend";
import { z } from "zod";
import { createWebhookLead } from "./imagina-leads";
import { promoVeranoLead, utmFromFormData } from "./web-lead-origin";
import { addOrUpdateMember } from "./mailchimp";
import { mintPromoToken } from "./promo-token";
import { buildPromoEmail } from "./promo-email";
import { PROMO } from "./promo-config";

const schema = z
  .object({
    email: z.email("Email inválido"),
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
    email: formData.get("email"),
    consent: formData.get("consent"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisa el email y acepta las condiciones." };
  }
  const email = parsed.data.email.trim().toLowerCase();

  // 1) CRÍTICO: guardar el lead antes que nada (nunca se pierde).
  const consentAt = new Date().toISOString();
  const lead = await createWebhookLead(
    promoVeranoLead({ email, consentAt }, utmFromFormData(formData)),
  );
  if (!lead.ok || !lead.id) {
    console.error("[promo] lead persist failed:", lead.error);
    return { ok: false, error: "No pudimos completar tu solicitud. Inténtalo de nuevo en un momento." };
  }
  const leadId = lead.id;

  // 2) BEST-EFFORT: alta en Mailchimp (single opt-in) + tag.
  await addOrUpdateMember(email, [PROMO.mailchimpTag]);

  // 3) BEST-EFFORT: email de bienvenida con CTA al cuestionario.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const token = mintPromoToken(leadId, email);
    const { subject, html, text } = buildPromoEmail({ email, leadId, token });
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: PROMO.fromEmail,
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
