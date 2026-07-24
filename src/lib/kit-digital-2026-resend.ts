import "server-only";
import { Resend } from "resend";
import { buildKitDigital2026Email } from "./kit-digital-2026-email";
import { setLeadEmailSent } from "./imagina-leads";

/** Manda el email de marca "casi has terminado" al lead y, si Resend devuelve un
 *  message id, lo persiste en el CRM (email_status='sent'). Best-effort en la
 *  persistencia; el resultado refleja el envío. Lo usan el webhook de Meta y la
 *  acción "Reenviar" del panel. */
export async function sendKitDigital2026Email(input: {
  leadId: string;
  name?: string | null;
  email: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const mail = buildKitDigital2026Email({ name: input.name ?? "", email: input.email });
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (error) {
      console.error("[kit-digital-2026-resend] send error:", error);
      return { ok: false, error: "send_failed" };
    }
    const messageId = data?.id;
    if (messageId) await setLeadEmailSent(input.leadId, messageId);
    return { ok: true, messageId };
  } catch (err) {
    console.error("[kit-digital-2026-resend] threw:", err);
    return { ok: false, error: "send_threw" };
  }
}
