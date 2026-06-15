import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { LEAD_STATUSES, type LeadStatus } from "./lead-status";

const TABLE = "imagina_leads";
const BUCKET = "imagina-previews";

export { LEAD_STATUSES, type LeadStatus };

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
  account_manager: string | null;
  archived: boolean;
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

/** Insert (or upsert) a lead row. Best-effort — never throws to the caller. */
export async function saveLead(input: SaveLeadInput): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(TABLE).upsert(
    {
      id: input.id,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      sector: input.sector ?? null,
      business_name: input.businessName ?? null,
      business_type: input.businessType ?? null,
      style: input.style ?? null,
      palette: input.palette ?? null,
      value_prop: input.valueProp ?? null,
      current_website: input.currentWebsite ?? null,
      pdf_path: input.pdfPath ?? null,
    },
    { onConflict: "id" },
  );
  if (error) console.error("[imagina-leads] saveLead error:", error.message);
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

export async function updateLeadReview(
  leadId: string,
  rating: string,
  comment: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(TABLE)
    .update({ review_rating: rating, review_comment: comment || null })
    .eq("id", leadId);
  if (error) console.error("[imagina-leads] updateReview error:", error.message);
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

/** Update a single free-text/select field on a lead (account_manager, notes, followup). */
export async function updateLeadField(
  leadId: string,
  field: "account_manager" | "notes" | "followup",
  value: string,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb
    .from(TABLE)
    .update({ [field]: value.trim() || null })
    .eq("id", leadId);
  if (error) {
    console.error(`[imagina-leads] updateLeadField(${field}) error:`, error.message);
    return false;
  }
  return true;
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

export async function getLeadPdfPath(leadId: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from(TABLE)
    .select("pdf_path")
    .eq("id", leadId)
    .maybeSingle();
  return (data?.pdf_path as string | null) ?? null;
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
