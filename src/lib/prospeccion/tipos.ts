/** Tipos de la prospección. Sin `server-only`: los usa también el cliente. */

export const ESTADOS_PROSPECTO = [
  "nuevo",
  "listo",
  "sin_contacto",
  "enviado",
  "respondido",
  "rebotado",
  "baja",
  "descartado",
] as const;
export type EstadoProspecto = (typeof ESTADOS_PROSPECTO)[number];

/** Estados desde los que se puede descartar a mano: todos menos los que dejan
 *  constancia de una baja o de un rebote, que no se pisan nunca. */
export const ESTADOS_DESCARTABLES: EstadoProspecto[] = ESTADOS_PROSPECTO.filter(
  (e) => e !== "baja" && e !== "rebotado" && e !== "descartado",
);

export type FuenteProspecto = "osm" | "overture" | "borme";
export type TipoEmail = "generica" | "personal";

export interface ProspectRow {
  id: string;
  search_id: string | null;
  source: FuenteProspecto;
  external_id: string;
  name: string;
  sector: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  email_kind: TipoEmail | null;
  rating: number | null;
  reviews: number | null;
  status: EstadoProspecto;
  /** Por qué quedó sin contacto (sin web, web caída, sin email publicado). */
  contact_note: string | null;
  enriched_at: string | null;
  template_id: string | null;
  sent_at: string | null;
  resend_id: string | null;
  send_error: string | null;
  lead_id: string | null;
  created_at: string;
  /* Consentimiento obtenido por teléfono (docs/sql/2026-10-19-prospeccion-consentimiento.sql).
   * Opcionales: hasta que se ejecute la migración, las filas no los traen. */
  /** Cuándo aceptó recibir información por email. */
  consentimiento_at?: string | null;
  /** Usuaria de ventas que lo registró. */
  consentimiento_por?: string | null;
  consentimiento_nota?: string | null;
  /** Cuándo dijo que ya no quiere recibir información. */
  consentimiento_retirado_at?: string | null;
}

/** Lo que devuelve una fuente antes de guardarse. */
export interface ProspectoNuevo {
  source: FuenteProspecto;
  external_id: string;
  name: string;
  sector: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  /** Email que la propia fuente publica (OSM lo trae a veces). */
  email?: string | null;
  rating: number | null;
  reviews: number | null;
}

export interface ProspectSearchRow {
  id: string;
  source: FuenteProspecto;
  params: Record<string, string>;
  status: "buscando" | "lista" | "error";
  error: string | null;
  total: number;
  created_at: string;
}

export interface ProspectTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}
