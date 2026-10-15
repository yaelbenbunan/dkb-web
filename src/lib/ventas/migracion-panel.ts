/**
 * Cómo se traduce un lead del /panel viejo (`imagina_leads`) a un lead de
 * ventas (marca dinkbit). Es la referencia probada de lo que hace
 * docs/sql/2026-10-15-crm-unificacion-datos.sql: el SQL replica esta lógica
 * paso a paso. Si cambia una, cambia la otra. Puro.
 */

import type { LeadRow } from "../imagina-leads";
import type { LeadWebNuevo } from "./db";
import { emailDeResponsablePanel, ETIQUETA_KIT_DIGITAL, faseDesdeEstadoPanel } from "./dominio";

const limpio = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t || null;
};

/** Campos que solo tienen sentido en los flujos de la web: van a `extra`. */
const EXTRA = ["sector", "business_type", "template", "style", "palette", "value_prop", "pdf_path", "review_rating", "review_comment"] as const;

export function leadVentasDesdePanel(
  fila: LeadRow,
  usuarias: { id: string; email: string; activa: boolean }[],
): LeadWebNuevo & { notas: string[] } {
  const email = emailDeResponsablePanel(fila.account_manager);
  const responsable = email ? usuarias.find((u) => u.activa && u.email.toLowerCase() === email) : undefined;
  const estado = String(fila.status ?? "");
  const extra = Object.fromEntries(EXTRA.map((k) => [k, limpio(fila[k] as string | null)]).filter(([, v]) => v !== null));
  const notas = [
    limpio(fila.notes) && `Notas de /panel: ${limpio(fila.notes)}`,
    limpio(fila.followup) && `Seguimiento: ${limpio(fila.followup)}`,
  ].filter((n): n is string => Boolean(n));

  return {
    id_externo: fila.id,
    negocio: limpio(fila.business_name) ?? limpio(fila.name) ?? limpio(fila.email) ?? `(sin nombre) ${fila.id}`,
    contacto: limpio(fila.name),
    telefono: limpio(fila.phone),
    email: limpio(fila.email),
    web: limpio(fila.current_website),
    origen: "web",
    origen_detalle: limpio(fila.campaign),
    fase: faseDesdeEstadoPanel(estado),
    asignada_a: responsable?.id ?? null,
    proximo_seguimiento: fila.followup_at ?? null,
    canal: limpio(fila.channel),
    campana: limpio(fila.campaign),
    etiquetas: estado === "kit-digital" || estado === "cliente-kit-digital" ? [ETIQUETA_KIT_DIGITAL] : [],
    consentimiento: fila.consent,
    extra,
    created_at: fila.created_at,
    notas,
  };
}
