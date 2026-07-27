import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

const CAMPAIGNS_TABLE = "campaigns";
const RECIPIENTS_TABLE = "campaign_recipients";
const TEMPLATES_TABLE = "email_templates";

export interface CampaignRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  subject: string | null;
  from_email: string | null;
  status: string;
  template_id: string | null;
  blocks: unknown;
  concept: string | null;
  sent_at: string | null;
  recipients_total: number | null;
}

export interface CampaignRecipientRow {
  id: string;
  campaign_id: string;
  lead_id: string;
  email: string;
  message_id: string | null;
  status: string;
  updated_at: string;
}

export interface EmailTemplateRow {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  blocks: unknown;
  is_builtin: boolean;
}

/** Crea una campaña en borrador. Best-effort — devuelve null si falla o no hay
 *  Supabase configurado. */
export async function createCampaign(
  input: { name?: string; concept?: string },
): Promise<{ id: string } | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const row = {
    name: input.name ?? null,
    concept: input.concept ?? null,
    status: "draft",
  };
  const { data, error } = await sb.from(CAMPAIGNS_TABLE).insert(row).select("id").single();
  if (error) {
    console.error("[campaigns] createCampaign error:", error.message);
    return null;
  }
  return { id: (data as { id: string }).id };
}

/** Actualiza campos de una campaña por id. `blocks`, si viene como objeto, se
 *  serializa a JSON antes de persistir. Best-effort. */
export async function updateCampaign(
  id: string,
  patch: Partial<{
    name: string | null;
    subject: string | null;
    from_email: string | null;
    blocks: unknown;
    concept: string | null;
    status: string;
    template_id: string | null;
    recipients_total: number;
    sent_at: string | null;
  }>,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const payload: Record<string, unknown> = { ...patch };
  if ("blocks" in payload && payload.blocks !== null && typeof payload.blocks === "object") {
    payload.blocks = JSON.stringify(payload.blocks);
  }
  const { error } = await sb.from(CAMPAIGNS_TABLE).update(payload).eq("id", id);
  if (error) console.error("[campaigns] updateCampaign error:", error.message);
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[campaigns] getCampaign error:", error.message);
    return null;
  }
  return (data as CampaignRow | null) ?? null;
}

export async function listCampaigns(limit = 200): Promise<CampaignRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[campaigns] listCampaigns error:", error.message);
    return [];
  }
  return (data ?? []) as CampaignRow[];
}

export async function setCampaignStatus(id: string, status: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(CAMPAIGNS_TABLE).update({ status }).eq("id", id);
  if (error) console.error("[campaigns] setCampaignStatus error:", error.message);
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(TEMPLATES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[campaigns] listEmailTemplates error:", error.message);
    return [];
  }
  return (data ?? []) as EmailTemplateRow[];
}

/** Guarda una plantilla creada por el usuario (nunca sembrada/built-in). */
export async function saveEmailTemplate(
  input: { name: string; description?: string; blocks: unknown },
): Promise<{ id: string } | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const row = {
    name: input.name,
    description: input.description ?? null,
    blocks: input.blocks,
    is_builtin: false,
  };
  const { data, error } = await sb.from(TEMPLATES_TABLE).insert(row).select("id").single();
  if (error) {
    console.error("[campaigns] saveEmailTemplate error:", error.message);
    return null;
  }
  return { id: (data as { id: string }).id };
}

/** Inserta destinatarios en bloque para una campaña. `status` por defecto
 *  "pending". Best-effort. */
export async function insertCampaignRecipients(
  rows: {
    campaign_id: string;
    lead_id: string;
    email: string;
    message_id?: string | null;
    status?: string;
  }[],
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || rows.length === 0) return;
  const payload = rows.map((r) => ({
    campaign_id: r.campaign_id,
    lead_id: r.lead_id,
    email: r.email,
    message_id: r.message_id ?? null,
    status: r.status ?? "pending",
  }));
  const { error } = await sb.from(RECIPIENTS_TABLE).insert(payload);
  if (error) console.error("[campaigns] insertCampaignRecipients error:", error.message);
}

/** Guarda el message_id de Resend para un destinatario concreto de una
 *  campaña (para casar los eventos del webhook). Best-effort. */
export async function setCampaignRecipientMessageId(
  campaignId: string,
  leadId: string,
  messageId: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(RECIPIENTS_TABLE)
    .update({ message_id: messageId })
    .eq("campaign_id", campaignId)
    .eq("lead_id", leadId);
  if (error) {
    console.error("[campaigns] setCampaignRecipientMessageId error:", error.message);
  }
}
