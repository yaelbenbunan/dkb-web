/**
 * Layout de marca compartido para los correos automáticos que se envían al
 * lead tras rellenar un formulario de la web.
 *
 * Existe porque cada correo se construía con su propio `<!doctype html>` y su
 * propio andamiaje de tablas: cuatro copias del mismo esqueleto que se iban
 * separando entre sí. Aquí vive una sola vez, y cada flujo aporta únicamente
 * lo suyo (asunto, titular, texto y CTA).
 *
 * Tablas + estilos inline porque es lo único que renderiza igual en Outlook,
 * Gmail y Apple Mail. La referencia visual es buildKitDigital2026Email().
 */

import { CONTACT_INFO } from "./contact-info";

export const BRAND = {
  accentHex: "#187bef",
  siteUrl: "https://www.dinkbit.es",
  // La dirección que se muestra sale de contact-info para que no se separe de
  // la del sitio. Es .com a propósito: es el buzón que tiene la redirección
  // activa, así que las respuestas llegan. El .es no está monitorizado.
  contactEmail: CONTACT_INFO.email,
  logoUrl: "https://www.dinkbit.es/img/logo/dinkbit-email.png",
} as const;

const FONT_STACK = "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";

/**
 * Paletas del correo.
 *
 * Existen porque Growth no es dinkbit: quien rellena el formulario viene de una
 * página casi negra con acento turquesa, y recibía un correo blanco y azul. El
 * salto se notaba, así que el correo se viste como la página de la que viene.
 *
 * Los colores del tema `growth` son los mismos de GROWTH_THEME (growth-config),
 * copiados a mano: este fichero no puede importar de la landing porque lo usan
 * también los correos que no tienen nada que ver con ella.
 */
const THEMES = {
  dinkbit: {
    page: "#eef2f7",
    card: "#ffffff",
    accent: "#187bef",
    /** Texto que va ENCIMA del acento (botón). */
    onAccent: "#ffffff",
    heading: "#0f172a",
    body: "#475569",
    muted: "#94a3b8",
    panel: "#f4f7fc",
    panelLine: "#e2e8f0",
    panelText: "#334155",
    line: "#eef2f7",
    ctaNote: "#64748b",
    shadow: "0 18px 50px -24px rgba(15,23,42,0.35)",
    colorScheme: "light",
  },
  // Claro, para leerse bien en cualquier cliente de correo. El acento es el
  // turquesa oscurecido (#0A7C7E) y no
  // el de la página (#30CCCE): en el correo también se usa para texto, y el
  // claro sobre blanco no se lee.
  growth: {
    page: "#F2F8F8",
    card: "#ffffff",
    accent: "#0A7C7E",
    onAccent: "#ffffff",
    heading: "#0F2B30",
    body: "#3E5559",
    muted: "#7D9195",
    panel: "#F2F8F8",
    panelLine: "#DDE9EA",
    panelText: "#3E5559",
    line: "#DDE9EA",
    ctaNote: "#587075",
    shadow: "0 18px 50px -24px rgba(15,43,48,0.30)",
    colorScheme: "light",
  },
} as const;

export type EmailTheme = keyof typeof THEMES;

/**
 * Logotipo de Growth para el correo: la versión de fondo claro (gris y negro),
 * servida desde la web como el de dinkbit. La de fondo oscuro, con las letras
 * en blanco, no se vería sobre la tarjeta blanca.
 */
