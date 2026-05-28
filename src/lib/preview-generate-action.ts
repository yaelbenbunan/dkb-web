"use server";

import type OpenAI from "openai";
import { getOpenAIClient } from "./openai-client";
import {
  buildCopyPrompt,
  buildImagePrompt,
  buildSectorInformativaCopyPrompt,
  type PromptInput,
} from "./preview-prompts";
import {
  copyResponseSchema,
  previewGenerateInputSchema,
  sectorInformativaCopyResponseSchema,
  type CopyResponse,
  type PreviewGenerateInput,
  type SectorInformativaCopyResponse,
} from "./preview-validation";
import { getSectorLabel, resolvePalette } from "./preview-themes";

export interface PreviewGenerateResult {
  copy: CopyResponse | null;
  /** Filled when the sector-specific InformativaSectorTemplate is used */
  sectorCopy: SectorInformativaCopyResponse | null;
  heroImageDataUrl: string | null;
  error?: string;
}

// Sectors that have their own `InformativaSectorTemplate` rendering path.
// "restauracion" is intentionally excluded — it will get a bespoke template.
const SECTOR_INFORMATIVA_SECTORS = new Set<string>([
  "salud",
  "educacion",
  "moda",
  "tecnologia",
  "servicios",
]);

function useSectorInformativa(input: PreviewGenerateInput): boolean {
  return (
    input.businessType === "informativa" &&
    SECTOR_INFORMATIVA_SECTORS.has(input.sector)
  );
}

export async function generatePreview(
  input: PreviewGenerateInput,
): Promise<PreviewGenerateResult> {
  const parsed = previewGenerateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      copy: null,
      sectorCopy: null,
      heroImageDataUrl: null,
      error: "Datos inválidos para generar el preview.",
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    console.error("Missing OPENAI_API_KEY — preview will use fallbacks.");
    return { copy: null, sectorCopy: null, heroImageDataUrl: null };
  }

  const palette = resolvePalette(parsed.data.palette, parsed.data.customColors);
  if (!palette) {
    return { copy: null, sectorCopy: null, heroImageDataUrl: null };
  }

  const template: "informativa" | "ecommerce" =
    parsed.data.businessType === "ecommerce" ? "ecommerce" : "informativa";

  const promptInput: PromptInput = {
    businessName: parsed.data.businessName,
    sectorLabel: getSectorLabel(parsed.data.sector),
    businessType: parsed.data.businessType,
    ecommerceKind: parsed.data.ecommerceKind,
    offerings: parsed.data.offerings,
    valueProp: parsed.data.valueProp,
    paletteSlug: palette.slug,
    paletteAccent: palette.accent,
    template,
  };

  const useSector = useSectorInformativa(parsed.data);

  // Sector templates skip hero image generation (they use a curated static
  // photo pool instead) to keep cost and latency lower.
  const tasks: Promise<unknown>[] = useSector
    ? [generateSectorCopy(client, promptInput)]
    : [generateCopy(client, promptInput), generateHeroImage(client, promptInput)];

  const results = await Promise.allSettled(tasks);

  if (useSector) {
    const sectorRes = results[0];
    return {
      copy: null,
      sectorCopy:
        sectorRes.status === "fulfilled"
          ? (sectorRes.value as SectorInformativaCopyResponse | null)
          : null,
      heroImageDataUrl: null,
    };
  }

  const [copyRes, imageRes] = results;
  return {
    copy:
      copyRes.status === "fulfilled"
        ? (copyRes.value as CopyResponse | null)
        : null,
    sectorCopy: null,
    heroImageDataUrl:
      imageRes.status === "fulfilled" ? (imageRes.value as string | null) : null,
  };
}

async function generateCopy(
  client: OpenAI,
  promptInput: PromptInput,
): Promise<CopyResponse | null> {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente que responde únicamente con JSON válido, sin markdown ni texto extra.",
        },
        { role: "user", content: buildCopyPrompt(promptInput) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("generateCopy: invalid JSON from OpenAI:", err);
      return null;
    }
    const validated = copyResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(
        "generateCopy: response failed schema validation:",
        validated.error.issues,
      );
      return null;
    }
    return validated.data;
  } catch (err) {
    console.error("generateCopy failed:", err);
    return null;
  }
}

async function generateSectorCopy(
  client: OpenAI,
  promptInput: PromptInput,
): Promise<SectorInformativaCopyResponse | null> {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente que responde únicamente con JSON válido, sin markdown ni texto extra.",
        },
        { role: "user", content: buildSectorInformativaCopyPrompt(promptInput) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("generateSectorCopy: invalid JSON from OpenAI:", err);
      return null;
    }
    const validated = sectorInformativaCopyResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(
        "generateSectorCopy: response failed schema validation:",
        validated.error.issues,
      );
      return null;
    }
    return validated.data;
  } catch (err) {
    console.error("generateSectorCopy failed:", err);
    return null;
  }
}

async function generateHeroImage(
  client: OpenAI,
  promptInput: PromptInput,
): Promise<string | null> {
  try {
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: buildImagePrompt(promptInput),
      size:
        promptInput.template === "informativa" ? "1024x1536" : "1536x1024",
      quality: "medium",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error("generateHeroImage failed:", err);
    return null;
  }
}
