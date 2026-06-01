// Shared (client-safe) lead status values. Kept out of `imagina-leads.ts`
// because that module is server-only and can't be imported by client components.
export const LEAD_STATUSES = [
  "nuevo",
  "contactado",
  "propuesta",
  "ganado",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  nuevo: "#2563eb",
  contactado: "#7c3aed",
  propuesta: "#d97706",
  ganado: "#16a34a",
  perdido: "#64748b",
};
