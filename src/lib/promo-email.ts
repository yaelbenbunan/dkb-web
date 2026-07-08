// Email de bienvenida a la promo de verano (-50%). Table-based + inline styles
// para compatibilidad con clientes de correo. Se envía AL usuario (marketing),
// por eso incluye disclaimer de comunicaciones comerciales y baja.
import { PROMO, promoDeadlineLabel } from "./promo-config";

const FONT_STACK = "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";
const ACCENT = "#187bef";

export function buildPromoEmail(input: { email: string; leadId: string; token: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const ctaHref =
    `${PROMO.siteUrl}${PROMO.questionnairePath}` +
    `?t=${encodeURIComponent(input.token)}` +
    `&lid=${encodeURIComponent(input.leadId)}` +
    `&em=${encodeURIComponent(input.email)}`;
  const deadline = promoDeadlineLabel();
  const subject = `Tu web o ecommerce al ${PROMO.discountPct}% este verano 🌴`;
  const preheader = `Solo hasta el ${deadline}. Cuéntanos sobre tu negocio y ponemos tu web en marcha con ${PROMO.discountPct}% de descuento.`;

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT_STACK};color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border-top:6px solid ${ACCENT};">
  <tr><td style="padding:30px 36px 6px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:${ACCENT};text-transform:uppercase;">Promo Verano · -${PROMO.discountPct}%</div>
    <h1 style="margin:12px 0 0;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-0.5px;">
      Este verano, tu web o ecommerce al ${PROMO.discountPct}% 🌴
    </h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:#475569;">
      Gracias por tu interés. Durante este verano lanzamos todas nuestras webs y
      tiendas online con un <strong style="color:${ACCENT};">${PROMO.discountPct}% de descuento</strong>.
      Oferta válida hasta el <strong>${deadline}</strong>.
    </p>
  </td></tr>
  <tr><td style="padding:24px 36px 8px;text-align:center;">
    <a href="${ctaHref}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:17px 34px;border-radius:12px;">Cuéntanos sobre tu negocio →</a>
    <p style="margin:14px 0 0;font-size:13px;color:#64748b;">Nos dices a qué te dedicas y empezamos a diseñar tu web.</p>
  </td></tr>
  <tr><td style="padding:20px 36px 28px;border-top:1px solid #eef2f7;">
    <p style="margin:0 0 10px;font-size:11px;line-height:1.6;color:#94a3b8;">
      Recibes este correo porque solicitaste información sobre nuestra promoción de
      verano y aceptaste recibir comunicaciones comerciales de dinkbit. Puedes darte
      de baja respondiendo a este correo. Más info en nuestra
      <a href="${PROMO.siteUrl}/privacidad" style="color:${ACCENT};">política de privacidad</a>.
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">dinkbit · <a href="${PROMO.siteUrl}" style="color:${ACCENT};text-decoration:none;">www.dinkbit.es</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Este verano, tu web o ecommerce al ${PROMO.discountPct}%.`,
    "",
    `Durante este verano lanzamos todas nuestras webs y tiendas online con un ${PROMO.discountPct}% de descuento. Válido hasta el ${deadline}.`,
    "",
    `Cuéntanos sobre tu negocio y empezamos: ${ctaHref}`,
    "",
    "Recibes este correo porque solicitaste información sobre nuestra promoción de verano y aceptaste recibir comunicaciones comerciales de dinkbit. Puedes darte de baja respondiendo a este correo.",
  ].join("\n");

  return { subject, html, text };
}
