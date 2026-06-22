import type { WebhookLeadInput } from "./imagina-leads";

/**
 * Maps each web form's validated fields to a CRM lead row, always recording
 * WHERE the conversion happened in one of the persisted fields
 * (`channel` / `campaign` / `notes`). These builders are the single source of
 * truth for that mapping so the origin labelling stays consistent across forms
 * and can be unit-tested without touching Resend or Supabase.
 *
 * Convention: paid landings are attributed to their acquisition channel
 * (Google Ads Performance Max — our only Meta campaign is "leads", which comes
 * in through the webhook, not these on-site forms). Organic on-site forms use
 * `channel: "Web"` and spell out the exact form in `notes`.
 */

export function homeHeroLead(d: {
  name: string;
  email: string;
  phone: string;
  service: string;
}): WebhookLeadInput {
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel: "Web",
    campaign: null,
    notes: `Origen: formulario rápido del Home (Hero) · Servicio de interés: ${d.service}`,
  };
}

export function marketingLandingLead(d: {
  name: string;
  phone: string;
  email?: string | null;
  businessType: string;
  budget: string;
  origin: string;
}): WebhookLeadInput {
  return {
    name: d.name,
    email: d.email ?? null,
    phone: d.phone,
    channel: "google ads",
    campaign: "Pmax",
    notes: `Origen: ${d.origin} · Tipo: ${d.businessType} · Presupuesto: ${d.budget}`,
  };
}

export function callRequestLead(d: {
  name: string;
  phone: string;
  service: string;
}): WebhookLeadInput {
  return {
    name: d.name,
    email: null,
    phone: d.phone,
    channel: "Web",
    campaign: null,
    notes: `Origen: solicitud de llamada (CTA de la página de servicio) · Servicio de interés: ${d.service}`,
  };
}

export function contactLead(d: {
  name: string;
  email: string;
  phone: string;
  service: string;
  source: string;
}): WebhookLeadInput {
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel: "Web",
    campaign: null,
    notes: `Origen: formulario de contacto · Servicio de interés: ${d.service} · Cómo nos conoció: ${d.source}`,
  };
}

export function kitDigitalLead(d: {
  name: string;
  email: string;
  phone: string;
  device: string;
  bono: string;
  // nif/address are accepted for signature parity with the form but are NOT
  // persisted to the CRM — that fulfillment PII stays in the email only.
  nif?: string;
  address?: string;
}): WebhookLeadInput {
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel: "Web",
    campaign: "Kit Digital",
    notes: `Origen: landing /kit-digital · Modelo: ${d.device} · Bono: ${d.bono}`,
  };
}
