// Shared (client-safe) lead status values. Kept out of `imagina-leads.ts`
// because that module is server-only and can't be imported by client components.
//
// `imagina_leads.status` es `text` sin CHECK ni enum (verificado 2026-07-21), así
// que añadir un estado aquí NO requiere migración en Supabase: esta lista es la
// única fuente de verdad y `setLeadStatus` valida contra ella.
export const LEAD_STATUSES = [
  "nuevo",
  "contactado",
  "kit-digital",
  "ilocalizable",
  "propuesta",
  "ganado",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Etiqueta visible en el panel. El valor guardado en BD es el slug (kebab-case);
// esto evita depender de `text-transform: capitalize`, que parte los nombres
// propios en varias palabras ("Interés En Kit Digital").
export const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  "kit-digital": "Interés en Kit Digital",
  ilocalizable: "Ilocalizable",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
};

/** Etiqueta legible de un estado; cae al valor crudo si es desconocido. */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// One clearly distinct hue per status — solid, saturated, easy to scan.
export const STATUS_COLORS: Record<string, string> = {
  nuevo: "#2563eb", // azul
  contactado: "#0891b2", // cian
  "kit-digital": "#7c3aed", // violeta
  ilocalizable: "#64748b", // gris pizarra
  propuesta: "#d97706", // ámbar
  ganado: "#16a34a", // verde
  perdido: "#dc2626", // rojo
};
