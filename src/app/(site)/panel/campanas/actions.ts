"use server";

import { revalidatePath } from "next/cache";
import {
  createCampaign,
  updateCampaign,
  getCampaign,
  listEmailTemplates,
  getBuiltinTemplates,
  saveEmailTemplate,
  scheduleCampaign,
  cancelCampaignSchedule,
} from "@/lib/campaigns";
import {
  generateCampaignBlocks,
  editCampaignBlocks,
  type BlocksFailureReason,
} from "@/lib/campaign-ai";
import {
  sendCampaign,
  sendCampaignTest,
  validateCampaign,
  CAMPAIGN_NOT_CLAIMABLE,
} from "@/lib/campaign-send";
import { checkScheduleTime } from "@/lib/campaign-schedule";
import { blocksSchema, sanitizeBlocks, type Block } from "@/lib/campaign-blocks";
import { uploadCampaignImage } from "@/lib/campaign-images";
import { sanitizeSenderName } from "@/lib/email-from";
import { sanitizePreheader } from "@/lib/email-preheader";

const AI_FAILURE_MESSAGE: Record<BlocksFailureReason, string> = {
  "missing-api-key":
    "Falta configurar OPENAI_API_KEY en el servidor, así que no se llegó a llamar a la IA.",
  "api-error":
    "No se pudo contactar con OpenAI (API caída, clave inválida o sin saldo). Vuelve a intentarlo.",
  "invalid-response":
    "La IA devolvió una propuesta que no encaja con los bloques del email. Vuelve a intentarlo o reformula el concepto.",
};

/** Códigos de error del envío traducidos para quien usa el panel. */
const SEND_ERROR_MESSAGE: Record<string, string> = {
  missing_subject: "Falta el asunto.",
  from_email_not_allowed: "Ese email de envío no está autorizado.",
  invalid_blocks: "El correo no tiene contenido válido.",
  campaign_not_found: "Campaña no encontrada.",
  [CAMPAIGN_NOT_CLAIMABLE]:
    "La campaña ya se está enviando o está programada. Si está programada, cancela la programación antes de enviarla a mano.",
};

function sendErrorMessage(code: string | undefined, fallback: string): string {
  return (code && SEND_ERROR_MESSAGE[code]) || code || fallback;
}

function parseLeadIds(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

  await updateCampaign(campaignId, { blocks: sanitizeBlocks(res.blocks), concept: trimmedConcept });
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

  await updateCampaign(campaignId, { blocks: sanitizeBlocks(res.blocks) });
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

  await updateCampaign(campaignId, { blocks: sanitizeBlocks(parsed.data) });
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
  fromName: string = "",
  preheader: string = "",
): Promise<{ ok: boolean; error?: string }> {
  if (!campaignId) return { ok: false, error: "Falta el id de campaña." };

  // El nombre del remitente se guarda ya saneado: lo que hay en la base es
  // exactamente lo que acabará en la cabecera `From`, sin sorpresas.
  const senderName = sanitizeSenderName(fromName);

  await updateCampaign(campaignId, {
    name: name.trim() || null,
    subject: subject.trim() || null,
    from_email: fromEmail.trim() || null,
    from_name: senderName || null,
    preheader: sanitizePreheader(preheader) || null,
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
    from_name: campaign.from_name ?? null,
    preheader: campaign.preheader ?? null,
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
  const leadIds = parseLeadIds(leadIdsCsv);
  if (!campaignId || leadIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un destinatario." };
  }

  const res = await sendCampaign(campaignId, leadIds);
  revalidatePath("/panel/campanas");
  if (!res.ok) return { ok: false, error: sendErrorMessage(res.error, "No se pudo enviar la campaña.") };
  return { ok: true, sent: res.sent, skipped: res.skipped };
}

/** Programa el envío. Se valida ya lo mismo que al enviar, para no descubrir a
 *  la hora programada que faltaba el asunto; el cron lo vuelve a validar con
 *  la versión que haya entonces. */
export async function scheduleCampaignAction(
  campaignId: string,
  leadIdsCsv: string,
  scheduledAtIso: string,
): Promise<{ ok: boolean; error?: string }> {
  const leadIds = parseLeadIds(leadIdsCsv);
  if (!campaignId || leadIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un destinatario." };
  }
  const when = checkScheduleTime(scheduledAtIso);
  if (!when.ok) return { ok: false, error: when.error };

  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  const validated = validateCampaign(campaign);
  if (!validated.ok) return { ok: false, error: sendErrorMessage(validated.error, "La campaña no es válida.") };

  const res = await scheduleCampaign(campaignId, when.iso, leadIds);
  revalidatePath("/panel/campanas");
  if (res.ok) return { ok: true };
  const SCHEDULE_ERROR: Record<typeof res.error, string> = {
    not_schedulable: "Solo se pueden programar campañas en borrador.",
    missing_migration:
      "Falta la migración de envíos programados en la base de datos (docs/sql/2026-09-16-campaign-schedule.sql).",
    db_error: "No se pudo programar la campaña.",
  };
  return { ok: false, error: SCHEDULE_ERROR[res.error] };
}

export async function cancelScheduleAction(
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!campaignId) return { ok: false, error: "Falta el id de campaña." };
  const ok = await cancelCampaignSchedule(campaignId);
  revalidatePath("/panel/campanas");
  return ok
    ? { ok: true }
    : { ok: false, error: "Ya no estaba programada: puede que se esté enviando en este momento." };
}

/** Sube una imagen propia y devuelve su URL pública, lista para pegarla en un
 *  bloque de imagen. El fichero viaja en un FormData porque las Server Actions
 *  no serializan `File` de otra forma. */
export async function uploadCampaignImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const campaignId = String(formData.get("campaignId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No llegó ninguna imagen." };
  }
  const res = await uploadCampaignImage(campaignId, file);
  return res.ok ? { ok: true, url: res.url } : { ok: false, error: res.error };
}
