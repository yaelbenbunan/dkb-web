import { z } from "zod";
import { CONTACT_INFO } from "./contact-info";

const hero = z.object({ eyebrow: z.string().optional(), title: z.string(), body: z.string().optional(), accent: z.string().optional() });
const paragraph = z.object({ text: z.string(), align: z.enum(["left","center"]).optional(), size: z.enum(["sm","md","lg"]).optional() });
const checklist = z.object({ label: z.string().optional(), items: z.array(z.string()).min(1), accent: z.string().optional() });
const button = z.object({ label: z.string(), url: z.string().url(), accent: z.string().optional() });
const image = z.object({ src: z.string().url(), alt: z.string().optional(), href: z.string().url().optional() });
const divider = z.object({});
const footer = z.object({ orgLine: z.string(), unsubscribe: z.literal(true) });

const propsByType = { hero, paragraph, checklist, button, image, divider, footer } as const;
export type BlockType = keyof typeof propsByType;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), props: hero }),
  z.object({ id: z.string(), type: z.literal("paragraph"), props: paragraph }),
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
    checklist: { items: ["Punto 1"] },
    button: { label: "Botón", url: "https://www.dinkbit.es" },
    image: { src: "https://www.dinkbit.es/img/logo/dinkbit-email.png" },
    divider: {},
    footer: DEFAULT_FOOTER_BLOCK.props,
  };
  return blockSchema.parse({ id, type, props: defaults[type] });
}
