import type { Block, CampaignStyle } from "./campaign-blocks";

function esc(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function safeUrl(raw: string): string {
  try { const u = new URL(raw); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : "#"; }
  catch { return "#"; }
}
function safeColor(v: string | undefined, fallback: string): string {
  return v && /^#?[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : fallback;
}
const SIZE: Record<string,string> = { sm: "14px", md: "16px", lg: "20px" };

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
        textLines.push(b.props.title, b.props.body ?? "");
        return `<tr><td style="padding:24px 36px 6px;">
          ${b.props.eyebrow ? `<p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:1.5px;color:${a};text-transform:uppercase;">${esc(b.props.eyebrow)}</p>` : ""}
          <h1 style="margin:0;font-size:28px;line-height:1.15;color:#0f172a;font-weight:900;">${esc(b.props.title)}</h1>
          ${b.props.body ? `<p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#475569;">${esc(b.props.body)}</p>` : ""}
        </td></tr>`;
      }
      case "paragraph": {
        textLines.push(b.props.text);
        return `<tr><td style="padding:10px 36px;font-size:${SIZE[b.props.size ?? "md"]};line-height:1.55;color:#334155;text-align:${b.props.align ?? "left"};">${esc(b.props.text)}</td></tr>`;
      }
      case "checklist": {
        const a = safeColor(b.props.accent, accent);
        b.props.items.forEach((i) => textLines.push(`· ${i}`));
        const rows = b.props.items.map((i) => `<tr><td style="padding:6px 0;font-size:15px;color:#334155;">✓ ${esc(i)}</td></tr>`).join("");
        return `<tr><td style="padding:10px 36px;">${b.props.label ? `<p style="margin:0 0 6px;font-size:12px;font-weight:800;color:${a};text-transform:uppercase;">${esc(b.props.label)}</p>` : ""}<table role="presentation" width="100%">${rows}</table></td></tr>`;
      }
      case "button": {
        const a = safeColor(b.props.accent, accent);
        const url = safeUrl(b.props.url);
        textLines.push(`${b.props.label}: ${url}`);
        return `<tr><td style="padding:20px 36px;text-align:center;"><a href="${url}" style="display:inline-block;background:${a};color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:14px 30px;border-radius:12px;">${esc(b.props.label)}</a></td></tr>`;
      }
      case "image": {
        const src = safeUrl(b.props.src);
        const img = `<img src="${src}" alt="${esc(b.props.alt ?? "")}" style="display:block;max-width:100%;border:0;" />`;
        return `<tr><td style="padding:10px 36px;text-align:center;">${b.props.href ? `<a href="${safeUrl(b.props.href)}">${img}</a>` : img}</td></tr>`;
      }
      case "divider":
        return `<tr><td style="padding:8px 36px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td></tr>`;
      case "footer":
        textLines.push("", b.props.orgLine, `Darse de baja: ${ctx.unsubscribeUrl}`);
        return `<tr><td style="padding:22px 36px 28px;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;">
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
