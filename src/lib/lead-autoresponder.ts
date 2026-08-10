import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, type BrandedEmailInput } from "./email-layout";
import { setLeadEmailSent } from "./imagina-leads";
import { CONTACT_INFO } from "./contact-info";

/**
 * Manda el acuse de recibo al lead que acaba de rellenar un formulario y
 * registra el estado en el CRM para que la columna del panel sea fiable.
 *
 * Es best-effort de principio a fin: si Resend no está configurado, falla o
 * lanza, se devuelve el motivo pero NUNCA se propaga la excepción. El lead ya
 * está guardado en ese punto y perderlo por un fallo de correo sería mucho
 * peor que no enviar el acuse.
 */
export async function sendLeadAutoresponder(input: {
  /** Id del lead en el CRM. Sin él se envía igual, pero no se registra estado. */
  leadId?: string | null;
  to: string;
  mail: BrandedEmailInput;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const rendered = renderBrandedEmail(input.mail);
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      // Responder tiene que llegar al buzón de contacto pase lo que pase con el
      // remitente, que depende de qué dominio esté verificado en Resend.
      replyTo: CONTACT_INFO.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (error) {
      console.error("[lead-autoresponder] send error:", error);
      return { ok: false, error: "send_failed" };
    }
    const messageId = data?.id;
    // El envío ya ha ocurrido: que falle el registro no lo deshace.
    if (messageId && input.leadId) {
      try {
        await setLeadEmailSent(input.leadId, messageId);
      } catch (err) {
        console.error("[lead-autoresponder] no se pudo registrar el estado:", err);
      }
    }
    return { ok: true, messageId };
  } catch (err) {
    console.error("[lead-autoresponder] threw:", err);
    return { ok: false, error: "send_threw" };
  }
}
