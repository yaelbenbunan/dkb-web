"use server";

import { revalidatePath } from "next/cache";
import {
  createCampaign,
  updateCampaign,
  getCampaign,
  listEmailTemplates,
  getBuiltinTemplates,
  saveEmailTemplate,
} from "@/lib/campaigns";
import {
  generateCampaignBlocks,
  editCampaignBlocks,
  type BlocksFailureReason,
} from "@/lib/campaign-ai";
import { sendCampaign, sendCampaignTest } from "@/lib/campaign-send";
import { blocksSchema, type Block } from "@/lib/campaign-blocks";

const AI_FAILURE_MESSAGE: Record<BlocksFailureReason, string> = {
  "missing-api-key":
    "Falta configurar OPENAI_API_KEY en el servidor, así que no se llegó a llamar a la IA.",
  "api-error":
    "No se pudo contactar con OpenAI (API caída, clave inválida o sin saldo). Vuelve a intentarlo.",
  "invalid-response":
    "La IA devolvió una propuesta que no encaja con los bloques del email. Vuelve a intentarlo o reformula el concepto.",
};

export async function createDraftAction(): Promise<{ id: string } | { error: string }> {
  const res = await createCampaign({});
  if (!res) return { error: "No se pudo crear la campaña." };
  revalidatePath("/panel/campanas");
  return { id: res.id };
}

export async function generateAction(
  campaignId: string,
  concept: string,
  refs: string,
  templateId?: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedConcept = concept.trim();
  if (!campaignId || !trimmedConcept) {
    return { ok: false, error: "Falta el concepto de la campaña." };
  }

  let templateBlocks: Block[] | undefined;
  if (templateId) {
    const [custom, builtin] = await Promise.all([
      listEmailTemplates(),
      getBuiltinTemplates(),
    ]);
    const template = [...custom, ...builtin].find((t) => t.id === templateId);
    if (template) {
      const parsedTemplate = blocksSchema.safeParse(template.blocks);
      if (parsedTemplate.success) templateBlocks = parsedTemplate.data;
    }
  }

  const res = await generateCampaignBlocks({
    concept: trimmedConcept,
    refs: refs.trim() || undefined,
    templateBlocks,
  });
  if (!res.ok) return { ok: false, error: AI_FAILURE_MESSAGE[res.reason] };

  await updateCampaign(campaignId, { blocks: res.blocks, concept: trimmedConcept });
  revalidatePath("/panel/campanas");
  return { ok: true };
}

export async function editAction(
  campaignId: string,
  instruction: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedInstruction = instruction.trim();
  if (!campaignId || !trimmedInstruction) {
    return { ok: false, error: "Falta la instrucción de edición." };
  }

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  const parsed = blocksSchema.safeParse(campaign.blocks);
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "La campaña no tiene bloques válidos." };
  }

  const res = await editCampaignBlocks(parsed.data, trimmedInstruction);
  if (!res.ok) return { ok: false, error: AI_FAILURE_MESSAGE[res.reason] };

  await updateCampaign(campaignId, { blocks: res.blocks });
  revalidatePath("/panel/campanas");
  return { ok: true };
}

export async function saveBlocksAction(
  campaignId: string,
  blocksJson: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!campaignId) return { ok: false, error: "Falta el id de campaña." };

  let raw: unknown;
  try {
    raw = JSON.parse(blocksJson);
  } catch {
    return { ok: false, error: "JSON de bloques inválido." };
  }

  const parsed = blocksSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Los bloques no son válidos." };

  await updateCampaign(campaignId, { blocks: parsed.data });
  revalidatePath("/panel/campanas");
  return { ok: true };
}

export async function saveAsTemplateAction(
  campaignId: string,
  name: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedName = name.trim();
  if (!campaignId || !trimmedName) {
    return { ok: false, error: "Falta el nombre de la plantilla." };
  }

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  const parsed = blocksSchema.safeParse(campaign.blocks);
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "La campaña no tiene bloques válidos." };
  }

  const res = await saveEmailTemplate({
    name: trimmedName,
    description: description.trim() || undefined,
    blocks: parsed.data,
  });
  if (!res) return { ok: false, error: "No se pudo guardar la plantilla." };
  revalidatePath("/panel/campanas");
  return { ok: true };
}

export async function setCampaignMetaAction(
  campaignId: string,
  name: string,
  subject: string,
  fromEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!campaignId) return { ok: false, error: "Falta el id de campaña." };

  await updateCampaign(campaignId, {
    name: name.trim() || null,
    subject: subject.trim() || null,
    from_email: fromEmail.trim() || null,
  });
  revalidatePath("/panel/campanas");
  return { ok: true };
}

export async function sendTestAction(
  campaignId: string,
  toEmails: string,
): Promise<{ ok: boolean; error?: string }> {
  const emails = toEmails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!campaignId || emails.length === 0) {
    return { ok: false, error: "Añade al menos un email de prueba." };
  }

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };

  const res = await sendCampaignTest({
    subject: campaign.subject ?? "",
    from_email: campaign.from_email ?? "",
    blocks: campaign.blocks,
    toEmails: emails,
  });
  if (!res.ok) return { ok: false, error: res.error ?? "No se pudo enviar la prueba." };
  return { ok: true };
}

export async function sendCampaignAction(
  campaignId: string,
  leadIdsCsv: string,
): Promise<{ ok: boolean; sent?: number; skipped?: number; error?: string }> {
  const leadIds = leadIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!campaignId || leadIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un destinatario." };
  }

  const res = await sendCampaign(campaignId, leadIds);
  revalidatePath("/panel/campanas");
  if (!res.ok) return { ok: false, error: res.error ?? "No se pudo enviar la campaña." };
  return { ok: true, sent: res.sent, skipped: res.skipped };
}
