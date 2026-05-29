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
import { extractWebsite } from "./website-extract";

export interface PreviewGenerateResult {
  copy: CopyResponse | null;
  /** Filled when the sector-specific InformativaSectorTemplate is used */
  sectorCopy: SectorInformativaCopyResponse | null;
  heroImageDataUrl: string | null;
  error?: string;
}

// Sectors handled by `InformativaSectorTemplate`. Restauración shares the
// same template but renders a "Especialidades de la casa" dish grid in
// place of the Servicios cards.
const SECTOR_INFORMATIVA_SECTORS = new Set<string>([
  "salud",
  "educacion",
  "moda",
  "tecnologia",
  "servicios",
  "restauracion",
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

  // Best-effort: fetch the user's current website to ground the copy in their
  // real services/tone and reuse a real image when available. Never blocks the
  // preview — extractWebsite returns null on any failure/timeout.
  const source = await extractWebsite(parsed.data.currentWebsite);

  // Map cuisine slug to a human-readable label that the AI can read.
  const cuisineLabel =
    parsed.data.cuisine && parsed.data.sector === "restauracion"
      ? {
          tradicional: "Tradicional / mediterránea",
          italiana: "Italiana",
          asiatica: "Asiática (japonesa, china, tailandesa)",
          mexicana: "Mexicana / latina",
          americana: "Americana / burger / BBQ",
          fusion: "Fusión / autor",
        }[parsed.data.cuisine]
      : undefined;

  const promptInput: PromptInput = {
    businessName: parsed.data.businessName,
    sectorLabel: getSectorLabel(parsed.data.sector),
    businessType: parsed.data.businessType,
    ecommerceKind: parsed.data.ecommerceKind,
    offerings: parsed.data.offerings,
    cuisineLabel,
    featuredDishes:
      parsed.data.sector === "restauracion"
        ? parsed.data.featuredDishes
        : undefined,
    valueProp: parsed.data.valueProp,
    paletteSlug: palette.slug,
    paletteAccent: palette.accent,
    template,
    sourceSummary: source?.summary,
  };

  const useSector = useSectorInformativa(parsed.data);

  if (useSector) {
    // Sector templates use a curated static photo pool, so we only need copy.
    const sectorCopy = await generateSectorCopy(client, promptInput).catch(
      () => null,
    );
    return { copy: null, sectorCopy, heroImageDataUrl: null };
  }

  // Generic templates need a hero image. Prefer a real image scraped from the
  // user's current website (more faithful, and free); only fall back to AI
  // image generation when we couldn't get one.
  const tasks: Promise<unknown>[] = [generateCopy(client, promptInput)];
  if (!source?.imageUrl) {
    tasks.push(generateHeroImage(client, promptInput));
  }
  const results = await Promise.allSettled(tasks);

  const copyRes = results[0];
  const aiImageRes = source?.imageUrl ? undefined : results[1];
  return {
    copy:
      copyRes.status === "fulfilled"
        ? (copyRes.value as CopyResponse | null)
        : null,
    sectorCopy: null,
    heroImageDataUrl:
      source?.imageUrl ??
      (aiImageRes && aiImageRes.status === "fulfilled"
        ? (aiImageRes.value as string | null)
        : null),
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