function growthLockup(): string {
  return `<img src="${BRAND.siteUrl}/img/growth/growth-logo-claro.png" alt="Growth by dinkbit" width="148" style="display:block;width:148px;height:auto;">`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapa el texto y solo DESPUÉS convierte los marcadores `**así**` en negrita.
 * El orden importa: si se hiciera al revés, cualquier `<` del contenido saldría
 * vivo al HTML. Así el copy puede destacar una frase sin abrir la puerta a
 * inyección.
 */
function richText(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** La versión en texto plano no tiene negritas: se quitan los marcadores. */
function plainText(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

/** Igual que en el render de campañas: fuera cualquier esquema que no sea web. */
function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Nombre de pila: con quién hablamos, sin soltarle el nombre completo. */
function firstName(name?: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || null;
}

export interface BrandedEmailInput {
  /** Asunto del correo. Se devuelve tal cual. */
  subject: string;
  /**
   * Etiqueta pequeña junto al logo (p. ej. "Contacto"). Debe nombrar el
   * contexto, nunca la marca: el logotipo ya la lleva y repetirla deja
   * "dinkbit" dos veces en la cabecera. Omítela si no hay contexto que dar.
   */
  eyebrow?: string;
  /** Titular principal. */
  heading: string;
  /** Párrafo de entrada. */
  intro: string;
  /** Nombre del lead; se usa solo el de pila. Sin él, saludo genérico. */
  name?: string | null;
  /** Texto de vista previa que muestran los clientes de correo. */
  preheader?: string;
  /** Lista de pasos o puntos. Se omite el bloque entero si no hay. */
  bullets?: readonly string[];
  bulletsLabel?: string;
  /** Botón de acción. Se omite si falta o si la URL no es http/https. */
  cta?: { label: string; url: string };
  /**
   * Paleta del correo. Por defecto la de dinkbit (clara, azul); `"growth"`
   * viste el correo como la landing de la que viene el lead.
   */
  theme?: EmailTheme;
}

export function renderBrandedEmail(input: BrandedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const t = THEMES[input.theme ?? "dinkbit"];
  const accent = t.accent;
  const first = firstName(input.name);
  const greeting = first ? `Hola ${esc(first)}` : "Hola";
  const preheader = plainText(input.preheader ?? input.intro);
  const ctaUrl = input.cta ? safeUrl(input.cta.url) : null;
  const bullets = input.bullets ?? [];

  const bulletsHtml =
    bullets.length === 0
      ? ""
      : `
  <tr><td style="padding:22px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.panel};border:1px solid ${t.panelLine};border-radius:14px;">
      <tr><td style="padding:20px 22px 14px;">
        ${
          input.bulletsLabel
            ? `<p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${accent};text-transform:uppercase;">${esc(input.bulletsLabel)}</p>`
            : ""
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${bullets
            .map(
              (b) => `
          <tr><td style="padding:9px 0;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td valign="top" style="width:26px;">
                <div style="width:20px;height:20px;border-radius:999px;background:${accent};color:${t.onAccent};font-size:12px;font-weight:900;text-align:center;line-height:20px;">✓</div>
              </td>
              <td style="font-size:15px;line-height:1.5;color:${t.panelText};padding-left:8px;">${richText(b)}</td>
            </tr></table>
          </td></tr>`,
            )
            .join("")}
        </table>
      </td></tr>
    </table>
  </td></tr>`;

  const ctaHtml = ctaUrl
    ? `
  <tr><td style="padding:24px 36px 8px;text-align:center;">
    <a href="${ctaUrl}" style="display:inline-block;background:${accent};color:${t.onAccent};font-size:16px;font-weight:800;text-decoration:none;padding:15px 32px;border-radius:12px;box-shadow:0 10px 24px -10px ${accent};">${esc(input.cta!.label)} →</a>
    <p style="margin:14px 0 0;font-size:13px;color:${t.ctaNote};">O responde a este correo si tienes cualquier duda.</p>
  </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="${t.colorScheme}">
<meta name="supported-color-schemes" content="${t.colorScheme}">
</head>
<body style="margin:0;padding:0;background:${t.page};font-family:${FONT_STACK};color:${t.heading};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${t.page}" style="background:${t.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${t.card}" style="width:600px;max-width:600px;background:${t.card};border-radius:20px;overflow:hidden;border-top:6px solid ${accent};box-shadow:${t.shadow};">

  <tr><td style="padding:26px 36px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" valign="middle">${input.theme === "growth" ? growthLockup() : `<img src="${BRAND.logoUrl}" alt="dinkbit" width="116" style="display:block;width:116px;height:auto;">`}</td>
      ${
        input.eyebrow
          ? `<td align="right" valign="middle" style="font-size:12px;font-weight:700;letter-spacing:2px;color:${accent};text-transform:uppercase;">${esc(input.eyebrow)}</td>`
          : ""
      }
    </tr></table>
  </td></tr>

  <tr><td style="padding:14px 36px 6px;">
    <h1 style="margin:0;font-size:30px;line-height:1.12;color:${t.heading};font-weight:900;letter-spacing:-0.5px;">${esc(input.heading)}</h1>
    <p style="margin:16px 0 0;font-size:17px;line-height:1.55;color:${t.body};">${greeting}, ${richText(input.intro)}</p>
  </td></tr>
${bulletsHtml}${ctaHtml}
  <tr><td style="padding:20px 36px 28px;border-top:1px solid ${t.line};">
    <p style="margin:0;font-size:12px;color:${t.muted};">${input.theme === "growth" ? "Growth by dinkbit" : "dinkbit"} · <a href="${BRAND.siteUrl}" style="color:${accent};text-decoration:none;">www.dinkbit.es</a> · ${BRAND.contactEmail}</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `${first ? `Hola ${first}` : "Hola"}, ${plainText(input.intro)}`,
    "",
    input.heading,
    ...(bullets.length
      ? ["", input.bulletsLabel ? `${input.bulletsLabel}:` : "", ...bullets.map((b) => `· ${plainText(b)}`)]
      : []),
    ...(ctaUrl ? ["", `${input.cta!.label}: ${ctaUrl}`] : []),
    "",
    "Un saludo,",
    "El equipo de dinkbit",
    BRAND.siteUrl,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return { subject: input.subject, html, text };
}
