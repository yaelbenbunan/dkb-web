import type { Block, BlockAlign, CampaignStyle, ImageWidth, TextStyle } from "./campaign-blocks";
import { sanitizeRichText, richTextToPlain, isRichTextEmpty } from "./rich-text";

function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
// Fuentes de imagen: solo se pueden servir por http/https.
function safeUrl(raw: string): string {
  try { const u = new URL(raw); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : "#"; }
  catch { return "#"; }
}
// Destinos de enlace: además de la web, los CTA de llamada y de email son
// legítimos en un correo, así que tel: y mailto: también pasan.
function safeLinkUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const ok = ["http:", "https:", "tel:", "mailto:"].includes(u.protocol);
    return ok ? u.toString() : "#";
  } catch { return "#"; }
}
function safeColor(v: string | undefined, fallback: string): string {
  return v && /^#?[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : fallback;
}
/** El selector de color del panel guarda `#rrggbb`, pero la IA y los datos
 *  viejos a veces sueltan el hex sin almohadilla, que en CSS no vale. */
function withHash(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  return t.startsWith("#") ? t : `#${t}`;
}
const SIZE: Record<string,string> = { sm: "14px", md: "16px", lg: "20px" };

/** Ancho útil del email: los 600px de la tabla menos los 36 de padding lateral. */
const CONTENT_WIDTH = 528;
/** Padding lateral de todas las secciones. */
const SIDE_PAD = 36;

const ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);
/** Alineación declarada por el bloque, o la que ese bloque tenía por defecto. */
function align(v: BlockAlign | undefined, fallback: BlockAlign = "left"): string {
  return v && ALIGN_VALUES.has(v) ? v : fallback;
}

/**
 * Padding vertical de una sección.
 *
 * Si el bloque trae `spacing` (el control deslizante del editor), el aire va
 * repartido mitad arriba y mitad abajo, de forma que entre dos secciones
 * consecutivas queda exactamente el valor elegido — y con 0 quedan pegadas del
 * todo. Si no lo trae (campañas de antes del slider), se respeta el padding de
 * siempre de ese tipo de bloque y el email se ve igual que el día que se guardó.
 *
 * Se usa padding en el `<td>` a propósito: los márgenes verticales son lo
 * primero que se pierde en Outlook y en Gmail, pero el padding de una celda de
 * tabla lo respetan todos los clientes.
 */
function pad(b: Block, top: number, bottom: number = top): string {
  if (typeof b.spacing !== "number") return `${top}px ${SIDE_PAD}px ${bottom}px`;
  const half = Math.round(b.spacing / 2);
  return `${half}px ${SIDE_PAD}px ${half}px`;
}

/** Valores por defecto de un nodo de texto, antes de que el usuario toque nada. */
interface TextBase {
  color: string;
  size: number;
  weight: number;
  lineHeight: string;
  align: string;
}

/**
 * CSS inline de un nodo de texto concreto (el título del hero, su bajada, su
 * botón…). Solo se emiten propiedades que aguantan en Outlook, Gmail y Apple
 * Mail: color, font-size en píxeles, font-weight, font-style, text-decoration y
 * text-align, todas en el atributo `style` del propio elemento. Nada de clases,
 * nada de `<style>` en el head y nada de unidades relativas.
 */
function textStyleCss(s: TextStyle | undefined, base: TextBase): string {
  const size = typeof s?.size === "number" && Number.isFinite(s.size)
    ? Math.max(10, Math.min(60, Math.round(s.size)))
    : base.size;
  const weight = s?.bold === undefined ? base.weight : s.bold ? Math.max(base.weight, 700) : 400;
  const css = [
    `font-size:${size}px`,
    `line-height:${base.lineHeight}`,
    `color:${safeColor(withHash(s?.color), base.color)}`,
    `font-weight:${weight}`,
    `text-align:${align(s?.align, base.align as BlockAlign)}`,
  ];
  if (s?.italic) css.push("font-style:italic");
  if (s?.underline) css.push("text-decoration:underline");
  return css.join(";");
}

/** Texto de un bloque: el enriquecido si lo hay (saneado), y si no el plano
 *  escapado. Así conviven los bloques nuevos con los ya guardados. */
