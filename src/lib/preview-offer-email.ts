// Builds the user-facing "offer" email sent right after they use the preview
// generator. Table-based + inline styles for email-client compatibility.

export const OFFER = {
  accentHex: "187bef",
  priceNormal: "2.000€",
  priceOffer: "1.000€",
  sections: "hasta 5 secciones",
  ttlHours: 48,
  /** Sender — must be on the Resend-verified domain (dinkbit.es). */
  fromEmail: "hola@dinkbit.es",
  /** Where the user's replies / CTA go. */
  contactEmail: "hola@dinkbit.es",
  siteUrl: "https://www.dinkbit.es",
  logoUrl: "https://www.dinkbit.es/img/logo/dinkbit-email.png",
  termsUrl: "https://www.dinkbit.es/condiciones-oferta",
} as const;

/** Short disclaimer shown in the email; full terms live at OFFER.termsUrl. */
export const OFFER_DISCLAIMER =
  "Oferta válida 48 h desde el envío. Precios sin IVA. No incluye la " +
  "generación de contenidos (textos e imágenes), que aporta el cliente.";

const FONT_STACK =
  "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";

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
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,600,700,900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT_STACK};color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border-top:6px solid ${accent};box-shadow:0 18px 50px -24px rgba(15,23,42,0.35);">

  <!-- HEADER: logo top-right -->
  <tr><td style="padding:26px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" valign="middle" style="font-size:12px;font-weight:700;letter-spacing:2px;color:${accent};text-transform:uppercase;">Tu preview está listo</td>
      <td align="right" valign="middle"><img src="${OFFER.logoUrl}" alt="dinkbit" width="116" style="display:block;width:116px;height:auto;"></td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="padding:14px 36px 6px;">
    <h1 style="margin:0;font-size:31px;line-height:1.12;color:#0f172a;font-weight:900;letter-spacing:-0.5px;">
      Gracias por imaginar la web de ${business} 👀
    </h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:#475569;">
      Si hemos hecho <strong style="color:${accent};">esto en 2 segundos…</strong>
      imagina lo que haremos con tu web completa si nos la encargas de verdad.
    </p>
  </td></tr>

  <!-- PDF chip -->
  <tr><td style="padding:22px 36px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border:1px solid #e2e8f0;border-radius:12px;">
      <tr><td style="padding:14px 18px;font-size:15px;color:#334155;">
        📎&nbsp; <strong>Adjuntamos el PDF</strong> con el preview que acabas de ver, para que lo guardes y lo compartas.
      </td></tr>
    </table>
  </td></tr>

  <!-- OFFER (accent colour block for punch) -->
  <tr><td style="padding:24px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accent};border-radius:18px;">
      <tr><td style="padding:28px 26px 26px;text-align:center;">
        <div style="display:inline-block;background:#ffffff;color:${accent};font-size:12px;font-weight:900;letter-spacing:1.5px;padding:7px 14px;border-radius:999px;text-transform:uppercase;">Oferta exclusiva · -50%</div>
        <div style="margin:18px 0 2px;font-size:21px;color:#ffffff;font-weight:800;">Tu web profesional, ${OFFER.sections}</div>
        <div style="font-size:14px;color:#dbeafe;">Diseño a medida, lista para vender.</div>
        <div style="margin:18px 0 4px;line-height:1;">
          <span style="font-size:21px;color:#bfdbfe;text-decoration:line-through;">${OFFER.priceNormal}</span>
          <span style="font-size:52px;font-weight:900;color:#ffffff;margin-left:12px;letter-spacing:-1px;">${OFFER.priceOffer}</span>
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- COUNTDOWN -->
  <tr><td style="padding:24px 36px 4px;text-align:center;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1.5px;">⏳ Tu 50% caduca en</p>
    <img src="${input.countdownUrl}" width="300" alt="Cuenta atrás de la oferta" style="display:block;margin:0 auto;border-radius:10px;max-width:300px;width:300px;height:auto;">
    <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Válida hasta el <strong style="color:#0f172a;">${escapeHtml(deadlineLabel)}</strong>.</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:24px 36px 28px;text-align:center;">
    <a href="${ctaHref}" style="display:inline-block;background:${accent};color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:17px 36px;border-radius:12px;box-shadow:0 10px 24px -10px ${accent};">Quiero mi web con 50% →</a>
    <p style="margin:14px 0 0;font-size:13px;color:#64748b;">O responde a este correo y lo ponemos en marcha.</p>
  </td></tr>

  <!-- DISCLAIMER + FOOTER -->
  <tr><td style="padding:20px 36px 28px;border-top:1px solid #eef2f7;">
    <p style="margin:0 0 12px;font-size:11px;line-height:1.6;color:#94a3b8;">
      ${escapeHtml(OFFER_DISCLAIMER)}
      <a href="${OFFER.termsUrl}" style="color:${accent};text-decoration:underline;">Ver todas las condiciones</a>.
    </p>
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
    "Adjuntamos el PDF con el preview que acabas de ver.",
    "",
    "OFERTA EXCLUSIVA (-50%)",
    `Tu web profesional, ${OFFER.sections}: ${OFFER.priceNormal} -> ${OFFER.priceOffer}`,
    `Válida hasta el ${deadlineLabel} (48 h desde este correo).`,
    "",
    `Quiero mi web con 50%: escribe a ${OFFER.contactEmail} o responde a este correo.`,
    "",
    `${OFFER_DISCLAIMER} Condiciones: ${OFFER.termsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
