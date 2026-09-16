import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { BUILTIN_TEMPLATES } from "./campaign-templates-builtin";

const CAMPAIGNS_TABLE = "campaigns";
const RECIPIENTS_TABLE = "campaign_recipients";
const TEMPLATES_TABLE = "email_templates";

/** Columnas añadidas por migración manual, que pueden no existir todavía. */
const OPTIONAL_COLUMNS = ["from_name", "preheader"] as const;

export interface CampaignRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  subject: string | null;
  from_email: string | null;
  /** Nombre visible del remitente. Opcional en el tipo porque su columna se
   *  migra a mano: en una base sin migrar, la fila llega sin este campo. */
  from_name?: string | null;
  /** Texto previo que se ve junto al asunto en la bandeja. Opcional en el tipo
   *  por el mismo motivo que `from_name`: su columna se migra a mano. */
  preheader?: string | null;
  status: string;
  template_id: string | null;
  blocks: unknown;
  concept: string | null;
  sent_at: string | null;
  recipients_total: number | null;
  /** Hora a la que el cron debe enviarla (status `scheduled`). Opcional en el
   *  tipo porque su columna se migra a mano (docs/sql). */
  scheduled_at?: string | null;
  /** Destinatarios elegidos al programar: el wizard no los guarda en ningún
   *  otro sitio, y el cron no tiene a nadie delante que los seleccione. */
  scheduled_lead_ids?: string[] | null;
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

/** Actualiza campos de una campaña por id. `blocks` es jsonb: se pasa tal
 *  cual (objeto/array), sin serializar, para que supabase-js lo persista
 *  como JSON nativo. Best-effort. */
