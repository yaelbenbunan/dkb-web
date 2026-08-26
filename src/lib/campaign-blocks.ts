import { z } from "zod";
import { CONTACT_INFO } from "./contact-info";
import { sanitizeRichText } from "./rich-text";

// Alineación disponible en todos los bloques con contenido. Es opcional en
// todos: sin ella cada bloque mantiene la alineación que tenía de siempre, así
// que las campañas y plantillas ya guardadas se siguen viendo igual.
const align = z.enum(["left", "center", "right", "justify"]);
export const ALIGNMENTS = align.options;
export type BlockAlign = z.infer<typeof align>;

/** Color en hexadecimal, con o sin almohadilla. */
const hex = z.string().regex(/^#?[0-9a-fA-F]{6}$/);

/** Texto con formato inline (negrita, cursiva, color, enlaces). Se sanea al
 *  guardar y otra vez al renderizar: aquí solo se comprueba que sea texto. */
const richText = z.string();

/** Ancho de una imagen: en porcentaje del ancho útil o en píxeles. */
const imageWidth = z.object({
  unit: z.enum(["pct", "px"]),
  value: z.number().int().min(5).max(2000),
});
export type ImageWidth = z.infer<typeof imageWidth>;

const hero = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  /** Versión enriquecida de `body`. Si está, manda sobre el texto plano. */
  bodyHtml: richText.optional(),
  accent: z.string().optional(),
  align: align.optional(),
});
const paragraph = z.object({
  text: z.string(),
  /** Versión enriquecida de `text`. Si está, manda sobre el texto plano. */
  html: richText.optional(),
  align: align.optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
});
const textbox = z.object({
  html: richText,
  align: align.optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  background: hex.optional(),
  borderColor: hex.optional(),
});
const checklist = z.object({
  label: z.string().optional(),
  items: z.array(z.string()).min(1),
  accent: z.string().optional(),
  align: align.optional(),
});
const button = z.object({
  label: z.string(),
  url: z.string().url(),
  accent: z.string().optional(),
  align: align.optional(),
});
const image = z.object({
  src: z.string().url(),
  alt: z.string().optional(),
  href: z.string().url().optional(),
  width: imageWidth.optional(),
  align: align.optional(),
});
const divider = z.object({});
const footer = z.object({ orgLine: z.string(), unsubscribe: z.literal(true) });

const propsByType = { hero, paragraph, textbox, checklist, button, image, divider, footer } as const;
export type BlockType = keyof typeof propsByType;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), props: hero }),
  z.object({ id: z.string(), type: z.literal("paragraph"), props: paragraph }),
  z.object({ id: z.string(), type: z.literal("textbox"), props: textbox }),
  z.object({ id: z.string(), type: z.literal("checklist"), props: checklist }),
  z.object({ id: z.string(), type: z.literal("button"), props: button }),
  z.object({ id: z.string(), type: z.literal("image"), props: image }),
  z.object({ id: z.string(), type: z.literal("divider"), props: divider }),
  z.object({ id: z.string(), type: z.literal("footer"), props: footer }),
]);
export type Block = z.infer<typeof blockSchema>;
export const blocksSchema = z.array(blockSchema);

export const campaignStyleSchema = z.object({
  accentHex: z.string().regex(/^#?[0-9a-fA-F]{6}$/),
  fontStack: z.string().optional(),
});
export type CampaignStyle = z.infer<typeof campaignStyleSchema>;

export const DEFAULT_STYLE: CampaignStyle = {
  accentHex: "#187bef",
  fontStack: "'Source Sans Pro','Source Sans 3',Helvetica,Arial,sans-serif",
};
export const DEFAULT_FOOTER_BLOCK: Block = {
  id: "footer", type: "footer", props: { orgLine: `dinkbit · www.dinkbit.es · ${CONTACT_INFO.email}`, unsubscribe: true },
};

// id sin Date.now()/random prohibidos en workflows, pero aquí (app) sí valen.
export function newBlock(type: BlockType): Block {
  const id = `b_${Math.random().toString(36).slice(2, 9)}`;
  const defaults: Record<BlockType, unknown> = {
    hero: { title: "Título", body: "" },
    paragraph: { text: "Texto…" },
    textbox: { html: "Escribe aquí", background: "#f8fafc", borderColor: "#e2e8f0" },
    checklist: { items: ["Punto 1"] },
    button: { label: "Botón", url: "https://www.dinkbit.es" },
    image: { src: "https://www.dinkbit.es/img/logo/dinkbit-email.png" },
    divider: {},
    footer: DEFAULT_FOOTER_BLOCK.props,
  };
  return blockSchema.parse({ id, type, props: defaults[type] });
}

/**
 * Sanea el texto enriquecido de todos los bloques. Se llama al GUARDAR, para
 * que en la base de datos no llegue a existir HTML que no queramos; el
 * renderizador vuelve a sanear por si acaso, pero esto evita almacenar basura
 * de un editor viejo, de un pegado raro o de la IA.
 */
export function sanitizeBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    switch (b.type) {
      case "paragraph":
        return b.props.html === undefined
          ? b
          : { ...b, props: { ...b.props, html: sanitizeRichText(b.props.html) } };
      case "hero":
        return b.props.bodyHtml === undefined
          ? b
          : { ...b, props: { ...b.props, bodyHtml: sanitizeRichText(b.props.bodyHtml) } };
      case "textbox":
        return { ...b, props: { ...b.props, html: sanitizeRichText(b.props.html) } };
      default:
        return b;
    }
  });
}
