import "server-only";
import { createWebhookLead } from "./imagina-leads";
import { sendKitDigital2026Email } from "./kit-digital-2026-resend";

const CAMPAIGN = "Kit Digital 2026";

export async function handleKitDigital2026MetaLead(input: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const clean = (v?: string | null) => {
    const t = (v ?? "").trim();
    return t || null;
  };
  const email = clean(input.email);

  const saved = await createWebhookLead({
    id: clean(input.id),
    name: clean(input.name),
    email,
    phone: clean(input.phone),
    channel: "Meta",
    campaign: CAMPAIGN,
    status: "kit-digital",
    notes: "Origen: Meta Lead Ads (campaña Kit Digital) · pendiente de completar datos en la landing",
  });
  if (!saved.ok) return saved;

  // Email al lead (best-effort). El helper persiste el estado de envío.
  if (email && saved.id) {
    await sendKitDigital2026Email({ leadId: saved.id, name: clean(input.name), email });
  }
  return saved;
}
