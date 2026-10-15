import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { LEAD_STATUSES, type LeadStatus } from "./lead-status";
import { statusesBelow, type RecipientEventStatus } from "./campaign-stats";
import type { PromoQuestionnaireInput } from "./promo-questionnaire";
import { promoQuestionnaireFields, formatQuestionnaireNotes } from "./promo-questionnaire";
import type { BulkLeadInput, LeadRow, ManualLeadInput, SaveLeadInput, WebhookLeadInput } from "./imagina-leads";

/**
 * Las escrituras de leads tal como eran antes de la unificación del CRM
 * (2026-10-15): sobre la tabla `imagina_leads` del /panel viejo.
 *
 * Ya no son el camino normal: las altas van a /panel/ventas (marca dinkbit) en
 * `ventas/leads-web.ts`. Se conservan como RESPALDO —si un formulario llega
 * antes de que se ejecute la migración, el lead no se pierde— y para los leads
 * que todavía solo están aquí (correos enviados antes de migrar).
 */

const TABLE = "imagina_leads";

const KD2026_CAMPAIGN = "Kit Digital 2026";

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

/** Update a single free-text/select field on a lead (account_manager, notes,
 *  followup, channel, campaign, name, email, phone). */
export async function updateLeadField(
  leadId: string,
  field:
    | "account_manager"
    | "notes"
    | "followup"
    | "channel"
    | "campaign"
    | "name"
    | "email"
    | "phone",
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

/** Insert a lead coming from an external webhook (Zapier → Meta Lead Ads, etc.).
 *  Upserts on `id` so a retried delivery with the same external id won't dup. */
export async function createWebhookLead(
  input: WebhookLeadInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "supabase_not_configured" };
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const row = {
    id: clean(input.id) ?? crypto.randomUUID(),
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    channel: clean(input.channel) ?? "Meta",
    campaign: clean(input.campaign),
    sector: clean(input.sector),
    business_type: clean(input.businessType),
    notes: clean(input.notes),
    status: clean(input.status) ?? "nuevo",
    consent: input.consent ?? null,
  };
  const { error } = await sb.from(TABLE).upsert(row, { onConflict: "id" });
  if (error) {
    console.error("[imagina-leads] createWebhookLead error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: row.id };
}

/** Enriquece la fila existente (match por email en la campaña) o crea una nueva.
 *  Al enriquecer: conserva channel/campaign/status; rellena name/phone solo si
 *  faltaban; setea sector/business_type; appende notes. */
export async function upsertKitDigital2026Lead(
  lead: WebhookLeadInput,
): Promise<{ ok: boolean; id?: string; matched: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, matched: false, error: "supabase_not_configured" };
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const email = clean(lead.email);
  // Escapa los comodines de LIKE (\, %, _) para que el email se matchee de
  // forma literal (case-insensitive), no como patrón — un "_" en el local-part
  // del email es común y no debe actuar como comodín.
  const emailLike = email ? email.replace(/[\\%_]/g, (c) => `\\${c}`) : null;

  // Buscar fila existente (con sus campos para decidir el merge).
  const existing = email
    ? (
        await sb
          .from(TABLE)
          .select("id,name,phone,notes")
          .ilike("email", emailLike!)
          .eq("campaign", KD2026_CAMPAIGN)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  if (!existing) {
    const res = await createWebhookLead(lead);
    return { ...res, matched: false };
  }

  const row = existing as {
    id: string;
    name: string | null;
    phone: string | null;
    notes: string | null;
  };
  const update: Record<string, string | boolean | null> = {
    sector: clean(lead.sector),
    business_type: clean(lead.businessType),
  };
  // name/phone: solo si faltaban (no pisar dato bueno con vacío).
  if (!clean(row.name) && clean(lead.name)) update.name = clean(lead.name);
  if (!clean(row.phone) && clean(lead.phone)) update.phone = clean(lead.phone);
  // consent: un submit que enriquece un lead ya existente también cuenta como
  // consentimiento explícito — se registra si venía marcado.
  if (lead.consent === true) update.consent = true;
  // notes: appendear al bloque previo.
  const incoming = clean(lead.notes);
  if (incoming) {
    update.notes = row.notes
      ? `${row.notes}\n\n— Datos de la landing —\n${incoming}`
      : incoming;
  }

  const { error } = await sb.from(TABLE).update(update).eq("id", row.id);
  if (error) {
    console.error("[imagina-leads] upsertKitDigital2026Lead update error:", error.message);
    return { ok: false, id: row.id, matched: true, error: error.message };
  }
  return { ok: true, id: row.id, matched: true };
}

/** Insert a lead captured by hand from the panel. Always a fresh row (random
 *  id, status "nuevo"); channel defaults to "Web" when not specified. */
export async function createManualLead(
  input: ManualLeadInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "supabase_not_configured" };
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const row = {
    id: crypto.randomUUID(),
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    current_website: clean(input.website),
    channel: clean(input.channel) ?? "Web",
    campaign: clean(input.campaign),
    notes: clean(input.notes),
    status: "nuevo",
  };
  const { error } = await sb.from(TABLE).insert(row);
  if (error) {
    console.error("[imagina-leads] createManualLead error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: row.id };
}

/**
 * Alta masiva desde CSV. Inserta en lotes para no mandar un único payload
 * enorme a Supabase; si un lote falla se aborta y se devuelve cuántos habían
 * entrado ya, porque dejar el resto a medias en silencio haría imposible saber
 * qué hay que reimportar.
 */
export async function createLeadsBulk(
  inputs: BulkLeadInput[],
  chunkSize = 200,
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, inserted: 0, error: "supabase_not_configured" };
  if (inputs.length === 0) return { ok: true, inserted: 0 };

  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const rows = inputs.map((input) => ({
    id: crypto.randomUUID(),
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    current_website: clean(input.website),
    channel: clean(input.channel) ?? "Web",
    campaign: clean(input.campaign),
    notes: clean(input.notes),
    status: LEAD_STATUSES.includes(input.status as LeadStatus)
      ? (input.status as LeadStatus)
      : "nuevo",
    consent: input.consent ?? null,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb.from(TABLE).insert(chunk);
    if (error) {
      console.error("[imagina-leads] createLeadsBulk error:", error.message);
      return { ok: false, inserted, error: error.message };
    }
    inserted += chunk.length;
  }
  return { ok: true, inserted };
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

/** Notas actuales del lead (para no pisar la marca de consentimiento). */
export async function getLeadNotes(leadId: string): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) return "";
  const { data } = await sb.from(TABLE).select("notes").eq("id", leadId).maybeSingle();
  return (data?.notes as string | null) ?? "";
}

/** Persiste las respuestas del cuestionario sobre el lead existente, sin pisar
 *  la nota de consentimiento (se antepone al bloque del cuestionario). */
export async function savePromoQuestionnaire(input: PromoQuestionnaireInput): Promise<void> {
  await saveLead(promoQuestionnaireFields(input));
  const prev = await getLeadNotes(input.leadId);
  const block = formatQuestionnaireNotes(input);
  const combined = prev ? `${prev}\n\n— Cuestionario —\n${block}` : block;
  await updateLeadField(input.leadId, "notes", combined);
}

/** Marca el email como enviado y guarda el message_id de Resend (para casar los
 *  eventos del webhook). Best-effort. */
export async function setLeadEmailSent(
  leadId: string,
  messageId: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(TABLE)
    .update({
      email_status: "sent",
      email_message_id: messageId,
      email_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) console.error("[imagina-leads] setLeadEmailSent error:", error.message);
}

/** Actualiza el estado del email de la fila cuyo message_id casa con el evento de
 *  Resend. Devuelve el nº de filas actualizadas (0 si no rastreamos ese email). */
export async function setLeadEmailStatusByMessageId(
  messageId: string,
  status: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { data, error } = await sb
    .from(TABLE)
    .update({ email_status: status, email_updated_at: new Date().toISOString() })
    .eq("email_message_id", messageId)
    .select("id");
  if (error) {
    console.error(
      "[imagina-leads] setLeadEmailStatusByMessageId error:",
      error.message,
    );
    return 0;
  }
  return data?.length ?? 0;
}

export async function setLeadConsent(leadId: string, consent: boolean): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(TABLE).update({ consent }).eq("id", leadId);
  if (error) console.error("[imagina-leads] setLeadConsent error:", error.message);
}

/** Actualiza el estado del destinatario de campaña cuyo message_id casa con el
 *  evento de Resend (tabla `campaign_recipients`, no `imagina_leads`). Si el
 *  evento es un rebote o una queja, propaga también el estado al lead (tabla
 *  `imagina_leads`) para que deje de ser emailable — best-effort, no aborta si
 *  falla. Devuelve el nº de filas de `campaign_recipients` actualizadas (0 si
 *  no rastreamos ese envío o el destinatario ya estaba en un estado posterior). */
export async function setCampaignRecipientStatusByMessageId(
  messageId: string,
  status: RecipientEventStatus,
): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  let query = sb
    .from("campaign_recipients")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("message_id", messageId);
  // Entregado/abierto/clic solo hacen subir el estado: un evento que llega
  // tarde no puede borrar una apertura ya registrada (ver campaign-stats.ts).
  const below = statusesBelow(status);
  if (below) query = query.in("status", below);
  const { data, error } = await query.select("id,lead_id");
  if (error) {
    console.error(
      "[imagina-leads] setCampaignRecipientStatusByMessageId error:",
      error.message,
    );
    return 0;
  }
  const rows = (data ?? []) as { id: string; lead_id: string }[];
  if ((status === "bounced" || status === "complained") && rows.length > 0) {
    const leadUpdate: Record<string, unknown> = {
      email_status: status,
      email_updated_at: new Date().toISOString(),
    };
    if (status === "complained") leadUpdate.consent = false;
    for (const row of rows) {
      const { error: leadError } = await sb.from(TABLE).update(leadUpdate).eq("id", row.lead_id);
      if (leadError) {
        console.error(
          "[imagina-leads] setCampaignRecipientStatusByMessageId → lead update error:",
          leadError.message,
        );
      }
    }
  }
  return rows.length;
}

/** Leads "emailables": consentimiento explícito, email presente y sin rebote ni
 *  queja registrados. Admite filtros opcionales de status/campaign/channel. */
export async function listEmailableLeads(filter?: {
  status?: string;
  campaign?: string;
  channel?: string;
}): Promise<LeadRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  let query = sb
    .from(TABLE)
    .select("*")
    .eq("consent", true)
    .not("email", "is", null)
    .or("email_status.is.null,email_status.not.in.(bounced,complained)");
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.campaign) query = query.eq("campaign", filter.campaign);
  if (filter?.channel) query = query.eq("channel", filter.channel);
  const { data, error } = await query;
  if (error) {
    console.error("[imagina-leads] listEmailableLeads error:", error.message);
    return [];
  }
  return (data ?? []) as LeadRow[];
}

/** Rebote o queja de un correo a un lead que solo está en `imagina_leads`. */
export async function marcarEmailLeadLegacy(leadId: string, status: "bounced" | "complained"): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const update: Record<string, unknown> = { email_status: status, email_updated_at: new Date().toISOString() };
  if (status === "complained") update.consent = false;
  const { error } = await sb.from(TABLE).update(update).eq("id", leadId);
  if (error) console.error("[imagina-leads-legacy] marcarEmailLeadLegacy error:", error.message);
}
