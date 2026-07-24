import "server-only";
import { Resend } from "resend";
import { createWebhookLead } from "./imagina-leads";
import { buildKitDigital2026Email } from "./kit-digital-2026-email";

const CAMPAIGN = "Kit Digital 2026";

/** Lead entrante de Meta Lead Ads (vía Zapier) para el Kit Digital: se guarda en
 *  el CRM con canal Meta + campaña Kit Digital 2026 y se le manda el email de
 *  marca "casi has terminado". El guardado es lo crítico; el email es
 *  best-effort. Idempotente por `id` externo (leadgen_id) en createWebhookLead. */
export async function handleKitDigital2026MetaLead(input: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const email = clean(input.email);

  const saved = await createWebhookLead({
    id: clean(input.id),
    name: clean(input.name),
    email,
    phone: clean(input.phone),
    channel: "Meta",
    campaign: CAMPAIGN,
    // Entra ya etiquetado como "Interés en Kit Digital" (slug kit-digital).
    status: "kit-digital",
    notes: "Origen: Meta Lead Ads (campaña Kit Digital) · pendiente de completar datos en la landing",
  });
  if (!saved.ok) return saved;

  // Email al lead — best-effort. Sin email o sin config de Resend, se omite.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (email && apiKey) {
    try {
      const resend = new Resend(apiKey);
      const mail = buildKitDigital2026Email({ name: clean(input.name) ?? "", email });
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (error) console.error("[kit-digital-2026-meta] email error:", error);
    } catch (err) {
      console.error("[kit-digital-2026-meta] email threw:", err);
    }
  }
  return saved;
}
