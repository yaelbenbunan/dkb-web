import type { Rama } from "./growth-calc";
import type { WebhookLeadInput } from "./imagina-leads";

/**
 * Maps each web form's validated fields to a CRM lead row, always recording
 * WHERE the conversion happened in one of the persisted fields
 * (`channel` / `campaign` / `notes`). These builders are the single source of
 * truth for that mapping so the origin labelling stays consistent across forms
 * and can be unit-tested without touching Resend or Supabase.
 *
 * Convention: cada formulario tiene un canal/campaña por defecto (tráfico
 * orgánico del sitio → `channel: "Web"`). Si la visita traía UTMs (o un clic de
 * anuncio), `attribution()` sobrescribe el canal/campaña con el origen real:
 * p.ej. `utm_source=google&utm_campaign=search` → canal "Google Ads",
 * campaña "search". Así basta con etiquetar los anuncios con UTMs.
 */

export interface UtmInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

// Extrae las UTMs que el formulario adjuntó al FormData (ver lib/utm.ts).
// Server-safe: no toca `window`.
export function utmFromFormData(fd: FormData): UtmInput {
  const g = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    utmSource: g("utm_source"),
    utmMedium: g("utm_medium"),
    utmCampaign: g("utm_campaign"),
  };
}

// Deriva canal + campaña a partir de las UTMs de la visita. Sin UTMs, devuelve
// los valores por defecto del formulario. Normaliza las fuentes conocidas a la
// etiqueta de canal que usamos en el CRM.
export function attribution(
  utm: UtmInput | undefined,
  def: { channel: string; campaign: string | null },
): { channel: string; campaign: string | null } {
  const source = (utm?.utmSource ?? "").trim().toLowerCase();
  const campaign = (utm?.utmCampaign ?? "").trim();
  if (!source) return def;
  // Etiquetas de canal consistentes con las ya usadas en el CRM (ver
  // CHANNEL_COLORS del panel): "google ads" en minúscula, "Meta", etc.
  const channel = /google|adwords|g[-_ ]?ads/.test(source)
    ? "google ads"
    : /meta|facebook|fb|instagram|\big\b/.test(source)
      ? "Meta"
      : /bing|microsoft/.test(source)
        ? "Microsoft Ads"
        : /linkedin/.test(source)
          ? "LinkedIn"
          : /tiktok/.test(source)
            ? "TikTok"
            : // fuente desconocida: se conserva tal cual (capitalizada)
              source.charAt(0).toUpperCase() + source.slice(1);
  return { channel, campaign: campaign || def.campaign };
}

export function homeHeroLead(
  d: {
    name: string;
    email: string;
    phone: string;
    service: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel, campaign } = attribution(utm, { channel: "Web", campaign: null });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: `Origen: formulario rápido del Home (Hero) · Servicio de interés: ${d.service}`,
  };
}

export function marketingLandingLead(
  d: {
    name: string;
    phone: string;
    email?: string | null;
    businessType: string;
    budget: string;
    origin: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  // Landing de pago: por defecto Google Ads / Pmax; las UTMs concretan la campaña.
  const { channel, campaign } = attribution(utm, { channel: "google ads", campaign: "Pmax" });
  return {
    name: d.name,
    email: d.email ?? null,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: `Origen: ${d.origin} · Tipo: ${d.businessType} · Presupuesto: ${d.budget}`,
  };
}

export function callRequestLead(
  d: {
    name: string;
    phone: string;
    service: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel, campaign } = attribution(utm, { channel: "Web", campaign: null });
  return {
    name: d.name,
    email: null,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: `Origen: solicitud de llamada (CTA de la página de servicio) · Servicio de interés: ${d.service}`,
  };
}

export function contactLead(
  d: {
    name: string;
    email: string;
    phone: string;
    service: string;
    source: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel, campaign } = attribution(utm, { channel: "Web", campaign: null });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: `Origen: formulario de contacto · Servicio de interés: ${d.service} · Cómo nos conoció: ${d.source}`,
  };
}

export function kitDigitalLead(
  d: {
    name: string;
    email: string;
    phone: string;
    device: string;
    bono: string;
    // nif/address are accepted for signature parity with the form but are NOT
    // persisted to the CRM — that fulfillment PII stays in the email only.
    nif?: string;
    address?: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel, campaign } = attribution(utm, { channel: "Web", campaign: "Kit Digital" });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: `Origen: landing /puesto-seguro · Modelo: ${d.device} · Bono: ${d.bono}`,
  };
}