export async function updateCampaign(
  id: string,
  patch: Partial<{
    name: string | null;
    subject: string | null;
    from_email: string | null;
    from_name: string | null;
    preheader: string | null;
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
  // Siempre se toca updated_at, aunque no venga en el patch: el wizard re-sincroniza
  // sus bloques con un efecto que depende de este campo (ver CampaignWizard.tsx),
  // así que si no cambia, la IA nunca refresca el editor tras escribir bloques.
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await sb.from(CAMPAIGNS_TABLE).update(payload).eq("id", id);
  if (!error) return;

  // Columnas cuya migración se lanza a mano en el SQL Editor (docs/sql). Si
  // todavía no está aplicada, PostgREST rechaza el update ENTERO y se perdería
  // también el asunto o los bloques: se reintenta sin la columna que falta.
  const missing = OPTIONAL_COLUMNS.filter(
    (col) => col in payload && error.message.includes(col),
  );
  if (missing.length > 0) {
    console.error(
      `[campaigns] updateCampaign: falta la columna ${missing.join(", ")} en la base de datos. ` +
        "Ejecuta la migración de docs/sql. Se guarda el resto de campos.",
    );
    for (const col of missing) delete payload[col];
    const retry = await sb.from(CAMPAIGNS_TABLE).update(payload).eq("id", id);
    if (retry.error) console.error("[campaigns] updateCampaign error:", retry.error.message);
    return;
  }
  console.error("[campaigns] updateCampaign error:", error.message);
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

/** Pasa la campaña a `sending` solo si sigue en uno de `fromStatuses`. Es un
 *  update condicional (una sola sentencia), así que dos envíos simultáneos —un
 *  doble clic, o el cron solapándose con un envío manual— no pueden reclamar
 *  la misma campaña: solo uno recibe `true`. */
export async function claimCampaignForSending(
  id: string,
  fromStatuses: string[],
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .update({ status: "sending" })
    .eq("id", id)
    .in("status", fromStatuses)
    .select("id");
  if (error) {
    console.error("[campaigns] claimCampaignForSending error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Deja la campaña programada. Solo desde borrador o error: una campaña ya
 *  enviada, enviándose o programada no se reprograma por aquí. */
export async function scheduleCampaign(
  id: string,
  scheduledAt: string,
  leadIds: string[],
): Promise<{ ok: true } | { ok: false; error: "not_schedulable" | "missing_migration" | "db_error" }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "db_error" };
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .update({ status: "scheduled", scheduled_at: scheduledAt, scheduled_lead_ids: leadIds })
    .eq("id", id)
    .in("status", ["draft", "failed"])
    .select("id");
  if (error) {
    console.error("[campaigns] scheduleCampaign error:", error.message);
    return {
      ok: false,
      error: error.message.includes("scheduled_") ? "missing_migration" : "db_error",
    };
  }
  return (data?.length ?? 0) > 0 ? { ok: true } : { ok: false, error: "not_schedulable" };
}

/** Vuelve a borrador una campaña programada. Devuelve false si ya no estaba
 *  programada (por ejemplo, el cron la acaba de coger). */
export async function cancelCampaignSchedule(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .update({ status: "draft", scheduled_at: null, scheduled_lead_ids: null })
    .eq("id", id)
    .eq("status", "scheduled")
    .select("id");
  if (error) {
    console.error("[campaigns] cancelCampaignSchedule error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Campañas programadas cuya hora ya ha llegado. */
export async function listDueScheduledCampaigns(
  nowIso: string,
): Promise<{ id: string; scheduled_lead_ids: string[] | null }[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(CAMPAIGNS_TABLE)
    .select("id,scheduled_lead_ids")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });
  if (error) {
    console.error("[campaigns] listDueScheduledCampaigns error:", error.message);
    return [];
  }
  return (data ?? []) as { id: string; scheduled_lead_ids: string[] | null }[];
}

/** Email y estado de cada destinatario de una campaña, paginando de 1000 en
 *  1000 (el máximo que devuelve PostgREST por petición). */
export async function listCampaignRecipients(
  campaignId: string,
): Promise<{ email: string; status: string }[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const PAGE = 1000;
  const out: { email: string; status: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(RECIPIENTS_TABLE)
      .select("email,status")
      .eq("campaign_id", campaignId)
      .order("email", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[campaigns] listCampaignRecipients error:", error.message);
      return out;
    }
    const rows = (data ?? []) as { email: string; status: string }[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
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

/** Plantillas sembradas/predefinidas (`is_builtin = true`). Best-effort. */
export async function getBuiltinTemplates(): Promise<EmailTemplateRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    // Fallback si no hay Supabase configurado
    const now = new Date().toISOString();
    return BUILTIN_TEMPLATES.map((t) => ({
      id: t.id,
      created_at: now,
      name: t.name,
      description: t.description ?? null,
      blocks: t.blocks,
      is_builtin: true,
    }));
  }
  const { data, error } = await sb
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("is_builtin", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[campaigns] getBuiltinTemplates error:", error.message);
    // Fallback a plantillas builtin si hay error
    const now = new Date().toISOString();
    return BUILTIN_TEMPLATES.map((t) => ({
      id: t.id,
      created_at: now,
      name: t.name,
      description: t.description ?? null,
      blocks: t.blocks,
      is_builtin: true,
    }));
  }
  const dbRows = (data ?? []) as EmailTemplateRow[];
  if (dbRows.length > 0) {
    return dbRows;
  }
  // Fallback si no hay filas en la BD
  const now = new Date().toISOString();
  return BUILTIN_TEMPLATES.map((t) => ({
    id: t.id,
    created_at: now,
    name: t.name,
    description: t.description ?? null,
    blocks: t.blocks,
    is_builtin: true,
  }));
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
  // upsert (no insert): un reintento de envío (mismo campaign_id + lead_id) no debe
  // reventar contra la unique constraint — pisa la fila anterior con el estado nuevo.
  const { error } = await sb
    .from(RECIPIENTS_TABLE)
    .upsert(payload, { onConflict: "campaign_id,lead_id" });
  if (error) console.error("[campaigns] insertCampaignRecipients error:", error.message);
}

/** Guarda el message_id de Resend para un destinatario concreto de una
 *  campaña (para casar los eventos del webhook). Best-effort. */
export async function setRecipientMessageId(
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
    console.error("[campaigns] setRecipientMessageId error:", error.message);
  }
}
