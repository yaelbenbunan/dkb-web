// Builds the user-facing "offer" email sent right after they use the preview
// generator. Table-based + inline styles for email-client compatibility.

export const OFFER = {
  accentHex: "187bef",
  priceNormal: "2.000€",
  priceOffer: "1.000€",
  sections: "hasta 5 secciones",
  ttlHours: 48,
  contactEmail: "hola@dinkbit.com",
  siteUrl: "https://www.dinkbit.es",
} as const;

export const OFFER_DISCLAIMER =
  "Promoción válida durante 48 h desde el envío de este correo. El precio " +
  "promocional de 1.000€ (IVA no incluido) corresponde a una web de hasta 5 " +
  "secciones desarrollada sobre plantilla, con una ronda de revisiones e " +
  "integración de textos e imágenes aportados por el cliente; precio de " +
  "referencia sin promoción: 2.000€. No acumulable con otras ofertas o " +
  "descuentos. La activación requiere aceptar la propuesta dentro del plazo y " +
  "queda sujeta a un briefing inicial; dinkbit podrá verificar la elegibilidad " +
  "y modificar o cancelar la promoción. El preview adjunto es una simulación " +
  "orientativa generada automáticamente y no representa el diseño, los textos " +
  "ni las imágenes finales. Responsable: dinkbit. Más info en www.dinkbit.es.";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDeadline(deadlineMs: number): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(deadlineMs));
  } catch {
    return "en 48 horas";
  }
}

export interface OfferEmailInput {
  name: string;
  businessName: string;
  leadId: string;
  deadlineMs: number;
  /** Absolute URL of the dynamic countdown GIF. */
  countdownUrl: string;
}

export function buildOfferEmail(input: OfferEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml((input.name || "").split(" ")[0] || "hola");
  const business = escapeHtml(input.businessName || "tu negocio");
  const accent = `#${OFFER.accentHex}`;
  const deadlineLabel = formatDeadline(input.deadlineMs);

  const ctaSubject = encodeURIComponent(
    `Quiero mi web con 50% [#${input.leadId}]`,
  );
  const ctaBody = encodeURIComponent(
    `Hola, acabo de ver el preview de ${input.businessName} y quiero aprovechar el 50% de descuento antes de que caduque.`,
  );
  const ctaHref = `mailto:${OFFER.contactEmail}?subject=${ctaSubject}&body=${ctaBody}`;

  const subject = `${name}, tu web con 50% de descuento (48 h) ⏳`;

  const preheader = `Si hicimos esto en 2 segundos, imagina tu web completa. ${OFFER.priceOffer} en vez de ${OFFER.priceNormal} — solo 48 h.`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:#0b1220;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

  <!-- HERO -->
  <tr><td style="background:#0b1220;padding:36px 36px 30px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:${accent};text-transform:uppercase;">dinkbit</div>
    <h1 style="margin:14px 0 0;font-size:30px;line-height:1.15;color:#ffffff;font-weight:800;">Gracias por imaginar la web de ${business} 👀</h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.5;color:#c7d2e0;">
      Si hemos hecho <strong style="color:#ffffff;">esto en 2 segundos…</strong>
      imagina lo que haremos con tu web completa si nos la encargas de verdad.
    </p>
  </td></tr>

  <!-- PDF -->
  <tr><td style="padding:24px 36px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border-radius:12px;">
      <tr><td style="padding:16px 18px;font-size:15px;color:#334155;">
        📎 <strong>Adjuntamos el PDF</strong> con el preview que acabas de ver, para que lo guardes y lo compartas.
      </td></tr>
    </table>
  </td></tr>

  <!-- OFFER -->
  <tr><td style="padding:24px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${accent};border-radius:16px;">
      <tr><td style="padding:26px 26px 8px;text-align:center;">
        <div style="display:inline-block;background:${accent};color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;padding:6px 12px;border-radius:999px;text-transform:uppercase;">Oferta de lanzamiento · -50%</div>
        <h2 style="margin:18px 0 4px;font-size:22px;color:#0f172a;font-weight:800;">Tu web profesional, ${OFFER.sections}</h2>
        <p style="margin:0;font-size:14px;color:#64748b;">Diseño a medida, lista para vender.</p>
        <div style="margin:18px 0 6px;">
          <span style="font-size:20px;color:#94a3b8;text-decoration:line-through;">${OFFER.priceNormal}</span>
          <span style="font-size:44px;font-weight:800;color:${accent};margin-left:10px;">${OFFER.priceOffer}</span>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- COUNTDOWN -->
  <tr><td style="padding:22px 36px 6px;text-align:center;">
    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:1px;">Tu 50% caduca en</p>
    <img src="${input.countdownUrl}" width="300" alt="Cuenta atrás de la oferta" style="display:block;margin:0 auto;border-radius:10px;max-width:300px;width:300px;height:auto;">
    <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Válida hasta el <strong style="color:#0f172a;">${escapeHtml(deadlineLabel)}</strong>.</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:22px 36px 30px;text-align:center;">
    <a href="${ctaHref}" style="display:inline-block;background:${accent};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:16px 34px;border-radius:12px;">Quiero mi web con 50% →</a>
    <p style="margin:14px 0 0;font-size:13px;color:#64748b;">O responde a este correo y lo ponemos en marcha.</p>
  </td></tr>

  <!-- DISCLAIMER + FOOTER -->
  <tr><td style="padding:20px 36px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0 0 14px;font-size:10px;line-height:1.5;color:#94a3b8;">${escapeHtml(OFFER_DISCLAIMER)}</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">dinkbit · <a href="${OFFER.siteUrl}" style="color:${accent};text-decoration:none;">www.dinkbit.es</a> · ${OFFER.contactEmail}</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Gracias por imaginar la web de ${input.businessName}.`,
    "",
    "Si hemos hecho esto en 2 segundos, imagina lo que haremos con tu web completa.",
    "",
    `Adjuntamos el PDF con el preview que acabas de ver.`,
    "",
    `OFERTA DE LANZAMIENTO (-50%)`,
    `Tu web profesional, ${OFFER.sections}: ${OFFER.priceNormal} -> ${OFFER.priceOffer}`,
    `Válida hasta el ${deadlineLabel} (48 h desde este correo).`,
    "",
    `Quiero mi web con 50%: escribe a ${OFFER.contactEmail} o responde a este correo.`,
    "",
    OFFER_DISCLAIMER,
  ].join("\n");

  return { subject, html, text };
}