function bodyHtml(html: string | undefined, plain: string): string {
  if (!isRichTextEmpty(html)) return sanitizeRichText(html);
  return esc(plain).replace(/\n/g, "<br />");
}
function bodyText(html: string | undefined, plain: string): string {
  return isRichTextEmpty(html) ? plain : richTextToPlain(sanitizeRichText(html));
}

/** Ancho de imagen en píxeles, nunca mayor que el ancho útil del email. */
function imagePx(width: ImageWidth | undefined): number | null {
  if (!width) return null;
  const raw = width.unit === "pct"
    ? Math.round((CONTENT_WIDTH * width.value) / 100)
    : width.value;
  return Math.max(1, Math.min(CONTENT_WIDTH, raw));
}

export function renderCampaignEmail(
  blocks: Block[],
  style: CampaignStyle,
  ctx: { preheader?: string; unsubscribeUrl: string },
): { html: string; text: string } {
  const rawAccent = style.accentHex.startsWith("#") ? style.accentHex : `#${style.accentHex}`;
  const accent = safeColor(rawAccent, "#187bef");
  const DEFAULT_FONT = "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif";
  const font = style.fontStack && /^[\w\s,'"-]+$/.test(style.fontStack) ? style.fontStack : DEFAULT_FONT;
  const textLines: string[] = [];

  const blockHtml = (b: Block): string => {
    switch (b.type) {
      case "hero": {
        const a = safeColor(b.props.accent, accent);
        const al = align(b.props.align);
        textLines.push(b.props.title, bodyText(b.props.bodyHtml, b.props.body ?? ""));
        const body = b.props.body || !isRichTextEmpty(b.props.bodyHtml)
          ? bodyHtml(b.props.bodyHtml, b.props.body ?? "")
          : "";
        // Cada nodo del hero pinta con SU estilo: el bloque solo aporta la
        // alineación de partida y el color de acento.
        const eyebrowCss = textStyleCss(b.props.eyebrowStyle, {
          color: a, size: 12, weight: 800, lineHeight: "1.3", align: al,
        });
        const titleCss = textStyleCss(b.props.titleStyle, {
          color: "#0f172a", size: 28, weight: 900, lineHeight: "1.15", align: al,
        });
        const bodyCss = textStyleCss(b.props.bodyStyle, {
          color: "#475569", size: 16, weight: 400, lineHeight: "1.55", align: al,
        });
        const cta = b.props.cta;
        let ctaHtml = "";
        if (cta && cta.label.trim()) {
          const url = safeLinkUrl(cta.url);
          const bg = safeColor(withHash(cta.background), a);
          const ctaCss = textStyleCss(cta.style, {
            color: "#ffffff", size: 16, weight: 800, lineHeight: "1.2", align: al,
          });
          textLines.push(`${cta.label}: ${url}`);
          // El <a> va dentro de un <div> alineado porque un inline-block no se
          // alinea solo: quien manda es el text-align del contenedor.
          ctaHtml = `<div style="text-align:${align(cta.style?.align, al as BlockAlign)};margin:18px 0 0;">
            <a href="${url}" style="display:inline-block;text-decoration:none;${ctaCss};background:${bg};padding:14px 30px;border-radius:12px;">${esc(cta.label)}</a>
          </div>`;
        }
        return `<tr><td style="padding:${pad(b, 24, 6)};text-align:${al};">
          ${b.props.eyebrow ? `<p style="margin:0 0 8px;${eyebrowCss};letter-spacing:1.5px;text-transform:uppercase;">${esc(b.props.eyebrow)}</p>` : ""}
          <h1 style="margin:0;${titleCss};">${esc(b.props.title)}</h1>
          ${body ? `<p style="margin:14px 0 0;${bodyCss};">${body}</p>` : ""}
          ${ctaHtml}
        </td></tr>`;
      }
      case "paragraph": {
        textLines.push(bodyText(b.props.html, b.props.text));
        return `<tr><td style="padding:${pad(b, 10)};font-size:${SIZE[b.props.size ?? "md"]};line-height:1.55;color:#334155;text-align:${align(b.props.align)};">${bodyHtml(b.props.html, b.props.text)}</td></tr>`;
      }
      case "textbox": {
        // Caja con fondo y borde propios: sirve para destacar un aviso sin
        // depender de dónde esté colocada dentro del email.
        const bg = safeColor(b.props.background, "#f8fafc");
        const border = safeColor(b.props.borderColor, "#e2e8f0");
        textLines.push(richTextToPlain(sanitizeRichText(b.props.html)));
        return `<tr><td style="padding:${pad(b, 10)};">
          <table role="presentation" width="100%" style="background:${bg};border:1px solid ${border};border-radius:12px;">
            <tr><td style="padding:16px 18px;font-size:${SIZE[b.props.size ?? "md"]};line-height:1.55;color:#334155;text-align:${align(b.props.align)};">${sanitizeRichText(b.props.html)}</td></tr>
          </table>
        </td></tr>`;
      }
      case "checklist": {
        const a = safeColor(b.props.accent, accent);
        const al = align(b.props.align);
        b.props.items.forEach((i) => textLines.push(`· ${i}`));
        const rows = b.props.items.map((i) => `<tr><td style="padding:6px 0;font-size:15px;color:#334155;text-align:${al};">✓ ${esc(i)}</td></tr>`).join("");
        return `<tr><td style="padding:${pad(b, 10)};text-align:${al};">${b.props.label ? `<p style="margin:0 0 6px;font-size:12px;font-weight:800;color:${a};text-transform:uppercase;">${esc(b.props.label)}</p>` : ""}<table role="presentation" width="100%">${rows}</table></td></tr>`;
      }
      case "button": {
        const a = safeColor(b.props.accent, accent);
        const url = safeLinkUrl(b.props.url);
        textLines.push(`${b.props.label}: ${url}`);
        return `<tr><td style="padding:${pad(b, 20)};text-align:${align(b.props.align, "center")};"><a href="${url}" style="display:inline-block;background:${a};color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:14px 30px;border-radius:12px;">${esc(b.props.label)}</a></td></tr>`;
      }
      case "image": {
        const src = safeUrl(b.props.src);
        const px = imagePx(b.props.width);
        const al = align(b.props.align, "center");
        // El atributo width (en px) es lo único que respeta Outlook; el
        // max-width evita que se desborde en móvil, y el margen alinea la
        // imagen cuando es más estrecha que la columna.
        const margin = al === "center" ? "0 auto" : al === "right" ? "0 0 0 auto" : "0";
        const css = [
          "display:block",
          `margin:${margin}`,
          ...(px ? [`width:${px}px`] : []),
          "max-width:100%",
          "height:auto",
          "border:0",
        ].join(";");
        const widthAttr = px ? ` width="${px}"` : "";
        const img = `<img src="${src}" alt="${esc(b.props.alt ?? "")}"${widthAttr} style="${css};" />`;
        if (b.props.alt) textLines.push(b.props.alt);
        return `<tr><td style="padding:${pad(b, 10)};text-align:${al};">${b.props.href ? `<a href="${safeLinkUrl(b.props.href)}">${img}</a>` : img}</td></tr>`;
      }
      case "divider":
        return `<tr><td style="padding:${pad(b, 8)};"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>`;
      case "footer":
        textLines.push("", b.props.orgLine, `Darse de baja: ${ctx.unsubscribeUrl}`);
        return `<tr><td style="padding:${pad(b, 22, 28)};border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;">
          <p style="margin:0 0 6px;">${esc(b.props.orgLine)}</p>
          <p style="margin:0;"><a href="${esc(safeUrl(ctx.unsubscribeUrl))}" style="color:#94a3b8;text-decoration:underline;">Darse de baja</a></p>
        </td></tr>`;
      default: { const _exhaustive: never = b; return _exhaustive; }
    }
  };

  const body = blocks.map(blockHtml).join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${font};">
${ctx.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(ctx.preheader)}</div>` : ""}
<table role="presentation" width="100%" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" style="width:600px;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border-top:6px solid ${accent};">
${body}
</table></td></tr></table></body></html>`;
  return { html, text: textLines.filter((l) => l !== undefined).join("\n") };
}
