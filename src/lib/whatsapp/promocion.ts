/**
 * Mapeo puro de un lead del módulo de ventas (marca `dinkbit`, leads de
 * WhatsApp) al formato que espera el alta manual del CRM principal
 * (`createManualLead` en `src/lib/imagina-leads.ts`).
 *
 * `channel` es siempre "WhatsApp": así, en el CRM principal, estos leads se
 * distinguen de los que entran por formulario web.
 */

/** Subconjunto de `Lead` (ventas, `src/lib/ventas/db.ts`) que hace falta para
 *  el mapeo — no se importa el tipo completo para no acoplar este módulo
 *  puro al de ventas. */
export interface LeadVentasParaEmbudo {
  negocio: string | null;
  contacto: string | null;
  telefono: string | null;
  origen_detalle: string | null;
}

export interface DatosEmbudo {
  name: string;
  phone: string;
  channel: string;
  campaign: string | null;
}

/**
 * Nombre: contacto si lo hay, si no el nombre del negocio, y si tampoco hay
 * negocio, el teléfono (siempre hay algo que enseñar en el CRM principal).
 */
export function datosParaEmbudo(lead: LeadVentasParaEmbudo): DatosEmbudo {
  return {
    name: lead.contacto || lead.negocio || lead.telefono || "",
    phone: lead.telefono ?? "",
    channel: "WhatsApp",
    campaign: lead.origen_detalle,
  };
}
