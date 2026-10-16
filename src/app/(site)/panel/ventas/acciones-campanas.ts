"use server";

import { revalidatePath } from "next/cache";
import { editCampaignBlocks, generateCampaignBlocks } from "@/lib/campaign-ai";
import { blocksSchema, sanitizeBlocks, type Block } from "@/lib/campaign-blocks";
import { uploadCampaignImage } from "@/lib/campaign-images";
import { AI_FAILURE_MESSAGE, parseLeadIds, SCHEDULE_ERROR_MESSAGE, sendErrorMessage } from "@/lib/campaign-mensajes";
import { checkScheduleTime } from "@/lib/campaign-schedule";
import { ALLOWED_SENDERS, sendCampaign, sendCampaignTest, validateCampaign } from "@/lib/campaign-send";
import {
  cancelCampaignSchedule,
  crearCampanaDeMarca,
  getBuiltinTemplates,
  getCampaign,
  listEmailTemplates,
  saveEmailTemplate,
  scheduleCampaign,
  updateCampaign,
  type AmbitoMarca,
  type CampaignRow,
} from "@/lib/campaigns";
import { sanitizePreheader } from "@/lib/email-preheader";
import { sanitizeSenderName } from "@/lib/email-from";
import { accesoMarcaAccion, requireUsuaria } from "@/lib/ventas/auth";
import { campanaEsDeMarca, conModulo, leerModulos, MODULO_CAMPANAS, remitentesDeMarca, tieneModulo } from "@/lib/ventas/campanas";
import { actualizarModulosMarca, getMarcaPorId, type Marca } from "@/lib/ventas/db";
import { MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

/**
 * Las acciones del asistente de campañas en /panel/ventas/<marca>/campanas.
 * Hacen lo mismo que las del /panel viejo (`panel/campanas/actions.ts`), pero
 * antes de cada cosa comprueban: sesión y permiso en la sección «campanas» de
 * la marca, que la marca tenga el módulo encendido y que la campaña sea suya.
 * Llevan `slug` delante: la página las ata a su marca con `.bind`.
 */

type Resultado = { ok: boolean; error?: string };

const MODULO_APAGADO = "El módulo de campañas no está activado en esta marca.";
const NO_ENCONTRADA = "Campaña no encontrada.";

async function accesoCampanas(slug: string): Promise<{ ok: true; marca: Marca } | { ok: false; error: string }> {
  const acceso = await accesoMarcaAccion(slug, "campanas");
  if (!acceso.ok) return acceso;
  if (!tieneModulo(acceso.marca, MODULO_CAMPANAS)) return { ok: false, error: MODULO_APAGADO };
  return { ok: true, marca: acceso.marca };
}

async function campanaDeMarca(
  slug: string,
  campaignId: string,
): Promise<{ ok: true; marca: Marca; campaign: CampaignRow } | { ok: false; error: string }> {
  const acceso = await accesoCampanas(slug);
  if (!acceso.ok) return acceso;
  const campaign = campaignId ? await getCampaign(campaignId) : null;
  if (!campaign || !campanaEsDeMarca(campaign, acceso.marca)) return { ok: false, error: NO_ENCONTRADA };
  return { ok: true, marca: acceso.marca, campaign };
}

/** Las campañas y plantillas sin marca son de dinkbit (ver ventas/campanas.ts). */
function ambito(marca: Marca): AmbitoMarca {
  return { marcaId: marca.id, incluirSinMarca: marca.slug === MARCA_DINKBIT_SLUG };
}

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}/campanas`, "layout");
}

export async function crearBorradorCampanaAction(slug: string): Promise<{ id: string } | { error: string }> {
  const acceso = await accesoCampanas(slug);
  if (!acceso.ok) return { error: acceso.error };
  const res = await crearCampanaDeMarca({ marcaId: acceso.marca.id, sinMarcaSiFalta: acceso.marca.slug === MARCA_DINKBIT_SLUG });
  if (!res.ok) {
    return {
      error:
        res.error === "missing_migration"
          ? "Falta ejecutar en Supabase la migración de campañas (docs/sql/2026-10-16-ventas-campanas.sql)."
          : "No se pudo crear la campaña.",
    };
  }
  refrescar(slug);
  return { id: res.id };
}

export async function generarCampanaAction(
  slug: string,
  campaignId: string,
  concept: string,
  refs: string,
  templateId?: string,
): Promise<Resultado> {
  const trimmedConcept = concept.trim();
  if (!trimmedConcept) return { ok: false, error: "Falta el concepto de la campaña." };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;

  let templateBlocks: Block[] | undefined;
  if (templateId) {
    // Solo las plantillas que ve esta marca: las predefinidas y las suyas.
    const [propias, predefinidas] = await Promise.all([listEmailTemplates(ambito(r.marca)), getBuiltinTemplates()]);
    const template = [...propias, ...predefinidas].find((t) => t.id === templateId);
    const parsed = template ? blocksSchema.safeParse(template.blocks) : null;
    if (parsed?.success) templateBlocks = parsed.data;
  }

  const res = await generateCampaignBlocks({ concept: trimmedConcept, refs: refs.trim() || undefined, templateBlocks });
  if (!res.ok) return { ok: false, error: AI_FAILURE_MESSAGE[res.reason] };
  await updateCampaign(campaignId, { blocks: sanitizeBlocks(res.blocks), concept: trimmedConcept });
  refrescar(slug);
  return { ok: true };
}

export async function editarCampanaAction(slug: string, campaignId: string, instruction: string): Promise<Resultado> {
  const trimmed = instruction.trim();
  if (!trimmed) return { ok: false, error: "Falta la instrucción de edición." };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  const parsed = blocksSchema.safeParse(r.campaign.blocks);
  if (!parsed.success || parsed.data.length === 0) return { ok: false, error: "La campaña no tiene bloques válidos." };
  const res = await editCampaignBlocks(parsed.data, trimmed);
  if (!res.ok) return { ok: false, error: AI_FAILURE_MESSAGE[res.reason] };
  await updateCampaign(campaignId, { blocks: sanitizeBlocks(res.blocks) });
  refrescar(slug);
  return { ok: true };
}

export async function guardarBloquesCampanaAction(slug: string, campaignId: string, blocksJson: string): Promise<Resultado> {
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  let raw: unknown;
  try {
    raw = JSON.parse(blocksJson);
  } catch {
    return { ok: false, error: "JSON de bloques inválido." };
  }
  const parsed = blocksSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Los bloques no son válidos." };
  await updateCampaign(campaignId, { blocks: sanitizeBlocks(parsed.data) });
  refrescar(slug);
  return { ok: true };
}

export async function guardarPlantillaCampanaAction(slug: string, campaignId: string, name: string, description: string): Promise<Resultado> {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Falta el nombre de la plantilla." };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  const parsed = blocksSchema.safeParse(r.campaign.blocks);
  if (!parsed.success || parsed.data.length === 0) return { ok: false, error: "La campaña no tiene bloques válidos." };
  const res = await saveEmailTemplate({
    name: trimmedName,
    description: description.trim() || undefined,
    blocks: parsed.data,
    marcaId: r.marca.id,
    sinMarcaSiFalta: r.marca.slug === MARCA_DINKBIT_SLUG,
  });
  if (!res) return { ok: false, error: "No se pudo guardar la plantilla." };
  refrescar(slug);
  return { ok: true };
}

export async function guardarDatosCampanaAction(
  slug: string,
  campaignId: string,
  name: string,
  subject: string,
  fromEmail: string,
  fromName: string = "",
  preheader: string = "",
): Promise<Resultado> {
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  // Igual que en el /panel viejo: el nombre del remitente se guarda ya saneado.
  const senderName = sanitizeSenderName(fromName);
  await updateCampaign(campaignId, {
    name: name.trim() || null,
    subject: subject.trim() || null,
    from_email: fromEmail.trim() || null,
    from_name: senderName || null,
    preheader: sanitizePreheader(preheader) || null,
  });
  refrescar(slug);
  return { ok: true };
}

export async function enviarPruebaCampanaAction(slug: string, campaignId: string, toEmails: string): Promise<Resultado> {
  const emails = toEmails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return { ok: false, error: "Añade al menos un email de prueba." };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  const res = await sendCampaignTest({
    subject: r.campaign.subject ?? "",
    from_email: r.campaign.from_email ?? "",
    from_name: r.campaign.from_name ?? null,
    preheader: r.campaign.preheader ?? null,
    blocks: r.campaign.blocks,
    toEmails: emails,
    remitentes: remitentesDeMarca(r.marca, ALLOWED_SENDERS),
  });
  if (!res.ok) return { ok: false, error: sendErrorMessage(res.error, "No se pudo enviar la prueba.") };
  return { ok: true };
}

export async function enviarCampanaAction(
  slug: string,
  campaignId: string,
  leadIdsCsv: string,
): Promise<{ ok: boolean; sent?: number; skipped?: number; error?: string }> {
  const leadIds = parseLeadIds(leadIdsCsv);
  if (leadIds.length === 0) return { ok: false, error: "Selecciona al menos un destinatario." };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  // `sendCampaign` vuelve a decidir por la marca de la campaña a quién puede ir.
  const res = await sendCampaign(campaignId, leadIds);
  refrescar(slug);
  if (!res.ok) return { ok: false, error: sendErrorMessage(res.error, "No se pudo enviar la campaña.") };
  return { ok: true, sent: res.sent, skipped: res.skipped };
}

export async function programarCampanaAction(slug: string, campaignId: string, leadIdsCsv: string, scheduledAtIso: string): Promise<Resultado> {
  const leadIds = parseLeadIds(leadIdsCsv);
  if (leadIds.length === 0) return { ok: false, error: "Selecciona al menos un destinatario." };
  const when = checkScheduleTime(scheduledAtIso);
  if (!when.ok) return { ok: false, error: when.error };
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  const validated = validateCampaign(r.campaign, remitentesDeMarca(r.marca, ALLOWED_SENDERS));
  if (!validated.ok) return { ok: false, error: sendErrorMessage(validated.error, "La campaña no es válida.") };
  const res = await scheduleCampaign(campaignId, when.iso, leadIds);
  refrescar(slug);
  return res.ok ? { ok: true } : { ok: false, error: SCHEDULE_ERROR_MESSAGE[res.error] };
}

export async function cancelarProgramacionCampanaAction(slug: string, campaignId: string): Promise<Resultado> {
  const r = await campanaDeMarca(slug, campaignId);
  if (!r.ok) return r;
  const ok = await cancelCampaignSchedule(campaignId);
  refrescar(slug);
  return ok ? { ok: true } : { ok: false, error: "Ya no estaba programada: puede que se esté enviando en este momento." };
}

export async function subirImagenCampanaAction(slug: string, formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const r = await campanaDeMarca(slug, String(formData.get("campaignId") ?? ""));
  if (!r.ok) return r;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No llegó ninguna imagen." };
  const res = await uploadCampaignImage(r.campaign.id, file);
  return res.ok ? { ok: true, url: res.url } : { ok: false, error: res.error };
}

/** Encender o apagar el módulo de campañas y fijar sus remitentes. Solo admin:
 *  es un servicio de pago para la marca. */
export async function actualizarModulosAction(marcaId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerModulos(fd);
  if (!leido.ok) return leido;
  const marca = await getMarcaPorId(marcaId);
  if (!marca) return { ok: false, error: "Marca no encontrada." };
  const res = await actualizarModulosMarca(marcaId, {
    modulos: conModulo(marca.modulos, MODULO_CAMPANAS, leido.datos.campanas),
    campanas_remitentes: leido.datos.remitentes,
  });
  if (!res.ok) return res;
  revalidatePath("/panel/ventas", "layout");
  return { ok: true, mensaje: leido.datos.campanas ? "Módulo de campañas activado." : "Módulo de campañas desactivado." };
}
