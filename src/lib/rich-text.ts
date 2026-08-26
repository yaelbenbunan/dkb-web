// Texto enriquecido para los emails de campaña.
//
// El editor del panel es un `contenteditable`, así que lo que llega aquí es
// HTML que ha escrito un navegador (y que, en teoría, podría haber escrito
// cualquiera). Nada de eso se guarda ni se envía tal cual: pasa por
// `sanitizeRichText`, que reconstruye el HTML desde cero permitiendo solo un
// puñado de etiquetas que además se ven bien en clientes de correo.
//
// La lista es corta a propósito. En email no vale cualquier HTML: Outlook
// ignora medio CSS, Gmail recorta los <style>, y todo lo que no sea formato
// inline es fuente de problemas. Negrita, cursiva, subrayado, color, enlace y
// salto de línea cubren lo que se necesita para destacar una frase.

/** Etiquetas que se conservan, con su forma canónica. */
const TAG_ALIASES: Record<string, string> = {
  b: "b",
  strong: "b",
  i: "i",
  em: "i",
  u: "u",
  a: "a",
  span: "span",
  font: "span",
  br: "br",
};

/** Etiquetas cuyo contenido se tira entero, no solo la etiqueta. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "svg",
  "math",
  "title",
]);

/** Protocolos aceptables en un enlace de email. */
const SAFE_PROTOCOL = /^(?:https?:|mailto:|tel:)/i;

/** Colores con nombre (CSS) — sin paréntesis, así que `expression(...)` no cuela. */
const NAMED_COLOR = /^[a-z]{3,20}$/;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,[^)]*)?\)$/i;

/** Escapa texto suelto sin romper las entidades que ya venían escritas. */
function escapeText(s: string): string {
  return s
    .replace(/&(?!#?\w+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&(?!#?\w+;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Un color CSS reducido a algo que un cliente de correo entienda, o null. */
function safeColor(raw: string): string | null {
  const v = raw.trim().replace(/;+$/, "").trim();
  if (HEX_COLOR.test(v)) return v;
  if (NAMED_COLOR.test(v)) return v.toLowerCase();
  const rgb = RGB_COLOR.exec(v);
  if (rgb) {
    const hex = rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  return null;
}

/** Valor de una propiedad CSS dentro de un atributo `style`. El `(?:^|;)` evita
 *  que `background-color` cuele como `color`. */
function cssProp(style: string, prop: string): string | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
  return m ? m[1].trim() : null;
}

/** Color declarado en un atributo `style`, ignorando cualquier otra propiedad. */
function colorFromStyle(style: string): string | null {
  const v = cssProp(style, "color");
  return v ? safeColor(v) : null;
}

/**
 * Formato que viene expresado como CSS en vez de como etiqueta.
 *
 * Es el caso normal, no el raro: al aplicar negrita, Chrome y Safari escriben
 * `<span style="font-weight: bold">`, no `<b>`. Si esto no se tradujera, todo
 * el formato salvo el color se perdería al guardar.
 */
function formatFromStyle(style: string): { bold: boolean; italic: boolean; underline: boolean } {
  const weight = cssProp(style, "font-weight");
  const numeric = weight ? Number(weight) : NaN;
  return {
    bold: !!weight && (weight.toLowerCase() === "bold" || weight.toLowerCase() === "bolder" || numeric >= 600),
    italic: (cssProp(style, "font-style") ?? "").toLowerCase() === "italic",
    underline: /underline/i.test(
      `${cssProp(style, "text-decoration") ?? ""} ${cssProp(style, "text-decoration-line") ?? ""}`,
    ),
  };
}

/** URL de enlace, o null si el protocolo no es de fiar. Los espacios y los
 *  caracteres de control se quitan solo para decidir: `java\tscript:` es
 *  `javascript:` para el navegador, y así no se cuela por la rendija. */
function safeHref(raw: string): string | null {
  const collapsed = raw.replace(/[\u0000-\u0020]+/g, "");
  if (!SAFE_PROTOCOL.test(collapsed)) return null;
  return raw.trim();
}

function attrValue(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = re.exec(attrs);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? "";
}

const TOKEN = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*?)?\/?>)|([^<]+)|(<)/g;
const TAG_PARTS = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)\/?>$/;

