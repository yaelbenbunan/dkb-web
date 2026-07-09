// Email de bienvenida a la promo de verano (-50%). Table-based + inline styles
// para compatibilidad con clientes de correo. Se envía AL usuario (marketing),
// por eso incluye disclaimer de comunicaciones comerciales y baja.
//
// El CTA lleva a WhatsApp / llamada (NO al cuestionario): primero hablamos con
// el interesado y, a quien confirme, le enviamos el enlace del cuestionario a mano.
import { PROMO, promoDeadlineLabel } from "./promo-config";

const FONT_STACK = "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";
const ACCENT = "#187bef";
const WHATSAPP_GREEN = "#25D366";

const INCLUYE = [
  "Diseño web profesional a medida",
  "Adaptada a móvil, tablet y ordenador",
  "Optimizada para Google (SEO básico)",
  "Opción de tienda online (ecommerce)",
];

export function buildPromoEmail(): { subject: string; html: string; text: string } {
  const deadline = promoDeadlineLabel();
  const waMsg = encodeURIComponent(
    "Hola, me interesa la promo de verano del 50% para mi web/ecommerce.",
  );
  const waHref = `https://wa.me/${PROMO.whatsappNumber}?text=${waMsg}`;
  const telHref = `tel:${PROMO.phoneNumber}`;

  const subject = `Tu web o ecommerce al ${PROMO.discountPct}% este verano 🌴`;
  const preheader = `Hasta el ${deadline}. Escríbenos por WhatsApp o llámanos y te contamos cómo aprovecharlo.`;

  const includeRows = INCLUYE.map(
    (item) =>
      `<tr><td style="padding:4px 0;font-size:15px;color:#334155;">✓&nbsp; ${item}</td></tr>`,
  ).join("");

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

  <!-- HERO -->
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

  <!-- QUÉ INCLUYE -->
  <tr><td style="padding:22px 36px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border:1px solid #e2e8f0;border-radius:12px;">
      <tr><td style="padding:16px 18px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Qué incluye tu web</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${includeRows}</table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA: WhatsApp + llamada -->
  <tr><td style="padding:26px 36px 8px;text-align:center;">
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">¿Hablamos? Te contamos cómo aprovecharlo:</p>
    <a href="${waHref}" style="display:inline-block;background:${WHATSAPP_GREEN};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;margin:0 6px 12px;">💬 Hablar por WhatsApp</a>
    <br>
    <a href="${telHref}" style="display:inline-block;color:${ACCENT};font-size:16px;font-weight:700;text-decoration:none;padding:8px 0;">📞 O llámanos: ${PROMO.phoneDisplay}</a>
  </td></tr>

  <!-- DISCLAIMER + FOOTER -->
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
    "Qué incluye tu web:",
    ...INCLUYE.map((i) => `- ${i}`),
    "",
    "¿Hablamos? Te contamos cómo aprovecharlo:",
    `WhatsApp: ${waHref}`,
    `Teléfono: ${PROMO.phoneDisplay} (${telHref})`,
    "",
    "Recibes este correo porque solicitaste información sobre nuestra promoción de verano y aceptaste recibir comunicaciones comerciales de dinkbit. Puedes darte de baja respondiendo a este correo.",
  ].join("\n");

  return { subject, html, text };
}
