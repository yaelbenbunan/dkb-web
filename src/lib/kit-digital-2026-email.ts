// Builds the branded autoresponder sent to a lead after they join the Kit
// Digital 2026 waiting list. Table-based + inline styles for email-client
// compatibility (mirrors preview-offer-email.ts).

export const KD_EMAIL = {
  accentHex: "187bef",
  fromEmail: "hola@dinkbit.es",
  contactEmail: "hola@dinkbit.es",
  siteUrl: "https://www.dinkbit.es",
  landingUrl: "https://www.dinkbit.es/kit-digital-2026",
  logoUrl: "https://www.dinkbit.es/img/logo/dinkbit-email.png",
} as const;

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

/** Qué falta — pasos que se muestran como filas con check de acento. */
const STEPS: readonly string[] = [
  "Cuéntanos algunos detalles sobre tu negocio (2 minutos).",
  "Nos encargamos de toda la tramitación del Kit Digital por ti.",
  "Te avisamos en cuanto la convocatoria se reactive.",
];

export function buildKitDigital2026Email(input: {
  name: string;
  email?: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const first = escapeHtml((input.name || "").trim().split(/\s+/)[0] || "hola");
  const accent = `#${KD_EMAIL.accentHex}`;
  const subject = "Casi está — solo falta un paso para tu Kit Digital";
  const preheader =
    "Ya casi está. Cuéntanos algunos detalles sobre tu negocio y nos encargamos de todo.";
  const ctaUrl = input.email
    ? `${KD_EMAIL.landingUrl}?email=${encodeURIComponent(input.email)}`
    : KD_EMAIL.landingUrl;

  const stepsHtml = STEPS.map(
    (s) => `
      <tr><td style="padding:9px 0;vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:26px;">
            <div style="width:20px;height:20px;border-radius:999px;background:${accent};color:#ffffff;font-size:12px;font-weight:900;text-align:center;line-height:20px;">✓</div>
          </td>
          <td style="font-size:15px;line-height:1.5;color:#334155;padding-left:8px;">${escapeHtml(s)}</td>
        </tr></table>
      </td></tr>`,
  ).join("");

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

  <!-- HEADER: label + logo -->
  <tr><td style="padding:26px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" valign="middle" style="font-size:12px;font-weight:700;letter-spacing:2px;color:${accent};text-transform:uppercase;">Kit Digital</td>
      <td align="right" valign="middle"><img src="${KD_EMAIL.logoUrl}" alt="dinkbit" width="116" style="display:block;width:116px;height:auto;"></td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="padding:14px 36px 6px;">
    <h1 style="margin:0;font-size:30px;line-height:1.12;color:#0f172a;font-weight:900;letter-spacing:-0.5px;">
      ¡Casi has terminado, ${first}! 🚀
    </h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:#475569;">
      Gracias por tu interés en el <strong style="color:${accent};">Kit Digital</strong>.
      Solo falta <strong>un paso más</strong>: cuéntanos algunos detalles sobre tu negocio
      y nos encargamos del resto.
    </p>
  </td></tr>

  <!-- "QUÉ FALTA" card -->
  <tr><td style="padding:22px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border:1px solid #e2e8f0;border-radius:14px;">
      <tr><td style="padding:20px 22px 14px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${accent};text-transform:uppercase;">Qué falta</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${stepsHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:24px 36px 8px;text-align:center;">
    <a href="${ctaUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:15px 32px;border-radius:12px;box-shadow:0 10px 24px -10px ${accent};">Completar mis datos →</a>
    <p style="margin:14px 0 0;font-size:13px;color:#64748b;">O responde a este correo si tienes cualquier duda.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:20px 36px 28px;border-top:1px solid #eef2f7;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">dinkbit · <a href="${KD_EMAIL.siteUrl}" style="color:${accent};text-decoration:none;">www.dinkbit.es</a> · ${KD_EMAIL.contactEmail}</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hola ${(input.name || "").trim().split(/\s+/)[0] || "hola"},`,
    "",
    "Gracias por tu interés en el Kit Digital. Solo falta un paso más.",
    "",
    "Qué falta:",
    ...STEPS.map((s) => `· ${s}`),
    "",
    `Completa tus datos aquí: ${ctaUrl}`,
    "",
    "Un saludo,",
    "El equipo de Dinkbit",
    `${KD_EMAIL.siteUrl}`,
  ].join("\n");

  return { subject, html, text };
}