export function kitDigital2026Lead(
  d: {
    name: string;
    email: string;
    phone: string;
    // Servicios de interés (multi): Web, SEO, Redes sociales, Ordenador, etc.
    services: string[];
    businessType: "pyme" | "autonomo";
    // Pyme → tramo de empleados; autónomo → antigüedad de alta. Solo uno aplica.
    employees?: string | null;
    seniority?: string | null;
    // Sector (multi, opcional) — más para nosotros que para el Kit Digital.
    sectors: string[];
  },
  utm?: UtmInput,
): WebhookLeadInput {
  // Landing de captación: por defecto orgánico (Web); la campaña se fija SIEMPRE
  // a "Kit Digital 2026" para poder filtrar todos sus leads juntos en el CRM.
  const { channel } = attribution(utm, { channel: "Web", campaign: "Kit Digital 2026" });
  const typeLabel = d.businessType === "pyme" ? "Pyme" : "Autónomo";
  const detail =
    d.businessType === "pyme"
      ? `Empleados: ${d.employees ?? "—"}`
      : `Antigüedad de alta: ${d.seniority ?? "—"}`;
  const sectors = d.sectors.filter((s) => s.trim());
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign: "Kit Digital 2026",
    // Entra ya etiquetado como "Interés en Kit Digital" (slug kit-digital).
    status: "kit-digital",
    // El formulario exige el checkbox de consentimiento (consent: z.literal(true)
    // en kit-digital-2026-action.ts) — se registra para que el lead sea emailable.
    consent: true,
    // Columnas dedicadas para filtrar en el panel.
    sector: sectors.length ? sectors.join(", ") : null,
    businessType: typeLabel,
    notes: [
      "Origen: landing /kit-digital-2026 (vuelta del Kit Digital)",
      `Servicios de interés: ${d.services.join(", ") || "—"}`,
      `${typeLabel} · ${detail}`,
      `Sectores: ${sectors.join(", ") || "—"}`,
    ].join(" · "),
  };
}

export function promoVeranoLead(
  d: { name?: string | null; email: string; phone?: string | null; consentAt: string },
  utm?: UtmInput,
): WebhookLeadInput {
  // El canal refleja el origen del tráfico (organic → "promo-verano"), pero la
  // campaña se fija SIEMPRE a la de la promo para poder filtrar todos sus leads
  // juntos en el CRM, venga el visitante de donde venga.
  const { channel } = attribution(utm, { channel: "promo-verano", campaign: null });
  return {
    // Nombre de pila: por quién preguntar cuando contactemos con el lead.
    name: d.name ?? null,
    email: d.email,
    // Teléfono opcional: vía de contacto adicional al email cuando el lead lo aporta.
    phone: d.phone ?? null,
    channel,
    campaign: "promo-verano-2026",
    // El formulario exige el checkbox "acepto ... el envío de comunicaciones
    // comerciales" (consent: "on" en promo-subscribe-action.ts) — se registra
    // para que el lead sea emailable.
    consent: true,
    notes: `Origen: popup Promo Verano -50% · Consentimiento comunicaciones comerciales: ${d.consentAt}`,
  };
}

/**
 * Landing de web cerrada por nicho (psicólogos y las que vengan). Los campos de
 * cualificación se guardan en las notas porque no hay columna para ellos y son
 * lo primero que mira quien coge el teléfono: si decide o no, para cuándo la
 * quiere y si hay web que rehacer.
 */
export function webExpressLead(
  d: {
    name: string;
    email: string;
    phone: string;
    contactMethod: string;
    timeSlot: string;
    decisionMaker: string;
    urgency: string;
    goals: string[];
    stage?: string | null;
    currentWebsite?: string | null;
    origin: string;
    campaign: string;
    consent?: boolean;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  // Por defecto Meta: estas landings nacen para la campaña de Meta Lead Ads.
  // Si la visita trae UTMs, mandan ellas.
  const { channel, campaign } = attribution(utm, { channel: "Meta", campaign: d.campaign });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign,
    consent: d.consent ?? null,
    notes: [
      `Origen: ${d.origin}`,
      `Contactar por: ${d.contactMethod} · ${d.timeSlot}`,
      `Decisión: ${d.decisionMaker}`,
      `Plazo: ${d.urgency}`,
      `Objetivo: ${d.goals.join(", ") || "—"}`,
      d.stage ? `Situación: ${d.stage}` : null,
      d.currentWebsite ? `Web actual: ${d.currentWebsite}` : "Sin web actual",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Campaña fija de la landing /growth, para filtrar todos sus leads juntos en
 *  el panel. Mismo criterio que "Kit Digital 2026". */
const GROWTH_CAMPAIGN = "Growth clínicas";

export function growthLead(
  d: {
    name: string;
    email: string;
    phone: string;
    /** null = "no invierto todavía". */
    inversion: number | null;
    /** null = "no lo sé". */
    pacientes: number | null;
    /** null = no lo quiso decir. */
    ticket: number | null;
    costePorPaciente: number | null;
    rama: Rama;
  },
  utm?: UtmInput,
): WebhookLeadInput {
  const { channel } = attribution(utm, { channel: "Web", campaign: GROWTH_CAMPAIGN });
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    channel,
    campaign: GROWTH_CAMPAIGN,
    // Lead comercial normal: recorre el pipeline existente (contactado →
    // propuesta → ganado). No necesita estado propio como sí lo necesitaba el
    // Kit Digital, que etiquetaba un tipo de interés y no una venta en curso.
    status: "nuevo",
    consent: true,
    // Las respuestas de la calculadora van a notas porque son el guion de la
    // llamada: quien contesta "no lo sé" necesita otra conversación que quien
    // contesta "88 €".
    notes: [
      "Origen: landing /growth (calculadora de coste por paciente)",
      `Inversión: ${d.inversion === null ? "no invierte todavía" : `${d.inversion} €/mes`}`,
      `Pacientes/mes: ${d.pacientes === null ? "no lo sabe" : d.pacientes}`,
      `Ticket medio: ${d.ticket === null ? "no lo dijo" : `${d.ticket} €`}`,
      `Coste por paciente: ${d.costePorPaciente === null ? "no calculable" : `${d.costePorPaciente} €`}`,
      `Rama: ${d.rama}`,
    ].join(" · "),
  };
}
