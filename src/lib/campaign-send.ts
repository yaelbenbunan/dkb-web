import "server-only";
import { Resend } from "resend";
import {
  getCampaign,
  updateCampaign,
  setCampaignStatus,
  insertCampaignRecipients,
} from "./campaigns";
import { listEmailableLeads, type LeadRow } from "./imagina-leads";
import { renderCampaignEmail } from "./campaign-render";
import { mintUnsubscribeToken } from "./unsubscribe-token";
import { blocksSchema, DEFAULT_STYLE, type Block } from "./campaign-blocks";

const SITE = "https://www.dinkbit.es";
const BATCH_SIZE = 100;

/** Remitentes autorizados para envío de campañas. Lista blanca — nunca se
 *  manda con un `from` fuera de este conjunto. */
export const ALLOWED_SENDERS = (process.env.CAMPAIGN_SENDERS ?? "hola@dinkbit.es")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Filtro de emailable en código — defensa en profundidad además del filtro
 *  ya aplicado por `listEmailableLeads` en la query. */
function isEmailableLead(lead: LeadRow): lead is LeadRow & { email: string } {
  if (lead.consent !== true) return false;
  if (!lead.email) return false;
  const status = lead.email_status ?? "";
  return status !== "bounced" && status !== "complained";
}

function buildUnsubscribeUrl(leadId: string): string {
  const token = mintUnsubscribeToken(leadId);
  return `${SITE}/api/unsubscribe?id=${leadId}&token=${token}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function validateCampaign(campaign: {
  subject: string | null;
  from_email: string | null;
  blocks: unknown;
}): { ok: true; subject: string; from_email: string; blocks: Block[] } | { ok: false; error: string } {
  const subject = campaign.subject?.trim();
  if (!subject) return { ok: false, error: "missing_subject" };
  if (!campaign.from_email || !ALLOWED_SENDERS.includes(campaign.from_email)) {
    return { ok: false, error: "from_email_not_allowed" };
  }
  const parsed = blocksSchema.safeParse(campaign.blocks);
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: "invalid_blocks" };
  }
  return { ok: true, subject, from_email: campaign.from_email, blocks: parsed.data };
}

function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

/** Envía una campaña por lotes de 100 a los leads indicados, tras filtrar por
 *  consentimiento/email/no-rebote. Best-effort por lote: un lote que falla se
 *  registra como `failed` sin abortar el resto. */
export async function sendCampaign(
  campaignId: string,
  leadIds: string[],
): Promise<{ ok: boolean; sent: number; skipped: number; error?: string }> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, sent: 0, skipped: 0, error: "campaign_not_found" };

  const validated = validateCampaign(campaign);
  if (!validated.ok) return { ok: false, sent: 0, skipped: 0, error: validated.error };
  const { subject, from_email, blocks } = validated;

  const wanted = new Set(leadIds);
  const allEmailable = await listEmailableLeads();
  const emailable = allEmailable.filter((lead) => wanted.has(lead.id) && isEmailableLead(lead));
  const skipped = leadIds.length - emailable.length;

  const resend = getResendClient();
  let sent = 0;

  for (const batch of chunk(emailable, BATCH_SIZE)) {
    const payloads = batch.map((lead) => {
      const { html, text } = renderCampaignEmail(blocks, DEFAULT_STYLE, {
        preheader: subject,
        unsubscribeUrl: buildUnsubscribeUrl(lead.id),
      });
      return { from: from_email, to: lead.email as string, subject, html, text };
    });

    try {
      const { data, error } = await resend.batch.send(payloads);
      if (error) {
        console.error("[campaign-send] batch error:", error);
        await insertCampaignRecipients(
          batch.map((lead) => ({
            campaign_id: campaignId,
            lead_id: lead.id,
            email: lead.email as string,
            status: "failed",
          })),
        );
        continue;
      }
      const results = data?.data ?? [];
      await insertCampaignRecipients(
        batch.map((lead, idx) => ({
          campaign_id: campaignId,
          lead_id: lead.id,
          email: lead.email as string,
          message_id: results[idx]?.id ?? null,
          status: "sent",
        })),
      );
      sent += batch.length;
    } catch (err) {
      console.error("[campaign-send] batch threw:", err);
      await insertCampaignRecipients(
        batch.map((lead) => ({
          campaign_id: campaignId,
          lead_id: lead.id,
          email: lead.email as string,
          status: "failed",
        })),
      );
    }
  }

  await setCampaignStatus(campaignId, "sent");
  await updateCampaign(campaignId, { recipients_total: sent, sent_at: new Date().toISOString() });

  return { ok: true, sent, skipped };
}

/** Envío de prueba a direcciones sueltas (QA de plantilla). No toca el CRM ni
 *  `campaign_recipients`. */
export async function sendCampaignTest(input: {
  subject: string;
  from_email: string;
  blocks: unknown;
  toEmails: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const validated = validateCampaign({
    subject: input.subject,
    from_email: input.from_email,
    blocks: input.blocks,
  });
  if (!validated.ok) return { ok: false, error: validated.error };
  if (input.toEmails.length === 0) return { ok: false, error: "no_recipients" };

  const { html, text } = renderCampaignEmail(validated.blocks, DEFAULT_STYLE, {
    preheader: validated.subject,
    unsubscribeUrl: `${SITE}/api/unsubscribe?id=test&token=test`,
  });

  const resend = getResendClient();
  const payloads = input.toEmails.map((to) => ({
    from: validated.from_email,
    to,
    subject: validated.subject,
    html,
    text,
  }));

  try {
    const { error } = await resend.batch.send(payloads);
    if (error) {
      console.error("[campaign-send] test send error:", error);
      return { ok: false, error: "send_failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[campaign-send] test send threw:", err);
    return { ok: false, error: "send_threw" };
  }
}
