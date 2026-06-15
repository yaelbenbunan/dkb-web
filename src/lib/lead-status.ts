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

// One clearly distinct hue per status — solid, saturated, easy to scan.
export const STATUS_COLORS: Record<string, string> = {
  nuevo: "#2563eb", // azul
  contactado: "#0891b2", // cian
  propuesta: "#d97706", // ámbar
  ganado: "#16a34a", // verde
  perdido: "#dc2626", // rojo
};
