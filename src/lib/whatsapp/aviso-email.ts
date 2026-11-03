import "server-only";
import { Resend } from "resend";
import { BRAND, renderBrandedEmail } from "../email-layout";
import { MARCA_DINKBIT_SLUG } from "../ventas/dominio";
import { getLead, getMarcaPorId } from "../ventas/db";

/**
 * Correo al momento cuando un lead de WhatsApp de Dinkbit pasa a una persona
 * (pidió llamada, prefiere seguir por escrito, escribió fuera del guion…).
 *
 * Sin esto el aviso solo quedaba en la ficha y en «Espera respuesta» de la
 * bandeja, y un «Llamadme hoy» del chequeo dependía de que alguien abriera el
 * panel a tiempo. Solo la marca `dinkbit`: las demás marcas tienen su propia
 * comercial y no quieren estos correos.
 *
 * Destinatarias en `AVISO_LEADS_WHATSAPP` (emails separados por comas). Sin
 * ella no se manda nada. Best-effort: un fallo se registra y no toca el bot.
 */

export function destinatariasAviso(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export function construirAvisoLead(input: {
  leadId: string;
  negocio: string;
  telefono: string | null;
  nota: string | null;
}): { subject: string; html: string; text: string } {
  const negocio = input.negocio.trim() || "Lead de WhatsApp";
  return renderBrandedEmail({
    subject: `WhatsApp: ${negocio} espera respuesta`,
    eyebrow: "Aviso de WhatsApp",
    heading: `${negocio} espera respuesta`,
    intro: input.telefono
      ? `Ha pasado a una persona en WhatsApp. Su teléfono: ${input.telefono}.`
      : "Ha pasado a una persona en WhatsApp.",
    bullets: input.nota ? [input.nota] : undefined,
    bulletsLabel: input.nota ? "Lo que ha pasado" : undefined,
    cta: { label: "Abrir su ficha", url: `${BRAND.siteUrl}/panel/ventas/${MARCA_DINKBIT_SLUG}/leads/${input.leadId}` },
  });
}

export async function enviarAvisoLead(leadId: string, nota: string | null): Promise<void> {
  const para = destinatariasAviso(process.env.AVISO_LEADS_WHATSAPP);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM;
  if (para.length === 0 || !apiKey || !from) return;
  try {
    const lead = await getLead(leadId);
    if (!lead) return;
    const marca = await getMarcaPorId(lead.marca_id);
    if (marca?.slug !== MARCA_DINKBIT_SLUG) return;
    const correo = construirAvisoLead({ leadId, negocio: lead.negocio, telefono: lead.telefono, nota });
    const { error } = await new Resend(apiKey).emails.send({ from, to: para, ...correo });
    if (error) console.error("[whatsapp/aviso-email] Resend rechazó el aviso", leadId, error.message);
  } catch (e) {
    console.error("[whatsapp/aviso-email] fallo mandando el aviso", leadId, e);
  }
}
