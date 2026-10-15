import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { LEAD_STATUSES, type LeadStatus } from "./lead-status";
import { isFollowupDate } from "./followup-agenda";
import { statusesBelow, type RecipientEventStatus } from "./campaign-stats";
import type { PromoQuestionnaireInput } from "./promo-questionnaire";
import { promoQuestionnaireFields, formatQuestionnaireNotes } from "./promo-questionnaire";

const TABLE = "imagina_leads";
const BUCKET = "imagina-previews";

export { LEAD_STATUSES, type LeadStatus };

/**
 * Las escrituras de leads van a /panel/ventas (marca dinkbit) desde la
 * unificación del CRM (2026-10-15). Se reexportan aquí con su nombre de siempre
 * para que los formularios no cambien; la versión sobre `imagina_leads` vive en
 * `imagina-leads-legacy.ts` como respaldo. Lo que queda en este fichero son las
 * lecturas del /panel viejo (en consulta) y los ficheros de Storage.
 */
export {
  createLeadsBulk,
  createManualLead,
  createWebhookLead,
  getLeadNotes,
  getLeadPdfPath,
  listEmailableLeads,
  saveLead,
  savePromoQuestionnaire,
  setCampaignRecipientStatusByMessageId,
  setLeadConsent,
  setLeadEmailSent,
  setLeadEmailStatusByMessageId,
  updateLeadField,
  updateLeadReview,
  upsertKitDigital2026Lead,
} from "./ventas/leads-web";

export interface LeadRow {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  sector: string | null;
  business_name: string | null;
  business_type: string | null;
  template: string | null;
  style: string | null;
  palette: string | null;
  value_prop: string | null;
  current_website: string | null;
  pdf_path: string | null;
  review_rating: string | null;
  review_comment: string | null;
  status: LeadStatus | string;
  channel: string | null;
  campaign: string | null;
  notes: string | null;
  followup: string | null;
  /** Fecha (YYYY-MM-DD) en la que toca volver a llamar. null = sin agendar. */
  followup_at: string | null;
  account_manager: string | null;
  archived: boolean;
  email_status: string | null;
  email_message_id: string | null;
  email_updated_at: string | null;
  /** Consentimiento de comunicaciones comerciales (para campañas). null = sin definir. */
  consent: boolean | null;
}

export interface SaveLeadInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  sector?: string;
  businessName?: string;
  businessType?: string;
  style?: string;
  palette?: string;
  valueProp?: string;
  currentWebsite?: string;
  pdfPath?: string | null;
}


/** Upload the preview PDF to the private bucket; returns its storage path. */
export async function uploadPreviewPdf(
  leadId: string,
  pdf: Buffer,
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const path = `${leadId}.pdf`;
  // Retry a few times — storage uploads can fail transiently, and a miss here
  // means the lead's preview never reaches the panel.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (!error) return path;
    console.error(
      `[imagina-leads] uploadPreviewPdf error (attempt ${attempt}/3):`,
      error.message,
    );
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  return null;
}


export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from(TABLE).update({ status }).eq("id", leadId);
  if (error) {
    console.error("[imagina-leads] updateStatus error:", error.message);
    return false;
  }
  return true;
}


/** Agenda (o desagenda) la próxima llamada. `date` debe ser YYYY-MM-DD; una
 *  cadena vacía limpia la fecha y saca al lead de la agenda. Cualquier otra
 *  cosa se rechaza sin tocar la fila. */
export async function updateLeadFollowupDate(
  leadId: string,
  date: string,
): Promise<boolean> {
  const value = date.trim();
  if (value !== "" && !isFollowupDate(value)) return false;
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb
    .from(TABLE)
    .update({ followup_at: value || null })
    .eq("id", leadId);
  if (error) {
    console.error("[imagina-leads] updateLeadFollowupDate error:", error.message);
    return false;
  }
  return true;
}

export interface WebhookLeadInput {
  /** Optional external id (e.g. Meta leadgen_id) → makes retries idempotent. */
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  channel?: string | null;
  campaign?: string | null;
  /** Dedicated columns (used by web builders that capture them, e.g. Kit Digital 2026). */
  sector?: string | null;
  businessType?: string | null;
  notes?: string | null;
  /** Estado inicial del lead en el panel. Por defecto "nuevo"; los flujos de una
   *  campaña concreta pueden entrar ya etiquetados (p.ej. "kit-digital"). */
  status?: LeadStatus | string | null;
  /** Consentimiento de comunicaciones comerciales, cuando el formulario lo
   *  recoge con un checkbox explícito. null/undefined = sin definir (no tocar). */
  consent?: boolean | null;
}




export interface ManualLeadInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  channel?: string | null;
  campaign?: string | null;
  notes?: string | null;
}


export interface BulkLeadInput extends ManualLeadInput {
  status?: string | null;
  consent?: boolean | null;
}

/** Email y teléfono de todos los leads (incluidos los archivados), para detectar
 *  duplicados antes de una importación masiva. Solo dos columnas: una tabla de
 *  miles de filas cabe de sobra y evita traerse los PDFs y las notas. */
export async function listLeadContacts(
  limit = 10000,
): Promise<Array<{ email: string | null; phone: string | null }>> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb.from(TABLE).select("email,phone").limit(limit);
  if (error) {
    console.error("[imagina-leads] listLeadContacts error:", error.message);
    return [];
  }
  return (data ?? []) as Array<{ email: string | null; phone: string | null }>;
}


/** Archive (or unarchive) one or more leads. Archived leads are hidden from
 *  the panel by default. Returns the number of rows updated. */
export async function archiveLeads(
  ids: string[],
  archived: boolean,
): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb || ids.length === 0) return 0;
  const { data, error } = await sb
    .from(TABLE)
    .update({ archived })
    .in("id", ids)
    .select("id");
  if (error) {
    console.error("[imagina-leads] archiveLeads error:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/** Permanently delete one or more leads by id. Returns the number deleted. */
export async function deleteLeads(ids: string[]): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb || ids.length === 0) return 0;
  const { data, error } = await sb
    .from(TABLE)
    .delete()
    .in("id", ids)
    .select("id");
  if (error) {
    console.error("[imagina-leads] deleteLeads error:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function listLeads(limit = 500): Promise<LeadRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[imagina-leads] listLeads error:", error.message);
    return [];
  }
  return (data ?? []) as LeadRow[];
}


/** Short-lived signed URL for a stored PDF (private bucket). */
export async function getSignedPdfUrl(
  path: string,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[imagina-leads] signedUrl error:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}


/** Sube el logo que aporta el cliente al bucket privado; devuelve su ruta. */
export async function uploadPromoLogo(leadId: string, file: File): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `promo/${leadId}-logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/png", upsert: true });
  if (error) {
    console.error("[imagina-leads] uploadPromoLogo error:", error.message);
    return null;
  }
  return path;
}






