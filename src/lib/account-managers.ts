// Shared (client-safe) account-manager values. Kept out of `imagina-leads.ts`
// because that module is server-only and can't be imported by client components.
export const ACCOUNT_MANAGERS = ["Yael", "Paula G", "Paula L"] as const;
export type AccountManager = (typeof ACCOUNT_MANAGERS)[number];

export const AM_COLORS: Record<string, string> = {
  Yael: "#2563eb",
  "Paula G": "#db2777",
  "Paula L": "#0d9488",
};
