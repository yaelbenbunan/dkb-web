import { getOpenAIClient } from "./openai-client";
import {
  blocksSchema,
  DEFAULT_FOOTER_BLOCK,
  type Block,
} from "./campaign-blocks";

export interface GenerateCampaignBlocksInput {
  concept: string;
  refs?: string;
  templateBlocks?: Block[];
}

/**
 * Por qué no hubo bloques. Sin esto los tres fallos posibles (no hay clave
 * configurada, la API no responde, el modelo devuelve algo que no valida)
 * llegaban al panel como el mismo mensaje y no había forma de distinguirlos.
 */
export type BlocksFailureReason =
  | "missing-api-key"
  | "api-error"
  | "invalid-response";

export type BlocksResult =
  | { ok: true; blocks: Block[] }
  | { ok: false; reason: BlocksFailureReason };

const SYSTEM_PROMPT = `Eres un asistente que diseña emails de campañas de marketing para dinkbit componiéndolos a partir de bloques estructurados.

Todos los bloques con contenido admiten además "align": "left"|"center"|"right"|"justify" (opcional). Si el usuario no pide una alineación concreta, omítela.

Los campos de texto enriquecido ("html", "bodyHtml") admiten SOLO estas etiquetas inline: <b>, <i>, <u>, <a href="...">, <span style="color:#rrggbb"> y <br />. Nada de <div>, <p>, <style>, <script> ni atributos de evento: se descartan al guardar.

Tipos de bloque disponibles (8):
- "hero": { eyebrow?: string, title: string, body?: string, bodyHtml?: string (texto enriquecido; si lo usas, "body" debe llevar el mismo texto sin etiquetas), accent?: string, align? } — bloque de cabecera con el titular principal.
- "paragraph": { text: string, html?: string (texto enriquecido; si lo usas, "text" debe llevar el mismo texto sin etiquetas), align?, size?: "sm"|"md"|"lg" } — párrafo de texto libre.
- "textbox": { html: string (texto enriquecido), size?: "sm"|"md"|"lg", background?: "#rrggbb", borderColor?: "#rrggbb", align? } — caja destacada con fondo y borde propios, para avisos o notas.
- "checklist": { label?: string, items: string[] (mínimo 1), accent?: string, align? } — lista de puntos/beneficios.
- "button": { label: string, url: string (URL válida), align? } — botón de llamada a la acción.
- "image": { src: string (URL válida), alt?: string, href?: string (URL válida), width?: { unit: "pct"|"px", value: number }, align? } — imagen. NUNCA inventes una URL de imagen: usa solo las que ya estén en la campaña.
- "divider": {} — separador visual sin props.
- "footer": { orgLine: string, unsubscribe: true } — pie de email con los datos de la organización; SIEMPRE debe ser el último bloque.

Al EDITAR una campaña existente, conserva las props que ya tenía cada bloque (align, width, colores, src de las imágenes) salvo que la instrucción pida cambiarlas.

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto adicional, con la forma exacta:
{ "blocks": [ { "id": string, "type": "hero"|"paragraph"|"textbox"|"checklist"|"button"|"image"|"divider"|"footer", "props": { ... } }, ... ] }

Cada bloque debe tener un "id" único (string) y un "type" válido con las "props" correspondientes descritas arriba. El último bloque del array debe ser de tipo "footer".`;

/**
 * Ensures the last block in the array is a `footer` block, appending
 * `DEFAULT_FOOTER_BLOCK` when the model omitted it (or placed it elsewhere
 * without also closing the array with one).
 */
export function ensureFooter(blocks: Block[]): Block[] {
  if (blocks.length > 0 && blocks[blocks.length - 1].type === "footer") {
    return blocks;
  }
  return [...blocks, DEFAULT_FOOTER_BLOCK];
}

async function requestBlocks(
  systemPrompt: string,
  userPrompt: string,
): Promise<BlocksResult> {
  const client = getOpenAIClient();
  if (!client) {
    console.error("campaign-ai: OPENAI_API_KEY no está configurada en este entorno.");
    return { ok: false, reason: "missing-api-key" };
  }

  let lastReason: BlocksFailureReason = "invalid-response";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      const raw = completion.choices[0]?.message.content;
      if (!raw) {
        lastReason = "invalid-response";
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error("campaign-ai: invalid JSON from OpenAI:", err);
        lastReason = "invalid-response";
        continue;
      }

      const blocksCandidate =
        parsed && typeof parsed === "object" && "blocks" in parsed
          ? (parsed as { blocks: unknown }).blocks
          : undefined;

      const validated = blocksSchema.safeParse(blocksCandidate);
      if (!validated.success) {
        console.error(
          "campaign-ai: response failed schema validation:",
          validated.error.issues,
        );
        lastReason = "invalid-response";
        continue;
      }

      return { ok: true, blocks: ensureFooter(validated.data) };
    } catch (err) {
      console.error("campaign-ai: OpenAI request failed:", err);
      lastReason = "api-error";
    }
  }

  return { ok: false, reason: lastReason };
}

export async function generateCampaignBlocks(
  input: GenerateCampaignBlocksInput,
): Promise<BlocksResult> {
  const parts = [`Concepto de la campaña: ${input.concept}`];
  if (input.refs) parts.push(`Referencias/tono: ${input.refs}`);
  if (input.templateBlocks && input.templateBlocks.length > 0) {
    parts.push(
      `Bloques de plantilla de partida (puedes adaptarlos o partir de cero): ${JSON.stringify(
        input.templateBlocks,
      )}`,
    );
  }
  parts.push(
    "Genera el array de bloques para este email de campaña, terminando siempre con un bloque de tipo footer.",
  );

  return requestBlocks(SYSTEM_PROMPT, parts.join("\n\n"));
}

export async function editCampaignBlocks(
  blocks: Block[],
  instruction: string,
): Promise<BlocksResult> {
  const userPrompt = [
    `Bloques actuales del email: ${JSON.stringify(blocks)}`,
    `Instrucción de edición: ${instruction}`,
    "Devuelve el array de bloques completo y actualizado según la instrucción, terminando siempre con un bloque de tipo footer.",
  ].join("\n\n");

  return requestBlocks(SYSTEM_PROMPT, userPrompt);
}
