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
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) {
    console.error("[imagina-leads] uploadPreviewPdf error:", error.message);
    return null;
  }
  return path;
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