/**
 * Reconstruye el HTML permitiendo solo formato inline seguro. Todo lo demás se
 * descarta: las etiquetas desconocidas pierden la etiqueta pero conservan su
 * texto, y las peligrosas (`script`, `style`, `iframe`…) se van con contenido y
 * todo. Las etiquetas sin cerrar se cierran y los cierres huérfanos se ignoran,
 * así que la salida siempre está balanceada.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  const src = input ?? "";
  if (!src) return "";

  const out: string[] = [];
  // Cada etiqueta de origen puede abrir VARIAS de salida: un
  // `<span style="color:red; font-weight:bold">` se convierte en
  // `<span style="color:#ff0000"><b>`. La pila guarda esas piezas juntas para
  // poder cerrarlas en el orden correcto.
  const stack: { key: string; parts: { open: string; close: string }[] }[] = [];
  let skipDepth = 0;

  const closeEntry = (entry: (typeof stack)[number]) => {
    for (let i = entry.parts.length - 1; i >= 0; i--) out.push(entry.parts[i].close);
  };

  TOKEN.lastIndex = 0;
  let token: RegExpExecArray | null;
  while ((token = TOKEN.exec(src)) !== null) {
    const [, comment, tag, text, stray] = token;

    if (comment !== undefined) continue;

    if (tag !== undefined) {
      const parts = TAG_PARTS.exec(tag);
      if (!parts) continue;
      const closing = parts[1] === "/";
      const name = parts[2].toLowerCase();
      const attrs = parts[3] ?? "";
      const selfClosing = /\/\s*>$/.test(tag);

      if (DROP_WITH_CONTENT.has(name)) {
        if (closing) skipDepth = Math.max(0, skipDepth - 1);
        else if (!selfClosing) skipDepth++;
        continue;
      }
      if (skipDepth > 0) continue;

      const canonical = TAG_ALIASES[name];
      if (!canonical) continue; // etiqueta no permitida: se cae, el texto sigue

      if (canonical === "br") {
        out.push("<br />");
        continue;
      }

      if (closing) {
        const at = stack.map((e) => e.key).lastIndexOf(canonical);
        if (at === -1) continue; // cierre huérfano
        // Cierra también lo que quedó abierto por encima: mantiene el anidado
        // válido aunque el usuario haya cruzado las etiquetas.
        for (let i = stack.length - 1; i >= at; i--) closeEntry(stack[i]);
        stack.splice(at);
        continue;
      }

      const style = attrValue(attrs, "style") ?? "";
      const fmt = formatFromStyle(style);
      // <font color> es lo que genera el execCommand clásico; se traduce.
      const color = colorFromStyle(style) ?? safeColor(attrValue(attrs, "color") ?? "");

      const opened: { open: string; close: string }[] = [];
      // El color va por fuera para que envuelva a todo lo demás.
      if (color) opened.push({ open: `<span style="color:${escapeAttr(color)}">`, close: "</span>" });
      if (canonical === "b" || fmt.bold) opened.push({ open: "<b>", close: "</b>" });
      if (canonical === "i" || fmt.italic) opened.push({ open: "<i>", close: "</i>" });
      if (canonical === "u" || fmt.underline) opened.push({ open: "<u>", close: "</u>" });
      if (canonical === "a") {
        const href = safeHref(attrValue(attrs, "href") ?? "");
        // Enlace no fiable: se queda el texto (y su formato), sin enlace.
        if (href) {
          opened.push({
            open: `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`,
            close: "</a>",
          });
        }
      }

      for (const part of opened) out.push(part.open);
      // Se apila SIEMPRE, aunque no aporte nada: así el cierre correspondiente
      // encuentra su pareja y no va a cerrar por error una etiqueta de fuera.
      stack.push({ key: canonical, parts: opened });
      continue;
    }

    if (skipDepth > 0) continue;
    if (text !== undefined) out.push(escapeText(text));
    else if (stray !== undefined) out.push("&lt;");
  }

  for (let i = stack.length - 1; i >= 0; i--) closeEntry(stack[i]);
  return out.join("");
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function unescapeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** Versión en texto plano, para la parte text/plain del email. Los enlaces
 *  dejan su URL a la vista, que en texto plano no hay dónde pinchar. */
export function richTextToPlain(html: string | null | undefined): string {
  return unescapeEntities(
    (html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) =>
        `${String(label).replace(/<[^>]*>/g, "")} (${href})`,
      )
      .replace(/<[^>]*>/g, ""),
  );
}

/** Texto plano convertido a HTML enriquecido, para abrir en el editor lo que se
 *  escribió antes de que existiera el formato inline. */
export function plainToRichText(text: string | null | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  return escapeText(t).replace(/\r?\n/g, "<br />");
}

/** ¿No hay nada que enseñar? (solo etiquetas, espacios o vacío) */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  return richTextToPlain(html).trim() === "";
}
