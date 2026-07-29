import "server-only";
import { createWebhookLead } from "./imagina-leads";
import { sendKitDigital2026Email } from "./kit-digital-2026-resend";

const CAMPAIGN = "Kit Digital 2026";

const CONSENT_YES = new Set(["true", "on", "yes", "si", "sí", "1"]);
const CONSENT_NO = new Set(["false", "off", "no", "0"]);

/**
 * Traduce la respuesta de la casilla de consentimiento del formulario de Meta.
 * Meta manda el valor según el tipo de pregunta y el idioma del formulario
 * ("true"/"false" en las de tipo consentimiento, "sí"/"no" en las localizadas).
 *
 * Distingue tres estados a propósito: `true` (aceptó), `false` (la vio y la
 * dejó sin marcar) y `null` (no había pregunta, o llegó algo que no sabemos
 * interpretar). Un valor irreconocible NUNCA se resuelve como `true`: sin
 * respuesta clara no hay consentimiento, y el lead se queda fuera de las
 * campañas hasta que se confirme por otra vía.
 */
export function parseConsentAnswer(raw?: string | null): boolean | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (CONSENT_YES.has(v)) return true;
  if (CONSENT_NO.has(v)) return false;
  console.warn(`[kit-digital-2026-meta] respuesta de consentimiento no reconocida: ${JSON.stringify(raw)}`);
  return null;
}

export async function handleKitDigital2026MetaLead(input: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  consent?: string | null;
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
    consent: parseConsentAnswer(input.consent),
    notes: "Origen: Meta Lead Ads (campaña Kit Digital) · pendiente de completar datos en la landing",
  });
  if (!saved.ok) return saved;

  // Email al lead (best-effort). El helper persiste el estado de envío.
  if (email && saved.id) {
    await sendKitDigital2026Email({ leadId: saved.id, name: clean(input.name), email });
  }
  return saved;
}
